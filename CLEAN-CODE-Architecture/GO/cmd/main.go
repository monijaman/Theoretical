package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"auth-module/internal/infrastructure/database/models"
	"auth-module/internal/interface/handler"
	pgRepo "auth-module/internal/interface/repository/postgres"
)

// findAvailablePort finds an available port starting from the given port
func findAvailablePort(startPort int) int {
	for port := startPort; port < startPort+100; port++ {
		address := fmt.Sprintf(":%d", port)
		listener, err := net.Listen("tcp", address)
		if err == nil {
			listener.Close()
			return port
		}
	}
	return startPort // fallback to original port
}

// killProcessOnPort attempts to find and kill any process using the specified port
func killProcessOnPort(port int) {
	// On Windows, you can use netstat + taskkill, but for now we'll just log
	fmt.Printf("⚠️  Port %d appears to be in use. You may need to manually kill the process.\n", port)
	fmt.Printf("💡 Run this command to find the process: netstat -ano | findstr :%d\n", port)
	fmt.Printf("💡 Then kill it with: taskkill /PID <PID> /F\n")
}

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found or error loading .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	kafkaBroker := os.Getenv("KAFKA_BROKER")

	fmt.Println("Auth microservice starting...")
	fmt.Println("Database URL:", dbURL)
	fmt.Println("JWT Secret:", jwtSecret)
	fmt.Println("Kafka Broker:", kafkaBroker)

	// Validate required environment variables
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	fmt.Println("Attempting to connect to the database and migrate schema...")
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("GORM database connection failed: %v", err)
	}

	// Test database connection
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying sql.DB: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}
	fmt.Println("Database connection successful!")

	// Drop existing table and recreate
	if err := db.Migrator().DropTable(&models.UserModel{}); err != nil {
		log.Printf("Warning: Could not drop users table: %v", err)
	}

	if err := db.AutoMigrate(&models.UserModel{}); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	// Create repository instance with GORM DB
	userRepo := pgRepo.NewUserRepo(db)

	fmt.Println("Database migration complete! Setting up HTTP routes...")

	// Create a new HTTP mux for better route handling
	mux := http.NewServeMux()

	// Register routes with method check and pass repository
	mux.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
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

	mux.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
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

	// User management routes
	mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only GET method is allowed",
			})
			return
		}
		handler.ListUsersHandler(w, r, userRepo)
	})

	mux.HandleFunc("/api/users/all", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only GET method is allowed",
			})
			return
		}
		log.Println("Handling GET /api/users/all.")
		handler.GetAllUsersHandler(w, r, userRepo)
	})

	mux.HandleFunc("/api/users/search", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only GET method is allowed",
			})
			return
		}
		handler.SearchUsersHandler(w, r, userRepo)
	})

	mux.HandleFunc("/api/users/count", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only GET method is allowed",
			})
			return
		}
		handler.GetUserCountHandler(w, r, userRepo)
	})

	// Handle user by ID (this needs to be last to avoid conflicts)
	mux.HandleFunc("/api/users/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Only GET method is allowed",
			})
			return
		}
		handler.GetUserByIDHandler(w, r, userRepo)
	})

	// Add health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"service": "auth-module",
		})
	})

	fmt.Println("\nAPI Endpoints:")
	fmt.Println("POST http://localhost:8080/register")
	fmt.Println("POST http://localhost:8080/login")
	fmt.Println("GET  http://localhost:8080/api/users")
	fmt.Println("GET  http://localhost:8080/api/users/all")
	fmt.Println("GET  http://localhost:8080/api/users/search")
	fmt.Println("GET  http://localhost:8080/api/users/count")
	fmt.Println("GET  http://localhost:8080/api/users/{id}")
	fmt.Println("GET  http://localhost:8080/health")

	// Determine which port to use
	preferredPort := 8080
	availablePort := findAvailablePort(preferredPort)

	if availablePort != preferredPort {
		fmt.Printf("⚠️   Port %d is  in use, using port %d instead\n", preferredPort, availablePort)
	}

	serverAddr := fmt.Sprintf(":%d", availablePort)

	// Create HTTP server
	server := &http.Server{
		Addr:         serverAddr,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to listen for interrupt signal to terminate gracefully
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		fmt.Printf("\n🚀 Server is running on http://localhost:%d\n", availablePort)
		fmt.Println("Press Ctrl+C to stop the server")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			if err.Error() == "listen tcp "+serverAddr+": bind: Only one usage of each socket address (protocol/network address/port) is normally permitted." {
				killProcessOnPort(availablePort)
			}
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-stop
	fmt.Println("\n🛑 Shutting down server...")

	// Create a deadline for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Shutdown server gracefully
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	fmt.Println("✅ Server stopped gracefully")
}
