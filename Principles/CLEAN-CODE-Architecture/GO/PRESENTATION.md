# Clean Architecture Authentication System in Go — Presentation Guide

Welcome! This guide is designed to help you present and explain your Go authentication project using Clean Architecture to students.

---

## 1. What is Clean Architecture?

- **Clean Architecture** is a way to organize code so that each part has a clear job.
- Business logic is at the center and does not depend on frameworks or databases.
- Makes code easier to test, change, and maintain.

---

## 2. Project Structure (Visual)

```
auth-system/
├── cmd/                  # App entry point
│   └── main.go
├── internal/
│   ├── domain/           # Core business logic (entities, interfaces)
│   ├── usecase/          # Application logic (register, login)
│   ├── interface/        # Adapters (HTTP handlers, DB impl)
│   └── infrastructure/   # Frameworks (DB, JWT, Kafka)
└── pkg/                  # Shared code (e.g., password hashing)
```

---

## 3. Layers Explained (Simple)

- **Domain Layer:** User struct, repository interface (pure business rules)
- **Use Case Layer:** Register and login logic (no frameworks)
- **Interface Layer:** HTTP handlers, DB implementations (adapts input/output)
- **Infrastructure Layer:** Database connection, JWT, Kafka (details that can change)

---

## 4. How the Parts Work Together

1. User sends a request (e.g., register) to the HTTP handler.
2. Handler calls the use case (register logic).
3. Use case uses the repository interface to save the user.
4. Repository implementation talks to the database.
5. Infrastructure handles the actual DB connection.

---

## 5. Setup & Run (Step-by-Step)

### 1. Install Go and PostgreSQL

- [Go download](https://go.dev/dl/)
- [PostgreSQL download](https://www.postgresql.org/download/)

### 2. Create a Database

```sh
createdb -U postgres authdb
```

### 3. Set Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/authdb?sslmode=disable
JWT_SECRET=your_jwt_key
KAFKA_BROKER=localhost:9092
```

### 4. Install Dependencies

```sh
go mod init auth-module
go get github.com/lib/pq
go get github.com/joho/godotenv
go get golang.org/x/crypto/bcrypt
```

### 5. Run the App

```sh
go run ./cmd/main.go
```

### 6. Test the API

> **Note:**
> Make sure your Go server registers the `/register` and `/login` endpoints using `http.HandleFunc` or your web framework. If you get a 404 error, check your route registration in main.go.

- **Register:**
  - Method: POST
  - URL: `http://localhost:8080/register`
  - Body (JSON):
    ```json
    {
      "username": "alice",
      "email": "alice@example.com",
      "password": "password123"
    }
    ```
- **Login:**
  - Method: POST
  - URL: `http://localhost:8080/login`
  - Body (JSON):
    ```json
    {
      "email": "alice@example.com",
      "password": "password123"
    }
    ```

---

## 6. Troubleshooting

- **Database connection failed:**
  - Make sure Postgres is running and your password is correct.
  - See the password setup section below.
- **psql not found (Windows):**
  - Add the Postgres `bin` directory to your PATH (see instructions below).
- **.env not loaded:**
  - Make sure you have `github.com/joho/godotenv` and your `.env` file is in the project root.

---

## 7. How to Set or Change the Password for the "postgres" User in PostgreSQL

1. Open a terminal or command prompt.
2. Connect to PostgreSQL as the "postgres" user:
   ```sh
   psql -U postgres
   ```
   (If prompted for a password and you don't know it, try running as the system user that installed Postgres, or use `sudo -u postgres psql` on Linux.)
3. Set a new password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'yournewpassword';
   ```
4. Update your `.env` file:
   ```env
   DATABASE_URL=postgres://postgres:yournewpassword@localhost:5432/authdb?sslmode=disable
   ```
5. Restart your Go app.

**Note for Windows users:**
If you see an error like `'psql' is not recognized as an internal or external command`, add the PostgreSQL `bin` directory to your system PATH:

1. Find where PostgreSQL is installed (e.g., `C:\Program Files\PostgreSQL\17\bin`).
2. Open the Start menu and search for "Environment Variables".
3. Click "Edit the system environment variables" > "Environment Variables...".
4. Under "System variables", find and select the `Path` variable, then click "Edit...".
5. Click "New" and add the path to your PostgreSQL `bin` directory.
6. Click OK to save and restart your terminal.

---

## 8. Clean Architecture Benefits (Recap)

- Easy to test and maintain
- Swap out frameworks or databases with minimal changes
- Business logic is protected from outside changes

---

## 9. For You

- Ask questions about any layer or file!
- Try changing the database or adding a new feature (like password reset)
- Practice writing tests for the use cases

---

## How to Migrate the Database Schema (AutoMigrate)

You can automatically create or update your database tables to match your Go structs using GORM's AutoMigrate feature.

### 1. Install GORM and the Postgres driver

```sh
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

### 2. Update your main.go

- Import GORM and your User entity.
- Use the following code to connect and migrate:

```go
import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "auth-module/internal/domain/entity"
    // ...
)

func main() {
    // ...
    db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})
    if err != nil {
        log.Fatalf("GORM database connection failed: %v", err)
    }
    if err := db.AutoMigrate(&entity.User{}); err != nil {
        log.Fatalf("AutoMigrate failed: %v", err)
    }
    log.Println("Database migration complete!")
}
```

### 3. Run your app

```sh
go run ./cmd/main.go
```

- This will create or update the `users` table in your database to match your User struct.

---

Good luck and have fun learning Clean Architecture in Go!
