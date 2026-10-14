package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/handlers"
)

func main() {
	// Load .env if present
	_ = godotenv.Load()
	_ = godotenv.Load("backend/.env")
	_ = godotenv.Load("../.env")

	cfg := config.LoadConfig()

	log.Printf("[Server] Initializing TestHub backend in %s environment...", cfg.Environment)

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to Database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("[Server] Database connection failed: %v", err)
	}
	defer db.Close()
	log.Printf("[Server] Database connected successfully to %s:%d/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)

	// Run migrations automatically (search multiple candidate directories)
	candidateDirs := []string{
		"migrations",
		"backend/migrations",
		filepath.Join("..", "migrations"),
	}
	var migrationsDir string
	for _, dir := range candidateDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			migrationsDir = dir
			break
		}
	}

	if migrationsDir != "" {
		if err := db.RunMigrations(migrationsDir); err != nil {
			log.Printf("[Server] Warning during auto-migration: %v", err)
		} else {
			log.Printf("[Server] Auto-migrations verified from %s", migrationsDir)
		}
	} else {
		log.Printf("[Server] Notice: No migrations directory found in %v; skipping auto-migration", candidateDirs)
	}

	// Connect to Cache
	cacheClient := cache.New(cfg.RedisURL, cfg.RedisPassword)

	// Setup Router
	router := handlers.SetupRouter(db, cacheClient, cfg)

	// Configure HTTP server with production-grade timeouts
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in background goroutine
	go func() {
		log.Printf("[Server] TestHub REST API server running on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[Server] Failed to run server: %v", err)
		}
	}()

	// Wait for interrupt signal for Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	sig := <-quit
	log.Printf("[Server] Received shutdown signal: %v. Initiating graceful shutdown...", sig)

	// 10 second timeout for active requests (in-flight exam submissions, grading) to complete
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[Server] Server forced to shutdown: %v", err)
	}

	log.Println("[Server] Server exited cleanly.")
}
