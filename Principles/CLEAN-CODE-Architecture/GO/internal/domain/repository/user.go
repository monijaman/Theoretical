package repository

// UserRepository defines the contract for user data access.
// - This interface is part of the Domain Layer in Clean Code Architecture.
// - It uses the Repository Pattern to abstract data storage details from business logic.
// - Enables Dependency Injection: use cases depend on this interface, not a concrete DB.
// - Makes the code testable and decoupled from infrastructure (e.g., Postgres, MongoDB, etc).

import (
	"auth-module/internal/domain/entity"
	"context"
)

type UserRepository interface {
	Create(ctx context.Context, user *entity.User) (*entity.User, error)
	GetByID(ctx context.Context, id entity.UserID) (*entity.User, error)
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	GetByUsername(ctx context.Context, username string) (*entity.User, error)
	Update(ctx context.Context, user *entity.User) error
	Delete(ctx context.Context, id entity.UserID) error
	List(ctx context.Context, limit, offset int) ([]*entity.User, error)
	
	// Additional methods for better user management
	Count(ctx context.Context) (int64, error)
	Search(ctx context.Context, query string, limit, offset int) ([]*entity.User, error)
	GetByEmailOrUsername(ctx context.Context, emailOrUsername string) (*entity.User, error)
}
