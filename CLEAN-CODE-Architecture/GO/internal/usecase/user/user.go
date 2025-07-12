package usecase

import (
	"auth-module/internal/domain/entity"
	"auth-module/internal/domain/repository"
	"context"
	"errors"
)

// UserUseCase handles user-related business logic
// This is part of the Use Case layer in Clean Architecture
type UserUseCase struct {
	userRepo repository.UserRepository
}

// NewUserUseCase creates a new UserUseCase
func NewUserUseCase(userRepo repository.UserRepository) *UserUseCase {
	return &UserUseCase{
		userRepo: userRepo,
	}
}

// CreateUser creates a new user with validation
func (uc *UserUseCase) CreateUser(ctx context.Context, username, email, password string) (*entity.User, error) {
	// Check if user already exists.
	existingUser, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Check if username is taken
	existingUser, err = uc.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("username is already taken")
	}

	// Create new user using domain entity constructor
	user, err := entity.NewUser(username, email, password)
	if err != nil {
		return nil, err
	}

	// Save user to repository
	createdUser, err := uc.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return createdUser, nil
}

// GetUserByEmail retrieves a user by email
func (uc *UserUseCase) GetUserByEmail(ctx context.Context, email string) (*entity.User, error) {
	return uc.userRepo.GetByEmail(ctx, email)
}

// GetUserByID retrieves a user by ID
func (uc *UserUseCase) GetUserByID(ctx context.Context, id entity.UserID) (*entity.User, error) {
	return uc.userRepo.GetByID(ctx, id)
}

// UpdateUserProfile updates user profile information
func (uc *UserUseCase) UpdateUserProfile(ctx context.Context, id entity.UserID, firstName, lastName, phone, address string) error {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// Use domain method to update profile
	user.UpdateProfile(firstName, lastName, phone, address)

	return uc.userRepo.Update(ctx, user)
}

// ChangeUserPassword changes user password
func (uc *UserUseCase) ChangeUserPassword(ctx context.Context, id entity.UserID, newPassword string) error {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// Use domain method to change password
	if err := user.ChangePassword(newPassword); err != nil {
		return err
	}

	return uc.userRepo.Update(ctx, user)
}

// ListUsers retrieves a list of users with pagination
func (uc *UserUseCase) ListUsers(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	// Validate pagination parameters
	if limit <= 0 {
		limit = 10 // Default limit
	}
	if limit > 100 {
		limit = 100 // Maximum limit to prevent abuse
	}
	if offset < 0 {
		offset = 0
	}
	
	return uc.userRepo.List(ctx, limit, offset)
}

// GetAllUsers retrieves all users with a reasonable limit
func (uc *UserUseCase) GetAllUsers(ctx context.Context, limit int) ([]*entity.User, error) {
	// Validate limit
	if limit <= 0 {
		limit = 50 // Default limit
	}
	if limit > 1000 {
		limit = 1000 // Maximum limit to prevent memory issues
	}
	
	return uc.userRepo.List(ctx, limit, 0)
}

// SearchUsers searches for users by username, email, first name, or last name
func (uc *UserUseCase) SearchUsers(ctx context.Context, query string, limit, offset int) ([]*entity.User, error) {
	// Validate inputs
	if query == "" {
		return nil, errors.New("search query cannot be empty")
	}
	
	if limit <= 0 {
		limit = 10
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}
	
	// Use the Search method from repository
	return uc.userRepo.Search(ctx, query, limit, offset)
}

// GetUserCount returns the total number of users
func (uc *UserUseCase) GetUserCount(ctx context.Context) (int64, error) {
	return uc.userRepo.Count(ctx)
}
