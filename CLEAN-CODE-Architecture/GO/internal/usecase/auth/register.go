package auth

// This use case follows Clean Code Architecture principles:
// - Business logic (user registration) is separated from infrastructure (database, hashing).
// - The repository is injected (Dependency Injection), so this code is easy to test and not tied to a specific DB.
// - The Repository Pattern is used: repo.FindByEmail and repo.Create abstract data access.
// - The Hash utility is injected, so password logic is also decoupled.
// This makes the code modular, testable, and easy to maintain.

import (
	"auth-module/internal/domain/entity"
	"auth-module/internal/domain/repository"
	"auth-module/pkg/hash"
	"context"
	"errors"
	"time"
)

func Register(ctx context.Context, repo repository.UserRepository, user *entity.User) error {
	// Check if user already exists
	existing, _ := repo.GetByEmail(ctx, user.Email)
	if existing != nil {
		return errors.New("user already exists")
	}
	// Hash the password
	hashed, err := hash.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashed
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	
	_, err = repo.Create(ctx, user)
	return err
}
