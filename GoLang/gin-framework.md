# Go Gin Framework — Practical Lessons

Gin is a lightweight Go web framework for building HTTP APIs. It provides routing, middleware, JSON responses, and request binding.

## 1. Install Gin

```bash
go mod init example.com/gin-demo
go get github.com/gin-gonic/gin
```

## 2. First Server

```go
package main

import "github.com/gin-gonic/gin"

func main() {
    router := gin.Default()
    router.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "Hello, Gin!"})
    })
    router.Run(":8080")
}
```

`gin.Default()` creates a router with logging and recovery middleware. `gin.Context` contains the request and helps create the response.

## 3. Routes and HTTP Methods

```go
router.GET("/users", listUsers)
router.POST("/users", createUser)
router.PUT("/users/:id", updateUser)
router.DELETE("/users/:id", deleteUser)
```

Path parameters are read with `c.Param`:

```go
func getUser(c *gin.Context) {
    id := c.Param("id")
    c.JSON(200, gin.H{"userID": id})
}

router.GET("/users/:id", getUser)
```

## 4. Query Parameters

For `/users?role=admin&limit=10`:

```go
func searchUsers(c *gin.Context) {
    role := c.DefaultQuery("role", "user")
    limit := c.Query("limit")
    c.JSON(200, gin.H{"role": role, "limit": limit})
}
```

`Query` returns an empty string when missing. `DefaultQuery` provides a fallback.

## 5. JSON Request Bodies and Validation

```go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"required,email"`
}

func createUser(c *gin.Context) {
    var request CreateUserRequest
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    c.JSON(201, gin.H{"message": "user created", "user": request})
}
```

`ShouldBindJSON` parses JSON and checks validation tags. Always return after sending an error response.

## 6. Response Status Codes

```go
c.JSON(200, gin.H{"message": "success"})
c.String(200, "hello")
c.Status(204)
c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
```

| Code | Meaning | Typical use |
|---|---|---|
| `200` | OK | Successful read or update |
| `201` | Created | Successful create |
| `204` | No Content | Successful delete |
| `400` | Bad Request | Invalid input |
| `401` | Unauthorized | Missing or invalid login |
| `404` | Not Found | Resource does not exist |
| `500` | Server Error | Unexpected failure |

## 7. Route Groups

Groups organize routes and share middleware:

```go
api := router.Group("/api/v1")
{
    api.GET("/health", healthCheck)
    api.GET("/users", listUsers)
}
```

## 8. Middleware

Middleware runs before or after a handler. Call `c.Next()` to continue.

```go
func requireAPIKey(c *gin.Context) {
    if c.GetHeader("X-API-Key") != "secret" {
        c.AbortWithStatusJSON(401, gin.H{"error": "invalid API key"})
        return
    }
    c.Next()
}

router.Use(requireAPIKey)
```

Use authentication middleware on protected route groups when public routes also exist.

## 9. Small API Example

```go
type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

var users = []User{{ID: 1, Name: "Alice"}}

func listUsers(c *gin.Context) {
    c.JSON(200, users)
}

func getUser(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid user ID"})
        return
    }
    for _, user := range users {
        if user.ID == id {
            c.JSON(200, user)
            return
        }
    }
    c.JSON(404, gin.H{"error": "user not found"})
}
```

The example needs `strconv` and the Gin package imports. In a real application, replace the in-memory slice with a database repository.

## 10. Recommended Structure

```text
gin-api/
├── cmd/server/main.go       # entry point
├── internal/handler/        # HTTP handlers
├── internal/service/        # business logic
├── internal/repository/     # database access
├── internal/model/          # structs and data models
└── go.mod
```

Keep handlers focused on HTTP concerns. Put business rules in services and database queries in repositories.

## 11. Testing a Handler

Use `httptest.NewRequest`, `httptest.NewRecorder`, and `router.ServeHTTP` to test a handler without starting a real server.

```go
func TestGetUser(t *testing.T) {
    gin.SetMode(gin.TestMode)
    router := gin.New()
    router.GET("/users/:id", getUser)
    request := httptest.NewRequest(http.MethodGet, "/users/1", nil)
    response := httptest.NewRecorder()
    router.ServeHTTP(response, request)
    if response.Code != http.StatusOK {
        t.Fatalf("expected 200, got %d", response.Code)
    }
}
```

Run tests with `go test ./...`.

## Quick Reference

| Gin term | Simple meaning |
|---|---|
| `gin.Engine` | The main router and server configuration. |
| `gin.Context` | Request, response, route data, and helper methods. |
| Handler | Function that processes one HTTP request. |
| Middleware | Function that runs around handlers. |
| Route group | Shared URL prefix and middleware boundary. |
| `ShouldBindJSON` | Parses and validates a JSON body. |
| `c.Param` | Reads a path parameter such as `:id`. |
| `c.Query` | Reads a URL query parameter. |
| `c.JSON` | Sends a JSON response. |

## Good Practices

1. Validate input before using it.
2. Return immediately after sending an error response.
3. Use meaningful HTTP status codes.
4. Keep handlers small and move business logic into services.
5. Never expose secrets or internal errors in API responses.
