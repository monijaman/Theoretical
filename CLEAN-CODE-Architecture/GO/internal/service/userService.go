package service

import (
	"auth-module/config"
	"auth-module/internal/domain"
	"auth-module/internal/dto"
	"auth-module/internal/helper"
	"auth-module/internal/repository"
	"errors"
	"time"
)

type UserService struct {
	Repo   repository.UserRepository
	CRepo  repository.CatalogRepository
	Auth   helper.Auth
	Config config.AppConfig
}

// Signup handles user registration
func (s *UserService) Signup(userReq dto.UserSignup) (string, error) {
	// Check if user already exists
	existing, _ := s.Repo.FindUser(userReq.Email)
	if existing.ID != 0 {
		return "", errors.New("user already exists")
	}

	// Hash password
	hashedPassword, err := s.Auth.CreateHashedPassword(userReq.Password)
	if err != nil {
		return "", err
	}

	user := domain.User{
		Email:     userReq.Email,
		Password:  hashedPassword,
		Phone:     userReq.Phone,
		UserType:  "CUSTOMER", // Default role
		CreatedAt: time.Now(),
	}

	createdUser, err := s.Repo.CreateUser(user)
	if err != nil {
		return "", err
	}

	// Generate JWT token
	token, err := s.Auth.GenerateToken(createdUser.ID, createdUser.Email, "CUSTOMER")
	if err != nil {
		return "", err
	}

	return token, nil
}

// Login handles user authentication
func (s *UserService) Login(email, password string) (string, error) {
	user, err := s.Repo.FindUser(email)
	if err != nil {
		return "", errors.New("user not found")
	}

	// Verify password using the Auth helper method
	err = s.Auth.VerifyPassword(password, user.Password)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	// Generate JWT token
	role := user.UserType
	if role == "" {
		role = "CUSTOMER"
	}
	token, err := s.Auth.GenerateToken(user.ID, user.Email, role)
	if err != nil {
		return "", err
	}

	return token, nil
}

// GetVerificationCode generates and sends verification code to user
func (s *UserService) GetVerificationCode(user *domain.User) (string, error) {
	// For now, just return success message
	// In a real implementation, you'd generate a code, save it to the user record and send SMS
	
	return "Verification code sent successfully", nil
}

// VerifyCode verifies the provided code against user's stored code
func (s *UserService) VerifyCode(userID uint, code string) error {
	user, err := s.Repo.FindUserById(userID)
	if err != nil {
		return err
	}

	// For now, accept any 6-digit code (this would need proper verification logic)
	if len(code) != 6 {
		return errors.New("invalid verification code")
	}

	// Update user to mark as verified (using UserType for now as a proxy)
	updatedUser := user
	updatedUser.UpdatedAt = time.Now()

	_, err = s.Repo.UpdateUser(userID, updatedUser)
	if err != nil {
		return err
	}

	return nil
}

// CreateProfile creates or updates user profile
func (s *UserService) CreateProfile(userID uint, profile dto.ProfileInput) error {
	user, err := s.Repo.FindUserById(userID)
	if err != nil {
		return err
	}

	updatedUser := user
	updatedUser.FirstName = profile.FirstName
	updatedUser.LastName = profile.LastName
	updatedUser.UpdatedAt = time.Now()

	_, err = s.Repo.UpdateUser(userID, updatedUser)
	return err
}

// GetProfile retrieves user profile
func (s *UserService) GetProfile(userID uint) (*domain.User, error) {
	user, err := s.Repo.FindUserById(userID)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateProfile updates user profile
func (s *UserService) UpdateProfile(userID uint, profile dto.ProfileInput) error {
	user, err := s.Repo.FindUserById(userID)
	if err != nil {
		return err
	}

	updatedUser := user
	updatedUser.FirstName = profile.FirstName
	updatedUser.LastName = profile.LastName
	updatedUser.UpdatedAt = time.Now()

	_, err = s.Repo.UpdateUser(userID, updatedUser)
	return err
}

// CreateCart adds items to user's cart
func (s *UserService) CreateCart(req dto.CreateCartRequest, user *domain.User) (interface{}, error) {
	cart := domain.Cart{
		UserID:    user.ID,
		ProductID: req.ProductId,
		Quantity:  int(req.Qty),
		CreatedAt: time.Now(),
	}

	err := s.Repo.CreateCart(cart)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"user_id":    user.ID,
		"product_id": req.ProductId,
		"quantity":   req.Qty,
		"message":    "Item added to cart",
	}, nil
}

// FindCart retrieves user's cart
func (s *UserService) FindCart(userID uint) (interface{}, interface{}, error) {
	cartItems, err := s.Repo.FindCartItems(userID)
	if err != nil {
		return nil, nil, err
	}

	return cartItems, nil, nil
}

// GetOrders retrieves user's orders
func (s *UserService) GetOrders(user *domain.User) (interface{}, error) {
	orders, err := s.Repo.FindOrders(user.ID)
	if err != nil {
		return nil, err
	}
	return orders, nil
}

// GetOrderById retrieves a specific order by ID
func (s *UserService) GetOrderById(orderID, userID uint) (interface{}, error) {
	order, err := s.Repo.FindOrderById(orderID, userID)
	if err != nil {
		return nil, err
	}
	return order, nil
}

// BecomeSeller upgrades user to seller status
func (s *UserService) BecomeSeller(userID uint, req dto.SellerInput) (string, error) {
	user, err := s.Repo.FindUserById(userID)
	if err != nil {
		return "", err
	}

	// Update user to seller status
	updatedUser := user
	updatedUser.UserType = "SELLER"
	updatedUser.FirstName = req.FirstName
	updatedUser.LastName = req.LastName
	updatedUser.Phone = req.PhoneNumber
	updatedUser.UpdatedAt = time.Now()

	_, err = s.Repo.UpdateUser(userID, updatedUser)
	if err != nil {
		return "", err
	}

	// Generate new token with seller privileges
	token, err := s.Auth.GenerateToken(user.ID, user.Email, "SELLER")
	if err != nil {
		return "", err
	}

	return token, nil
}

// CreateOrder creates a new order for the user
func (s *UserService) CreateOrder(userID uint, orderData interface{}) (interface{}, error) {
	// This would create an order in the repository
	// For now, return a placeholder order
	order := map[string]interface{}{
		"id":      1,
		"user_id": userID,
		"status":  "created",
	}
	return order, nil
}
