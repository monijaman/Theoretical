# 30-Day AI Developer Learning Plan

---

## Week 1: Python Basics → OpenAI API → Prompt Engineering → Chatbot

---

### Day 1–2: Python Basics (AI-relevant subset)

**Goal:** Be comfortable enough with Python to call APIs, handle JSON, and manage files.

**Topics:**
- Variables, strings, lists, dicts, f-strings
- Functions, loops, conditionals
- `pip`, virtual environments (`venv` / `conda`)
- Reading/writing files
- `requests` library basics

**Practice:**
```python
# Read a text file and print word count
with open("sample.txt", "r") as f:
    text = f.read()
print(len(text.split()))
```

**Resources:**
- [Python Official Tutorial](https://docs.python.org/3/tutorial/) — chapters 3–6
- Automate the Boring Stuff with Python (free online) — chapters 1–4

---

### Day 3: OpenAI API

**Goal:** Make your first API call, understand tokens, models, and cost.

**Setup:**
```bash
pip install openai python-dotenv
```

**Core concepts:**
- API key management (`.env` file, never hardcode)
- `client.chat.completions.create()` — the main call
- `model`, `messages`, `temperature`, `max_tokens` parameters
- Understanding token limits per model
- Streaming responses

**Minimal working example:**
```python
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain APIs in one sentence."}]
)
print(response.choices[0].message.content)
```

**Explore:** system prompts, multi-turn conversations (appending to the messages list).

**Resources:**
- OpenAI API docs → Quickstart
- OpenAI Cookbook (GitHub)

---

### Day 4: Prompt Engineering

**Goal:** Learn to write prompts that produce reliable, structured outputs.

**Core techniques:**

| Technique | When to use |
|-----------|-------------|
| Zero-shot | Simple, well-defined tasks |
| Few-shot | When format/style matters — give 2–3 examples |
| Chain-of-Thought (CoT) | Reasoning tasks — add "Think step by step" |
| Structured output | Ask for JSON/markdown, then parse it |
| Role prompting | "You are a senior Python developer..." |
| Constraints | "Answer in under 50 words", "No markdown" |

**Practice exercises:**
1. Get the model to always return valid JSON (without using OpenAI's JSON mode)
2. Write a CoT prompt that solves a math word problem reliably
3. Create a system prompt for a customer support bot that never goes off-topic

**Resources:**
- Anthropic Prompt Engineering Guide
- OpenAI Prompt Engineering Guide
- Prompting Guide (promptingguide.ai)

---

### Day 5–7: Build — Simple AI Chatbot

**Goal:** A terminal or web chatbot that maintains conversation history.

**What to build:**
- Multi-turn chat (keeps the `messages` list between turns)
- System prompt that gives the bot a persona
- Graceful exit and error handling
- (Stretch) Streamlit UI

**Core loop:**
```python
messages = [{"role": "system", "content": "You are a helpful assistant."}]

while True:
    user_input = input("You: ")
    if user_input.lower() == "quit":
        break
    
    messages.append({"role": "user", "content": user_input})
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    
    reply = response.choices[0].message.content
    messages.append({"role": "assistant", "content": reply})
    print(f"Bot: {reply}")
```

**Stretch goals:**
- Save/load conversation history to a JSON file
- Add a Streamlit UI (`pip install streamlit`)
- Token counting to warn when approaching limits

---

## Week 2: LangChain → Embeddings → RAG → "Chat with PDF"

---

### Day 8–9: LangChain

**Goal:** Understand why LangChain exists and use its core abstractions.

**Setup:**
```bash
pip install langchain langchain-openai langchain-community
```

**Core concepts:**
- **Chains** — compose multiple steps (prompt → LLM → parser)
- **Prompt Templates** — reusable prompts with variables
- **Output Parsers** — parse LLM text into Python objects
- **LCEL (LangChain Expression Language)** — pipe syntax: `prompt | llm | parser`
- **Memory** — `ConversationBufferMemory` for chat history

**Example — LCEL chain:**
```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4o-mini")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("user", "{input}")
])

chain = prompt | llm
response = chain.invoke({"input": "What is LangChain?"})
print(response.content)
```

**Resources:**
- LangChain docs (python.langchain.com)
- LangChain Expression Language (LCEL) guide

---

### Day 10: Embeddings

**Goal:** Understand what embeddings are and how to generate + compare them.

**Concepts:**
- An embedding is a list of floats (~1536 numbers) representing meaning
- Similar text → similar embeddings (cosine similarity close to 1.0)
- Use cases: semantic search, clustering, deduplication

**Generate embeddings:**
```python
from openai import OpenAI

client = OpenAI()

def embed(text):
    return client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    ).data[0].embedding

import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

e1 = embed("I love dogs")
e2 = embed("Puppies are great")
e3 = embed("The stock market crashed")

print(cosine_similarity(e1, e2))  # high ~0.9
print(cosine_similarity(e1, e3))  # low  ~0.2
```

**Practice:** Build a simple semantic search over 20 hardcoded sentences.

---

### Day 11: RAG (Retrieval-Augmented Generation)

**Goal:** Understand the RAG pattern — why it exists and all its components.

**The problem RAG solves:**
LLMs have a knowledge cutoff and can't know your private documents. RAG lets you inject relevant context at query time.

**RAG pipeline:**
```
[Your Documents]
       ↓
  Split into chunks (e.g. 500 tokens each)
       ↓
  Embed each chunk → store in vector DB
       ↓
[User Query]
       ↓
  Embed the query
       ↓
  Find top-K similar chunks (vector search)
       ↓
  Inject chunks into LLM prompt as context
       ↓
  LLM answers using only retrieved context
```

**Key decisions in RAG:**
- **Chunk size** — too small loses context; too large dilutes relevance
- **Chunk overlap** — prevent cutting sentences in half
- **Top-K** — how many chunks to retrieve (usually 3–5)
- **Embedding model** — `text-embedding-3-small` is fast and cheap

**Resources:**
- LangChain RAG tutorial
- "Retrieval-Augmented Generation for NLP" (original paper — optional)

---

### Day 12–14: Build — "Chat with PDF"

**Goal:** Upload a PDF, ask questions, get answers grounded in the document.

**Setup:**
```bash
pip install langchain langchain-openai faiss-cpu pypdf
```

**Full implementation:**
```python
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

# 1. Load PDF
loader = PyPDFLoader("document.pdf")
docs = loader.load()

# 2. Split into chunks
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

# 3. Embed and store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.from_documents(chunks, embeddings)

# 4. Create retriever + QA chain
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
llm = ChatOpenAI(model="gpt-4o-mini")
qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

# 5. Ask questions
while True:
    q = input("Ask: ")
    print(qa_chain.invoke(q)["result"])
```

**Stretch goals:**
- Add source citations (which page answered the question)
- Support multiple PDFs
- Streamlit UI with file upload

---

## Week 3: LangGraph → AI Agents → MCP → AI Research Assistant

---

### Day 15–16: LangGraph

**Goal:** Build stateful, multi-step AI workflows using a graph model.

**Setup:**
```bash
pip install langgraph
```

**Why LangGraph:**
LangChain chains are linear. LangGraph lets you build **loops**, **conditionals**, and **parallel branches** — essential for agents that can retry, decide, or use tools.

**Core concepts:**
- **State** — a TypedDict passed between nodes
- **Nodes** — Python functions that transform state
- **Edges** — connections between nodes (can be conditional)
- **Graph** — assembled from nodes + edges + a defined START/END

**Minimal example:**
```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class State(TypedDict):
    input: str
    output: str

def process(state: State) -> State:
    return {"output": f"Processed: {state['input']}"}

graph = StateGraph(State)
graph.add_node("process", process)
graph.set_entry_point("process")
graph.add_edge("process", END)

app = graph.compile()
result = app.invoke({"input": "hello"})
print(result["output"])
```

**Resources:**
- LangGraph docs + tutorials (langchain-ai.github.io/langgraph)
- LangGraph "ReAct agent from scratch" tutorial

---

### Day 17–18: AI Agents

**Goal:** Understand the agent loop — how LLMs decide to call tools.

**The ReAct loop:**
```
Think → Act (call tool) → Observe result → Think again → ...
```

**Tool calling with OpenAI:**
```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
    tool_choice="auto"
)
```

**Agent design checklist:**
- Define clear, narrow tools (one job each)
- Write tool descriptions as if training a junior developer
- Always validate tool output before feeding back to LLM
- Add a max-iteration guard to prevent infinite loops
- Log every tool call for debugging

---

### Day 19: MCP (Model Context Protocol)

**Goal:** Understand MCP — how it standardizes tool/resource exposure to LLMs.

**What MCP is:**
MCP (by Anthropic) is an open protocol that lets you expose tools, resources, and prompts to any compatible LLM client (Claude Desktop, Cursor, etc.) through a standardized interface.

**Key concepts:**
- **MCP Server** — a process that exposes tools/resources
- **MCP Client** — an LLM app that connects to servers
- **Tools** — functions the LLM can call
- **Resources** — data the LLM can read (files, DB rows, API responses)
- **Prompts** — reusable prompt templates

**When to use MCP vs direct tool calling:**
- MCP: building reusable tool servers others can plug into (Claude Desktop, Cursor)
- Direct tool calling: one-off tools inside your own agent

**Setup:**
```bash
pip install mcp
```

**Resources:**
- modelcontextprotocol.io — official docs
- MCP Python SDK (GitHub: modelcontextprotocol/python-sdk)
- Anthropic MCP announcement blog post

---

### Day 20–21: Build — AI Research Assistant

**Goal:** An agent that searches the web, reads pages, and writes a research report.

**Architecture:**
```
User query
    ↓
[Planner Node] — breaks query into sub-questions
    ↓
[Search Node] — web search for each sub-question
    ↓
[Summarizer Node] — summarize each search result
    ↓
[Writer Node] — compile into a structured report
    ↓
Final report output
```

**Tools to implement:**
- `web_search(query)` — use SerpAPI or Tavily
- `fetch_page(url)` — use `requests` + `BeautifulSoup`
- `summarize(text)` — LLM call to condense a long page

**Setup:**
```bash
pip install langgraph langchain-openai tavily-python beautifulsoup4
```

**Stretch goals:**
- Add a "fact-check" node that cross-references claims
- Export report as a formatted PDF
- Add human-in-the-loop approval before writing final report

---

## Week 4: AI Evaluation → Monitoring → Deployment

---

### Day 22–23: AI Evaluation

**Goal:** Measure whether your AI system actually works — beyond vibes.

**Why evaluation is hard:**
LLM outputs are non-deterministic and hard to grade automatically.

**Evaluation types:**

| Type | Method | When to use |
|------|--------|-------------|
| Reference-based | Compare to golden answer (BLEU, exact match) | QA with known answers |
| LLM-as-judge | Use another LLM to grade output | Open-ended responses |
| Human eval | Human raters | High-stakes, final validation |
| Retrieval eval | Precision/recall of retrieved chunks | RAG systems |

**RAG-specific metrics (RAGAS):**
- **Faithfulness** — does the answer stick to retrieved context?
- **Answer relevancy** — does the answer address the question?
- **Context precision** — are retrieved chunks actually relevant?

**Setup:**
```bash
pip install ragas datasets
```

**Build:** Create a 20-question test set for your "Chat with PDF" project and measure faithfulness + answer relevancy.

**Resources:**
- RAGAS docs (docs.ragas.io)
- "LLM-as-a-Judge" paper (Zheng et al.)

---

### Day 24–25: Monitoring

**Goal:** Observe your AI system in production — catch regressions and bad outputs.

**What to track:**

| Metric | Why it matters |
|--------|----------------|
| Latency (p50, p95, p99) | User experience |
| Token usage | Cost control |
| Error rate (API failures, timeouts) | Reliability |
| Output quality (LLM judge score) | Catch regressions |
| Retrieval relevance | RAG health |
| User feedback (thumbs up/down) | Ground truth signal |

**Tools:**

| Tool | Best for |
|------|----------|
| **LangSmith** | LangChain tracing, built-in eval |
| **Langfuse** | Open-source alternative, self-hostable |
| **OpenTelemetry** | Custom spans in any stack |
| **Prometheus + Grafana** | Infrastructure-level metrics |

**LangSmith quickstart:**
```bash
pip install langsmith
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=your_key
```
Every LangChain/LangGraph call is now automatically traced.

---

### Day 26–27: Deployment

**Goal:** Get your AI app running in a real environment others can access.

**API layer — FastAPI:**
```bash
pip install fastapi uvicorn
```

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Query(BaseModel):
    question: str

@app.post("/ask")
async def ask(query: Query):
    # call your RAG chain here
    return {"answer": qa_chain.invoke(query.question)["result"]}
```

**Deployment options:**

| Option | Best for | Cost |
|--------|----------|------|
| **Railway** | Fast hobby deploys, git push | Free tier available |
| **Render** | Similar to Railway, good free tier | Free tier available |
| **Fly.io** | Docker-based, global edge | Free tier available |
| **AWS Lambda** | Serverless, scales to zero | Pay per call |
| **Modal** | GPU/ML workloads | Pay per second |

**Containerize with Docker:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Environment variable checklist before deploy:**
- [ ] API keys in environment variables (never in code)
- [ ] Rate limiting on your endpoints
- [ ] Input validation (Pydantic models)
- [ ] Request logging
- [ ] Health check endpoint (`GET /health`)

---

### Day 28–30: Capstone + Polish

**Goal:** Complete, polish, and document all four projects.

**Capstone checklist:**

- [ ] **Chatbot** — add Streamlit UI, conversation history persistence
- [ ] **Chat with PDF** — multi-file support, source citations, better chunking
- [ ] **Research Assistant** — add fact-checking node, export to PDF
- [ ] **All projects** — add eval suite, LangSmith tracing, deploy one to Railway

**Portfolio checklist:**
- [ ] Each project has a clear README with setup instructions
- [ ] At least one project is live (deployed URL)
- [ ] Record a 2-minute demo video for your strongest project
- [ ] Write one blog post or LinkedIn post about what you learned

---

## Quick Reference: Tools & Libraries

| Category | Library | Install |
|----------|---------|---------|
| LLM API | `openai` | `pip install openai` |
| Framework | `langchain` | `pip install langchain langchain-openai` |
| Agents/Graphs | `langgraph` | `pip install langgraph` |
| Vector DB (local) | `faiss-cpu` | `pip install faiss-cpu` |
| Vector DB (cloud) | `pinecone` | `pip install pinecone-client` |
| PDF loading | `pypdf` | `pip install pypdf` |
| Web search | `tavily-python` | `pip install tavily-python` |
| Evaluation | `ragas` | `pip install ragas` |
| Monitoring | `langsmith` | `pip install langsmith` |
| API server | `fastapi` | `pip install fastapi uvicorn` |
| UI | `streamlit` | `pip install streamlit` |

---

## Day-by-Day Summary

| Day | Topic | Deliverable |
|-----|-------|-------------|
| 1–2 | Python basics | Comfortable with files, dicts, functions |
| 3 | OpenAI API | First API call working |
| 4 | Prompt engineering | 3 prompt techniques practiced |
| 5–7 | **Build:** Chatbot | Working multi-turn chatbot |
| 8–9 | LangChain | LCEL chain running |
| 10 | Embeddings | Semantic search over 20 sentences |
| 11 | RAG concepts | RAG pipeline diagrammed and understood |
| 12–14 | **Build:** Chat with PDF | PDF QA working |
| 15–16 | LangGraph | Simple stateful graph built |
| 17–18 | AI Agents | Tool-calling agent working |
| 19 | MCP | MCP server/client understood |
| 20–21 | **Build:** Research Assistant | Multi-step research agent working |
| 22–23 | Evaluation | RAGAS eval on Chat with PDF |
| 24–25 | Monitoring | LangSmith tracing on all projects |
| 26–27 | Deployment | One project deployed to Railway/Render |
| 28–30 | **Capstone + Polish** | All 4 projects complete + one live |
