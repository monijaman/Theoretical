package repository

// UserRepository defines the contract for user data access.
// - This interface is part of the Domain Layer in Clean Code Architecture.
// - It uses the Repository Pattern to abstract data storage details from business logic.
// - Enables Dependency Injection: use cases depend on this interface, not a concrete DB.
// - Makes the code testable and decoupled from infrastructure (e.g., Postgres, in-memory, etc).

import "auth-module/internal/domain/entity"

type UserRepository interface {
	Create(user *entity.User) error
	FindByEmail(email string) (*entity.User, error)
}
