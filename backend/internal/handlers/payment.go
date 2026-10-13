package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"testhub/internal/models"
	"testhub/internal/repository"
	"testhub/internal/validator"
)

type PaymentHandler struct {
	subRepo  repository.SubscriptionRepository
	testRepo repository.TestRepository
}

func NewPaymentHandler(subRepo repository.SubscriptionRepository, testRepo repository.TestRepository) *PaymentHandler {
	return &PaymentHandler{
		subRepo:  subRepo,
		testRepo: testRepo,
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

	orderID := fmt.Sprintf("INV-%d-%s", time.Now().Unix(), uuid.New().String()[:6])
	now := time.Now()
	expiresAt := now.Add(15 * time.Minute)

	// QRIS simulation string (Standard EMVCo format simulator)
	qrPayload := fmt.Sprintf("00020101021226580016ID.TESTHUB.WWW0118936009180000000000520458125303360540%d5802ID5911TESTHUB_SaaS6007JAKARTA62190115%s6304ABCD", int(amount), orderID)
	snapToken := fmt.Sprintf("snap_%s_%s", orderID, uuid.New().String()[:8])

	order := models.Order{
		ID:               orderID,
		UserEmail:        req.UserEmail,
		TestID:           req.TestID,
		PlanType:         req.PlanType,
		Amount:           amount,
		Status:           "pending",
		PaymentMethod:    "qris",
		PaymentReference: "",
		SnapToken:        snapToken,
		QRPayload:        qrPayload,
		ExpiresAt:        &expiresAt,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := h.subRepo.CreateOrder(c.Request.Context(), &order); err != nil {
		log.Printf("[PaymentHandler.CreateInvoice] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat invoice pembayaran."})
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
	var req models.PaymentWebhookDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format webhook tidak valid"})
		return
	}

	log.Printf("[PaymentHandler.Webhook] Received notification for OrderID: %s, Status: %s", req.OrderID, req.TransactionStatus)

	if req.TransactionStatus == "settlement" || req.TransactionStatus == "capture" || req.TransactionStatus == "success" {
		ref := req.SignatureKey
		if ref == "" {
			ref = "SIMULATED_GATEWAY_SETTLEMENT"
		}

		sub, err := h.subRepo.SettleOrder(c.Request.Context(), req.OrderID, ref)
		if err != nil {
			log.Printf("[PaymentHandler.Webhook] Failed to settle order %s: %v", req.OrderID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses settlement order"})
			return
		}

		log.Printf("[PaymentHandler.Webhook] Order %s successfully settled! Activated Subscription ID: %s", req.OrderID, sub.ID)
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

	c.JSON(http.StatusOK, gin.H{"success": true})
}
