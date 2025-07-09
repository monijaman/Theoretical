package postgres

// UserRepo is an implementation of the UserRepository interface for Postgres.
// - This file is part of the Interface Adapters Layer in Clean Code Architecture.
// - Adapts domain repository interfaces to actual database operations.
// - Keeps business logic decoupled from database details.
// - Makes it easy to swap out or mock the DB implementation for testing or future changes.

import (
	"auth-module/internal/domain/entity"
	"database/sql"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(user *entity.User) error {
	query := `
		INSERT INTO users (username, email, password, first_name, last_name, phone, address, profile_pic, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id`

	err := r.db.QueryRow(
		query,
		user.Username,
		user.Email,
		user.Password,
		user.FirstName,
		user.LastName,
		user.Phone,
		user.Address,
		user.ProfilePic,
	).Scan(&user.ID)

	return err
}

func (r *UserRepo) FindByEmail(email string) (*entity.User, error) {
	user := &entity.User{}
	query := `SELECT id, username, email, password FROM users WHERE email = $1`
	err := r.db.QueryRow(query, email).Scan(&user.ID, &user.Username, &user.Email, &user.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return user, err
}
