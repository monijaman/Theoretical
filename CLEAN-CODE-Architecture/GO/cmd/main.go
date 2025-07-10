package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"auth-module/internal/infrastructure/database/models"
	"auth-module/internal/interface/handler"
	pgRepo "auth-module/internal/interface/repository/postgres"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found or error loading .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	kafkaBroker := os.Getenv("KAFKA_BROKER")

	fmt.Println("Auth microservice running...")
	fmt.Println("Database URL:", dbURL)
	fmt.Println("JWT Secret:", jwtSecret)
	fmt.Println("Kafka Broker:", kafkaBroker)

	fmt.Println("Attempting to connect to the database and migrate schema...")
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("GORM database connection failed: %v", err)
	}

	// Drop existing table and recreate
	if err := db.Migrator().DropTable(&models.UserModel{}); err != nil {
		log.Printf("Warning: Could not drop users table: %v", err)
	}

	if err := db.AutoMigrate(&models.UserModel{}); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	// Get *sql.DB from GORM
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying *sql.DB: %v", err)
	}

	// Create repository instance
	userRepo := pgRepo.NewUserRepo(sqlDB)

	fmt.Println("Database migration complete! Starting HTTP server on :8080 ...")

	// Register routes with method check and pass repository
	http.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only POST method is allowed",
			})
			return
		}
		handler.RegisterHandlerWithRepo(w, r, userRepo)
	})

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only POST method is allowed",
			})
			return
		}
		handler.LoginHandlerWithRepo(w, r, userRepo)
	})

	fmt.Println("\nAPI Endpoints:")
	fmt.Println("POST http://localhost:8080/register")
	fmt.Println("POST http://localhost:8080/login")
	fmt.Println("\nServer is running on http://localhost:8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
}
