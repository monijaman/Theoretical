package database

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	User     string
	Password string
	DBName   string
	Port     string
	SSLMode  string
	TimeZone string
}

// NewDatabaseConfig creates database configuration from environment
func NewDatabaseConfig() *DatabaseConfig {
	return &DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		User:     getEnv("DB_USER", "root"),
		Password: getEnv("DB_PASSWORD", "root"),
		DBName:   getEnv("DB_NAME", "authdb"),
		Port:     getEnv("DB_PORT", "5428"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
		TimeZone: getEnv("DB_TIMEZONE", "UTC"),
	}
}

// Connect establishes a connection to the PostgreSQL database using GORM
// This is pure infrastructure concern - no business logic here
func Connect(config *DatabaseConfig) (*gorm.DB, error) {
	dsn := buildDSN(config)

	gormConfig := &gorm.Config{
		Logger: getGormLogger(),
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}

// buildDSN constructs the database connection string
func buildDSN(config *DatabaseConfig) string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		config.Host,
		config.User,
		config.Password,
		config.DBName,
		config.Port,
		config.SSLMode,
		config.TimeZone,
	)
}

// getGormLogger configures GORM logger based on environment
func getGormLogger() logger.Interface {
	if getEnv("GO_ENV", "development") == "production" {
		return logger.Default.LogMode(logger.Error)
	}
	return logger.Default.LogMode(logger.Info)
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
