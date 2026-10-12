package handlers

import (
	"time"

	"github.com/gin-gonic/gin"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/middleware"
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

	authHandler := NewAuthHandler(db, cfg)
	publicHandler := NewPublicHandler(db, cacheClient)
	adminHandler := NewAdminHandler(db)
	aiService := services.NewAIAgentService()
	aiHandler := NewAIHandler(aiService)

	api := router.Group("/api")
	{
		// Auth Endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/register", middleware.RateLimit(cacheClient, 20, time.Minute, "register"), authHandler.Register)
			auth.POST("/login", middleware.RateLimit(cacheClient, 30, time.Minute, "login"), authHandler.Login)
			auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authHandler.Me)
		}

		// Public Test Taking Endpoints
		tests := api.Group("/tests")
		{
			tests.GET("", publicHandler.ListTests)
			tests.GET("/:testId", publicHandler.GetTest)
			tests.POST("/:testId/start", middleware.RateLimit(cacheClient, 10, time.Minute, "start_test"), publicHandler.StartTest)
		}

		sessions := api.Group("/sessions")
		{
			sessions.GET("/:sessionId/questions", publicHandler.GetQuestions)
			sessions.GET("/:sessionId/submissions", publicHandler.GetSubmissions)
			sessions.POST("/:sessionId/submit-answer", publicHandler.SubmitAnswer)
			sessions.POST("/:sessionId/questions/:questionId/submit", publicHandler.SubmitAnswer)
			sessions.POST("/:sessionId/finish", publicHandler.FinishTest)
		}

		results := api.Group("/results")
		{
			results.GET("/:resultId", publicHandler.GetResult)
		}

		// AI Assistant
		ai := api.Group("/ai")
		{
			ai.POST("/generate-questions", aiHandler.GenerateQuestions)
		}

		// Admin & Creator Protected Endpoints
		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired(cfg.JWTSecret))
		admin.Use(middleware.RequireAdmin())
		{
			admin.GET("/stats", adminHandler.GetStats)
			admin.GET("/tests", adminHandler.ListTests)
			admin.POST("/tests", adminHandler.CreateTest)
			admin.POST("/tests/:testId/toggle-publish", adminHandler.TogglePublish)
			admin.PATCH("/tests/:testId/toggle-publish", adminHandler.TogglePublish)
			admin.POST("/tests/:testId/publish", adminHandler.TogglePublish)
			admin.DELETE("/tests/:testId", adminHandler.DeleteTest)
			admin.GET("/tests/:testId/analytics", adminHandler.GetAnalytics)
			admin.GET("/essays", adminHandler.GetPendingEssays)
			admin.POST("/essays/:essayId/grade", adminHandler.GradeEssay)
		}
	}

	return router
}
