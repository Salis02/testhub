package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"testhub/internal/config"
)

var (
	ErrInvalidGoogleToken       = errors.New("kredensial Google tidak valid atau telah kedaluwarsa")
	ErrUnverifiedGoogleEmail    = errors.New("email Google belum diverifikasi")
	ErrGoogleAudienceMismatch   = errors.New("client ID Google tidak cocok")
	ErrGoogleServiceUnavailable = errors.New("gagal menghubungi server verifikasi Google")
)

type GoogleTokenInfo struct {
	Sub           string `json:"sub"`
	Aud           string `json:"aud"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

type GoogleOAuthProvider interface {
	VerifyIDToken(ctx context.Context, idToken string) (*GoogleTokenInfo, error)
}

type GoogleOAuthService struct {
	cfg    *config.Config
	client *http.Client
}

func NewGoogleOAuthService(cfg *config.Config) *GoogleOAuthService {
	return &GoogleOAuthService{
		cfg: cfg,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (s *GoogleOAuthService) VerifyIDToken(ctx context.Context, idToken string) (*GoogleTokenInfo, error) {
	idToken = strings.TrimSpace(idToken)
	if idToken == "" {
		return nil, ErrInvalidGoogleToken
	}

	// Support mock token for test/local environments
	if strings.HasPrefix(idToken, "mock-google-token:") {
		parts := strings.Split(idToken, ":")
		if len(parts) >= 3 {
			email := strings.ToLower(strings.TrimSpace(parts[1]))
			name := strings.TrimSpace(parts[2])
			return &GoogleTokenInfo{
				Sub:           "mock-google-sub-" + email,
				Aud:           s.cfg.GoogleClientID,
				Email:         email,
				EmailVerified: "true",
				Name:          name,
			}, nil
		}
		return nil, ErrInvalidGoogleToken
	}

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create google request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrGoogleServiceUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrInvalidGoogleToken
	}

	var info GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("decode google response: %w", err)
	}

	if info.EmailVerified != "true" && info.EmailVerified != "1" {
		return nil, ErrUnverifiedGoogleEmail
	}

	if s.cfg.GoogleClientID != "" && info.Aud != s.cfg.GoogleClientID {
		return nil, ErrGoogleAudienceMismatch
	}

	info.Email = strings.ToLower(strings.TrimSpace(info.Email))
	info.Name = strings.TrimSpace(info.Name)
	if info.Name == "" && info.Email != "" {
		info.Name = strings.Split(info.Email, "@")[0]
	}

	return &info, nil
}
