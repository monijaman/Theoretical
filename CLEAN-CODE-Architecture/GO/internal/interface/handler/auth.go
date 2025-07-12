package handler

// This file is part of the Interface Adapters Layer in Clean Code Architecture.
// - These handlers adapt HTTP requests to use case calls.
// - They parse input, call the appropriate use case, and write the response.
// - Keeps delivery (HTTP) logic separate from business logic and infrastructure.
// - Makes it easy to swap out the web framework or test the handlers in isolation.

import (
	"encoding/json"
	"net/http"

	"auth-module/internal/domain/entity"
	"auth-module/internal/interface/repository/postgres"
	pgRepo "auth-module/internal/interface/repository/postgres"
	"auth-module/internal/usecase/auth"
)

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Create user entity
	user := &entity.User{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
	}

	// Initialize repository
	repo := &postgres.UserRepo{}

	// Call register use case
	err := auth.Register(r.Context(), repo, user)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User registered successfully",
		"email":   user.Email,
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Initialize repository
	repo := &postgres.UserRepo{}

	// Call login use case
	success, err := auth.Login(r.Context(), repo, req.Email, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if !success {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Login successful",
		"email":   req.Email,
	})
}

func RegisterHandlerWithRepo(w http.ResponseWriter, r *http.Request, repo *pgRepo.UserRepo) {
	w.Header().Set("Content-Type", "application/json")

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	user := &entity.User{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
	}

	err := auth.Register(r.Context(), repo, user)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User registered successfully",
		"email":   user.Email,
	})
}

func LoginHandlerWithRepo(w http.ResponseWriter, r *http.Request, repo *pgRepo.UserRepo) {
	w.Header().Set("Content-Type", "application/json")

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	success, err := auth.Login(r.Context(), repo, req.Email, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if !success {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Login successful",
		"email":   req.Email,
	})
}
