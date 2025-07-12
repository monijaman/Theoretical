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

## Stop the current container:

docker-compose down

## Remove the old Docker volume (optional):

docker volume rm go_db

## Start with new configuration:

docker-compose up -d

## Check the created folder:

dir postgres-data