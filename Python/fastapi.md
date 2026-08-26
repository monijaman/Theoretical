# FastAPI — A Friendly, Practical Tutorial

Build a clean REST API with Python, type hints, automatic validation, and interactive documentation. This guide starts with one endpoint and gradually builds a complete **Task API** with CRUD operations, error handling, dependencies, tests, and a production-friendly structure.

> **You should know:** basic Python, functions, dictionaries, classes, and type hints. If those are new, read the [Python guide](readme.md) first.

---

## Table of Contents

1. [What is FastAPI?](#1-what-is-fastapi)
2. [Project Setup](#2-project-setup)
3. [Your First API](#3-your-first-api)
4. [How an API Request Works](#4-how-an-api-request-works)
5. [Path and Query Parameters](#5-path-and-query-parameters)
6. [Request Bodies and Validation](#6-request-bodies-and-validation)
7. [Build a CRUD Task API](#7-build-a-crud-task-api)
8. [Status Codes and Error Handling](#8-status-codes-and-error-handling)
9. [Dependencies](#9-dependencies)
10. [Async or Regular `def`?](#10-async-or-regular-def)
11. [Split a Real Project into Files](#11-split-a-real-project-into-files)
12. [Database Basics with SQLAlchemy](#12-database-basics-with-sqlalchemy)
13. [Authentication Basics](#13-authentication-basics)
14. [Testing](#14-testing)
15. [CORS](#15-cors)
16. [Configuration and Environment Variables](#16-configuration-and-environment-variables)
17. [Run in Production](#17-run-in-production)
18. [Common Mistakes](#18-common-mistakes)
19. [Cheat Sheet](#19-cheat-sheet)
20. [Practice Challenges](#20-practice-challenges)

---

## 1. What is FastAPI?

FastAPI is a Python framework for building web APIs. It uses standard Python type hints to provide:

- request validation
- automatic JSON conversion
- clear error messages
- interactive API documentation
- editor autocomplete and type checking
- support for both synchronous and asynchronous code

Here is the core idea:

```python
@app.get("/hello/{name}")
def say_hello(name: str):
    return {"message": f"Hello, {name}!"}
```

The decorator says, “Run this function when a `GET` request reaches `/hello/{name}`.” The `str` type hint tells FastAPI how to validate and document `name`.

---

## 2. Project Setup

Create a folder and a virtual environment:

```bash
mkdir fastapi-task-api
cd fastapi-task-api

python3 -m venv .venv
source .venv/bin/activate       # Linux or macOS
# .venv\Scripts\activate        # Windows PowerShell
```

Install FastAPI and the development server:

```bash
python -m pip install "fastapi[standard]"
```

Create `main.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Welcome to the Task API"}
```

Start the development server:

```bash
fastapi dev main.py
```

Open these pages:

- API: <http://127.0.0.1:8000>
- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>

The server reloads when you save a file. Press `Ctrl+C` to stop it.

### Give the documentation a title

```python
app = FastAPI(
    title="Task API",
    description="A beginner-friendly API for managing tasks.",
    version="1.0.0",
)
```

---

## 3. Your First API

An endpoint combines an HTTP method, a path, and a Python function:

```python
@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

FastAPI converts the returned dictionary into JSON:

```json
{
  "status": "healthy"
}
```

Common HTTP methods:

| Method | Typical purpose | Example |
|---|---|---|
| `GET` | Read data | Get all tasks |
| `POST` | Create data | Add a task |
| `PUT` | Replace data | Replace a complete task |
| `PATCH` | Update part of data | Change only task status |
| `DELETE` | Delete data | Remove a task |

Try the endpoint in `/docs` or from a terminal:

```bash
curl http://127.0.0.1:8000/health
```

---

## 4. How an API Request Works

When a client sends a request, FastAPI:

1. matches the HTTP method and URL to an endpoint
2. reads values from the path, query string, headers, or body
3. validates those values using your type hints and models
4. calls your function if the data is valid
5. converts the returned value into a JSON response

Invalid input normally receives status `422 Unprocessable Entity` with details explaining which field is wrong.

---

## 5. Path and Query Parameters

### Path parameters

A path parameter identifies a specific resource:

```python
@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    return {"task_id": task_id}
```

`GET /tasks/12` works. `GET /tasks/hello` fails validation because `task_id` must be an integer.

Add numeric rules with `Path`:

```python
from fastapi import Path


@app.get("/tasks/{task_id}")
def get_task(task_id: int = Path(gt=0, description="The task ID")):
    return {"task_id": task_id}
```

### Query parameters

Query parameters usually filter, sort, or paginate results:

```python
@app.get("/tasks")
def list_tasks(completed: bool | None = None, limit: int = 10):
    return {"completed": completed, "limit": limit}
```

Example URL:

```text
/tasks?completed=false&limit=5
```

A parameter with a default value is optional. A parameter without a default is required.

Use `Query` for additional validation:

```python
from typing import Annotated
from fastapi import Query


@app.get("/search")
def search(
    q: Annotated[str, Query(min_length=2, max_length=50)],
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
):
    return {"query": q, "limit": limit}
```

---

## 6. Request Bodies and Validation

Clients send data for a new task in the request body. Define its shape with a Pydantic model:

```python
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    completed: bool = False


@app.post("/tasks")
def create_task(task: TaskCreate):
    return task
```

Valid JSON:

```json
{
  "title": "Learn FastAPI",
  "description": "Finish the CRUD tutorial"
}
```

FastAPI rejects a missing or empty `title`, a title longer than 100 characters, and a non-boolean `completed` value it cannot parse.

### Input models and output models

Separate models make an API safer and clearer:

```python
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = None


class TaskResponse(TaskCreate):
    id: int
    completed: bool
```

- `TaskCreate` describes what a client may send.
- `TaskResponse` describes what the API promises to return.

A response model validates output and prevents accidental extra fields from leaking:

```python
@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate):
    return {"id": 1, **task.model_dump(), "completed": False}
```

---

## 7. Build a CRUD Task API

This complete example uses an in-memory dictionary. Data disappears whenever the server restarts, which is perfect for learning. A database comes later.

Replace `main.py` with:

```python
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

app = FastAPI(title="Task API", version="1.0.0")


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    completed: bool | None = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    completed: bool = False


tasks: dict[int, TaskResponse] = {}
next_id = 1


@app.get("/", tags=["General"])
def home():
    return {"message": "Welcome to the Task API"}


@app.get("/tasks", response_model=list[TaskResponse], tags=["Tasks"])
def list_tasks(
    completed: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    results = list(tasks.values())
    if completed is not None:
        results = [task for task in results if task.completed == completed]
    return results[offset : offset + limit]


@app.get("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def get_task(task_id: int):
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Tasks"],
)
def create_task(task_data: TaskCreate):
    global next_id

    task = TaskResponse(id=next_id, **task_data.model_dump())
    tasks[next_id] = task
    next_id += 1
    return task


@app.patch("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def update_task(task_id: int, task_data: TaskUpdate):
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    changes = task_data.model_dump(exclude_unset=True)
    updated_task = task.model_copy(update=changes)
    tasks[task_id] = updated_task
    return updated_task


@app.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Tasks"],
)
def delete_task(task_id: int) -> Response:
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    del tasks[task_id]
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

### Try the complete flow

Create a task:

```bash
curl -X POST http://127.0.0.1:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn FastAPI","description":"Build a Task API"}'
```

List tasks:

```bash
curl "http://127.0.0.1:8000/tasks?completed=false"
```

Update task `1`:

```bash
curl -X PATCH http://127.0.0.1:8000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

Delete task `1`:

```bash
curl -X DELETE http://127.0.0.1:8000/tasks/1
```

### Why `exclude_unset=True` matters

For a partial update, omitted fields must stay unchanged. `model_dump(exclude_unset=True)` includes only fields the client actually sent. Without it, default `None` values could overwrite existing data.

---

## 8. Status Codes and Error Handling

Use meaningful HTTP status codes:

| Code | Meaning | Typical use |
|---|---|---|
| `200 OK` | Request succeeded | Read or update |
| `201 Created` | Resource created | Successful `POST` |
| `204 No Content` | Success, no response body | Successful delete |
| `400 Bad Request` | Request violates a business rule | Invalid operation |
| `401 Unauthorized` | Authentication required or invalid | Missing/bad token |
| `403 Forbidden` | Authenticated but not allowed | Insufficient permission |
| `404 Not Found` | Resource does not exist | Unknown task ID |
| `409 Conflict` | Resource conflicts with current state | Duplicate unique value |
| `422 Unprocessable Entity` | Input validation failed | Wrong field type |
| `500 Internal Server Error` | Unexpected server failure | Unhandled error |

Raise `HTTPException` for expected API errors:

```python
from fastapi import HTTPException


if task is None:
    raise HTTPException(
        status_code=404,
        detail="Task not found",
    )
```

Do not return an error-looking dictionary with a successful `200` status:

```python
# Avoid this
return {"error": "Task not found"}
```

---

## 9. Dependencies

A dependency is reusable logic FastAPI runs before an endpoint. It is useful for authentication, database sessions, pagination, and shared validation.

```python
from typing import Annotated
from fastapi import Depends, Header, HTTPException


def verify_api_key(x_api_key: Annotated[str | None, Header()] = None):
    if x_api_key != "learning-secret":
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@app.get("/private-tasks")
def private_tasks(api_key: Annotated[str, Depends(verify_api_key)]):
    return {"message": "You may view private tasks"}
```

Call it with:

```bash
curl http://127.0.0.1:8000/private-tasks \
  -H "X-API-Key: learning-secret"
```

Never hard-code real secrets in source code. The example is only for understanding dependencies.

---

## 10. Async or Regular `def`?

FastAPI supports both:

```python
@app.get("/sync")
def sync_endpoint():
    return {"style": "sync"}


@app.get("/async")
async def async_endpoint():
    return {"style": "async"}
```

Use `async def` when the libraries you call are awaitable:

```python
result = await async_database.fetch_all(...)
```

Use regular `def` when calling blocking libraries that do not support `await`. FastAPI runs regular endpoint functions in a thread pool so they do not directly block the event loop.

Important rules:

- `async` helps I/O-bound work such as database and network calls.
- It does not automatically make CPU-heavy work faster.
- Never use blocking calls such as `time.sleep()` inside `async def`; use `await asyncio.sleep()` or a suitable non-blocking library.
- Do not add `async` everywhere unless the code genuinely awaits asynchronous operations.

---

## 11. Split a Real Project into Files

As the API grows, move related responsibilities into separate modules:

```text
app/
├── __init__.py
├── main.py
├── config.py
├── database.py
├── models.py          # database models
├── schemas.py         # request/response models
├── dependencies.py
└── routers/
    ├── __init__.py
    └── tasks.py
tests/
└── test_tasks.py
```

`app/routers/tasks.py`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("")
def list_tasks():
    return []
```

`app/main.py`:

```python
from fastapi import FastAPI
from app.routers import tasks

app = FastAPI(title="Task API")
app.include_router(tasks.router)
```

Run the package-based app:

```bash
fastapi dev app/main.py
```

Keep route functions focused on HTTP concerns. Put business rules in service functions and database work in repository or data-access functions when the project becomes larger.

---

## 12. Database Basics with SQLAlchemy

The in-memory dictionary is not persistent and cannot safely serve multiple processes. A real app normally uses a database.

Install SQLAlchemy and a migration tool:

```bash
python -m pip install sqlalchemy alembic
```

A minimal synchronous SQLite setup:

```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./tasks.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

A database model:

```python
# app/models.py
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
```

Use the session as a dependency:

```python
from typing import Annotated
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("")
def list_tasks(db: DatabaseSession):
    return db.query(Task).all()
```

For a real project, use Alembic migrations to create and change tables. Calling `create_all()` can be convenient for a tiny demo, but migrations give you a reviewable database history.

---

## 13. Authentication Basics

A common token flow is:

1. the user sends credentials to a login endpoint
2. the server verifies the password hash
3. the server returns a short-lived access token
4. the client sends `Authorization: Bearer <token>`
5. a dependency validates the token and loads the current user

FastAPI provides security helpers, but your application still needs secure password hashing, token verification, expiration, secret management, and authorization rules.

```python
from typing import Annotated
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    user = verify_and_decode_token(token)  # Implement with a trusted JWT library
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user
```

Security reminders:

- hash passwords with a modern password-hashing library; never store plaintext passwords
- keep signing keys in environment variables or a secret manager
- use HTTPS in production
- give tokens an expiration time
- distinguish authentication (“who are you?”) from authorization (“may you do this?”)
- do not invent your own cryptography

---

## 14. Testing

Install the test tools:

```bash
python -m pip install pytest httpx
```

Create `test_main.py` beside `main.py`:

```python
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_home():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Task API"}


def test_create_task():
    response = client.post(
        "/tasks",
        json={"title": "Test the API", "description": "Use pytest"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Test the API"
    assert body["completed"] is False
    assert isinstance(body["id"], int)


def test_rejects_empty_title():
    response = client.post("/tasks", json={"title": ""})

    assert response.status_code == 422


def test_missing_task_returns_404():
    response = client.get("/tasks/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found"}
```

Run the suite:

```bash
pytest -q
```

Good API tests cover the happy path, invalid input, missing resources, authorization, and important business rules. In database tests, replace the production database dependency with an isolated test database.

---

## 15. CORS

If a browser frontend runs on a different origin, the browser may require Cross-Origin Resource Sharing (CORS) headers:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

An origin includes the scheme, host, and port. `http://localhost:5173` and `http://localhost:3000` are different origins.

In production, list the frontend origins explicitly. Avoid a wide-open configuration, especially when credentials are allowed.

---

## 16. Configuration and Environment Variables

Configuration changes between development, testing, and production. Read it from the environment instead of hard-coding it.

Install the settings package:

```bash
python -m pip install pydantic-settings
```

```python
# app/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Task API"
    database_url: str = "sqlite:///./tasks.db"
    secret_key: str

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Local `.env` file:

```dotenv
SECRET_KEY=replace-this-development-value
DATABASE_URL=sqlite:///./tasks.db
```

Add `.env` to `.gitignore`. Commit an `.env.example` containing placeholder values so teammates know which variables are required.

---

## 17. Run in Production

The development server is optimized for development and auto-reloading. A simple production command is:

```bash
fastapi run app/main.py
```

Before deploying:

- store secrets outside source control
- use a production database and migrations
- restrict CORS to known origins
- serve through HTTPS
- add structured logs and health checks
- set request/body limits at the proxy or platform layer
- run tests and pin dependency versions
- choose worker counts based on measurement, memory, and workload
- avoid storing application state only in process memory

Container platforms often expect the app to listen on all interfaces and use a provided port. Follow the platform's process and health-check conventions.

---

## 18. Common Mistakes

### Putting a fixed route after a dynamic route

Declare `/users/me` before `/users/{user_id}`. Otherwise, FastAPI may try to interpret `me` as a user ID.

### Confusing Pydantic models with database models

Pydantic models validate API data. SQLAlchemy models map Python objects to database tables. They may look similar, but they have different jobs.

### Returning database-only fields

Use response models so password hashes, internal flags, and other private fields cannot accidentally appear in JSON.

### Using `async def` with blocking work

Blocking database drivers, file operations, and HTTP libraries can freeze the event loop when called directly in an async endpoint. Use async-compatible libraries or a regular `def` endpoint.

### Trusting input without business validation

Pydantic can confirm that `quantity` is an integer greater than zero. Your service must still confirm that inventory exists and the user may purchase it.

### Using mutable in-memory state in production

Multiple workers do not share the same Python dictionary. Restarts also erase it. Persist shared state in a database, cache, or another external service.

### Catching every exception

Avoid broad `except Exception` blocks that hide programming errors. Handle expected failures deliberately, log unexpected errors, and return safe messages.

---

## 19. Cheat Sheet

```python
# Application
app = FastAPI(title="My API")

# Routes
@app.get("/items")
@app.get("/items/{item_id}")
@app.post("/items", status_code=201)
@app.patch("/items/{item_id}")
@app.delete("/items/{item_id}", status_code=204)

# Request model
class ItemCreate(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(gt=0)

# Error
raise HTTPException(status_code=404, detail="Item not found")

# Dependency
def common_dependency():
    return "value"

@app.get("/example")
def example(value: Annotated[str, Depends(common_dependency)]):
    return {"value": value}

# Run development server
# fastapi dev main.py

# Interactive docs
# http://127.0.0.1:8000/docs
```

---

## 20. Practice Challenges

Build these in order:

1. Add a `priority` field with allowed values `low`, `medium`, and `high`.
2. Add a case-insensitive title search using `?q=fastapi`.
3. Add a `PUT /tasks/{task_id}` endpoint that replaces a full task.
4. Reject creating two active tasks with the same title using status `409`.
5. Add created and updated timestamps.
6. Move the router and schemas into separate files.
7. Replace the in-memory dictionary with SQLite and SQLAlchemy.
8. Add tests for filtering, updating, and deleting.
9. Protect write endpoints with authentication.
10. Deploy the API and connect it to a small frontend.

### Final mental model

Most FastAPI applications follow the same flow:

```text
HTTP request
    ↓
route + dependency checks
    ↓
Pydantic validation
    ↓
business logic
    ↓
database or external service
    ↓
response model → JSON response
```

Start small: define one model, create one route, test it in `/docs`, and grow the application one feature at a time.
