package postgres

// UserRepo is an implementation of the UserRepository interface for Postgres.
// - This file is part of the Interface Adapters Layer in Clean Code Architecture.
// - Adapts domain repository interfaces to actual database operations.
// - Keeps business logic decoupled from database details.
// - Makes it easy to swap out or mock the DB implementation for testing or future changes.

import (
	"auth-module/internal/domain/entity"
	"auth-module/internal/infrastructure/database/models"
	"database/sql"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(user *entity.User) error {
	// Convert domain entity to GORM model
	model := models.FromEntity(user)

	query := `
		INSERT INTO users (username, email, password, first_name, last_name, phone, address, profile_pic, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(
		query,
		model.Username,
		model.Email,
		model.Password,
		model.FirstName,
		model.LastName,
		model.Phone,
		model.Address,
		model.ProfilePic,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	return err
}

func (r *UserRepo) FindByEmail(email string) (*entity.User, error) {
	model := &models.UserModel{}
	query := `SELECT id, username, email, password, first_name, last_name, phone, address, profile_pic, created_at, updated_at 
			 FROM users WHERE email = $1`

	err := r.db.QueryRow(query, email).Scan(
		&model.ID,
		&model.Username,
		&model.Email,
		&model.Password,
		&model.FirstName,
		&model.LastName,
		&model.Phone,
		&model.Address,
		&model.ProfilePic,
		&model.CreatedAt,
		&model.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return model.ToEntity(), nil
}
