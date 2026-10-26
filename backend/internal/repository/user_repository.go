package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"testhub/internal/database"
	"testhub/internal/models"
)

var ErrUserNotFound = errors.New("pengguna tidak ditemukan")

// UserRepository defines the contract for user account management
type UserRepository interface {
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
	ListUsers(ctx context.Context, search, role, status string, limit, offset int) ([]models.UserListItem, int, error)
	UpdateUserStatus(ctx context.Context, userID string, isActive bool) error
	UpdateUserRole(ctx context.Context, userID string, role string) error
}

// PostgresUserRepository implements UserRepository using PostgreSQL
type PostgresUserRepository struct {
	db *database.DB
}

func NewPostgresUserRepository(db *database.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

// GetByEmail retrieves a user by email address
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE email = $1", email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &user, nil
}

// GetByID retrieves a user by their unique ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE id = $1", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &user, nil
}

// Create inserts a new user record into the database
func (r *PostgresUserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, full_name, role, subscription_tier, is_active, created_at, updated_at)
		VALUES (:id, :email, :password_hash, :full_name, :role, :subscription_tier, :is_active, :created_at, :updated_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

// Update updates an existing user record
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users 
		SET email = :email, password_hash = :password_hash, full_name = :full_name, 
		    role = :role, subscription_tier = :subscription_tier, 
		    subscription_expires_at = :subscription_expires_at, is_active = :is_active, 
		    updated_at = :updated_at
		WHERE id = :id
	`
	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}

// ListUsers returns paginated user records with search and role filters
func (r *PostgresUserRepository) ListUsers(ctx context.Context, search, role, status string, limit, offset int) ([]models.UserListItem, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if role != "" {
		whereClause += fmt.Sprintf(" AND role = $%d", argIdx)
		args = append(args, role)
		argIdx++
	}

	if status == "active" {
		whereClause += " AND is_active = true"
	} else if status == "suspended" || status == "inactive" {
		whereClause += " AND is_active = false"
	}

	if search != "" {
		whereClause += fmt.Sprintf(" AND (email ILIKE $%d OR full_name ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT 
			id, email, full_name, role, subscription_tier, 
			subscription_expires_at, is_active, created_at, updated_at
		FROM users
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	var users []models.UserListItem
	err = r.db.SelectContext(ctx, &users, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("select users: %w", err)
	}

	if users == nil {
		users = []models.UserListItem{}
	}

	return users, total, nil
}

// UpdateUserStatus toggles active/suspended status of a user
func (r *PostgresUserRepository) UpdateUserStatus(ctx context.Context, userID string, isActive bool) error {
	query := `UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3`
	res, err := r.db.ExecContext(ctx, query, isActive, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("update user status: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user %s not found", userID)
	}
	return nil
}

// UpdateUserRole updates user authority role (admin, creator, user)
func (r *PostgresUserRepository) UpdateUserRole(ctx context.Context, userID string, role string) error {
	query := `UPDATE users SET role = $1, updated_at = $2 WHERE id = $3`
	res, err := r.db.ExecContext(ctx, query, role, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("update user role: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user %s not found", userID)
	}
	return nil
}
