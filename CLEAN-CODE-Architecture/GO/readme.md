# Clean Architecture Authentication System in Go

[➡️ Click here for a beginner-friendly presentation guide (PRESENTATION.md)](PRESENTATION.md)

This project implements a user authentication system following Clean Architecture principles.

## Project Structure

```
auth-system/
├── cmd/
│   └── main.go           # Application entry point
├── internal/
│   ├── domain/           # Enterprise business rules
│   │   ├── entity/
│   │   │   └── user.go
│   │   └── repository/
│   │       └── user.go
│   ├── usecase/         # Application business rules
│   │   └── auth/
│   │       ├── login.go
│   │       └── register.go
│   ├── interface/       # Interface adapters
│   │   ├── repository/
│   │   │   └── postgres/
│   │   │       └── user.go
│   │   └── handler/
│   │       └── auth.go
│   └── infrastructure/  # Frameworks and drivers
│       ├── database/
│       │   └── postgres.go
│       └── token/
│           └── jwt.go
└── pkg/                 # Shared packages
    └── hash/
        └── bcrypt.go
```

## Clean Architecture Layers

1. **Domain Layer** (Enterprise Business Rules)

   - Contains user entity and repository interfaces
   - Pure business logic, no dependencies on external packages

2. **Use Case Layer** (Application Business Rules)

   - Implements authentication logic (login, register)
   - Depends on domain layer

3. **Interface Layer** (Interface Adapters)

   - HTTP handlers
   - Database implementations
   - Converts data between layers

4. **Infrastructure Layer** (Frameworks & Drivers)
   - Database connection
   - JWT token management
   - External services

## Features

- User Registration
- User Login with JWT
- Password Hashing
- Repository Pattern
- Dependency Injection

## Dependencies

- Go 1.21+
- PostgreSQL
- JWT for authentication
- Gin web framework
- GORM (Optional)
- [bcrypt password hashing](https://pkg.go.dev/golang.org/x/crypto/bcrypt)


# Go Commain

### go mod tidy

- It removes unused dependencies.
- It adds any missing module requirements for imports in your code.
- It updates your go.mod and go.sum files to reflect exactly what's needed.

need to install to run env
npm install -g nodemon

npm install --save-dev cross-env

server:
nodemon --watch './\*_/_.go' --signal SIGTERM --exec APP_ENV=dev 'go' run main.goa

## start app

air

it will run and check for file changes

## post with CURL

curl -X POST http://localhost:9000/register -d '{"email": "test@example.com", "password": "password123"}' -H "Content-Type: application/json"

curl -X POST http://localhost:9000/login -d '{"email": "test@example.com", "password": "password123"}' -H "Content-Type: application/json"

# use air for live file server changes

C:\Users\<YourUsername>\go\bin

## install

go install github.com/cosmtrek/air@latest

C:\Users\<YourUsername>\go\bin

## Step 2: Add Go bin to Windows PATH

## Step 3: Confirm it’s working

air -v

## run air

cd path\to\your\go-project
air
