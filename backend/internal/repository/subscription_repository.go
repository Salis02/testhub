package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"testhub/internal/database"
	"testhub/internal/models"
)

var (
	ErrSubscriptionNotFound = errors.New("data langganan tidak ditemukan")
	ErrOrderNotFound        = errors.New("invoice pembayaran tidak ditemukan")
)

type SubscriptionRepository interface {
	CreateSubscription(ctx context.Context, sub *models.Subscription) error
	HasActiveAccess(ctx context.Context, userIdentifier string, testID string) (bool, error)
	ListSubscriptions(ctx context.Context, status string, search string, limit, offset int) ([]models.Subscription, int, error)
	UpdateStatus(ctx context.Context, id string, status string, extendDays int, notes *string) error
	RevokeSubscription(ctx context.Context, id string, notes *string) error
	GetUserSubscriptions(ctx context.Context, userIdentifier string) ([]models.Subscription, error)
	CreateOrder(ctx context.Context, order *models.Order) error
	GetOrderByID(ctx context.Context, orderID string) (*models.Order, error)
	GetActivePendingOrder(ctx context.Context, userEmail string, testID *string, planType string) (*models.Order, error)
	SettleOrder(ctx context.Context, orderID string, paymentRef string) (*models.Subscription, error)
}

type PostgresSubscriptionRepository struct {
	db *database.DB
}

func NewPostgresSubscriptionRepository(db *database.DB) *PostgresSubscriptionRepository {
	return &PostgresSubscriptionRepository{db: db}
}

// CreateSubscription inserts a new subscription entry
func (r *PostgresSubscriptionRepository) CreateSubscription(ctx context.Context, sub *models.Subscription) error {
	query := `
		INSERT INTO subscriptions (id, user_identifier, test_id, tier, status, source, admin_notes, amount_paid, valid_until, created_at, updated_at)
		VALUES (:id, :user_identifier, :test_id, :tier, :status, :source, :admin_notes, :amount_paid, :valid_until, :created_at, :updated_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, sub)
	if err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}
	return nil
}

// HasActiveAccess checks if user has active subscription for test_id OR active season_pass / lifetime access
func (r *PostgresSubscriptionRepository) HasActiveAccess(ctx context.Context, userIdentifier string, testID string) (bool, error) {
	if userIdentifier == "" {
		return false, nil
	}

	query := `
		SELECT COUNT(*) FROM subscriptions
		WHERE user_identifier = $1
		  AND status = 'active'
		  AND (valid_until IS NULL OR valid_until > NOW())
		  AND (test_id = $2 OR tier = 'season_pass' OR tier = 'lifetime' OR tier = 'institution')
	`
	var count int
	err := r.db.GetContext(ctx, &count, query, userIdentifier, testID)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// ListSubscriptions returns paginated subscription entries with optional status/search filters
func (r *PostgresSubscriptionRepository) ListSubscriptions(ctx context.Context, status string, search string, limit, offset int) ([]models.Subscription, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if search != "" {
		whereClause += fmt.Sprintf(" AND (user_identifier ILIKE $%d OR COALESCE(admin_notes, '') ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM subscriptions %s", whereClause)
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("count subscriptions: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, user_identifier, test_id, tier, status, source, admin_notes, amount_paid, valid_until, created_at, updated_at
		FROM subscriptions
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	var list []models.Subscription
	err = r.db.SelectContext(ctx, &list, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("select subscriptions: %w", err)
	}

	if list == nil {
		list = []models.Subscription{}
	}

	return list, total, nil
}

// UpdateStatus modifies subscription status or extends active duration
func (r *PostgresSubscriptionRepository) UpdateStatus(ctx context.Context, id string, status string, extendDays int, notes *string) error {
	var current models.Subscription
	err := r.db.GetContext(ctx, &current, "SELECT * FROM subscriptions WHERE id = $1", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrSubscriptionNotFound
		}
		return err
	}

	now := time.Now()
	var newValidUntil *time.Time = current.ValidUntil

	if extendDays > 0 {
		baseTime := now
		if current.ValidUntil != nil && current.ValidUntil.After(now) {
			baseTime = *current.ValidUntil
		}
		extended := baseTime.AddDate(0, 0, extendDays)
		newValidUntil = &extended
	}

	adminNotes := current.AdminNotes
	if notes != nil && *notes != "" {
		adminNotes = notes
	}

	updateSQL := `
		UPDATE subscriptions
		SET status = $1, valid_until = $2, admin_notes = $3, updated_at = $4
		WHERE id = $5
	`
	_, err = r.db.ExecContext(ctx, updateSQL, status, newValidUntil, adminNotes, now, id)
	return err
}

// RevokeSubscription immediately revokes subscription access
func (r *PostgresSubscriptionRepository) RevokeSubscription(ctx context.Context, id string, notes *string) error {
	now := time.Now()
	updateSQL := `
		UPDATE subscriptions
		SET status = 'revoked', admin_notes = COALESCE($1, admin_notes), updated_at = $2
		WHERE id = $3
	`
	res, err := r.db.ExecContext(ctx, updateSQL, notes, now, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrSubscriptionNotFound
	}
	return nil
}

// GetUserSubscriptions returns all subscriptions owned by userIdentifier
func (r *PostgresSubscriptionRepository) GetUserSubscriptions(ctx context.Context, userIdentifier string) ([]models.Subscription, error) {
	query := `
		SELECT id, user_identifier, test_id, tier, status, source, admin_notes, amount_paid, valid_until, created_at, updated_at
		FROM subscriptions
		WHERE user_identifier = $1
		ORDER BY created_at DESC
	`
	var list []models.Subscription
	err := r.db.SelectContext(ctx, &list, query, userIdentifier)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []models.Subscription{}
	}
	return list, nil
}

// CreateOrder registers a new payment order invoice
func (r *PostgresSubscriptionRepository) CreateOrder(ctx context.Context, order *models.Order) error {
	query := `
		INSERT INTO orders (id, user_email, test_id, plan_type, amount, status, payment_method, payment_reference, snap_token, qr_payload, settled_at, expires_at, created_at, updated_at)
		VALUES (:id, :user_email, :test_id, :plan_type, :amount, :status, :payment_method, :payment_reference, :snap_token, :qr_payload, :settled_at, :expires_at, :created_at, :updated_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, order)
	return err
}

// GetOrderByID fetches an order by its ID
func (r *PostgresSubscriptionRepository) GetOrderByID(ctx context.Context, orderID string) (*models.Order, error) {
	var order models.Order
	err := r.db.GetContext(ctx, &order, "SELECT * FROM orders WHERE id = $1", orderID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

// GetActivePendingOrder finds an existing pending unexpired order for the user and item
func (r *PostgresSubscriptionRepository) GetActivePendingOrder(ctx context.Context, userEmail string, testID *string, planType string) (*models.Order, error) {
	var order models.Order
	var err error
	if testID != nil && *testID != "" {
		err = r.db.GetContext(ctx, &order, `
			SELECT * FROM orders 
			WHERE user_email = $1 AND test_id = $2 AND plan_type = $3 AND status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
			ORDER BY created_at DESC LIMIT 1
		`, userEmail, *testID, planType)
	} else {
		err = r.db.GetContext(ctx, &order, `
			SELECT * FROM orders 
			WHERE user_email = $1 AND plan_type = $2 AND status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
			ORDER BY created_at DESC LIMIT 1
		`, userEmail, planType)
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

// SettleOrder atomically marks order settled and creates the user's active subscription
func (r *PostgresSubscriptionRepository) SettleOrder(ctx context.Context, orderID string, paymentRef string) (*models.Subscription, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var order models.Order
	err = tx.GetContext(ctx, &order, "SELECT * FROM orders WHERE id = $1 FOR UPDATE", orderID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}

	if order.Status == "settled" {
		// Idempotency: order already settled
		var existingSub models.Subscription
		_ = tx.GetContext(ctx, &existingSub, "SELECT * FROM subscriptions WHERE user_identifier = $1 ORDER BY created_at DESC LIMIT 1", order.UserEmail)
		return &existingSub, nil
	}

	now := time.Now()
	var validUntil *time.Time
	validDays := 30
	if order.PlanType == "season_pass" {
		validDays = 90
	}
	exp := now.AddDate(0, 0, validDays)
	validUntil = &exp

	// 1. Mark order settled
	updateOrderSQL := `
		UPDATE orders
		SET status = 'settled', payment_reference = $1, settled_at = $2, updated_at = $2
		WHERE id = $3
	`
	_, err = tx.ExecContext(ctx, updateOrderSQL, paymentRef, now, orderID)
	if err != nil {
		return nil, fmt.Errorf("settle order: %w", err)
	}

	// 2. Insert active subscription
	subID := "sub-" + uuid.New().String()[:12]
	notes := fmt.Sprintf("Pembayaran Otomatis Order ID: %s via QRIS", orderID)
	sub := models.Subscription{
		ID:             subID,
		UserIdentifier: order.UserEmail,
		TestID:         order.TestID,
		Tier:           order.PlanType,
		Status:         "active",
		Source:         "gateway_midtrans",
		AdminNotes:     &notes,
		AmountPaid:     order.Amount,
		ValidUntil:     validUntil,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	insertSubSQL := `
		INSERT INTO subscriptions (id, user_identifier, test_id, tier, status, source, admin_notes, amount_paid, valid_until, created_at, updated_at)
		VALUES (:id, :user_identifier, :test_id, :tier, :status, :source, :admin_notes, :amount_paid, :valid_until, :created_at, :updated_at)
	`
	_, err = tx.NamedExecContext(ctx, insertSubSQL, sub)
	if err != nil {
		return nil, fmt.Errorf("create subscription after payment: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit settlement: %w", err)
	}

	return &sub, nil
}
