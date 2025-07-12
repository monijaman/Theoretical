package repository

// UserRepository defines the contract for user data access.
// - This interface is part of the Domain Layer in Clean Code Architecture.
// - It uses the Repository Pattern to abstract data storage details from business logic.
// - Enables Dependency Injection: use cases depend on this interface, not a concrete DB.
// - Makes the code testable and decoupled from infrastructure (e.g., Postgres, MongoDB, etc).

import "auth-module/internal/domain/entity"

type UserRepository interface {
	Create(user *entity.User) (*entity.User, error)
	FindByID(id entity.UserID) (*entity.User, error)
	FindByEmail(email string) (*entity.User, error)
	FindByUsername(username string) (*entity.User, error)
	Update(user *entity.User) error
	Delete(id entity.UserID) error
	List(limit, offset int) ([]*entity.User, error)
	
	// Additional methods for better user management
	Count() (int64, error)
	Search(query string, limit, offset int) ([]*entity.User, error)
	FindByEmailOrUsername(emailOrUsername string) (*entity.User, error)
}
