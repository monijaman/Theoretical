# Python Libraries Guide

## 1. Data Tools

### NumPy

NumPy is the foundation for numerical computing in Python. It provides fast multidimensional arrays, mathematical operations, linear algebra, statistics, random-number generation, and matrix and vector operations.

```python
import numpy as np

numbers = np.array([1, 2, 3, 4])
print(numbers.mean())
print(numbers * 2)
```

NumPy is faster than regular Python lists for large numerical datasets because many operations are implemented in optimized low-level code.

### pandas

pandas is used to work with structured data, especially tables. Its main structures are `DataFrame` for table-like data and `Series` for one-dimensional labeled data.

It supports reading and writing CSV, Excel, JSON, and SQL data; filtering and sorting; grouping and aggregation; missing-value handling; and data cleaning.

```python
import pandas as pd

data = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie"],
    "age": [25, 30, 28]
})

print(data[data["age"] > 26])
```

pandas is built largely on top of NumPy and is commonly used for cleaning, analyzing, and preparing datasets.

### Matplotlib

Matplotlib creates visualizations such as line charts, bar charts, histograms, scatter plots, pie charts, and scientific plots.

```python
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar"]
sales = [100, 140, 120]

plt.plot(months, sales)
plt.title("Monthly Sales")
plt.xlabel("Month")
plt.ylabel("Sales")
plt.show()
```

Visualizations help reveal trends, patterns, relationships, and outliers.

### Jupyter

Jupyter provides an interactive environment where code, written explanations, charts, tables, equations, and results can be combined in one notebook. Notebook files usually use the `.ipynb` extension.

A typical workflow is to load data with pandas, clean it, analyze it with NumPy and pandas, visualize it with Matplotlib, and record conclusions next to the code.

## 2. AI and Machine Learning Tools

NumPy and pandas are also used in AI for numerical operations, data cleaning, feature preparation, and dataset exploration.

### scikit-learn

scikit-learn is a general-purpose machine-learning library. It supports classification, regression, clustering, preprocessing, model evaluation, model selection, and dimensionality reduction.

Common algorithms include linear regression, logistic regression, decision trees, random forests, support vector machines, k-nearest neighbors, k-means clustering, and naive Bayes.

```python
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

X_train, X_test, y_train, y_test = train_test_split(
    features, labels, test_size=0.2, random_state=42
)

model = LogisticRegression()
model.fit(X_train, y_train)

predictions = model.predict(X_test)
print(accuracy_score(y_test, predictions))
```

scikit-learn is usually the best starting point for practical machine learning because its models are relatively easy to use and understand.

### PyTorch

PyTorch is a deep-learning framework used for neural networks, computer vision, natural-language processing, speech recognition, reinforcement learning, and AI research.

Its core concepts include tensors, neural-network layers, loss functions, optimizers, backpropagation, training loops, and GPU acceleration.

```python
import torch

x = torch.tensor([1.0, 2.0, 3.0])
y = x * 2

print(y)
```

Use PyTorch when you want to build or train neural networks yourself.

### Transformers

Hugging Face Transformers is a library for using pre-trained AI models for text classification, text generation, translation, summarization, question answering, image analysis, and speech recognition.

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")
result = classifier("This product is excellent.")
print(result)
```

Use scikit-learn for traditional machine learning, PyTorch for building and training deep-learning models, and Transformers for modern pre-trained language, vision, or speech models.

## 3. Automation Tools

### requests

`requests` sends HTTP requests from Python. It can download web pages, call APIs, send form data, use authentication, and process JSON responses.

```python
import requests

response = requests.get("https://api.example.com/data")
data = response.json()
print(data)
```

Use it when a service provides an API or when you only need to download raw HTML.

### BeautifulSoup

BeautifulSoup extracts information from HTML and XML. It is useful for finding links, extracting headings, reading tables, and collecting product names or prices.

```python
import requests
from bs4 import BeautifulSoup

html = requests.get("https://example.com").text
soup = BeautifulSoup(html, "html.parser")

title = soup.find("title")
print(title.text)
```

`requests` downloads a page while BeautifulSoup analyzes its HTML. BeautifulSoup does not run JavaScript, so dynamically generated content may require Playwright.

### Playwright

Playwright automates real browsers such as Chromium, Firefox, and WebKit. It can open pages, click buttons, fill forms, log in, handle JavaScript-heavy websites, take screenshots, download files, test websites, and extract dynamic content.

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    browser.close()
```

Playwright is more powerful than `requests` and BeautifulSoup, but it is also heavier and slower.

### openpyxl

`openpyxl` reads and writes Excel `.xlsx` files. It can create workbooks, edit cells, add formulas, format cells, create charts, add worksheets, apply filters, freeze panes, and adjust column widths.

```python
from openpyxl import Workbook

workbook = Workbook()
sheet = workbook.active

sheet["A1"] = "Name"
sheet["B1"] = "Score"
sheet.append(["Alice", 95])

workbook.save("results.xlsx")
```

Use pandas for data analysis and openpyxl when you need detailed Excel-specific formatting or workbook manipulation.

### Pillow

Pillow is a Python library for image processing. It can open and save images, resize and crop them, convert formats, rotate and flip them, add text, adjust brightness and contrast, and create thumbnails.

```python
from PIL import Image

image = Image.open("photo.jpg")
image = image.resize((800, 600))
image.save("resized_photo.png")
```

Pillow is useful for processing screenshots, product images, scanned documents, thumbnails, and image collections.

## How These Tools Work Together

```text
requests / Playwright
        ↓
BeautifulSoup
        ↓
pandas
        ↓
NumPy
        ↓
scikit-learn or PyTorch
        ↓
Matplotlib
        ↓
openpyxl
```

For example, you can collect website data with `requests` or Playwright, extract information with BeautifulSoup, store it in pandas, transform numbers with NumPy, build a model with scikit-learn, visualize results with Matplotlib, and export a report with openpyxl. Pillow can be added when images also need to be downloaded or processed.

## Recommended Learning Order

1. Python fundamentals
2. NumPy
3. pandas
4. Matplotlib
5. Jupyter
6. `requests`
7. BeautifulSoup
8. openpyxl and Pillow
9. Playwright
10. scikit-learn
11. PyTorch or Transformers

Start with scikit-learn before PyTorch or Transformers. It teaches essential machine-learning concepts with less complexity.
