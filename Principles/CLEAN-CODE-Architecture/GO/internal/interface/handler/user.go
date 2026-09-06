package handler

// This file contains HTTP handlers for user management operations.
// It's part of the Interface Adapters Layer in Clean Code Architecture.
// - Adapts HTTP requests to use case calls
// - Handles request parsing and response formatting
// - Maintains separation between HTTP delivery and business logic

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"auth-module/internal/domain/entity"
	"auth-module/internal/domain/repository"
	userUseCase "auth-module/internal/usecase/user"
)

// UserResponse represents the user data returned to client
type UserResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
	Phone     string `json:"phone,omitempty"`
	Address   string `json:"address,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// PaginatedUsersResponse represents paginated user list response
type PaginatedUsersResponse struct {
	Users      []UserResponse `json:"users"`
	Total      int64          `json:"total"`
	Limit      int            `json:"limit"`
	Offset     int            `json:"offset"`
	HasMore    bool           `json:"has_more"`
}

// CountResponse represents user count response
type CountResponse struct {
	Count int64 `json:"count"`
}

// convertUserToResponse converts domain entity to response format
func convertUserToResponse(user *entity.User) UserResponse {
	return UserResponse{
		ID:        string(user.ID),
		Username:  user.Username,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Phone:     user.Phone,
		Address:   user.Address,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ListUsersHandler handles GET /api/users
func ListUsersHandler(w http.ResponseWriter, r *http.Request, userRepo repository.UserRepository) {
	w.Header().Set("Content-Type", "application/json")

	// Parse query parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 10 // default
	offset := 0 // default

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// Create use case
	uc := userUseCase.NewUserUseCase(userRepo)

	// Get users
	users, err := uc.ListUsers(r.Context(), limit, offset)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Get total count
	total, err := uc.GetUserCount(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get user count"})
		return
	}

	// Convert to response format
	userResponses := make([]UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = convertUserToResponse(user)
	}

	response := PaginatedUsersResponse{
		Users:   userResponses,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
		HasMore: int64(offset+len(users)) < total,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetAllUsersHandler handles GET /api/users/all
func GetAllUsersHandler(w http.ResponseWriter, r *http.Request, userRepo repository.UserRepository) {
	w.Header().Set("Content-Type", "application/json")

	// Parse limit parameter
	limitStr := r.URL.Query().Get("limit")
	limit := 50 // default

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Create use case
	uc := userUseCase.NewUserUseCase(userRepo)

	// Get all users
	users, err := uc.GetAllUsers(r.Context(), limit)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Convert to response format
	userResponses := make([]UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = convertUserToResponse(user)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": userResponses,
		"count": len(userResponses),
		"limit": limit,
	})
}

// SearchUsersHandler handles GET /api/users/search
func SearchUsersHandler(w http.ResponseWriter, r *http.Request, userRepo repository.UserRepository) {
	w.Header().Set("Content-Type", "application/json")

	// Parse query parameters
	query := r.URL.Query().Get("q")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	if query == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Search query 'q' parameter is required"})
		return
	}

	limit := 10 // default
	offset := 0 // default

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// Create use case
	uc := userUseCase.NewUserUseCase(userRepo)

	// Search users
	users, err := uc.SearchUsers(r.Context(), query, limit, offset)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Convert to response format
	userResponses := make([]UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = convertUserToResponse(user)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users":  userResponses,
		"count":  len(userResponses),
		"query":  query,
		"limit":  limit,
		"offset": offset,
	})
}

// GetUserCountHandler handles GET /api/users/count
func GetUserCountHandler(w http.ResponseWriter, r *http.Request, userRepo repository.UserRepository) {
	w.Header().Set("Content-Type", "application/json")

	// Create use case
	uc := userUseCase.NewUserUseCase(userRepo)

	// Get user count
	count, err := uc.GetUserCount(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	response := CountResponse{Count: count}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetUserByIDHandler handles GET /api/users/{id}
func GetUserByIDHandler(w http.ResponseWriter, r *http.Request, userRepo repository.UserRepository) {
	w.Header().Set("Content-Type", "application/json")

	// Extract user ID from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if path == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "User ID is required"})
		return
	}

	// Convert string ID to UserID
	userID := entity.UserID(path)

	// Create use case
	uc := userUseCase.NewUserUseCase(userRepo)

	// Get user
	user, err := uc.GetUserByID(r.Context(), userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if user == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		return
	}

	response := convertUserToResponse(user)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
