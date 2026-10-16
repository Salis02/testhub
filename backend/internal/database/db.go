package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"testhub/internal/config"
)

type DB struct {
	*sqlx.DB
}

func New(cfg *config.Config) (*DB, error) {
	var dsn string
	if cfg.DBPassword != "" {
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
		)
	} else {
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s dbname=%s sslmode=%s",
			cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBName, cfg.DBSSLMode,
		)
	}

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	db.SetMaxOpenConns(cfg.DBPoolSize)
	db.SetMaxIdleConns(cfg.DBMaxIdle)
	db.SetConnMaxLifetime(15 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	return &DB{db.Unsafe()}, nil
}

func (db *DB) RunMigrations(migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("reading migrations directory: %w", err)
	}

	var sqlFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			sqlFiles = append(sqlFiles, entry.Name())
		}
	}
	sort.Strings(sqlFiles)

	for _, file := range sqlFiles {
		filePath := filepath.Join(migrationsDir, file)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", file, err)
		}

		log.Printf("[DB] Executing migration: %s", file)
		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("executing migration %s: %w", file, err)
		}
	}

	log.Printf("[DB] Successfully applied %d migrations", len(sqlFiles))
	return nil
}

func (db *DB) DropAllTables() error {
	query := `
		DROP TABLE IF EXISTS test_submissions, test_results, test_sessions, question_options, test_questions, subscriptions, orders, admin_audit_log, tests, users CASCADE;
	`
	log.Println("[DB] Dropping all database tables (CASCADE)...")
	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("drop tables failed: %w", err)
	}
	log.Println("[DB] All database tables dropped successfully.")
	return nil
}

