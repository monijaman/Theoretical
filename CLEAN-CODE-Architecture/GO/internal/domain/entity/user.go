package entity

import (
	"errors"
	"strconv"
	"strings"
	"time"
)

// UserID represents a unique identifier for a user
// This abstraction allows different storage implementations
type UserID string

// User represents our core domain entity, completely independent of any framework
// This entity focuses purely on business logic and domain rules
type User struct {
	ID        UserID
	Username  string
	FirstName string
	LastName  string
	Email     string
	Phone     string
	Address   string
	Password  string
	ProfilePic string
	// Audit fields - these could be moved to a separate concern
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewUser creates a new user with validation
// This constructor ensures business rules are followed
func NewUser(username, email, password string) (*User, error) {
	if err := validateEmail(email); err != nil {
		return nil, err
	}
	
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	
	if err := validatePassword(password); err != nil {
		return nil, err
	}
	
	now := time.Now()
	return &User{
		Username:  username,
		Email:     email,
		Password:  password, // In real app, this should be hashed
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// UpdateProfile updates user profile information
func (u *User) UpdateProfile(firstName, lastName, phone, address string) {
	u.FirstName = firstName
	u.LastName = lastName
	u.Phone = phone
	u.Address = address
	u.UpdatedAt = time.Now()
}

// ChangePassword changes user password with validation
func (u *User) ChangePassword(newPassword string) error {
	if err := validatePassword(newPassword); err != nil {
		return err
	}
	u.Password = newPassword // In real app, hash this
	u.UpdatedAt = time.Now()
	return nil
}

// GetFullName returns the full name of the user
func (u *User) GetFullName() string {
	return strings.TrimSpace(u.FirstName + " " + u.LastName)
}

// IsValid checks if the user entity is valid
func (u *User) IsValid() bool {
	return u.Username != "" && u.Email != "" && u.Password != ""
}

// Domain validation functions
func validateEmail(email string) error {
	if email == "" {
		return errors.New("email is required")
	}
	if !strings.Contains(email, "@") {
		return errors.New("invalid email format.")
	}
	return nil
}

func validateUsername(username string) error {
	if username == "" {
		return errors.New("username is required")
	}
	if len(username) < 3 {
		return errors.New("username must be at least 3 characters")
	}
	return nil
}

func validatePassword(password string) error {
	if password == "" {
		return errors.New("password is required")
	}
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

// ParseUserIDToUint converts UserID to uint for database operations
// This helper function is used by infrastructure layer to convert domain types
func ParseUserIDToUint(id UserID) (uint, error) {
	if id == "" {
		return 0, errors.New("empty user ID")
	}
	
	parsedID, err := strconv.ParseUint(string(id), 10, 32)
	if err != nil {
		return 0, errors.New("invalid user ID format")
	}
	
	return uint(parsedID), nil
}
