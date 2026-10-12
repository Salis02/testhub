package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"

	"testhub/internal/config"
	"testhub/internal/database"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")

	cfg := config.LoadConfig()
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		migrationsDir = filepath.Join("..", "migrations")
	}

	log.Printf("Executing migrations from %s...", migrationsDir)
	if err := db.RunMigrations(migrationsDir); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("Migrations completed successfully.")
}
