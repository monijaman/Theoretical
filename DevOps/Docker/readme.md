# Docker: Containerize Applications

Docker helps you package an application and its dependencies into a portable environment called an image, then run it as a container. This makes local development, CI, and production deployment more consistent.

## Table of Contents

1. [Why Docker?](#why-docker)
2. [Docker basics](#docker-basics)
3. [Install Docker](#install-docker)
4. [Core commands](#core-commands)
5. [Dockerfile walkthrough](#dockerfile-walkthrough)
6. [Run a container](#run-a-container)
7. [Docker Compose](#docker-compose)
8. [Volumes and networking](#volumes-and-networking)
9. [Best practices](#best-practices)
10. [Common interview questions](#common-interview-questions)
11. [Troubleshooting](#troubleshooting)
12. [A Complete deployment](complete-deployment.md)
---

## Why Docker?

Docker solves a common problem in software delivery:

- The app works on one machine but fails on another.
- Dependencies, versions, OS libraries, and runtime config differ across environments.
- Deploying the exact same artifact into QA, staging, and production is hard.

With Docker, you build once and run anywhere with the same image.

### Key concepts

- Image: a read-only blueprint containing code, dependencies, environment, and startup instructions.
- Container: a running instance of an image.
- Dockerfile: a text file used to build an image.
- Registry: a place to store images, such as Docker Hub or Amazon ECR.

```text
Dockerfile -> build -> Image -> run -> Container
```

---

## Docker basics

### Image vs container

| Item | Meaning |
| --- | --- |
| Image | Static package of the app and its runtime |
| Container | Running process created from an image |
| Dockerfile | Recipe used to build the image |
| Volume | Persistent storage attached to a container |
| Network | Connection path between containers |

### Typical workflow

```bash
docker build -t myapp:latest .
docker run -d -p 3000:3000 --name myapp myapp:latest
docker ps
```

---

## Install Docker

### On Windows/macOS

Install Docker Desktop from the official Docker site and make sure the Docker engine is running.

### On Linux

Use the package manager for your distro, then verify:

```bash
docker --version
docker compose version
```

If Docker is running correctly, you should see version output.

---

## Core commands

### Image commands

```bash
# List local images
docker images

# Pull an image from Docker Hub
docker pull nginx:latest

# Build an image from Dockerfile
docker build -t myapp:latest .

# Remove an image
docker rmi myapp:latest
```

### Container commands

```bash
# Run a container in the background
docker run -d --name myapp -p 3000:3000 myapp:latest

# Show running containers
docker ps

# Show all containers, including stopped ones
docker ps -a

# Stop a container
docker stop myapp

# Start it again
docker start myapp

# Remove a stopped container
docker rm myapp

# View logs
docker logs -f myapp
```

### Useful inspection commands

```bash
# Inspect container details
docker inspect myapp

# Run a shell inside a container
docker exec -it myapp sh

# Show resource use
docker stats
```

---

## Dockerfile walkthrough

A Dockerfile is the instruction file for building an image.

### Example: Node.js app

```dockerfile
# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]
```

### Build it

```bash
docker build -t node-app:latest .
```

### Run it

```bash
docker run -d -p 3000:3000 --name node-app node-app:latest
```

### Common Dockerfile instructions

- `FROM`: base image
- `WORKDIR`: working directory inside the container
- `COPY`: copy files into the image
- `RUN`: execute commands during build
- `EXPOSE`: document the intended port
- `CMD`: default command when the container starts
- `ENTRYPOINT`: command that always runs
- `ENV`: set environment variables

---

## Run a container

### Example with Nginx

```bash
# Pull and run Nginx
docker run -d --name webserver -p 8080:80 nginx:latest
```

Then open:

```text
http://localhost:8080
```

### Example with environment variables

```bash
docker run -d --name myapp \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -p 3000:3000 \
  myapp:latest
```

### Example with restart policy

```bash
docker run -d --restart unless-stopped --name myapp -p 3000:3000 myapp:latest
```

Restart policies are useful for services that should come back automatically after the host reboots.

---

## Docker Compose

Compose is a tool for defining and running multi-container applications using a single YAML file.

### Example: `docker-compose.yml`

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

### Start the stack

```bash
docker compose up --build
```

### Stop the stack

```bash
docker compose down
```

### Useful Compose commands

```bash
docker compose ps
docker compose logs -f

docker compose exec app sh

docker compose down -v
```

The `-v` flag removes named volumes, which is helpful when you want a completely clean reset.

---

## Volumes and networking

### Docker volumes

Volumes store data outside the container filesystem, so data survives container restarts and removals.

```bash
# Create a named volume
docker volume create app-data

# Run a container using it
docker run -d -v app-data:/data myapp:latest
```

### Bind mounts

Bind mounts sync a folder on the host with a folder in the container.

```bash
docker run -d -v $(pwd):/app myapp:latest
```

This is very useful during development because code changes are reflected immediately.

### Docker networks

Containers can communicate using user-defined networks.

```bash
docker network create app-network

docker run -d --name db --network app-network postgres:15
docker run -d --name app --network app-network -p 3000:3000 myapp:latest
```

Containers on the same network can reach each other by name.

---

## Best practices

- Use small base images such as `alpine` where possible.
- Keep layers efficient by copying only necessary files first.
- Use `.dockerignore` to exclude large or unnecessary files.
- Avoid storing secrets in Dockerfiles.
- Use environment variables for configuration.
- Run one process per container when possible.
- Prefer named volumes for persistent data.
- Use multi-stage builds for production images.
- Keep images versioned and tag them clearly.
- Use `docker compose` for local development and `docker run` for simple single-container tasks.

### Example `.dockerignore`

```text
node_modules
npm-debug.log
.git
.env
```

### Multi-stage build example

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

This reduces image size and avoids shipping development tooling to production.

---

## Common interview questions

### 1. What is the difference between a Docker image and a container?

An image is a packaged application blueprint. A container is a running instance of that image.

### 2. Why use Docker in CI/CD?

It creates consistent build and test environments, reduces setup drift, and makes it easier to run the same app locally and in production.

### 3. What is a Dockerfile?

A Dockerfile is the recipe that tells Docker how to build an image.

### 4. What is a volume?

A volume is persistent storage mounted to a container so data survives container restarts or recreation.

### 5. What is Docker Compose used for?

Compose manages multi-container applications with one configuration file and simple commands such as `docker compose up` and `docker compose down`.

### 6. What is the purpose of `.dockerignore`?

It prevents unnecessary or sensitive files from being copied into the image, which helps speed up builds and reduce image size.

### 7. Why are multi-stage builds useful?

They let you build artifacts in one stage and copy only the necessary runtime files into the final image.

### 8. What is the difference between `CMD` and `ENTRYPOINT`?

`CMD` provides the default command for a container, while `ENTRYPOINT` defines a command that should always run, with optional arguments provided via `CMD`.

---

## Troubleshooting

### Container exits immediately

Check the logs:

```bash
docker logs myapp
```

Common causes include:

- invalid startup command
- missing environment variables
- missing dependencies or wrong working directory
- port mismatch

### Port is not reachable

Verify the container is running and the port mapping is correct:

```bash
docker ps

docker port myapp
```

Also check whether the app inside the container is listening on the expected port.

### Image build fails

Look at the failing `RUN` step and rebuild with verbose output:

```bash
docker build -t myapp:latest .
```

### Permission or file issue

If files copied into the image are unreadable or the app cannot write to a directory, verify file ownership, permissions, and mounted volumes.

### `docker: permission denied`

On Linux, you may need to add your user to the Docker group or use `sudo` for initial setup.

---

## Quick reference

```bash
# Build image
docker build -t app:latest .

# Run container
docker run -d --name app -p 3000:3000 app:latest

# View logs
docker logs -f app

# Stop container
docker stop app

# Remove container
docker rm app

# List images
docker images

# List containers
docker ps -a

# Start Compose stack
docker compose up --build

# Stop Compose stack
docker compose down
```

---

## Final takeaway

Docker is a core tool in modern software engineering because it standardizes how applications are built, shipped, and run. If you understand images, containers, Dockerfiles, Compose, volumes, and networking, you will be well prepared for real-world development and system design interviews.

Practice by building a small Node.js or Python app, writing a Dockerfile, then running it with Docker Compose and a database. That combination gives you a strong foundation for backend, DevOps, and production engineering work.
