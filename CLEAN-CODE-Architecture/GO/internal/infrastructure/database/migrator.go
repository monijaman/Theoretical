package database

import (
	"auth-module/internal/infrastructure/database/models"
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migrator handles database migrations
type Migrator struct {
	db *gorm.DB
}

// NewMigrator creates a new migrator instance
func NewMigrator(db *gorm.DB) *Migrator {
	return &Migrator{db: db}
}

// RunMigrations executes all database migrations
func (m *Migrator) RunMigrations() error {
	log.Println("Running database migrations...")
	
	err := m.db.AutoMigrate(
		&models.UserModel{},
		// Add other models here as you create them
	)
	
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	
	log.Println("Database migrations completed successfully")
	return nil
}

// DropTables drops all tables (useful for development)
func (m *Migrator) DropTables() error {
	log.Println("Dropping database tables...")
	
	err := m.db.Migrator().DropTable(
		&models.UserModel{},
	)
	
	if err != nil {
		return fmt.Errorf("failed to drop tables: %w", err)
	}
	
	log.Println("Database tables dropped successfully")
	return nil
}
