package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"testhub/internal/cache"
)

type Claims struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	TokenType string `json:"token_type,omitempty"` // "access" or "refresh"
	jwt.RegisteredClaims
}

func TokenHash(tokenStr string) string {
	hash := sha256.Sum256([]byte(tokenStr))
	return hex.EncodeToString(hash[:])
}

func IsTokenBlacklisted(ctx context.Context, cc *cache.Client, tokenStr string) bool {
	if cc == nil || tokenStr == "" {
		return false
	}
	key := "blacklist:token:" + TokenHash(tokenStr)
	var dummy string
	err := cc.Get(key, &dummy)
	return err == nil
}

func BlacklistToken(ctx context.Context, cc *cache.Client, tokenStr string, expiresAt time.Time) error {
	if cc == nil || tokenStr == "" {
		return nil
	}
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		return nil
	}
	key := "blacklist:token:" + TokenHash(tokenStr)
	return cc.Set(key, "revoked", ttl)
}

func GenerateToken(userID, email, role, secret string, expiry time.Duration, tokenType ...string) (string, error) {
	tType := "access"
	if len(tokenType) > 0 && tokenType[0] != "" {
		tType = tokenType[0]
	}
	claims := Claims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		TokenType: tType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func AuthRequired(secret string, cacheClient ...*cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenStr := parts[1]

		// Check if token was revoked via logout
		if len(cacheClient) > 0 && cacheClient[0] != nil {
			if IsTokenBlacklisted(c.Request.Context(), cacheClient[0], tokenStr) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi telah berakhir (token telah di-logout)"})
				c.Abort()
				return
			}
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired authorization token"})
			c.Abort()
			return
		}

		if claims.TokenType == "refresh" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token cannot be used for API access"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// RequireAdmin restricts access strictly to users with "admin" role
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Hanya Administrator yang berwenang"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireCreatorOrAdmin allows either creator or administrator
func RequireCreatorOrAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || (role != "admin" && role != "creator") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Memerlukan akses Pengajar atau Administrator"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// OptionalAuth extracts JWT claims if the Authorization header is present and valid.
// If the token is absent or invalid, it does not abort, allowing guests to proceed.
func OptionalAuth(secret string, cacheClient ...*cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenStr := parts[1]

		if len(cacheClient) > 0 && cacheClient[0] != nil {
			if IsTokenBlacklisted(c.Request.Context(), cacheClient[0], tokenStr) {
				c.Next()
				return
			}
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		})

		if err == nil && token.Valid && claims.TokenType != "refresh" {
			c.Set("user_id", claims.UserID)
			c.Set("userID", claims.UserID)
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
		}

		c.Next()
	}
}

