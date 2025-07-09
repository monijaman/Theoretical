package database

// This file is part of the Infrastructure Layer in Clean Code Architecture.
// - Handles the details of connecting to the Postgres database.
// - Keeps database logic separate from business logic and use cases.
// - Makes it easy to swap out or mock the database for testing or future changes.

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq" // Postgres driver
)

// NewPostgresDB creates and verifies a connection to the Postgres database using the connection string from the environment.
// Returns a *sql.DB object for use by repository implementations.
func NewPostgresDB() (*sql.DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}
	// Check the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}
	fmt.Println("Successfully connected to the database!")
	return db, nil
}
