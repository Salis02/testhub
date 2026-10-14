package handlers

import (
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/middleware"
	"testhub/internal/repository"
	"testhub/internal/services"
)

func SetupRouter(db *database.DB, cacheClient *cache.Client, cfg *config.Config) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":      "ok",
			"environment": cfg.Environment,
			"timestamp":   time.Now().Format(time.RFC3339),
		})
	})

	// Initialize Local Storage Provider (Search candidate directories)
	candidateUploadDirs := []string{"uploads", filepath.Join("..", "uploads"), filepath.Join("backend", "uploads")}
	uploadBaseDir := "uploads"
	for _, dir := range candidateUploadDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			uploadBaseDir = dir
			break
		}
	}
	_ = os.MkdirAll(filepath.Join(uploadBaseDir, "questions"), 0755)

	storage, err := services.NewLocalStorageProvider(filepath.Join(uploadBaseDir, "questions"), "/uploads/questions", 2*1024*1024)
	if err != nil {
		log.Printf("[Server] Warning: Failed to init storage provider: %v", err)
	}

	testRepo := repository.NewPostgresTestRepository(db)
	examRepo := repository.NewPostgresExamRepository(db)
	subRepo := repository.NewPostgresSubscriptionRepository(db)

	authHandler := NewAuthHandler(db, cfg)
	publicHandler := NewPublicHandler(examRepo, subRepo, testRepo, cacheClient)
	adminHandler := NewAdminHandler(db, testRepo)
	paymentGateway := services.NewPaymentGatewayProvider(cfg)
	paymentHandler := NewPaymentHandler(subRepo, testRepo, paymentGateway)
	adminSubHandler := NewAdminSubscriptionHandler(subRepo, testRepo)
	mediaHandler := NewMediaHandler(storage)
	aiService := services.NewAIAgentService(cfg)
	aiHandler := NewAIHandler(aiService)

	// Serve Static Media Uploads (Fast & Cacheable)
	router.Static("/uploads", uploadBaseDir)

	api := router.Group("/api")
	{
		// =========================================================================
		// 1. PUBLIC ROLE ENDPOINTS (Unauthenticated examinees & visitors)
		// =========================================================================

		// Public Authentication & Identification
		auth := api.Group("/auth")
		{
			auth.POST("/register", middleware.RateLimit(cacheClient, 20, time.Minute, "register"), authHandler.Register)
			auth.POST("/login", middleware.RateLimit(cacheClient, 30, time.Minute, "login"), authHandler.Login)
			auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authHandler.Me) // Backward-compatible alias
		}

		// Public Test Discovery & Leaderboard
		tests := api.Group("/tests")
		{
			tests.GET("", publicHandler.ListTests)
			tests.GET("/:testId", publicHandler.GetTest)
			tests.GET("/:testId/leaderboard", publicHandler.GetLeaderboard)
			tests.POST("/:testId/start", middleware.OptionalAuth(cfg.JWTSecret), middleware.RateLimit(cacheClient, 10, time.Minute, "start_test"), publicHandler.StartTest)
		}

		// Public Test Session Engine (Frictionless Exam Taking)
		sessions := api.Group("/sessions")
		{
			sessions.GET("/:sessionId/questions", publicHandler.GetQuestions)
			sessions.GET("/:sessionId/submissions", publicHandler.GetSubmissions)
			sessions.POST("/:sessionId/submit-answer", publicHandler.SubmitAnswer)
			sessions.POST("/:sessionId/questions/:questionId/submit", publicHandler.SubmitAnswer)
			sessions.POST("/:sessionId/finish", middleware.OptionalAuth(cfg.JWTSecret), publicHandler.FinishTest)
		}

		// Public Test Results & Verification Certificates
		results := api.Group("/results")
		{
			results.GET("/:resultId", publicHandler.GetResult)
			results.GET("/:resultId/certificate", publicHandler.GetCertificate)
		}

		verify := api.Group("/verify")
		{
			verify.GET("/certificate/:certificateId", publicHandler.VerifyCertificate)
		}

		// Public Payment Gateway (Invoicing, Polling, & Webhooks)
		payments := api.Group("/payments")
		{
			payments.POST("/create-invoice", middleware.OptionalAuth(cfg.JWTSecret), middleware.RateLimit(cacheClient, 15, time.Minute, "create_invoice"), paymentHandler.CreateInvoice)
			payments.GET("/status/:orderId", paymentHandler.GetOrderStatus)
			payments.POST("/webhook", paymentHandler.HandleWebhook)
		}

		// Public AI Assistance
		ai := api.Group("/ai")
		{
			ai.POST("/generate-questions", aiHandler.GenerateQuestions)
		}

		// =========================================================================
		// 2. USER ROLE ENDPOINTS (Authenticated Examinees / Students)
		// =========================================================================
		user := api.Group("/user")
		user.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			user.GET("/me", authHandler.Me)
			user.GET("/subscriptions", paymentHandler.GetUserSubscriptions)
		}

		// =========================================================================
		// 3. ADMIN & CREATOR ROLE ENDPOINTS (Admin & Platform Managers)
		// =========================================================================
		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired(cfg.JWTSecret))
		admin.Use(middleware.RequireAdmin())
		{
			// Dashboard & Analytics
			admin.GET("/stats", adminHandler.GetStats)
			admin.GET("/tests/:testId/analytics", adminHandler.GetAnalytics)

			// Test & Question Bank Management
			admin.GET("/tests", adminHandler.ListTests)
			admin.POST("/tests", adminHandler.CreateTest)
			admin.GET("/tests/:testId", adminHandler.GetTest)
			admin.PUT("/tests/:testId", adminHandler.UpdateTest)
			admin.POST("/tests/:testId/toggle-publish", adminHandler.TogglePublish)
			admin.PATCH("/tests/:testId/toggle-publish", adminHandler.TogglePublish)
			admin.POST("/tests/:testId/publish", adminHandler.TogglePublish)
			admin.DELETE("/tests/:testId", adminHandler.DeleteTest)

			// Essay Manual Grading
			admin.GET("/essays", adminHandler.GetPendingEssays)
			admin.POST("/essays/:essayId/grade", adminHandler.GradeEssay)

			// Media Uploads
			admin.POST("/upload-media", mediaHandler.UploadMedia)
			admin.DELETE("/media", mediaHandler.DeleteMedia)

			// Subscription Management & Manual Overrides
			admin.GET("/subscriptions", adminSubHandler.ListSubscriptions)
			admin.POST("/subscriptions/manual-grant", adminSubHandler.ManualGrant)
			admin.PUT("/subscriptions/:id/status", adminSubHandler.UpdateStatus)
			admin.DELETE("/subscriptions/:id/revoke", adminSubHandler.Revoke)
		}
	}

	return router
}
