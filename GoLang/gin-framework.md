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

The server listens on port `8080`, so open `http://localhost:8080`. If the port is already used, change it to another port such as `:3000`. For production, handle the returned error instead of ignoring it:

```go
if err := router.Run(":8080"); err != nil {
    log.Fatal(err)
}
```

Use `gin.New()` when you want to choose middleware yourself:

```go
router := gin.New()
router.Use(gin.Logger(), gin.Recovery())
```

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

Convert query values before using them as numbers and reject invalid input:

```go
limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
if err != nil || limit < 1 || limit > 100 {
    c.JSON(400, gin.H{"error": "limit must be between 1 and 100"})
    return
}
```

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

The JSON field names come from the `json` tags, not necessarily the Go field names. Binding is useful because it performs decoding and validation in one step. Keep request structs separate from database models so clients cannot accidentally set protected fields such as `ID`, `Role`, or `CreatedAt`.

For optional fields, use pointers when you need to distinguish “not provided” from a zero value:

```go
type UpdateUserRequest struct {
    Name *string `json:"name"`
}
```

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

The full route becomes `/api/v1/health`. Groups are useful for API versioning and for separating public and protected endpoints.

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

Middleware order matters. The first middleware runs before the handler, and its code after `c.Next()` runs after the handler:

```go
func timing() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next()
        log.Println(c.Request.Method, c.Request.URL.Path, time.Since(start))
    }
}
```

If middleware calls `Abort`, later handlers do not run. Use `c.Set` and `c.Get` to pass authenticated user information from middleware to a handler.

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

This example is intentionally simple: the slice disappears when the process stops, concurrent writes would need synchronization, and there is no pagination. A real API should put storage behind an interface and validate every input at the boundary.

A typical create response includes a `Location` header:

```go
created := User{ID: 2, Name: "Bob"}
c.Header("Location", "/users/2")
c.JSON(http.StatusCreated, created)
```

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

The usual request flow is:

```text
client -> router -> middleware -> handler -> service -> repository -> database
                                                <- response/error
```

The handler translates HTTP input into a service call. The service applies business rules, while the repository knows how to store and retrieve data. This separation makes each layer easier to test.

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

Test both success and failure paths: a valid ID should return `200`, a malformed ID should return `400`, and an unknown ID should return `404`. For JSON endpoints, set the content type and send a request body with `httptest.NewRequest`.

## 12. CORS and Static Files

Browsers may block requests from a different origin. Configure CORS deliberately with a middleware package rather than allowing every origin in production. Gin can also serve static assets:

```go
router.Static("/assets", "./public")
router.LoadHTMLGlob("templates/*")
```

Use static serving for simple assets; use a dedicated frontend or CDN when the application grows.

## 13. Authentication Boundary

Gin does not provide login or JWT authentication automatically. Middleware should verify a token, load the user, store the user ID in the context, and abort with `401` when verification fails. Authorization is a separate check: a valid user may still lack permission and should receive `403`.

```go
func requireUser(c *gin.Context) {
    token := c.GetHeader("Authorization")
    if token == "" {
        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
        return
    }
    c.Set("userID", 42) // replace with real token verification
    c.Next()
}
```

Never hard-code real secrets in source code; load them from environment variables or a secret manager.

## 14. Graceful Shutdown

A production server should stop accepting new requests and give active requests time to finish:

```go
server := &http.Server{Addr: ":8080", Handler: router}
go server.ListenAndServe()

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
server.Shutdown(ctx)
```

In a complete program, wait for `SIGINT` or `SIGTERM` before calling `Shutdown`. Always set timeouts so a stuck request cannot prevent the process from stopping forever.

## 15. Production Checklist

- Set `gin.ReleaseMode` in production.
- Validate body, path, and query input.
- Add request size limits and server timeouts.
- Return consistent JSON error shapes.
- Log request IDs and useful failure context, but never passwords or tokens.
- Use HTTPS at the edge or through a reverse proxy.
- Add tests for handlers, services, and repositories.
- Run `go test -race ./...` when shared state or concurrency is involved.

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
