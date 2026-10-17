package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"testhub/internal/helpers"
	"testhub/internal/models"
	"testhub/internal/repository"
	"testhub/internal/services"
	"testhub/internal/validator"
)

type PaymentHandler struct {
	subRepo  repository.SubscriptionRepository
	testRepo repository.TestRepository
	gateway  services.PaymentGatewayProvider
}

func NewPaymentHandler(subRepo repository.SubscriptionRepository, testRepo repository.TestRepository, gateway services.PaymentGatewayProvider) *PaymentHandler {
	return &PaymentHandler{
		subRepo:  subRepo,
		testRepo: testRepo,
		gateway:  gateway,
	}
}

// CreateInvoice handles POST /api/payments/create-invoice
func (h *PaymentHandler) CreateInvoice(c *gin.Context) {
	var req models.CreateInvoiceDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi permintaan invoice gagal",
			"details": validator.FormatValidationErrors(err),
		})
		return
	}

	idempotencyKey := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
	if idempotencyKey != "" {
		c.Header("Idempotency-Key", idempotencyKey)
	}

	var amount float64
	var testTitle string

	if req.PlanType == "per_test" {
		if req.TestID == nil || *req.TestID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID ujian wajib disertakan untuk paket per_test"})
			return
		}
		test, err := h.testRepo.GetTestByID(c.Request.Context(), *req.TestID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return
		}
		amount = test.PriceIDR
		if amount <= 0 {
			amount = 15000 // Default nominal tryout berbayar jika belum di-set
		}
		testTitle = test.Title
	} else {
		// Season Pass (Akses Seluruh Tryout CPNS/SBMPTN 90 Hari)
		amount = 79000
		testTitle = "Season Pass All-Access (90 Hari)"
	}

	// 1. Pre-Payment Ownership Check: Cegah pembelian ulang jika user sudah punya akses aktif
	testIDStr := ""
	if req.TestID != nil {
		testIDStr = *req.TestID
	}
	hasAccess, errAccess := h.subRepo.HasActiveAccess(c.Request.Context(), req.UserEmail, testIDStr)
	if errAccess == nil && hasAccess {
		c.JSON(http.StatusConflict, gin.H{
			"error":              "Anda sudah memiliki akses aktif. Silakan langsung mulai ujian.",
			"already_subscribed": true,
		})
		return
	}

	// 2. Pending Invoice Reuse & Idempotency: Jika ada order pending yang belum expired, gunakan kembali
	if existingOrder, err := h.subRepo.GetActivePendingOrder(c.Request.Context(), req.UserEmail, req.TestID, req.PlanType); err == nil && existingOrder != nil {
		countdown := 900
		if existingOrder.ExpiresAt != nil {
			countdown = int(time.Until(*existingOrder.ExpiresAt).Seconds())
			if countdown < 0 {
				countdown = 0
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"order_id":         existingOrder.ID,
			"plan_type":        existingOrder.PlanType,
			"title":            testTitle,
			"amount":           existingOrder.Amount,
			"status":           existingOrder.Status,
			"payment_method":   existingOrder.PaymentMethod,
			"qr_payload":       existingOrder.QRPayload,
			"snap_token":       existingOrder.SnapToken,
			"redirect_url":     "",
			"provider":         existingOrder.PaymentMethod,
			"expires_at":       existingOrder.ExpiresAt.Format(time.RFC3339),
			"countdown_second": countdown,
			"is_reused":        true,
		})
		return
	}

	orderID := fmt.Sprintf("INV-%d-%s", time.Now().Unix(), uuid.New().String()[:6])
	now := time.Now()
	expiresAt := now.Add(15 * time.Minute)

	// Delegate payment transaction creation to the active PaymentGatewayProvider (Midtrans / Simulator)
	gwResp, err := h.gateway.CreateTransaction(c.Request.Context(), services.PaymentInvoiceRequest{
		OrderID:   orderID,
		Amount:    amount,
		UserEmail: req.UserEmail,
		ItemName:  testTitle,
		ItemID:    req.PlanType,
	})
	if err != nil {
		log.Printf("[PaymentHandler.CreateInvoice] gateway error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghubungkan ke gateway pembayaran."})
		return
	}

	order := models.Order{
		ID:               orderID,
		UserEmail:        req.UserEmail,
		TestID:           req.TestID,
		PlanType:         req.PlanType,
		Amount:           amount,
		Status:           "pending",
		PaymentMethod:    gwResp.Provider,
		PaymentReference: "",
		SnapToken:        gwResp.SnapToken,
		QRPayload:        gwResp.QRPayload,
		ExpiresAt:        &expiresAt,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := h.subRepo.CreateOrder(c.Request.Context(), &order); err != nil {
		log.Printf("[PaymentHandler.CreateInvoice] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan faktur pembayaran."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"order_id":         order.ID,
		"plan_type":        order.PlanType,
		"title":            testTitle,
		"amount":           order.Amount,
		"status":           order.Status,
		"payment_method":   order.PaymentMethod,
		"qr_payload":       order.QRPayload,
		"snap_token":       order.SnapToken,
		"redirect_url":     gwResp.RedirectURL,
		"provider":         gwResp.Provider,
		"expires_at":       order.ExpiresAt.Format(time.RFC3339),
		"countdown_second": 900,
	})
}

// GetOrderStatus handles GET /api/payments/status/:orderId
func (h *PaymentHandler) GetOrderStatus(c *gin.Context) {
	orderID := c.Param("orderId")

	order, err := h.subRepo.GetOrderByID(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"order_id":   order.ID,
		"status":     order.Status,
		"plan_type":  order.PlanType,
		"amount":     order.Amount,
		"user_email": order.UserEmail,
		"settled_at": order.SettledAt,
	})
}

// GetUserSubscriptions handles GET /api/user/subscriptions
func (h *PaymentHandler) GetUserSubscriptions(c *gin.Context) {
	userEmail, exists := c.Get("email")
	if !exists || userEmail == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Autentikasi diperlukan"})
		return
	}

	subs, err := h.subRepo.GetUserSubscriptions(c.Request.Context(), userEmail.(string))
	if err != nil {
		log.Printf("[PaymentHandler.GetUserSubscriptions] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar langganan"})
		return
	}

	if subs == nil {
		subs = []models.Subscription{}
	}

	c.JSON(http.StatusOK, subs)
}

// HandleWebhook handles POST /api/payments/webhook
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	rawBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gagal membaca data webhook"})
		return
	}

	verif, err := h.gateway.VerifyWebhook(c.Request.Context(), rawBytes)
	if err != nil {
		log.Printf("[PaymentHandler.Webhook] parsing error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload notifikasi webhook tidak valid"})
		return
	}

	if !verif.SignatureValid {
		log.Printf("[PaymentHandler.Webhook] Warning: Signature verifikasi gateway tidak valid untuk OrderID %s", verif.OrderID)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Signature verifikasi gateway tidak valid"})
		return
	}

	log.Printf("[PaymentHandler.Webhook] Notification verified for OrderID: %s, Status: %s", verif.OrderID, verif.TransactionStatus)

	if verif.TransactionStatus == "settled" {
		// Handle Midtrans Dashboard test pings / simulator order probes
		if strings.HasPrefix(verif.OrderID, "payment_notif_test") {
			log.Printf("[PaymentHandler.Webhook] Midtrans dashboard test notification acknowledged for %s", verif.OrderID)
			c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Test notification acknowledged"})
			return
		}

		sub, err := h.subRepo.SettleOrder(c.Request.Context(), verif.OrderID, verif.PaymentReference)
		if err != nil {
			if errors.Is(err, repository.ErrOrderNotFound) {
				log.Printf("[PaymentHandler.Webhook] Order %s not found in DB (likely test/external order). Acknowledged with 200.", verif.OrderID)
				c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Order not tracked, notification acknowledged"})
				return
			}
			log.Printf("[PaymentHandler.Webhook] Failed to settle order %s: %v", verif.OrderID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses settlement order"})
			return
		}
		log.Printf("[PaymentHandler.Webhook] Order %s successfully settled! Active Subscription ID: %s", verif.OrderID, sub.ID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// =========================================================================
// ADMIN SUBSCRIPTION MANAGEMENT & MANUAL OVERRIDES
// =========================================================================

type AdminSubscriptionHandler struct {
	subRepo  repository.SubscriptionRepository
	testRepo repository.TestRepository
}

func NewAdminSubscriptionHandler(subRepo repository.SubscriptionRepository, testRepo repository.TestRepository) *AdminSubscriptionHandler {
	return &AdminSubscriptionHandler{
		subRepo:  subRepo,
		testRepo: testRepo,
	}
}

// ListSubscriptions handles GET /api/admin/subscriptions
func (h *AdminSubscriptionHandler) ListSubscriptions(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	list, total, err := h.subRepo.ListSubscriptions(c.Request.Context(), status, search, limit, offset)
	if err != nil {
		log.Printf("[AdminSubscriptionHandler.List] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar langganan."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"subscriptions": list,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// ManualGrant handles POST /api/admin/subscriptions/manual-grant
func (h *AdminSubscriptionHandler) ManualGrant(c *gin.Context) {
	var req models.ManualGrantSubscriptionDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi permintaan grant manual gagal",
			"details": validator.FormatValidationErrors(err),
		})
		return
	}

	if req.PlanType == "per_test" && (req.TestID == nil || *req.TestID == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Test ID wajib disertakan jika memilih plan per_test"})
		return
	}

	now := time.Now()
	validUntil := now.AddDate(0, 0, req.ValidDays)
	subID := fmt.Sprintf("sub-manual-%s", uuid.New().String()[:8])
	adminUser, _ := c.Get("email")
	adminEmailStr := "admin"
	if s, ok := adminUser.(string); ok && s != "" {
		adminEmailStr = s
	}

	auditNote := fmt.Sprintf("[Grant by %s]: %s", adminEmailStr, req.ReasonNotes)

	sub := models.Subscription{
		ID:             subID,
		UserIdentifier: req.UserIdentifier,
		TestID:         req.TestID,
		Tier:           req.PlanType,
		Status:         "active",
		Source:         "admin_manual",
		AdminNotes:     &auditNote,
		AmountPaid:     0,
		ValidUntil:     &validUntil,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := h.subRepo.CreateSubscription(c.Request.Context(), &sub); err != nil {
		log.Printf("[AdminSubscriptionHandler.ManualGrant] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memberikan akses manual."})
		return
	}

	helpers.LogAudit(c, h.testRepo, "manual_grant_subscription", "subscription", sub.ID, "", fmt.Sprintf(`{"user": %q, "plan_type": %q, "valid_days": %d, "reason": %q}`, req.UserIdentifier, req.PlanType, req.ValidDays, req.ReasonNotes))
	c.JSON(http.StatusCreated, sub)
}

// UpdateStatus handles PUT /api/admin/subscriptions/:id/status
func (h *AdminSubscriptionHandler) UpdateStatus(c *gin.Context) {
	subID := c.Param("id")

	var req models.UpdateSubscriptionStatusDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi update status gagal",
			"details": validator.FormatValidationErrors(err),
		})
		return
	}

	err := h.subRepo.UpdateStatus(c.Request.Context(), subID, req.Status, req.ExtendDays, req.AdminNotes)
	if err != nil {
		log.Printf("[AdminSubscriptionHandler.UpdateStatus] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status langganan."})
		return
	}

	helpers.LogAudit(c, h.testRepo, "update_subscription_status", "subscription", subID, "", fmt.Sprintf(`{"status": %q, "extend_days": %d}`, req.Status, req.ExtendDays))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Revoke handles DELETE /api/admin/subscriptions/:id/revoke
func (h *AdminSubscriptionHandler) Revoke(c *gin.Context) {
	subID := c.Param("id")
	reason := c.Query("reason")
	if reason == "" {
		reason = "Dicabut oleh administrator"
	}

	err := h.subRepo.RevokeSubscription(c.Request.Context(), subID, &reason)
	if err != nil {
		log.Printf("[AdminSubscriptionHandler.Revoke] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencabut akses langganan."})
		return
	}

	helpers.LogAudit(c, h.testRepo, "revoke_subscription", "subscription", subID, "", fmt.Sprintf(`{"status": "revoked", "reason": %q}`, reason))
	c.JSON(http.StatusOK, gin.H{"success": true})
}
