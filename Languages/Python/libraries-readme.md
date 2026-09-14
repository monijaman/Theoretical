# Essential Python Libraries

A practical reference for the Python libraries most developers should know. Start with the standard library, then learn only the third-party libraries required by your project.

## How to install third-party libraries

Create a virtual environment before installing packages:

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install requests
```

The standard library is included with Python and does not need to be installed with `pip`.

## 1. Essential standard-library modules

| Library | What it does | Common use |
|---|---|---|
| `pathlib` | Works with file and directory paths | Find, read, write, and organize files |
| `os` | Provides operating-system features | Environment variables and system operations |
| `shutil` | Performs high-level file operations | Copying, moving, and deleting files |
| `sys` | Provides Python interpreter information | Command-line arguments and interpreter settings |
| `subprocess` | Runs external programs | Calling shell commands or other applications |
| `json` | Reads and writes JSON | APIs, configuration, and data exchange |
| `csv` | Reads and writes CSV files | Spreadsheet-style data |
| `sqlite3` | Provides a built-in SQLite database | Small local applications and prototypes |
| `datetime` | Handles dates and times | Timestamps, deadlines, and date calculations |
| `zoneinfo` | Handles time zones | Correct timezone-aware dates |
| `re` | Searches text using regular expressions | Validation and text extraction |
| `collections` | Provides specialized containers | `Counter`, `defaultdict`, and `deque` |
| `itertools` | Provides efficient iterator tools | Combining, filtering, and grouping data |
| `functools` | Provides function utilities | Caching, decorators, and partial functions |
| `math` | Provides mathematical functions | Calculations and numeric logic |
| `statistics` | Provides basic statistics | Mean, median, and standard deviation |
| `decimal` | Provides precise decimal arithmetic | Money and financial calculations |
| `random` | Generates pseudo-random values | Games, simulations, and sampling |
| `secrets` | Generates secure random values | Password reset tokens and security codes |
| `logging` | Records application events | Debugging, monitoring, and production logs |
| `argparse` | Builds command-line interfaces | Scripts with arguments and options |
| `dataclasses` | Creates data-focused classes | Simple models and configuration objects |
| `enum` | Creates named constant values | Statuses, roles, and fixed choices |
| `typing` | Adds type hints | Better editor support and static checking |
| `asyncio` | Runs asynchronous code | High-concurrency network applications |
| `threading` | Runs tasks in threads | I/O-bound background work |
| `multiprocessing` | Runs tasks in separate processes | CPU-heavy parallel work |
| `unittest` | Built-in testing framework | Unit and integration tests |

## 2. Web development and API libraries

| Library | What it does | Common use |
|---|---|---|
| `requests` | Sends HTTP requests | Calling REST APIs and downloading data |
| `httpx` | Modern HTTP client | Synchronous and asynchronous API calls |
| `FastAPI` | Builds typed, fast APIs | REST APIs and backend services |
| `Django` | Full web framework | Large web applications, admin panels, and authentication |
| `Flask` | Lightweight web framework | Small web apps and simple APIs |
| `pydantic` | Validates Python data | Request bodies, settings, and API responses |
| `SQLAlchemy` | SQL toolkit and ORM | Working with relational databases |
| `Alembic` | Manages database migrations | Updating database schemas safely |
| `Celery` | Runs distributed background tasks | Emails, reports, and long-running jobs |
| `beautifulsoup4` | Parses HTML and XML | Web scraping and HTML extraction |
| `lxml` | Fast XML and HTML processing | Large or performance-sensitive documents |
| `selenium` | Controls web browsers | Browser automation and end-to-end testing |
| `playwright` | Modern browser automation | Reliable browser tests and scraping |

## 3. Database libraries

| Library | What it does | Common use |
|---|---|---|
| `psycopg` | Connects Python to PostgreSQL | PostgreSQL applications |
| `mysql-connector-python` | Connects Python to MySQL | MySQL applications |
| `pymongo` | Connects Python to MongoDB | Document databases |
| `redis` | Works with Redis | Caching, queues, sessions, and rate limits |
| `SQLAlchemy` | Maps Python objects to SQL tables | Database queries and ORM-based applications |
| `motor` | Async MongoDB driver | Asynchronous MongoDB applications |
| `alembic` | Provides SQLAlchemy migrations | Versioning database changes |
| `psycopg` connection pool | Reuses database connections | Faster and safer web applications |

## 4. Data analysis and visualization

| Library | What it does | Common use |
|---|---|---|
| `NumPy` | Provides fast numerical arrays | Scientific calculations and matrix operations |
| `pandas` | Provides table-like DataFrames | Cleaning, joining, filtering, and analyzing data |
| `Polars` | Provides fast DataFrames | Large and performance-sensitive data processing |
| `Matplotlib` | Creates charts and plots | Line, bar, scatter, and custom charts |
| `Seaborn` | Creates statistical visualizations | Quick, attractive statistical charts |
| `Plotly` | Creates interactive charts | Dashboards and browser-based visualizations |
| `SciPy` | Provides scientific algorithms | Optimization, statistics, and signal processing |
| `Jupyter` | Provides interactive notebooks | Experiments, learning, and data analysis |
| `openpyxl` | Reads and writes Excel files | Automating `.xlsx` reports |
| `pyarrow` | Works with columnar data formats | Parquet files and fast data pipelines |

## 5. Machine learning and AI

| Library | What it does | Common use |
|---|---|---|
| `scikit-learn` | Provides classical machine learning | Classification, regression, clustering, and preprocessing |
| `PyTorch` | Provides deep-learning tools | Neural networks and model training |
| `TensorFlow` | Provides machine-learning infrastructure | Deep learning and production models |
| `Keras` | High-level neural-network API | Quickly building deep-learning models |
| `transformers` | Provides pre-trained AI models | Text generation, classification, and embeddings |
| `datasets` | Loads and processes datasets | Training and evaluating AI models |
| `OpenAI` | Provides the OpenAI Python SDK | Calling OpenAI models and APIs |
| `spaCy` | Provides production NLP tools | Named entities, tokenization, and text pipelines |
| `NLTK` | Provides traditional NLP tools | Teaching, research, and language processing |
| `Pillow` | Processes images | Resize, crop, convert, and edit images |
| `opencv-python` | Provides computer-vision tools | Image and video processing |

## 6. Testing and code quality

| Library | What it does | Common use |
|---|---|---|
| `pytest` | Runs tests with a simple syntax | Unit, integration, and API tests |
| `pytest-cov` | Measures test coverage | Finding untested code |
| `hypothesis` | Generates test cases automatically | Property-based testing |
| `ruff` | Lints and formats Python quickly | Finding errors and enforcing style |
| `black` | Formats Python code | Consistent code formatting |
| `mypy` | Checks type hints | Detecting type-related bugs |
| `pyright` | Fast static type checker | Type checking in editors and CI |
| `pre-commit` | Runs checks before commits | Automatic quality checks |
| `tox` | Tests across environments | Supporting multiple Python versions |
| `bandit` | Finds common security issues | Python security scanning |
| `pip-audit` | Checks vulnerable dependencies | Dependency security auditing |

## 7. Command-line, configuration, and operations

| Library | What it does | Common use |
|---|---|---|
| `argparse` | Builds command-line interfaces | Built-in CLI scripts |
| `Click` | Builds command-line applications | Structured CLI tools |
| `Typer` | Builds typed CLI applications | Modern commands based on type hints |
| `rich` | Improves terminal output | Tables, progress bars, colors, and tracebacks |
| `python-dotenv` | Loads `.env` values | Local development configuration |
| `PyYAML` | Reads and writes YAML | Configuration files and data serialization |
| `tomllib` | Reads TOML files | Built-in project configuration support in modern Python |
| `structlog` | Creates structured logs | JSON logs and observability |
| `psutil` | Reads system and process information | Monitoring CPU, memory, and processes |
| `boto3` | Provides the AWS SDK | S3, EC2, Lambda, and other AWS services |
| `docker` | Controls Docker from Python | Building and managing containers |
| `gunicorn` | Runs WSGI applications | Production Django or Flask deployments |
| `uvicorn` | Runs ASGI applications | Production FastAPI deployments |

## 8. Useful specialized libraries

| Library | What it does | Common use |
|---|---|---|
| `cryptography` | Provides modern cryptographic tools | Encryption, keys, and digital signatures |
| `PyJWT` | Creates and validates JSON Web Tokens | API authentication |
| `passlib` | Hashes and verifies passwords | Secure password storage |
| `email` | Builds and parses email messages | Email processing; built into Python |
| `smtplib` | Sends email through SMTP | Sending email; built into Python |
| `reportlab` | Generates PDF documents | Invoices, reports, and certificates |
| `pypdf` | Reads and edits PDFs | Merging, splitting, and extracting PDF data |
| `python-dateutil` | Extends date and time handling | Flexible date parsing and relative dates |
| `schedule` | Runs simple scheduled jobs | Lightweight periodic tasks |
| `APScheduler` | Schedules advanced jobs | Background and recurring jobs |

## Recommended learning order

1. Learn `pathlib`, `json`, `datetime`, `collections`, `logging`, and `sqlite3`.
2. Learn `pytest`, `ruff`, type hints, virtual environments, and `pyproject.toml`.
3. Choose a direction:
   - Web: `FastAPI` or `Django`, `pydantic`, `SQLAlchemy`, and `httpx`.
   - Data: `NumPy`, `pandas`, `Matplotlib`, and `Jupyter`.
   - AI: `NumPy`, `pandas`, `scikit-learn`, and then `PyTorch` or `transformers`.
   - Automation: `requests`, `BeautifulSoup`, `Playwright`, `openpyxl`, and `Pillow`.
4. Add a database driver, logging, testing, security, and deployment tools as your project grows.

Do not install every library in this document. Choose the smallest set that solves the current problem, keep dependencies in a virtual environment, and read the official documentation for the version you use.
