package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/handlers"
)

func main() {
	// Load .env if present
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")

	cfg := config.LoadConfig()

	log.Printf("[Server] Initializing TestHub backend in %s environment...", cfg.Environment)

	// Connect to Database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("[Server] Database connection failed: %v", err)
	}
	defer db.Close()
	log.Printf("[Server] Database connected successfully to %s:%d/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)

	// Run migrations automatically
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		migrationsDir = filepath.Join("..", "migrations")
	}
	if err := db.RunMigrations(migrationsDir); err != nil {
		log.Printf("[Server] Warning during auto-migration: %v", err)
	}

	// Connect to Cache
	cacheClient := cache.New(cfg.RedisURL, cfg.RedisPassword)

	// Setup Router
	router := handlers.SetupRouter(db, cacheClient, cfg)

	log.Printf("[Server] TestHub REST API server running on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("[Server] Failed to run server: %v", err)
	}
}
