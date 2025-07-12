# Clean Architecture Authentication System in Go

[➡️ Click here for a beginner-friendly presentation guide (PRESENTATION.md)](PRESENTATION.md)

This project implements a user authentication system following Clean Architecture principles as defined by Robert C. Martin (Uncle Bob). It demonstrates how to build scalable, maintainable, and testable software by organizing code into distinct layers with clear boundaries and dependencies.

## 🏗️ System Architecture Overview

The system follows the **Clean Architecture** pattern, which enforces a strict dependency rule: inner layers (business logic) should not depend on outer layers (frameworks, databases, UI). This creates a maintainable codebase where business logic is isolated from external concerns.

```
📁 Project Structure
auth-system/
├── cmd/
│   └── main.go           # 🚀 Application entry point & dependency injection
├── internal/
│   ├── domain/           # 🎯 Enterprise business rules (CORE)
│   │   ├── entity/
│   │   │   └── user.go   # User business entity with validation
│   │   └── repository/
│   │       └── user.go   # Repository interface (contract)
│   ├── usecase/         # 📋 Application business rules
│   │   └── auth/
│   │       ├── login.go  # Login business logic
│   │       └── register.go # Registration business logic
│   ├── interface/       # 🔌 Interface adapters
│   │   ├── repository/
│   │   │   └── postgres/
│   │   │       └── user.go # Database implementation
│   │   └── handler/
│   │       └── auth.go   # HTTP handlers
│   └── infrastructure/  # 🛠️ Frameworks and drivers
│       ├── database/
│       │   └── postgres.go # Database connection
│       └── token/
│           └── jwt.go    # JWT token management
└── pkg/                 # 📦 Shared utilities
    └── hash/
        └── bcrypt.go     # Password hashing utility
```

## 🎯 Clean Architecture Layers Explained

### 1. **Domain Layer** (Enterprise Business Rules) - The Heart ❤️

**Location**: `internal/domain/`

**Purpose**: Contains the core business logic and entities that represent the fundamental concepts of your application.

**Key Principles**:
- **Zero External Dependencies**: No imports from frameworks, databases, or external libraries
- **Business Rule Enforcement**: Entities validate their own state
- **Interface Definitions**: Repository interfaces define contracts without implementations

**Example from `user.go`**:
```go
// Pure business entity with validation
type User struct {
    ID        UserID
    Username  string
    Email     string
    Password  string
    // ... other fields
}

// Business rule: Email validation in the domain
func (u *User) ValidateEmail() error {
    if !strings.Contains(u.Email, "@") {
        return errors.New("invalid email format")
    }
    return nil
}
```

**Why This Matters**: Your business logic is protected from changes in frameworks, databases, or external services.

### 2. **Use Case Layer** (Application Business Rules) - The Brain 🧠

**Location**: `internal/usecase/`

**Purpose**: Orchestrates the flow of data between entities and coordinates business operations.

**Key Principles**:
- **Single Responsibility**: Each use case handles one specific business operation
- **Dependency Injection**: Depends on repository interfaces, not implementations
- **Business Logic Coordination**: Combines multiple domain entities to achieve business goals

**Example from `login.go`**:
```go
func Login(ctx context.Context, repo repository.UserRepository, email, password string) (bool, error) {
    // 1. Fetch user from repository (interface, not concrete implementation)
    user, err := repo.GetByEmail(ctx, email)
    if err != nil {
        return false, errors.New("user not found")
    }
    
    // 2. Verify password using domain logic
    if !hash.CheckPasswordHash(password, user.Password) {
        return false, errors.New("invalid password")
    }
    
    return true, nil
}
```

**Why This Matters**: Business logic is separated from infrastructure concerns and can be easily tested.

### 3. **Interface Layer** (Interface Adapters) - The Translator 🔄

**Location**: `internal/interface/`

**Purpose**: Converts data between the format most convenient for use cases and the format most convenient for external agencies (web, database).

**Key Components**:

#### **HTTP Handlers** (`handler/auth.go`):
- Convert HTTP requests to use case inputs
- Convert use case outputs to HTTP responses
- Handle HTTP-specific concerns (status codes, headers)

#### **Repository Implementations** (`repository/postgres/user.go`):
- Implement repository interfaces defined in the domain
- Convert between database models and domain entities
- Handle database-specific operations

**Example Flow**:
```
HTTP Request → Handler → Use Case → Repository Interface → Database Implementation
     ↓
HTTP Response ← Handler ← Use Case ← Repository Interface ← Database Implementation
```

### 4. **Infrastructure Layer** (Frameworks & Drivers) - The Plumbing 🔧

**Location**: `internal/infrastructure/`

**Purpose**: Contains all the external concerns like databases, web frameworks, and external services.

**Key Components**:
- **Database Connection**: PostgreSQL setup and configuration
- **JWT Token Management**: Token creation and validation
- **External Service Integrations**: Third-party APIs, email services, etc.

## 🎨 Clean Code Principles Demonstrated

### 1. **Dependency Inversion Principle (DIP)**
```
❌ BAD: Use Case → Concrete Database Implementation
✅ GOOD: Use Case → Repository Interface ← Database Implementation
```

The use cases depend on abstractions (interfaces), not concretions (database implementations).

### 2. **Single Responsibility Principle (SRP)**
- Each layer has a single reason to change
- Domain entities only change when business rules change
- Infrastructure only changes when external services change

### 3. **Open/Closed Principle (OCP)**
- Easy to add new features without modifying existing code
- Want to add email notifications? Create a new use case without touching existing ones
- Want to switch from PostgreSQL to MongoDB? Implement the repository interface for MongoDB

### 4. **Repository Pattern**
```go
// Interface in domain (what we need)
type UserRepository interface {
    Create(ctx context.Context, user *entity.User) (*entity.User, error)
    GetByEmail(ctx context.Context, email string) (*entity.User, error)
}

// Implementation in infrastructure (how we do it)
type PostgresUserRepository struct {
    db *gorm.DB
}
```

### 5. **Dependency Injection**
Dependencies are injected from the outside, making the code:
- **Testable**: Mock dependencies for unit tests
- **Flexible**: Swap implementations without changing business logic
- **Maintainable**: Clear separation of concerns

## 🔄 Data Flow Example: User Login

```
1. 🌐 HTTP Request (POST /login)
   ↓
2. 🔌 Handler (interface/handler/auth.go)
   - Validates request format
   - Extracts email/password
   ↓
3. 📋 Use Case (usecase/auth/login.go)
   - Calls repository to find user
   - Verifies password hash
   ↓
4. 🎯 Repository Interface (domain/repository/user.go)
   - Defines contract for data access
   ↓
5. 🛠️ Database Implementation (interface/repository/postgres/user.go)
   - Executes SQL query
   - Converts DB model to domain entity
   ↓
6. 📦 Password Verification (pkg/hash/bcrypt.go)
   - Compares hashed passwords
   ↓
7. 🔐 JWT Token Generation (infrastructure/token/jwt.go)
   - Creates authentication token
   ↓
8. 🌐 HTTP Response (Success/Error)
```

## 🧪 Testing Strategy

The clean architecture makes testing straightforward:

### **Unit Testing Use Cases**:
```go
func TestLogin(t *testing.T) {
    // Mock repository
    mockRepo := &MockUserRepository{}
    mockRepo.On("GetByEmail").Return(user, nil)
    
    // Test the use case
    result, err := Login(ctx, mockRepo, "test@example.com", "password")
    
    assert.NoError(t, err)
    assert.True(t, result)
}
```

### **Integration Testing**:
- Test repository implementations with real database
- Test HTTP handlers with test server

### **End-to-End Testing**:
- Test complete user journeys through HTTP API

## ✨ Benefits of This Architecture

### 🚀 **Maintainability**
- **Clear Separation**: Each layer has a single responsibility
- **Easy to Navigate**: Developers can quickly find and understand code
- **Reduced Complexity**: Changes in one layer don't cascade to others

### 🧪 **Testability**
- **Unit Testing**: Business logic can be tested without external dependencies
- **Mock Dependencies**: Repository interfaces can be easily mocked
- **Fast Tests**: Domain and use case tests run without database or HTTP calls

### 🔄 **Flexibility**
- **Database Agnostic**: Switch from PostgreSQL to MongoDB by implementing the repository interface
- **Framework Independent**: Business logic doesn't depend on Gin, can switch to any HTTP framework
- **Easy Integration**: Add new features without modifying existing code

### 📈 **Scalability**
- **Horizontal Scaling**: Each layer can be scaled independently
- **Microservices Ready**: Easy to extract use cases into separate services
- **Team Scaling**: Different teams can work on different layers

## 🎓 Teaching Points for Students

### **Key Concepts to Emphasize**:

1. **Dependency Direction**: Dependencies always point inward (toward business logic)
2. **Interface Segregation**: Small, focused interfaces are better than large ones
3. **Abstraction**: Program to interfaces, not implementations
4. **Single Source of Truth**: Business rules live in one place (domain layer)

### **Common Mistakes to Avoid**:

❌ **Putting business logic in handlers**
```go
// BAD: Business logic in HTTP handler
func LoginHandler(c *gin.Context) {
    email := c.PostForm("email")
    password := c.PostForm("password")
    
    // Business logic mixed with HTTP concerns
    if email == "" || password == "" {
        c.JSON(400, gin.H{"error": "missing fields"})
        return
    }
    
    // Direct database access in handler
    user := db.Where("email = ?", email).First(&User{})
    // ... more business logic
}
```

✅ **GOOD: Separation of concerns**
```go
// Handler only handles HTTP concerns
func LoginHandler(c *gin.Context) {
    email := c.PostForm("email")
    password := c.PostForm("password")
    
    // Delegate to use case
    result, err := authUseCase.Login(c.Request.Context(), email, password)
    if err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, gin.H{"token": result.Token})
}
```

### **Exercises for Students**:

1. **Add a new feature**: Implement password reset functionality following the same patterns
2. **Switch databases**: Implement the repository interface for a different database
3. **Add validation**: Enhance the User entity with more business rules
4. **Write tests**: Create unit tests for use cases using mock repositories

## 🛠️ Development Workflow

### **Adding a New Feature (Example: Email Verification)**:

1. **Start with Domain**: Define new entity properties and business rules
```go
// internal/domain/entity/user.go
type User struct {
    // ...existing fields...
    EmailVerified bool
    VerificationToken string
}
```

2. **Update Repository Interface**: Add new methods needed
```go
// internal/domain/repository/user.go
type UserRepository interface {
    // ...existing methods...
    UpdateEmailVerification(ctx context.Context, userID UserID, verified bool) error
}
```

3. **Create Use Case**: Implement business logic
```go
// internal/usecase/auth/verify_email.go
func VerifyEmail(ctx context.Context, repo repository.UserRepository, token string) error {
    // Business logic for email verification
}
```

4. **Implement Repository**: Add database implementation
```go
// internal/interface/repository/postgres/user.go
func (r *userRepository) UpdateEmailVerification(ctx context.Context, userID entity.UserID, verified bool) error {
    // Database implementation
}
```

5. **Add Handler**: Create HTTP endpoint
```go
// internal/interface/handler/auth.go
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
    // HTTP handling
}
```

## 📚 Further Reading and Resources

### **Books**:
- "Clean Architecture" by Robert C. Martin
- "Clean Code" by Robert C. Martin
- "Domain-Driven Design" by Eric Evans

### **Patterns Used**:
- **Repository Pattern**: Abstract data access
- **Dependency Injection**: Invert control of dependencies
- **Factory Pattern**: Create entities with validation
- **Adapter Pattern**: Convert between layer formats

### **Related Concepts**:
- **SOLID Principles**: Foundation of clean architecture
- **Domain-Driven Design (DDD)**: Designing software around business domains
- **Hexagonal Architecture**: Alternative name for clean architecture
- **Onion Architecture**: Similar layered approach

## Features

- User Registration
- User Login with JWT
- Password Hashing
- Repository Pattern
- Dependency Injection

## Features

- ✅ User Registration with validation
- ✅ User Login with JWT authentication
- ✅ Password Hashing (bcrypt)
- ✅ Repository Pattern implementation
- ✅ Dependency Injection
- ✅ Clean Architecture layers
- ✅ PostgreSQL database integration
- ✅ Docker containerization
- ✅ Comprehensive error handling
- ✅ Context-aware operations

## 🐳 Getting Started with Docker

### **Prerequisites**:
- Docker and Docker Compose installed
- Go 1.21+ (for local development)

### **Quick Start**:

1. **Clone and navigate to the project**:
```bash
git clone <repository-url>
cd CLEAN-CODE-Architecture/GO
```

2. **Start the application**:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Go application on port 8080

3. **Verify the setup**:
```bash
# Check running containers
docker-compose ps

# Check application logs
docker-compose logs app

# Test the API
curl http://localhost:8080/health
```

### **Environment Configuration**:

Create a `.env` file (if not exists) with:
```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=auth_db
JWT_SECRET=your-secret-key
PORT=8080
```

### **API Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create new user account |
| POST | `/login` | Authenticate user |
| GET | `/health` | Health check |
| GET | `/users` | List users (authenticated) |

### **Example API Usage**:

**Register a new user**:
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

## Dependencies

### **Core Dependencies**:
- **Go 1.21+**: Modern Go with generics support
- **PostgreSQL**: Reliable relational database
- **JWT (golang-jwt/jwt)**: Secure token-based authentication
- **Gin Web Framework**: Fast HTTP router
- **GORM**: Object-relational mapping for Go
- **bcrypt**: Secure password hashing
- **godotenv**: Environment variable management

### **Development Dependencies**:
- **Docker & Docker Compose**: Containerization
- **Postman Collection**: API testing (included)
- **Air** (optional): Live reload for development

## 🔧 Docker Management Commands

### **Container Management**:

**Stop the application**:
```bash
docker-compose down
```

**Stop and remove volumes (clean slate)**:
```bash
docker-compose down -v
```

**Remove the old Docker volume (if needed)**:
```bash
docker volume rm go_db
```

**Start with fresh configuration**:
```bash
docker-compose up -d --build
```

**View logs**:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f app
```

### **Database Management**:

**Check the created folder**:
```bash
# On Windows
dir postgres-data

# On Linux/Mac
ls -la postgres-data
```

**Connect to PostgreSQL directly**:
```bash
docker-compose exec postgres psql -U postgres -d auth_db
```

**Backup database**:
```bash
docker-compose exec postgres pg_dump -U postgres auth_db > backup.sql
```

**Restore database**:
```bash
docker-compose exec -T postgres psql -U postgres auth_db < backup.sql
```

### **Development Commands**:

**Rebuild application only**:
```bash
docker-compose up -d --build app
```

**Run without Docker (local development)**:
```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Run Go application locally
go run cmd/main.go
```

**Run tests**:
```bash
# Inside container
docker-compose exec app go test ./...

# Local
go test ./...
```

## 🚨 Troubleshooting

### **Common Issues**:

1. **Port 8080 already in use**:
```bash
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (Windows)
taskkill /PID <PID> /F

# Kill the process (Linux/Mac)
lsof -ti:8080 | xargs kill -9
```

2. **Database connection issues**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check PostgreSQL logs
docker-compose logs postgres
```

3. **Permission issues with postgres-data folder**:
```bash
# Remove the folder and restart
rm -rf postgres-data
docker-compose up -d
```

### **Health Checks**:

**Application health**:
```bash
curl http://localhost:8080/health
```

**Database connectivity**:
```bash
docker-compose exec app go run -c "
package main
import \"fmt\"
import \"auth-module/internal/infrastructure/database\"
func main() {
    db, err := database.NewPostgresDB()
    if err != nil {
        fmt.Printf(\"Database connection failed: %v\n\", err)
        return
    }
    fmt.Println(\"Database connected successfully!\")
}
"
```

## 🎯 Next Steps for Learning

### **Beginner Level**:
1. Understand each layer's responsibility
2. Trace a request from HTTP to database
3. Modify existing endpoints
4. Add simple validation rules

### **Intermediate Level**:
1. Implement new use cases (password reset, user profile)
2. Add unit tests for use cases
3. Create mock repositories for testing
4. Implement caching layer

### **Advanced Level**:
1. Add observability (logging, metrics, tracing)
2. Implement event-driven architecture
3. Add microservices communication
4. Performance optimization and profiling

---

📖 **For detailed step-by-step explanations, see [PRESENTATION.md](PRESENTATION.md)**