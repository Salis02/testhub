package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/middleware"
	"testhub/internal/models"
)

type AuthHandler struct {
	db  *database.DB
	cfg *config.Config
}

func NewAuthHandler(db *database.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid: " + err.Error()})
		return
	}

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

	role := "creator"
	if req.Role == "admin" || req.Role == "creator" {
		role = req.Role
	}

	userID := uuid.New().String()
	user := models.User{
		ID:               userID,
		Email:            req.Email,
		PasswordHash:     string(hashedPassword),
		FullName:         req.FullName,
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

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi token"})
		return
	}

	refreshToken, _ := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.RefreshTokenExpiry)

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

	var user models.User
	err := h.db.Get(&user, "SELECT * FROM users WHERE email = $1", req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak cocok"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau kata sandi tidak cocok"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi token"})
		return
	}

	refreshToken, _ := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.RefreshTokenExpiry)

	c.JSON(http.StatusOK, models.AuthResponse{
		UserID:       user.ID,
		Email:        user.Email,
		FullName:     user.FullName,
		Role:         user.Role,
		Token:        token,
		RefreshToken: refreshToken,
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

	c.JSON(http.StatusOK, user)
}
