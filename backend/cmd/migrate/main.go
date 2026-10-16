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

	action := "up"
	if len(os.Args) > 1 {
		action = os.Args[1]
	}

	switch action {
	case "down", "drop", "reset":
		log.Println("Rolling back / dropping all database tables...")
		if err := db.DropAllTables(); err != nil {
			log.Fatalf("Rollback failed: %v", err)
		}
		log.Println("Database tables dropped successfully.")
	case "fresh", "refresh":
		log.Println("Refreshing database (dropping and re-running all migrations)...")
		if err := db.DropAllTables(); err != nil {
			log.Fatalf("Failed to drop tables: %v", err)
		}
		log.Printf("Executing migrations from %s...", migrationsDir)
		if err := db.RunMigrations(migrationsDir); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		log.Println("Database migrations refreshed successfully.")
	case "up":
		log.Printf("Executing migrations from %s...", migrationsDir)
		if err := db.RunMigrations(migrationsDir); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		log.Println("Migrations completed successfully.")
	default:
		log.Fatalf("Unknown migration action '%s'. Supported commands: up, down, fresh", action)
	}
}

