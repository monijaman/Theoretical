.PHONY: dev build run clean install-air

# Development with hot reload
dev:
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Air not found. Installing..."; \
		go install github.com/air-verse/air@latest; \
		air; \
	fi

# Install air
install-air:
	go install github.com/air-verse/air@latest

# Build the application
build:
	go build -o bin/main main.go

# Run without hot reload
run:
	go run main.go

# Clean build artifacts
clean:
	rm -rf tmp/ bin/ build-errors.log
