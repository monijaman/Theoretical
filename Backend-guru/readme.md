# Backend Engineering Learning Guide

A practical collection of notes for building, understanding, and operating backend services. Start with a small API and add complexity when you can explain the problem it solves.

## Choose Your Starting Point

| Your goal | Start with |
| --- | --- |
| Write clearer application code | [Coding Styles](Coding%20Styles/readme.md) |
| Build a predictable API | [API Design](API%20Design/readme.md), then [Security & Performance](Security%20and%20Performance/readme.md) |
| Understand architecture choices | [Architecture Patterns](Architecture%20Patterns/readme.md), then [System Design](System%20Design/readme.md) |
| Add caching or background work | [Redis](Redis%20Deep%20Dive/readme.md), then [RabbitMQ](RabbitMQ%20%2B%20Event-Driven%20Architecture/readme.md) |
| Diagnose service failures | [Observability & Reliability](Observability%20%26%20Reliability/readme.md) |
| Practice operating a service | [Kubernetes](Kubernetes%20%2B%20Observability%20%2B%20Production%20Engineering/readme.md), then [Production Simulation](Production%20Simulation/readme.md) |
| Prepare for an interview | [Interview Guide](Interview/readme.md) and [System Design Practice](System%20Design/10-system-design-practice/readme.md) |

## Before You Begin

Be comfortable with JavaScript functions and promises, HTTP requests, JSON, and basic database queries. Useful background elsewhere in this repository includes [Node.js and Express](../Node-Express/readme.md), [TypeScript](../TypeScript/README.md), and [MongoDB](../Mongo-DB/readme.md).

Examples focus on individual ideas. Some omit application setup or use placeholder services and credentials. Treat capacity figures and timings as learning examples unless a cited source or reproducible measurement supports them. Check the documentation for the versions you use before adopting a configuration.

## Suggested Learning Path

1. **Build a small API.** Practice readable code, validation, authorization, consistent responses, and database access.
2. **Understand its design.** Draw the request flow and explain the responsibilities of each component.
3. **Measure it.** Add logs and basic metrics, then identify a real bottleneck before adding a cache.
4. **Add background work.** Move one task to a queue and test retries and duplicate delivery.
5. **Operate it.** Practice deployment, health checks, shutdown, alerts, and recovery.
6. **Explain your decisions.** Use the interview and system design exercises to compare alternatives.

Work through one topic at a time. Study duration depends on your background and practice time; completing the notes is a starting point for experience, not a guarantee of a particular role.

## All Modules

| Module | What you will learn |
| --- | --- |
| [Coding Styles](Coding%20Styles/readme.md) | Use consistent names, small responsibilities, and clear error handling to make backend code easier to change. |
| [API Design](API%20Design/readme.md) | Design an API that clients can understand and use consistently. |
| [Security and Performance](Security%20and%20Performance/readme.md) | Learn how to protect an API and investigate slow requests. |
| [Architecture Patterns](Architecture%20Patterns/readme.md) | Compare ways to organize and deploy a backend. |
| [System Design](System%20Design/readme.md) | Study scaling, storage, consistency, communication, and complete design exercises. |
| [Distributed Systems Concepts](Distributed%20Systems%20Concepts/readme.md) | Understand what changes when an operation depends on several machines. |
| [Redis Deep Dive](Redis%20Deep%20Dive/readme.md) | Learn how Redis can support caching, rate limiting, and real-time updates. |
| [RabbitMQ + Event-Driven Architecture](RabbitMQ%20%2B%20Event-Driven%20Architecture/readme.md) | Learn how publishers, queues, and consumers work together. |
| [Observability & Reliability](Observability%20%26%20Reliability/readme.md) | Use logs, metrics, traces, health checks, and service objectives to understand failures. |
| [Kubernetes + Observability + Production Engineering](Kubernetes%20%2B%20Observability%20%2B%20Production%20Engineering/readme.md) | Deploy, scale, secure, and troubleshoot workloads in a cluster. |
| [Production Simulation](Production%20Simulation/readme.md) | Practice responding to failures in a controlled environment. |
| [Interview](Interview/readme.md) | Practice 100 backend questions with explanations, examples, and trade-offs. |
| [Others](Others/readme.md) | Explore real-time communication, Socket.IO scaling, and live-streaming building blocks. |

## How the Guides Fit Together

The System Design folder explains general building blocks and trade-offs. The dedicated Redis, RabbitMQ, Kubernetes, and observability guides provide implementation examples. The interview guide helps you revisit the same ideas as questions.

A monolith, modular monolith, and microservices are design options. Choose based on deployment needs, team ownership, data boundaries, and operational cost. A larger number of services is not a measure of engineering skill.

## A Project to Connect the Topics

Build a small order API and improve it in stages:

- Store orders and validate inputs; test permissions and error responses.
- Add pagination and document the API contract.
- Cache a product lookup and explain how it becomes fresh after an update.
- Send a confirmation through a queue and handle duplicate messages.
- Connect a failed request to logs, metrics, and a trace.
- Deploy to a practice environment, interrupt one dependency, and verify recovery.

Keep a short record of what you measured, what changed, and which trade-offs remain. That evidence is more useful than adding tools without a clear need.

## Progress Check

You are ready to move on from a topic when you can explain its purpose, build a small example, identify a failure mode, and justify when you would choose another approach.
