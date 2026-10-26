package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/helpers"
	"testhub/internal/middleware"
	"testhub/internal/models"
	"testhub/internal/repository"
	"testhub/internal/services"
)

type AuthHandler struct {
	db          *database.DB
	cfg         *config.Config
	testRepo    repository.TestRepository
	userRepo    repository.UserRepository
	googleOAuth services.GoogleOAuthProvider
	cache       *cache.Client
}

func NewAuthHandler(
	db *database.DB,
	cfg *config.Config,
	testRepo repository.TestRepository,
	userRepo repository.UserRepository,
	googleOAuth services.GoogleOAuthProvider,
	cacheClient ...*cache.Client,
) *AuthHandler {
	var cClient *cache.Client
	if len(cacheClient) > 0 {
		cClient = cacheClient[0]
	}
	return &AuthHandler{
		db:          db,
		cfg:         cfg,
		testRepo:    testRepo,
		userRepo:    userRepo,
		googleOAuth: googleOAuth,
		cache:       cClient,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid: " + err.Error()})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check if email already registered via UserRepository
	existing, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err == nil && existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email sudah terdaftar"})
		return
	} else if err != nil && !errors.Is(err, repository.ErrUserNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kesalahan database"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengenkripsi kata sandi"})
		return
	}

	// Public registration only allows "creator" role; admin privileges cannot be self-assigned
	role := "creator"
	user := models.User{
		ID:               uuid.New().String(),
		Email:            req.Email,
		PasswordHash:     string(hashedPassword),
		FullName:         strings.TrimSpace(req.FullName),
		Role:             role,
		SubscriptionTier: "free",
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := h.userRepo.Create(c.Request.Context(), &user); err != nil {
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

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
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

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req models.GoogleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kredensial Google wajib disertakan"})
		return
	}

	// 1. Delegate external token verification & claims extraction to GoogleOAuthProvider service
	tokenInfo, err := h.googleOAuth.VerifyIDToken(c.Request.Context(), req.Credential)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidGoogleToken), errors.Is(err, services.ErrGoogleAudienceMismatch):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUnverifiedGoogleEmail):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrGoogleServiceUnavailable):
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Autentikasi Google gagal: " + err.Error()})
		}
		return
	}

	// 2. Fetch or provision user through UserRepository
	user, err := h.userRepo.GetByEmail(c.Request.Context(), tokenInfo.Email)
	if err != nil {
		if !errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kesalahan database saat memeriksa akun"})
			return
		}

		// Auto-register new user via Google
		role := req.Role
		if role != "creator" && role != "user" {
			role = "creator"
		}

		user = &models.User{
			ID:               uuid.New().String(),
			Email:            tokenInfo.Email,
			PasswordHash:     "$oauth$google$" + tokenInfo.Sub,
			FullName:         tokenInfo.Name,
			Role:             role,
			SubscriptionTier: "free",
			IsActive:         true,
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}

		if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat akun pengguna Google: " + err.Error()})
			return
		}

		helpers.LogAudit(c, h.testRepo, "auth_registered_google", "user", user.ID, "", fmt.Sprintf(`{"email": %q, "role": %q}`, user.Email, user.Role))
	} else {
		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akun Anda telah dinonaktifkan. Silakan hubungi administrator."})
			return
		}

		// Refresh name if empty
		if user.FullName == "" && tokenInfo.Name != "" {
			user.FullName = tokenInfo.Name
			user.UpdatedAt = time.Now()
			_ = h.userRepo.Update(c.Request.Context(), user)
		}
	}

	// 3. Issue JWT Access & Refresh Tokens
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry, "access")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi token"})
		return
	}

	refreshToken, _ := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.RefreshTokenExpiry, "refresh")

	helpers.LogAudit(c, h.testRepo, "auth_google_login_success", "user", user.ID, "", fmt.Sprintf(`{"email": %q, "role": %q}`, user.Email, user.Role))

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

	// Check if refresh token has been revoked
	if middleware.IsTokenBlacklisted(c.Request.Context(), h.cache, req.RefreshToken) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token telah dicabut atau sudah digunakan"})
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

	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
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

	// Refresh Token Rotation: invalidate previous refresh token
	if claims.ExpiresAt != nil {
		_ = middleware.BlacklistToken(c.Request.Context(), h.cache, req.RefreshToken, claims.ExpiresAt.Time)
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		UserID:       user.ID,
		Email:        user.Email,
		FullName:     user.FullName,
		Role:         user.Role,
		Token:        newToken,
		RefreshToken: newRefreshToken,
	})
}

// Logout invalidates the active access token and refresh token in Redis
func (h *AuthHandler) Logout(c *gin.Context) {
	// 1. Blacklist current Bearer access token
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &middleware.Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(h.cfg.JWTSecret), nil
		})
		if err == nil && token.Valid && claims.ExpiresAt != nil {
			_ = middleware.BlacklistToken(c.Request.Context(), h.cache, tokenStr, claims.ExpiresAt.Time)
		}
	}

	// 2. Blacklist refresh token if provided
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.RefreshToken != "" {
		claims := &middleware.Claims{}
		token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(h.cfg.JWTSecret), nil
		})
		if err == nil && token.Valid && claims.ExpiresAt != nil {
			_ = middleware.BlacklistToken(c.Request.Context(), h.cache, req.RefreshToken, claims.ExpiresAt.Time)
		}
	}

	helpers.LogAudit(c, h.testRepo, "auth_logout", "user", "", "", `{"action": "token_invalidated"}`)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Berhasil logout, token telah dinonaktifkan."})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tidak terautentikasi"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID.(string))
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
