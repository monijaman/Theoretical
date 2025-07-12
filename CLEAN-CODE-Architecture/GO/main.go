package main

import (
	"auth-module/config"
	"auth-module/internal/api"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := loadEnv(); err != nil {
		log.Fatal("Error loading .env file:", err)
	}

	// Setup configuration
	cfg, err := config.SetupEnv()
	if err != nil {
		log.Fatal("Config setup failed:", err)
	}

	// Start the application
	api.StartServer(cfg)
}

func loadEnv() error {
	if os.Getenv("GO_ENV") == "production" {
		return nil // Skip .env in production
	}
	return godotenv.Load()
}
