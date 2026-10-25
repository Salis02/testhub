package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/helpers"
	"testhub/internal/middleware"
	"testhub/internal/models"
	"testhub/internal/repository"
)

type AuthHandler struct {
	db       *database.DB
	cfg      *config.Config
	testRepo repository.TestRepository
}

func NewAuthHandler(db *database.DB, cfg *config.Config, testRepo repository.TestRepository) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg, testRepo: testRepo}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid: " + err.Error()})
		return
	}

	// Normalize email to lowercase and trim whitespace
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check if email already registered
	var existingEmail string
	err := h.db.Get(&existingEmail, "SELECT email FROM users WHERE email = $1", req.Email)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email sudah terdaftar"})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kesalahan database"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengenkripsi kata sandi"})
		return
	}

	// Public registration only allows "creator" role; admin privileges cannot be self-assigned
	role := "creator"

	userID := uuid.New().String()
	user := models.User{
		ID:               userID,
		Email:            req.Email,
		PasswordHash:     string(hashedPassword),
		FullName:         strings.TrimSpace(req.FullName),
		Role:             role,
		SubscriptionTier: "free",
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	query := `
		INSERT INTO users (id, email, password_hash, full_name, role, subscription_tier, is_active, created_at, updated_at)
		VALUES (:id, :email, :password_hash, :full_name, :role, :subscription_tier, :is_active, :created_at, :updated_at)
	`
	_, err = h.db.NamedExec(query, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan pengguna: " + err.Error()})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry, "access")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi token"})
		return
	}

	refreshToken, _ := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.RefreshTokenExpiry, "refresh")

	helpers.LogAudit(c, h.testRepo, "auth_registered", "user", user.ID, "", fmt.Sprintf(`{"email": %q, "role": %q}`, user.Email, user.Role))

	c.JSON(http.StatusCreated, models.AuthResponse{
		UserID:       user.ID,
		Email:        user.Email,
		FullName:     user.FullName,
		Role:         user.Role,
		Token:        token,
		RefreshToken: refreshToken,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid: " + err.Error()})
		return
	}

	// Normalize email to lowercase and trim whitespace
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	err := h.db.Get(&user, "SELECT * FROM users WHERE email = $1", req.Email)
	if err != nil {
		// Equalize CPU response timing against timing side-channel email enumeration
		_ = bcrypt.CompareHashAndPassword([]byte("$2a$10$dummyHashToEqualizeTimingExecutionTime1234567890"), []byte(req.Password))
		helpers.LogAudit(c, h.testRepo, "auth_login_failed", "user", "", "", fmt.Sprintf(`{"attempted_email": %q, "reason": "user_not_found"}`, req.Email))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak cocok"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		helpers.LogAudit(c, h.testRepo, "auth_login_failed", "user", user.ID, "", fmt.Sprintf(`{"attempted_email": %q, "reason": "invalid_password"}`, req.Email))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak cocok"})
		return
	}

	if !user.IsActive {
		helpers.LogAudit(c, h.testRepo, "auth_login_suspended", "user", user.ID, "", fmt.Sprintf(`{"attempted_email": %q, "reason": "account_suspended"}`, req.Email))
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun Anda telah dinonaktifkan. Silakan hubungi administrator."})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry, "access")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi token"})
		return
	}

	refreshToken, _ := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.RefreshTokenExpiry, "refresh")

	helpers.LogAudit(c, h.testRepo, "auth_login_success", "user", user.ID, "", fmt.Sprintf(`{"email": %q, "role": %q}`, user.Email, user.Role))

	c.JSON(http.StatusOK, models.AuthResponse{
		UserID:       user.ID,
		Email:        user.Email,
		FullName:     user.FullName,
		Role:         user.Role,
		Token:        token,
		RefreshToken: refreshToken,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token wajib disertakan"})
		return
	}

	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(h.cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid || claims.TokenType != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token tidak valid atau telah kedaluwarsa"})
		return
	}

	var user models.User
	err = h.db.Get(&user, "SELECT * FROM users WHERE id = $1", claims.UserID)
	if err != nil || !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Pengguna tidak ditemukan atau telah dinonaktifkan"})
		return
	}

	newToken, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry, "access")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui sesi token"})
		return
	}

	newRefreshToken, _ := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.RefreshTokenExpiry, "refresh")

	c.JSON(http.StatusOK, models.AuthResponse{
		UserID:       user.ID,
		Email:        user.Email,
		FullName:     user.FullName,
		Role:         user.Role,
		Token:        newToken,
		RefreshToken: newRefreshToken,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tidak terautentikasi"})
		return
	}

	var user models.User
	err := h.db.Get(&user, "SELECT id, email, full_name, role, subscription_tier, is_active, created_at, updated_at FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun Anda telah dinonaktifkan"})
		return
	}

	c.JSON(http.StatusOK, user)
}
