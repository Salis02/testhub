package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"testhub/internal/helpers"
	"testhub/internal/repository"
	"testhub/internal/services"
)

type MediaHandler struct {
	storage  services.StorageProvider
	testRepo repository.TestRepository
}

func NewMediaHandler(storage services.StorageProvider, testRepo repository.TestRepository) *MediaHandler {
	return &MediaHandler{
		storage:  storage,
		testRepo: testRepo,
	}
}

// UploadMedia handles POST /api/admin/upload-media
func (h *MediaHandler) UploadMedia(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File gambar wajib dilampirkan dengan parameter form 'file': " + err.Error()})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuka file yang diunggah: " + err.Error()})
		return
	}
	defer file.Close()

	publicURL, err := h.storage.Upload(c.Request.Context(), file, fileHeader.Filename, fileHeader.Header.Get("Content-Type"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	helpers.LogAudit(c, h.testRepo, "upload_media", "media", publicURL, "", fmt.Sprintf(`{"filename": %q, "size_bytes": %d, "content_type": %q}`, fileHeader.Filename, fileHeader.Size, fileHeader.Header.Get("Content-Type")))

	c.JSON(http.StatusCreated, gin.H{
		"url":          publicURL,
		"filename":     fileHeader.Filename,
		"size_bytes":   fileHeader.Size,
		"content_type": fileHeader.Header.Get("Content-Type"),
	})
}

// DeleteMedia handles DELETE /api/admin/media
func (h *MediaHandler) DeleteMedia(c *gin.Context) {
	urlParam := c.Query("url")
	if urlParam == "" {
		var req struct {
			URL string `json:"url"`
		}
		if err := c.ShouldBindJSON(&req); err == nil {
			urlParam = req.URL
		}
	}

	if urlParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL file yang akan dihapus wajib disertakan"})
		return
	}

	if err := h.storage.Delete(c.Request.Context(), urlParam); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus file: " + err.Error()})
		return
	}

	helpers.LogAudit(c, h.testRepo, "delete_media", "media", urlParam, "", fmt.Sprintf(`{"url": %q}`, urlParam))

	c.JSON(http.StatusOK, gin.H{"success": true})
}
