# Django — A Friendly, Practical Tutorial

Build a complete web application with Python using Django. This guide starts with one page and gradually creates a **Task Manager** with a database, forms, authentication, an admin panel, tests, and production-ready settings.

> **You should know:** basic Python, functions, classes, HTML, and a little CSS. If Python is new to you, begin with the [Python guide](readme.md).

---

## Table of Contents

1. [What is Django?](#1-what-is-django)
2. [Project Setup](#2-project-setup)
3. [Understand the Project Structure](#3-understand-the-project-structure)
4. [Your First Page](#4-your-first-page)
5. [How a Django Request Works](#5-how-a-django-request-works)
6. [Templates and Template Inheritance](#6-templates-and-template-inheritance)
7. [Models and the Database](#7-models-and-the-database)
8. [The Django Admin](#8-the-django-admin)
9. [List and View Tasks](#9-list-and-view-tasks)
10. [Forms, Create, and Update](#10-forms-create-and-update)
11. [Delete Tasks Safely](#11-delete-tasks-safely)
12. [Authentication](#12-authentication)
13. [Messages and User Feedback](#13-messages-and-user-feedback)
14. [Static Files and Styling](#14-static-files-and-styling)
15. [Class-Based Views](#15-class-based-views)
16. [Testing](#16-testing)
17. [Configuration and Environment Variables](#17-configuration-and-environment-variables)
18. [Security Essentials](#18-security-essentials)
19. [Deploy to Production](#19-deploy-to-production)
20. [Build an API with Django REST Framework](#20-build-an-api-with-django-rest-framework)
21. [Common Mistakes](#21-common-mistakes)
22. [Cheat Sheet](#22-cheat-sheet)
23. [Practice Challenges](#23-practice-challenges)

---

## 1. What is Django?

Django is a Python framework for building database-backed websites. It includes many features that other frameworks require you to assemble yourself:

- URL routing
- HTML templates
- database models and migrations
- forms and validation
- user authentication and permissions
- an automatic admin site
- security protections
- testing tools

Django follows a pattern commonly called **Model–Template–View (MTV)**:

| Part | Responsibility |
|---|---|
| Model | Defines and works with stored data |
| Template | Produces the HTML shown to the user |
| View | Handles a request and chooses the response |

Django is a strong choice for dashboards, content sites, internal tools, e-commerce systems, social applications, and APIs.

---

## 2. Project Setup

Create a folder and virtual environment:

```bash
mkdir django-task-manager
cd django-task-manager

python3 -m venv .venv
source .venv/bin/activate       # Linux or macOS
# .venv\Scripts\activate        # Windows PowerShell
```

Install Django:

```bash
python -m pip install django
python -m django --version
```

Create the project in the current folder:

```bash
django-admin startproject config .
```

Create the initial database tables and start the development server:

```bash
python manage.py migrate
python manage.py runserver
```

Open <http://127.0.0.1:8000>. Press `Ctrl+C` to stop the server.

> The development server is convenient for local work. It is not a production web server.

### Create the tasks application

A **project** holds site-wide configuration. An **app** is a focused feature inside that project.

```bash
python manage.py startapp tasks
```

Register it in `config/settings.py`:

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "tasks",
]
```

---

## 3. Understand the Project Structure

Your files now look like this:

```text
django-task-manager/
├── manage.py
├── db.sqlite3
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── tasks/
    ├── migrations/
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── tests.py
    └── views.py
```

Important files:

- `manage.py` runs project commands.
- `settings.py` contains installed apps, database settings, middleware, templates, and static-file configuration.
- project `urls.py` is the site’s main URL table.
- app `models.py` defines database data.
- app `views.py` contains request handlers.
- app `admin.py` configures the administration site.
- `migrations/` stores versioned database changes.

Do not edit generated migration files casually. Change models and generate a new migration instead.

---

## 4. Your First Page

Add a view in `tasks/views.py`:

```python
from django.http import HttpResponse


def home(request):
    return HttpResponse("<h1>Welcome to the Task Manager</h1>")
```

Create `tasks/urls.py`:

```python
from django.urls import path

from . import views

app_name = "tasks"

urlpatterns = [
    path("", views.home, name="home"),
]
```

Connect the app URLs in `config/urls.py`:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("tasks.urls")),
]
```

Visit <http://127.0.0.1:8000>. Django matches the URL and calls `home`.

### Why name URLs?

`name="home"` lets code refer to the route as `tasks:home` instead of hard-coding `/`. If the path changes later, templates and redirects continue to work.

---

## 5. How a Django Request Works

For a normal page request:

```text
Browser request
      ↓
Middleware
      ↓
URL pattern
      ↓
View function
      ↓
Model/database (when needed)
      ↓
Template renders HTML
      ↓
HTTP response
```

The `request` object contains details such as:

```python
request.method       # "GET", "POST", ...
request.GET          # query-string data
request.POST         # submitted form data
request.user         # current authenticated user
request.headers      # request headers
```

Middleware runs around the view. Django uses it for sessions, authentication, CSRF protection, messages, and other cross-cutting behavior.

---

## 6. Templates and Template Inheritance

Returning HTML from Python becomes difficult to maintain. Templates keep presentation separate.

Create this structure:

```text
tasks/
└── templates/
    └── tasks/
        ├── base.html
        └── home.html
```

The second `tasks` folder namespaces templates and avoids collisions with other apps.

`tasks/templates/tasks/base.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{% block title %}Task Manager{% endblock %}</title>
</head>
<body>
  <nav>
    <a href="{% url 'tasks:home' %}">Task Manager</a>
  </nav>

  <main>
    {% block content %}{% endblock %}
  </main>
</body>
</html>
```

`tasks/templates/tasks/home.html`:

```html
{% extends "tasks/base.html" %}

{% block title %}Home | Task Manager{% endblock %}

{% block content %}
  <h1>Welcome to the Task Manager</h1>
  <p>Keep your work simple and organized.</p>
{% endblock %}
```

Update the view:

```python
from django.shortcuts import render


def home(request):
    context = {"page_heading": "My Tasks"}
    return render(request, "tasks/home.html", context)
```

Template basics:

```html
{{ variable }}

{% if tasks %}
  <p>Tasks are available.</p>
{% endif %}

{% for task in tasks %}
  <p>{{ task.title }}</p>
{% empty %}
  <p>No tasks yet.</p>
{% endfor %}
```

Django escapes variable output by default, which helps prevent cross-site scripting. Avoid marking untrusted content as safe.

---

## 7. Models and the Database

Define a task in `tasks/models.py`:

```python
from django.conf import settings
from django.db import models


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    completed = models.BooleanField(default=False)
    due_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["completed", "-created_at"]

    def __str__(self):
        return self.title
```

What the fields mean:

- `ForeignKey` connects each task to one user.
- `CASCADE` deletes a user’s tasks if that user is deleted.
- `blank=True` allows an empty form value.
- `null=True` allows SQL `NULL` in the database.
- `choices` limits priority to known values.
- `auto_now_add` sets creation time once.
- `auto_now` updates the timestamp on every save.

### Create and apply migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

The normal workflow is:

1. edit a model
2. run `makemigrations`
3. review the generated migration
4. run `migrate`

Commit migration files to version control. They are part of the application’s source history.

### Try the ORM in the shell

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from tasks.models import Task

User = get_user_model()
user = User.objects.create_user(username="alice", password="safe-demo-password")

task = Task.objects.create(owner=user, title="Learn Django")
Task.objects.all()
Task.objects.filter(completed=False)
Task.objects.get(pk=task.pk)

task.completed = True
task.save()

task.delete()
```

Useful query methods:

| Method | Purpose |
|---|---|
| `.all()` | Return every row |
| `.filter(...)` | Return zero or more matching rows |
| `.get(...)` | Return exactly one row or raise an exception |
| `.create(...)` | Create and save a row |
| `.update(...)` | Update matching rows directly |
| `.delete()` | Delete rows |
| `.exists()` | Efficiently check whether a match exists |

QuerySets are lazy: Django usually waits to query the database until their results are needed.

---

## 8. The Django Admin

Create an administrator:

```bash
python manage.py createsuperuser
```

Register the model in `tasks/admin.py`:

```python
from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "priority", "completed", "due_date")
    list_filter = ("completed", "priority")
    search_fields = ("title", "description", "owner__username")
    ordering = ("completed", "-created_at")
```

Start the server and visit <http://127.0.0.1:8000/admin/>.

The admin is excellent for trusted staff and internal data management. It is not normally the public user interface of your application.

---

## 9. List and View Tasks

Replace the home view with a task list in `tasks/views.py`:

```python
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render

from .models import Task


@login_required
def task_list(request):
    tasks = Task.objects.filter(owner=request.user)

    status = request.GET.get("status")
    if status == "active":
        tasks = tasks.filter(completed=False)
    elif status == "completed":
        tasks = tasks.filter(completed=True)

    return render(request, "tasks/task_list.html", {"tasks": tasks})


@login_required
def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk, owner=request.user)
    return render(request, "tasks/task_detail.html", {"task": task})
```

Update `tasks/urls.py`:

```python
from django.urls import path

from . import views

app_name = "tasks"

urlpatterns = [
    path("", views.task_list, name="task-list"),
    path("tasks/<int:pk>/", views.task_detail, name="task-detail"),
]
```

`tasks/templates/tasks/task_list.html`:

```html
{% extends "tasks/base.html" %}

{% block title %}My Tasks{% endblock %}

{% block content %}
  <h1>My Tasks</h1>

  <p>
    <a href="?">All</a> ·
    <a href="?status=active">Active</a> ·
    <a href="?status=completed">Completed</a>
  </p>

  <ul>
    {% for task in tasks %}
      <li>
        <a href="{% url 'tasks:task-detail' task.pk %}">
          {{ task.title }}
        </a>
        {% if task.completed %}✓{% endif %}
      </li>
    {% empty %}
      <li>No tasks yet.</li>
    {% endfor %}
  </ul>
{% endblock %}
```

`tasks/templates/tasks/task_detail.html`:

```html
{% extends "tasks/base.html" %}

{% block content %}
  <h1>{{ task.title }}</h1>
  <p>{{ task.description|default:"No description."|linebreaks }}</p>
  <p>Priority: {{ task.get_priority_display }}</p>
  <p>Status: {% if task.completed %}Complete{% else %}Active{% endif %}</p>
  <a href="{% url 'tasks:task-list' %}">Back to tasks</a>
{% endblock %}
```

Notice the ownership check in `get_object_or_404`. Looking up only by `pk` could allow one user to view another user’s task by changing the URL.

---

## 10. Forms, Create, and Update

Django forms render fields, validate input, and return cleaned Python values.

Create `tasks/forms.py`:

```python
from django import forms

from .models import Task


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ["title", "description", "priority", "completed", "due_date"]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 4}),
            "due_date": forms.DateInput(attrs={"type": "date"}),
        }
```

Add views:

```python
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import TaskForm
from .models import Task


@login_required
def task_create(request):
    if request.method == "POST":
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save(commit=False)
            task.owner = request.user
            task.save()
            messages.success(request, "Task created successfully.")
            return redirect("tasks:task-detail", pk=task.pk)
    else:
        form = TaskForm()

    return render(request, "tasks/task_form.html", {"form": form})


@login_required
def task_update(request, pk):
    task = get_object_or_404(Task, pk=pk, owner=request.user)

    if request.method == "POST":
        form = TaskForm(request.POST, instance=task)
        if form.is_valid():
            form.save()
            messages.success(request, "Task updated successfully.")
            return redirect("tasks:task-detail", pk=task.pk)
    else:
        form = TaskForm(instance=task)

    return render(
        request,
        "tasks/task_form.html",
        {"form": form, "task": task},
    )
```

Add routes:

```python
urlpatterns = [
    path("", views.task_list, name="task-list"),
    path("tasks/new/", views.task_create, name="task-create"),
    path("tasks/<int:pk>/", views.task_detail, name="task-detail"),
    path("tasks/<int:pk>/edit/", views.task_update, name="task-update"),
]
```

Create `tasks/templates/tasks/task_form.html`:

```html
{% extends "tasks/base.html" %}

{% block content %}
  <h1>{% if task %}Edit Task{% else %}New Task{% endif %}</h1>

  <form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Save task</button>
  </form>

  <a href="{% url 'tasks:task-list' %}">Cancel</a>
{% endblock %}
```

The `{% csrf_token %}` protects POST forms from cross-site request forgery. Include it in every internal POST form.

The common form flow is:

```python
if request.method == "POST":
    form = MyForm(request.POST)
    if form.is_valid():
        value = form.cleaned_data["field_name"]
        # Perform the action, then redirect.
else:
    form = MyForm()
```

Redirect after a successful POST. This **POST–Redirect–GET** pattern prevents accidental duplicate submissions when the browser refreshes.

---

## 11. Delete Tasks Safely

A delete operation should require `POST`, not `GET`. A link may be followed by crawlers, browser prefetching, or accidental clicks.

Add the view:

```python
from django.views.decorators.http import require_POST


@login_required
@require_POST
def task_delete(request, pk):
    task = get_object_or_404(Task, pk=pk, owner=request.user)
    task.delete()
    messages.success(request, "Task deleted.")
    return redirect("tasks:task-list")
```

Add the route:

```python
path("tasks/<int:pk>/delete/", views.task_delete, name="task-delete"),
```

Add a form to the detail page:

```html
<form method="post" action="{% url 'tasks:task-delete' task.pk %}">
  {% csrf_token %}
  <button type="submit">Delete task</button>
</form>
```

For a more deliberate experience, render a confirmation page before the final POST.

---

## 12. Authentication

Django includes users, sessions, password hashing, login/logout views, and permissions.

Add Django’s authentication URLs in `config/urls.py`:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path("", include("tasks.urls")),
]
```

This provides routes such as:

- `/accounts/login/`
- `/accounts/logout/`
- `/accounts/password_change/`
- `/accounts/password_reset/`

Create `tasks/templates/registration/login.html`:

```html
{% extends "tasks/base.html" %}

{% block content %}
  <h1>Sign in</h1>

  {% if form.errors %}
    <p>Your username or password was incorrect.</p>
  {% endif %}

  <form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Sign in</button>
  </form>
{% endblock %}
```

Configure redirects in `config/settings.py`:

```python
LOGIN_REDIRECT_URL = "tasks:task-list"
LOGOUT_REDIRECT_URL = "login"
LOGIN_URL = "login"
```

Show account controls in `base.html`:

```html
{% if user.is_authenticated %}
  <span>Hello, {{ user.username }}</span>
  <form method="post" action="{% url 'logout' %}">
    {% csrf_token %}
    <button type="submit">Sign out</button>
  </form>
{% else %}
  <a href="{% url 'login' %}">Sign in</a>
{% endif %}
```

Use `@login_required` on function-based views that require a user.

### Add registration

```python
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm


def register(request):
    if request.user.is_authenticated:
        return redirect("tasks:task-list")

    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("tasks:task-list")
    else:
        form = UserCreationForm()

    return render(request, "registration/register.html", {"form": form})
```

For a new serious project, consider defining a custom user model before the first migration. Changing user models after a project has accumulated data is much harder.

---

## 13. Messages and User Feedback

The messages framework stores one-time notices across a redirect:

```python
from django.contrib import messages

messages.success(request, "Task saved.")
messages.info(request, "Nothing changed.")
messages.warning(request, "The due date is close.")
messages.error(request, "The task could not be saved.")
```

Render messages in `base.html`:

```html
{% if messages %}
  <ul class="messages">
    {% for message in messages %}
      <li class="{{ message.tags }}">{{ message }}</li>
    {% endfor %}
  </ul>
{% endif %}
```

Messages are ideal for confirmation after create, update, delete, login, or logout actions.

---

## 14. Static Files and Styling

Create:

```text
tasks/
└── static/
    └── tasks/
        └── styles.css
```

Load it in `base.html`:

```html
{% load static %}
<!doctype html>
<html lang="en">
<head>
  <link rel="stylesheet" href="{% static 'tasks/styles.css' %}">
</head>
```

Example CSS:

```css
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

body {
  margin: 0 auto;
  max-width: 52rem;
  padding: 1.5rem;
  color: #172033;
  background: #f7f8fc;
}

a { color: #3157d5; }
button { cursor: pointer; }

.messages {
  padding: 0;
  list-style: none;
}

.messages li {
  margin-block: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.4rem;
  background: #e8edff;
}
```

Django serves static files automatically during development when configured normally. Production requires collecting and serving them appropriately:

```bash
python manage.py collectstatic
```

Uploaded user files are **media**, not static files. Treat uploads as untrusted and store them with suitable validation and production storage.

---

## 15. Class-Based Views

Function-based views make request flow explicit and are excellent for learning. Django also provides reusable class-based views.

The task list can become:

```python
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView

from .models import Task


class TaskListView(LoginRequiredMixin, ListView):
    model = Task
    template_name = "tasks/task_list.html"
    context_object_name = "tasks"

    def get_queryset(self):
        queryset = Task.objects.filter(owner=self.request.user)
        status = self.request.GET.get("status")

        if status == "active":
            queryset = queryset.filter(completed=False)
        elif status == "completed":
            queryset = queryset.filter(completed=True)

        return queryset
```

URL:

```python
path("", TaskListView.as_view(), name="task-list"),
```

Common generic views:

- `ListView` lists objects.
- `DetailView` displays one object.
- `CreateView` creates an object.
- `UpdateView` updates an object.
- `DeleteView` confirms and deletes an object.

Use whichever style keeps the behavior easiest to understand. Avoid forcing unusual business workflows into a generic view when a simple function would be clearer.

---

## 16. Testing

Django includes a test client and isolated test database.

Create `tasks/tests/test_views.py` and add `__init__.py` inside `tasks/tests/`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from tasks.models import Task


class TaskViewsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="alice",
            password="test-password-123",
        )
        self.other_user = User.objects.create_user(
            username="bob",
            password="test-password-456",
        )
        self.task = Task.objects.create(
            owner=self.user,
            title="Test Django",
        )

    def test_task_list_requires_login(self):
        response = self.client.get(reverse("tasks:task-list"))

        self.assertEqual(response.status_code, 302)
        self.assertIn("/accounts/login/", response.url)

    def test_user_sees_own_tasks(self):
        self.client.login(username="alice", password="test-password-123")

        response = self.client.get(reverse("tasks:task-list"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Django")

    def test_user_cannot_view_another_users_task(self):
        self.client.login(username="bob", password="test-password-456")

        response = self.client.get(
            reverse("tasks:task-detail", kwargs={"pk": self.task.pk})
        )

        self.assertEqual(response.status_code, 404)

    def test_create_task_assigns_current_user(self):
        self.client.login(username="alice", password="test-password-123")

        response = self.client.post(
            reverse("tasks:task-create"),
            {"title": "New task", "priority": "high"},
        )

        self.assertEqual(response.status_code, 302)
        created = Task.objects.get(title="New task")
        self.assertEqual(created.owner, self.user)
```

Run tests:

```bash
python manage.py test
```

Useful checks:

```bash
python manage.py check
python manage.py makemigrations --check
```

Test important permissions and ownership rules, not only successful page loads.

---

## 17. Configuration and Environment Variables

Never commit production secrets. Read environment-dependent values from the environment.

A small standard-library approach in `config/settings.py`:

```python
import os

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-development-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]
```

In production, require the secret instead of providing a fallback:

```python
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
```

Common environment-specific settings include:

- secret key
- debug mode
- allowed hosts
- database URL or credentials
- email provider credentials
- storage credentials
- trusted CSRF origins

Keep a `.env.example` with placeholder names, but add the real `.env` to `.gitignore`. Django does not read `.env` files automatically; use your process manager, hosting platform, or a well-maintained settings package if you want that behavior.

---

## 18. Security Essentials

Django provides safe defaults, but deployment choices still matter.

### Keep `DEBUG` off in production

Debug error pages can expose settings, file paths, and application details.

```python
DEBUG = False
```

### Set allowed hosts

```python
ALLOWED_HOSTS = ["tasks.example.com"]
```

### Use HTTPS security settings

When HTTPS and your proxy are correctly configured, production settings commonly include:

```python
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
```

Proxy-related settings depend on the hosting platform. Configure them only when you understand which proxy headers are trustworthy.

### Use the ORM safely

Normal QuerySet filters parameterize SQL. Be especially careful with raw SQL and never interpolate user input into a query string.

### Validate authorization on every object

Login is not enough. Scope queries to the current user or check the required permission:

```python
task = get_object_or_404(Task, pk=pk, owner=request.user)
```

### Run Django’s deployment checks

```bash
python manage.py check --deploy
```

Review every warning in the context of your actual hosting setup.

---

## 19. Deploy to Production

A typical production system contains:

```text
Browser
   ↓ HTTPS
Reverse proxy or hosting platform
   ↓
WSGI/ASGI application server
   ↓
Django
   ↓
PostgreSQL + external file storage
```

Before deployment:

1. pin and install dependencies
2. configure production environment variables
3. use a production database such as PostgreSQL
4. set `DEBUG=False` and configure `ALLOWED_HOSTS`
5. run migrations
6. collect static files
7. run tests and deployment checks
8. configure HTTPS, logging, backups, and monitoring

Typical release commands:

```bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py check --deploy
```

Do not use `python manage.py runserver` in production. Use a production-capable WSGI or ASGI server, or the server selected by your hosting platform.

SQLite is convenient for learning. A multi-user production service normally benefits from PostgreSQL and a proper backup plan.

---

## 20. Build an API with Django REST Framework

Django renders HTML naturally. For JSON APIs, Django REST Framework (DRF) adds serializers, API views, authentication, permissions, and interactive browsing.

Install and register it:

```bash
python -m pip install djangorestframework
```

```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "tasks",
]
```

`tasks/serializers.py`:

```python
from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "completed",
            "due_date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
```

`tasks/api.py`:

```python
from rest_framework import permissions, viewsets

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
```

Add API routes in `config/urls.py`:

```python
from rest_framework.routers import DefaultRouter
from tasks.api import TaskViewSet

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path("api/", include(router.urls)),
    path("", include("tasks.urls")),
]
```

You now have CRUD endpoints under `/api/tasks/`. Authentication and per-object authorization still require careful design; never rely only on hiding links in the frontend.

---

## 21. Common Mistakes

### Forgetting to register an app

If Django cannot find models, templates, or static files, confirm the app is in `INSTALLED_APPS`.

### Changing a model without migrations

After a model change, run:

```bash
python manage.py makemigrations
python manage.py migrate
```

### Using `get()` when multiple rows are possible

`get()` must find exactly one row. Use `filter()` for a collection or uncertain match.

### Trusting a URL ID

Always apply ownership or permission rules when fetching an object. An authenticated user can still change `/tasks/4/` to `/tasks/5/`.

### Performing writes through `GET`

Create, update, delete, logout, and other state-changing actions should use appropriate non-GET requests with CSRF protection.

### Writing raw form handling unnecessarily

Use Django forms or model forms for validation. Do not save unvalidated `request.POST` values directly.

### Forgetting `{% csrf_token %}`

Internal POST forms need the CSRF token. A missing token produces a `403` response.

### Querying inside a template loop

Repeated relationship lookups can produce an N+1 query problem. Use `select_related()` for single-valued relationships and `prefetch_related()` for collections.

```python
tasks = Task.objects.select_related("owner")
```

### Using `DEBUG=True` in production

Debug mode is not a substitute for logging and can expose sensitive information.

---

## 22. Cheat Sheet

```bash
# Project and app
django-admin startproject config .
python manage.py startapp tasks

# Development
python manage.py runserver
python manage.py shell
python manage.py check

# Database
python manage.py makemigrations
python manage.py migrate

# Admin
python manage.py createsuperuser

# Tests
python manage.py test

# Production assets/checks
python manage.py collectstatic
python manage.py check --deploy
```

```python
# URL
path("tasks/<int:pk>/", views.task_detail, name="task-detail")

# Render and redirect
return render(request, "tasks/detail.html", {"task": task})
return redirect("tasks:task-detail", pk=task.pk)

# Safe lookup
task = get_object_or_404(Task, pk=pk, owner=request.user)

# Queries
Task.objects.all()
Task.objects.filter(owner=request.user, completed=False)
Task.objects.create(owner=request.user, title="Learn Django")

# Authentication
@login_required
def protected_view(request):
    ...
```

```html
<!-- Template essentials -->
{% extends "tasks/base.html" %}
{% url 'tasks:task-detail' task.pk %}
{% load static %}
{% static 'tasks/styles.css' %}
{% csrf_token %}
{{ task.title }}
```

---

## 23. Practice Challenges

Build these in order:

1. Add a “Create task” link and edit link to the templates.
2. Add keyword search with `?q=django` and `title__icontains`.
3. Add pagination with Django’s `Paginator`.
4. Validate that a due date cannot be in the past.
5. Add categories with a many-to-many relationship.
6. Let users toggle completion with a dedicated POST endpoint.
7. Add custom `404.html` and `500.html` templates.
8. Add tests for update and delete ownership.
9. Add PostgreSQL and environment-based database settings.
10. Build the DRF API and connect a small frontend.

### Final mental model

Most Django features fit into this flow:

```text
URL → view → form/service → model/database
        ↓
     template
        ↓
   HTML response
```

Start with one URL, one view, and one template. Add a model when the page needs persistent data, add a form when users need to change it, and test every important permission boundary.
