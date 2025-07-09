package auth

// This use case follows Clean Code Architecture principles:
// - Business logic (authentication) is separated from infrastructure (database, hashing).
// - The repository is injected (Dependency Injection), so this code is easy to test and not tied to a specific DB.
// - The Repository Pattern is used: repo.FindByEmail abstracts data access.
// - The Hash utility is injected, so password logic is also decoupled.
// This makes the code modular, testable, and easy to maintain.

import (
	"auth-module/internal/domain/repository"
	"auth-module/pkg/hash"
	"errors"
)

func Login(repo repository.UserRepository, email, password string) (bool, error) {
	user, err := repo.FindByEmail(email)
	if err != nil || user == nil {
		return false, errors.New("user not found")
	}
	if !hash.CheckPasswordHash(password, user.Password) {
		return false, errors.New("invalid password")
	}
	return true, nil
}
