package tests

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMediaUploadFlow(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

	// 1. Upload valid 1x1 PNG image
	pngBytes := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
		0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
		0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "diagram_soal.png")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, _ = part.Write(pngBytes)
	_ = writer.Close()

	reqUpload, _ := http.NewRequest("POST", "/api/admin/upload-media", body)
	reqUpload.Header.Set("Content-Type", writer.FormDataContentType())
	reqUpload.Header.Set("Authorization", "Bearer "+token)
	wUpload := httptest.NewRecorder()
	router.ServeHTTP(wUpload, reqUpload)

	if wUpload.Code != http.StatusCreated {
		t.Fatalf("Upload media failed with status %d: %s", wUpload.Code, wUpload.Body.String())
	}

	var uploadResp struct {
		URL string `json:"url"`
	}
	_ = json.Unmarshal(wUpload.Body.Bytes(), &uploadResp)
	if uploadResp.URL == "" {
		t.Fatalf("Expected url in upload response")
	}

	// 2. Test static file serving of the uploaded media
	reqStatic, _ := http.NewRequest("GET", uploadResp.URL, nil)
	wStatic := httptest.NewRecorder()
	router.ServeHTTP(wStatic, reqStatic)

	if wStatic.Code != http.StatusOK {
		t.Fatalf("Failed to serve static uploaded media from %s: status %d", uploadResp.URL, wStatic.Code)
	}

	// 3. Test upload invalid file (plain text script)
	invalidBody := &bytes.Buffer{}
	invalidWriter := multipart.NewWriter(invalidBody)
	invalidPart, _ := invalidWriter.CreateFormFile("file", "exploit.jpg")
	_, _ = invalidPart.Write([]byte("<?php echo 'malicious script'; ?>"))
	_ = invalidWriter.Close()

	reqInvalid, _ := http.NewRequest("POST", "/api/admin/upload-media", invalidBody)
	reqInvalid.Header.Set("Content-Type", invalidWriter.FormDataContentType())
	reqInvalid.Header.Set("Authorization", "Bearer "+token)
	wInvalid := httptest.NewRecorder()
	router.ServeHTTP(wInvalid, reqInvalid)

	if wInvalid.Code != http.StatusBadRequest {
		t.Fatalf("Expected malicious file to be rejected with 400, got: %d", wInvalid.Code)
	}
}
