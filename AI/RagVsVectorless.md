# Vectorless RAG — Complete Guide

---

## Table of Contents

1. [What is RAG?](#what-is-rag)
2. [The Problem with Traditional RAG](#the-problem-with-traditional-rag)
3. [What is Vectorless RAG?](#what-is-vectorless-rag)
4. [What is PageIndex?](#what-is-pageindex)
5. [How Vectorless RAG Works — Step by Step](#how-vectorless-rag-works)
6. [Vectorless vs Traditional RAG — Side by Side](#vectorless-vs-traditional-rag)
7. [When to Use Which?](#when-to-use-which)

---

## What is RAG?

**RAG** stands for **Retrieval-Augmented Generation**.

It is a technique that gives an AI model access to **your own documents or knowledge base** before answering a question — so instead of relying only on its training data, the AI can also look at *your specific information*.

### Simple Analogy

> Imagine you ask a student an exam question.
> - **Without RAG** → The student answers from memory alone.
> - **With RAG** → The student is allowed to search a textbook before answering.

RAG = LLM + ability to search your documents.

### How Traditional RAG Works

```
Your Documents
      │
      ▼
  [Chunking]          Split documents into small pieces (chunks)
      │
      ▼
  [Embedding]         Convert each chunk into a vector (a list of numbers)
      │
      ▼
  [Vector DB]         Store all vectors in a vector database (Pinecone, Weaviate, etc.)
      │
      ▼
User asks a question
      │
      ▼
  [Query Embedding]   Convert the question into a vector too
      │
      ▼
  [Similarity Search] Find chunks whose vectors are "closest" to the question vector
      │
      ▼
  [LLM]              Feed the retrieved chunks + question into the LLM
      │
      ▼
  Answer ✅
```

---

## The Problem with Traditional RAG

Traditional RAG works well, but it has real pain points:

| Problem | Why it hurts |
|---|---|
| **Embedding cost** | Every document and every query must be converted to vectors — API calls add up |
| **Vector DB complexity** | You need to set up, host, and maintain a vector database |
| **Chunking is tricky** | Splitting documents poorly breaks context — answers miss important info |
| **Semantic drift** | Embeddings sometimes retrieve the *wrong* chunk because meaning is approximate |
| **Staleness** | When documents update, you must re-embed and re-index everything |
| **Latency** | Two round trips: embed the query → search the DB → then call the LLM |

> In short: traditional RAG has **a lot of moving parts**.

---

## What is Vectorless RAG?

**Vectorless RAG** achieves the same goal as RAG — grounding an LLM in your documents — but **without using vector embeddings or a vector database at all**.

Instead of converting text into vectors and searching by similarity, it uses a smarter, lighter approach:

> **Let the LLM itself figure out which parts of the document are relevant.**

No embedding model. No vector DB. No similarity math.

### Core Idea

```
Traditional RAG:   Documents → Vectors → Search → Retrieve → LLM
Vectorless RAG:    Documents → PageIndex → LLM selects → LLM answers
```

---

## What is PageIndex?

**PageIndex** is the key mechanism behind Vectorless RAG.

Instead of converting document text into vectors, PageIndex creates a **plain-text map** of your document — a structured summary of *what is on each page* (or section).

### Think of it like a Book's Table of Contents

A table of contents doesn't contain the full book — it just tells you:
- Chapter 1 → Introduction to Networking (pages 1–12)
- Chapter 2 → TCP/IP Basics (pages 13–28)
- Chapter 3 → Firewalls (pages 29–45)

PageIndex does the same for your documents automatically.

### How PageIndex is Built

```
Original Document (e.g., a 50-page PDF)
        │
        ▼
 Split by page or section
        │
        ▼
 For each page → ask LLM: "Summarize what this page contains in 1–2 sentences"
        │
        ▼
 Store: { page: 1, summary: "Covers TCP handshake and port definitions" }
        │
        ▼
 PageIndex = list of (page number → summary)
```

The PageIndex is small, fast to build, and human-readable.

---

## How Vectorless RAG Works

With PageIndex built, here is the full flow when a user asks a question:

```
Step 1: User asks a question
        "How does a TCP handshake work?"

Step 2: Send the PageIndex + the question to the LLM
        Prompt: "Here is a list of pages and their summaries.
                 Which pages are relevant to the question? Return page numbers only."

Step 3: LLM reads the PageIndex and picks relevant pages
        Response: [Page 1, Page 3]

Step 4: Fetch the full text of those pages from the original document

Step 5: Send the full page text + original question to the LLM
        "Answer the question using only the content below: ..."

Step 6: LLM generates the final answer ✅
```

### Visual Flow

```
Document
   │
   ▼
PageIndex (summaries)
   │
   ▼
LLM picks relevant pages ──► Fetch full page text
                                       │
                                       ▼
                              LLM answers the question
```

Two LLM calls. No embeddings. No vector DB.

---

## Vectorless vs Traditional RAG — Side by Side

| Feature | Traditional RAG | Vectorless RAG |
|---|---|---|
| **Retrieval method** | Vector similarity search | LLM reads PageIndex and selects pages |
| **Requires embedding model** | Yes | No |
| **Requires vector database** | Yes (Pinecone, Weaviate, etc.) | No |
| **Setup complexity** | High | Low |
| **Running cost** | Embedding API + Vector DB | LLM calls only |
| **Works well on large docs** | Yes (good at scale) | Better for small-to-medium docs |
| **Handles structured docs** | Loses structure at chunk level | Preserves page-level structure |
| **Accuracy on dense docs** | Can miss context across chunks | Retrieves full pages = more context |
| **Re-indexing on updates** | Must re-embed everything | Just re-summarize changed pages |
| **Explainability** | Hard (vectors are opaque) | Easy (you can read the PageIndex) |
| **Cold start speed** | Slow (embed all docs first) | Fast (one LLM pass per page) |

---

## When to Use Which?

### Use Traditional RAG when:
- Your knowledge base is **very large** (millions of documents)
- You need **sub-second** retrieval at scale
- You already have a vector DB infrastructure
- Documents are **long, flat text** without natural page structure

### Use Vectorless RAG (PageIndex) when:
- You have **small-to-medium** document collections (a few hundred pages)
- You want **fast setup with minimal infrastructure**
- Your documents are **PDFs, reports, manuals** with natural page breaks
- You want **transparent, debuggable** retrieval (you can inspect the index)
- You want to **avoid embedding API costs** entirely
- Document contents are **highly structured** (tables, forms, technical specs)

---

## Quick Summary

```
RAG = Give the LLM a searchable memory from your documents

Traditional RAG:
  Documents → Embeddings → Vector DB → Similarity Search → LLM

Vectorless RAG:
  Documents → PageIndex (plain-text summaries) → LLM picks pages → LLM answers

PageIndex = A lightweight map of what's on each page,
            created by the LLM itself, no math required.
```

> Vectorless RAG trades **raw scale** for **simplicity, transparency, and lower cost** — a great default for most real-world document Q&A use cases.
