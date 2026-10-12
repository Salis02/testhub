package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrFileTooLarge     = errors.New("ukuran file melebihi batas maksimal (2MB)")
	ErrInvalidFileType  = errors.New("tipe file tidak diizinkan: hanya gambar JPEG, PNG, WebP, GIF, dan SVG yang didukung")
	ErrMagicBytesFailed = errors.New("header konten file tidak sesuai dengan format gambar yang valid")
)

// Allowed MIME types mapped to standard extensions
var allowedMIMETypes = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/gif":     ".gif",
	"image/svg+xml": ".svg",
}

// StorageProvider defines the flexible interface for file storage.
// Currently: LocalStorageProvider. Future: S3StorageProvider (AWS / Cloudflare R2 / MinIO).
type StorageProvider interface {
	Upload(ctx context.Context, file io.Reader, originalFilename string, declaredContentType string) (publicURL string, err error)
	Delete(ctx context.Context, fileURL string) error
}

// LocalStorageProvider implements StorageProvider for VPS local filesystem storage
type LocalStorageProvider struct {
	baseDir string // e.g. "uploads/questions"
	baseURL string // e.g. "/uploads/questions"
	maxSize int64  // in bytes (e.g. 2 * 1024 * 1024)
}

// NewLocalStorageProvider creates a new LocalStorageProvider instance
func NewLocalStorageProvider(baseDir, baseURL string, maxSizeBytes int64) (*LocalStorageProvider, error) {
	if maxSizeBytes <= 0 {
		maxSizeBytes = 2 * 1024 * 1024 // 2MB default
	}

	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("gagal membuat direktori upload %s: %w", baseDir, err)
	}

	return &LocalStorageProvider{
		baseDir: baseDir,
		baseURL: strings.TrimSuffix(baseURL, "/"),
		maxSize: maxSizeBytes,
	}, nil
}

// Upload validates, sniffs magic bytes, sanitizes filename to UUID, and saves the file locally
func (s *LocalStorageProvider) Upload(ctx context.Context, file io.Reader, originalFilename string, declaredContentType string) (string, error) {
	// 1. Read first 512 bytes for MIME type sniffing (magic bytes validation)
	headerBuf := make([]byte, 512)
	n, err := file.Read(headerBuf)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("gagal membaca header file: %w", err)
	}

	detectedMIME := http.DetectContentType(headerBuf[:n])

	// Special check for SVG which DetectContentType can identify as text/plain or text/xml
	if strings.Contains(detectedMIME, "text/") && strings.HasSuffix(strings.ToLower(originalFilename), ".svg") {
		contentSample := string(headerBuf[:n])
		if strings.Contains(contentSample, "<svg") || strings.Contains(contentSample, "<?xml") {
			detectedMIME = "image/svg+xml"
		}
	}

	ext, isAllowed := allowedMIMETypes[detectedMIME]
	if !isAllowed {
		// Detect WebP files starting with RIFF ... WEBP
		if strings.Contains(strings.ToLower(declaredContentType), "webp") && strings.HasPrefix(string(headerBuf[:n]), "RIFF") {
			detectedMIME = "image/webp"
			ext = ".webp"
		} else {
			return "", fmt.Errorf("%w (terdeteksi: %s)", ErrInvalidFileType, detectedMIME)
		}
	}

	// 2. Generate secure random UUID filename to completely eliminate path traversal and collisions
	uniqueID := uuid.New().String()
	sanitizedFilename := fmt.Sprintf("img_%s%s", uniqueID, ext)
	targetPath := filepath.Join(s.baseDir, sanitizedFilename)

	// 3. Create destination file
	out, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return "", fmt.Errorf("gagal membuat file tujuan: %w", err)
	}
	defer out.Close()

	// 4. Write sniffed header first
	if _, err := out.Write(headerBuf[:n]); err != nil {
		_ = os.Remove(targetPath)
		return "", fmt.Errorf("gagal menulis header file: %w", err)
	}

	// 5. Copy remaining stream with Size Limit guard
	limitReader := io.LimitReader(file, s.maxSize-int64(n)+1)
	written, err := io.Copy(out, limitReader)
	if err != nil {
		_ = os.Remove(targetPath)
		return "", fmt.Errorf("gagal menulis konten file: %w", err)
	}

	if written+int64(n) > s.maxSize {
		_ = os.Remove(targetPath)
		return "", ErrFileTooLarge
	}

	publicURL := fmt.Sprintf("%s/%s", s.baseURL, sanitizedFilename)
	return publicURL, nil
}

// Delete removes a stored file by public URL path safely without directory traversal
func (s *LocalStorageProvider) Delete(ctx context.Context, fileURL string) error {
	filename := filepath.Base(fileURL)
	if filename == "." || filename == "/" || filename == "" {
		return errors.New("url file tidak valid")
	}

	targetPath := filepath.Join(s.baseDir, filename)

	// Ensure target path is strictly within baseDir (anti-traversal)
	cleanPath := filepath.Clean(targetPath)
	cleanBase := filepath.Clean(s.baseDir)
	if !strings.HasPrefix(cleanPath, cleanBase) {
		return errors.New("akses ditolak: indikasi path traversal")
	}

	if err := os.Remove(cleanPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("gagal menghapus file: %w", err)
	}
	return nil
}
