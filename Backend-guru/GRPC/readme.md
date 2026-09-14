# gRPC: Build and Understand Service-to-Service APIs

Learn gRPC by building a small Node.js catalog service. You will define its contract, run a server and client, try all four RPC types, and learn how to handle failures and operate the service.

**RPC** means **remote procedure call**: one application asks another application to run an operation. A gRPC client exposes methods that look like function calls, but they cross a network and can fail, time out, or complete after the caller stops waiting.

## Start Here

**Before you begin:** Understand JavaScript functions, callbacks, basic Node.js, and client/server communication. Familiarity with Express helps, but this tutorial does not use Express.

**What you will build:**

| Operation | RPC type | What it demonstrates |
| --- | --- | --- |
| `GetProduct` | Unary | One request returns one product. |
| `ListProducts` | Server streaming | One request returns several products individually. |
| `SummarizeCart` | Client streaming | Several cart items produce one total. |
| `SupportChat` | Bidirectional streaming | Client and server exchange messages independently. |

The project uses an in-memory catalog. Cart summaries do not place orders, and the support chat is a simple reply service, not a persistent multi-user chat system.

**Suggested reading path:** Complete sections 1–6 first. Then study failures and contracts in sections 7–10, followed by production concerns in sections 11–14.

## Contents

1. [What gRPC does](#1-what-grpc-does)
2. [gRPC, REST, and message queues](#2-grpc-rest-and-message-queues)
3. [Understand the four RPC types](#3-understand-the-four-rpc-types)
4. [Set up the project and contract](#4-set-up-the-project-and-contract)
5. [Implement the server](#5-implement-the-server)
6. [Implement and run the client](#6-implement-and-run-the-client)
7. [Understand status codes and errors](#7-understand-status-codes-and-errors)
8. [Deadlines, cancellation, and retries](#8-deadlines-cancellation-and-retries)
9. [Metadata, authentication, and TLS](#9-metadata-authentication-and-tls)
10. [Evolve Protocol Buffer contracts](#10-evolve-protocol-buffer-contracts)
11. [Streaming and backpressure](#11-streaming-and-backpressure)
12. [Testing and debugging](#12-testing-and-debugging)
13. [Deploying and observing a service](#13-deploying-and-observing-a-service)
14. [Browser clients and API gateways](#14-browser-clients-and-api-gateways)
15. [Troubleshooting](#15-troubleshooting)
16. [Practice projects and interview questions](#16-practice-projects-and-interview-questions)

## 1. What gRPC Does

Imagine an order service that needs product information from a catalog service. It needs an agreed operation name, request format, response format, and failure behavior.

In gRPC, you commonly define those details using **Protocol Buffers**, also called **Protobuf**, in a `.proto` file. Client and server tooling use that definition to encode and decode messages.

```text
Order service                              Catalog service

client.getProduct({ id: "p1" })
             |
             v
      Encode request  -- network -->  Decode request
                                           |
                                      Run handler
                                           |
      Decode response <-- network --  Encode response
             |
             v
       Product or error
```

Traditional gRPC uses HTTP/2 transport. Protocol Buffers describe messages and services; gRPC adds the RPC lifecycle, status handling, metadata, and streaming behavior. See [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/).

### Key terms

| Term | Meaning |
| --- | --- |
| Service | A named group of remote operations. |
| Method | One operation, such as `GetProduct`. |
| Message | A structured request or response value. |
| Stub/client | The local API used to invoke remote methods. |
| Channel | The client's connection abstraction for reaching a target. |
| Metadata | Key/value information sent alongside messages. |
| Deadline | The latest time a caller is willing to wait. |
| Status | The final outcome of an RPC. |
| Stream | A sequence of messages within one RPC. |

Reuse a client for calls to the same target instead of constructing one per request. Close it when that part of the application shuts down.

## 2. gRPC, REST, and Message Queues

Choose communication based on what the caller needs, who the clients are, and how failures should behave.

| Question | gRPC | Typical REST/JSON API | Message queue |
| --- | --- | --- | --- |
| Main interaction | Named remote operations | HTTP operations on resources | Publish and process messages |
| Contract | Usually a `.proto` schema | Often OpenAPI plus JSON schemas | Event/message schemas |
| Response | Unary or streaming RPC result | HTTP response | Often a later event or separate status lookup |
| Browser integration | Needs compatible browser tooling or a gateway | Direct browser support | Usually accessed through a backend |
| Offline consumer | Ordinary RPC does not durably queue work | Ordinary HTTP does not durably queue work | Can buffer work when configured for durability |
| Good example | Internal catalog lookup | Public product API | Background email delivery |

A gRPC call can use asynchronous JavaScript without becoming a durable background job. If a consumer must process work after being offline, design a persistence and delivery mechanism for that requirement.

Binary encoding and HTTP/2 can help efficiency, but gRPC is not automatically faster for every workload. Measure payload size, serialization, connection behavior, and downstream latency.

**Checkpoint:** Explain why an order lookup might use gRPC while sending a confirmation email might use [RabbitMQ](../RabbitMQ%20%2B%20Event-Driven%20Architecture/readme.md).

## 3. Understand the Four RPC Types

```text
Unary:                 request  ------------> response
Server streaming:      request  ------------> response, response, response
Client streaming:      request, request ----> response
Bidirectional:         request, request <--> response, response
```

### Unary

One request produces one response or an error. Start here for lookups and bounded operations.

### Server streaming

The client sends one request and receives messages over time. For example, the server returns catalog entries one at a time. A stream can fail after delivering some messages; receiving data alone does not prove the RPC completed successfully.

### Client streaming

The client sends multiple messages, then finishes its sending side. The server returns a single result. In our example, the server sums the contents of a small cart.

### Bidirectional streaming

Both sides can send multiple messages. Each direction preserves its message order, but your application defines the relationship between requests and responses. gRPC does not require one response per request.

These patterns are described in the [Node.js basics tutorial](https://grpc.io/docs/languages/node/basics/).

## 4. Set Up the Project and Contract

### Install the dependencies

Use a maintained Node.js release compatible with the installed packages. In a new directory, run:

```bash
mkdir grpc-catalog-lab
cd grpc-catalog-lab
npm init -y
npm install @grpc/grpc-js @grpc/proto-loader
```

The tutorial uses CommonJS. If you add these files to an existing project with `"type": "module"`, use `.cjs` filenames and adjust the imports, or convert them to ES modules.

- `@grpc/grpc-js` provides the Node.js gRPC implementation.
- `@grpc/proto-loader` loads the contract at runtime.

Commit the resulting lock file when keeping the project in Git. Dynamic loading avoids a code-generation step in this JavaScript lab; it does not provide generated TypeScript checking for your application objects.

### Project layout

Create these four files:

```text
grpc-catalog-lab/
├── catalog.proto
├── proto.js
├── server.js
├── client.js
├── package.json
└── package-lock.json
```

### Define catalog.proto

```proto
syntax = "proto3";

package catalog.v1;

service CatalogService {
  rpc GetProduct(GetProductRequest) returns (Product);
  rpc ListProducts(ListProductsRequest) returns (stream Product);
  rpc SummarizeCart(stream CartItem) returns (CartSummary);
  rpc SupportChat(stream ChatMessage) returns (stream ChatMessage);
}

message GetProductRequest {
  string id = 1;
}

message ListProductsRequest {}

message Product {
  string id = 1;
  string name = 2;
  int32 price_cents = 3;
}

message CartItem {
  string product_id = 1;
  int32 quantity = 2;
}

message CartSummary {
  int32 total_quantity = 1;
  int64 total_cents = 2;
}

message ChatMessage {
  string text = 1;
}
```

The number after each field is its **wire identifier**, not a default value or array position. Keep those numbers stable when evolving the schema. `stream` before a request or response type selects the corresponding streaming direction.

This example assumes one currency and stores prices in integer cents. In a real API, define the currency and permitted ranges explicitly. Protocol Buffers describe types, but business rules such as “quantity must be positive” still need validation. See the [proto3 language guide](https://protobuf.dev/programming-guides/proto3/).

### Load the contract in proto.js

```javascript
const path = require('node:path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const definition = protoLoader.loadSync(
  path.join(__dirname, 'catalog.proto'),
  {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const catalog = grpc.loadPackageDefinition(definition).catalog.v1;

module.exports = { grpc, CatalogService: catalog.CatalogService };
```

The options affect the JavaScript representation:

| Option | Effect in this tutorial |
| --- | --- |
| `keepCase: false` | `product_id` becomes `productId`; `price_cents` becomes `priceCents`. |
| `longs: String` | Represents 64-bit integers as strings, avoiding JavaScript number precision loss. |
| `enums: String` | Represents enum values by name if enums are added. |
| `defaults: true` | Populates ordinary default values in decoded objects. |
| `oneofs: true` | Adds information describing selected `oneof` fields. |

Both server and client import this shared loader so they use the same object shape.

## 5. Implement the Server

Create `server.js`:

```javascript
const { grpc, CatalogService } = require('./proto');

const products = new Map([
  ['p1', { id: 'p1', name: 'Keyboard', priceCents: 4999 }],
  ['p2', { id: 'p2', name: 'Mouse', priceCents: 1999 }],
  ['p3', { id: 'p3', name: 'Monitor', priceCents: 19999 }],
]);

function rpcError(code, details) {
  return { code, details };
}

function getProduct(call, callback) {
  const id = call.request.id.trim();

  if (!id) {
    callback(rpcError(grpc.status.INVALID_ARGUMENT, 'Product ID is required'));
    return;
  }

  const product = products.get(id);
  if (!product) {
    callback(rpcError(grpc.status.NOT_FOUND, 'Product not found'));
    return;
  }

  callback(null, product);
}

function listProducts(call) {
  // A finite catalog of three entries keeps this demonstration bounded.
  const entries = [...products.values()];
  let index = 0;
  let timer;

  function sendNext() {
    if (call.cancelled) return;
    if (index === entries.length) {
      call.end();
      return;
    }

    const canContinue = call.write(entries[index++]);
    if (canContinue) {
      timer = setTimeout(sendNext, 200);
    } else {
      call.once('drain', sendNext);
    }
  }

  call.on('cancelled', () => {
    clearTimeout(timer);
    call.removeListener('drain', sendNext);
  });

  sendNext();
}

function summarizeCart(call, callback) {
  let totalQuantity = 0;
  let totalCents = 0;
  let itemCount = 0;
  let finished = false;

  function finish(error, response) {
    if (finished) return;
    finished = true;
    callback(error, response);
  }

  call.on('cancelled', () => { finished = true; });
  call.on('error', () => { finished = true; });

  call.on('data', (item) => {
    if (finished) return;

    itemCount += 1;
    if (itemCount > 100) {
      finish(rpcError(grpc.status.RESOURCE_EXHAUSTED, 'At most 100 cart items'));
      return;
    }

    const product = products.get(item.productId);
    if (!product) {
      finish(rpcError(grpc.status.NOT_FOUND, 'Cart contains an unknown product'));
      return;
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      finish(rpcError(grpc.status.INVALID_ARGUMENT, 'Quantity must be 1 through 100'));
      return;
    }

    totalQuantity += item.quantity;
    totalCents += product.priceCents * item.quantity;
  });

  call.on('end', () => {
    // Totals stay within safe integer bounds for this fixed catalog and limits.
    finish(null, { totalQuantity, totalCents: String(totalCents) });
  });
}

function supportChat(call) {
  // A bounded echo-style support demo, not durable chat history.
  let count = 0;
  let finished = false;

  call.on('cancelled', () => { finished = true; });
  call.on('error', () => { finished = true; });

  call.on('data', (message) => {
    if (finished) return;
    const text = message.text.trim();
    count += 1;

    if (!text || text.length > 200 || count > 10) {
      finished = true;
      call.emit('error', rpcError(
        grpc.status.INVALID_ARGUMENT,
        'Send at most 10 non-empty messages, each at most 200 characters'
      ));
      return;
    }

    // At most ten short replies are buffered in this teaching example.
    call.write({ text: `Support received: ${text}` });
  });

  call.on('end', () => {
    if (!finished) {
      finished = true;
      call.end();
    }
  });
}

const server = new grpc.Server();
server.addService(CatalogService.service, {
  getProduct,
  listProducts,
  summarizeCart,
  supportChat,
});

const address = '127.0.0.1:50051';
server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error) => {
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Catalog service listening on ${address}`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  const timeout = setTimeout(() => server.forceShutdown(), 5000);
  server.tryShutdown(() => {
    clearTimeout(timeout);
    console.log('Catalog service stopped');
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### Read the handlers by RPC type

| Handler | Receives | Completes by |
| --- | --- | --- |
| `getProduct` | `call.request` | Calling `callback(error, response)`. |
| `listProducts` | `call.request` | Writing responses and calling `call.end()`. |
| `summarizeCart` | Incoming `data` events | Returning one callback response after input ends. |
| `supportChat` | Incoming `data` events | Writing responses and ending its response stream. |

A unary callback should be completed once. The cart handler uses a guard because validation, stream completion, and cancellation can occur through different event paths.

The server binds to the local loopback address without TLS for this lab. Current `grpc-js` starts serving after a successful bind; a separate `server.start()` call is unnecessary. The shutdown handler gives active calls a bounded opportunity to finish before forcefully stopping remaining calls.

## 6. Implement and Run the Client

Create `client.js`:

```javascript
const { grpc, CatalogService } = require('./proto');

const client = new CatalogService(
  '127.0.0.1:50051',
  grpc.credentials.createInsecure()
);

const mode = process.argv[2] || 'get';
const options = { deadline: new Date(Date.now() + 5000) };
const metadata = new grpc.Metadata();
metadata.set('x-request-id', 'catalog-lab');

function report(error) {
  console.error(`${grpc.status[error.code] || error.code}: ${error.details || error.message}`);
  process.exitCode = 1;
}

function receiveStream(call) {
  call.on('data', (message) => console.log(message));
  call.on('error', report);
  call.on('status', (status) => {
    console.log(`Final status: ${grpc.status[status.code]}`);
    client.close();
  });
}

switch (mode) {
  case 'get':
    client.getProduct(
      { id: process.argv[3] ?? 'p1' },
      metadata,
      options,
      (error, product) => {
        if (error) report(error);
        else console.log(product);
        client.close();
      }
    );
    break;

  case 'list': {
    const call = client.listProducts({}, metadata, options);
    receiveStream(call);
    break;
  }

  case 'cart': {
    const call = client.summarizeCart(metadata, options, (error, summary) => {
      if (error) report(error);
      else console.log(summary);
      client.close();
    });
    call.on('error', report);
    call.write({ productId: 'p1', quantity: 2 });
    call.write({ productId: 'p2', quantity: 1 });
    call.end();
    break;
  }

  case 'chat': {
    const call = client.supportChat(metadata, options);
    receiveStream(call);
    call.write({ text: 'Hello!' });
    call.write({ text: 'Do you have keyboards?' });
    call.end();
    break;
  }

  default:
    console.error('Choose: get [id], list, cart, or chat');
    process.exitCode = 1;
    client.close();
}
```

### Run the server

In terminal 1, from the project directory:

```bash
node server.js
```

Expected startup message:

```text
Catalog service listening on 127.0.0.1:50051
```

### Try all four methods

In terminal 2, from the same directory:

```bash
node client.js get p1
node client.js list
node client.js cart
node client.js chat
```

Representative output:

```text
# get p1
{ id: 'p1', name: 'Keyboard', priceCents: 4999 }

# list: three separate response messages
{ id: 'p1', name: 'Keyboard', priceCents: 4999 }
{ id: 'p2', name: 'Mouse', priceCents: 1999 }
{ id: 'p3', name: 'Monitor', priceCents: 19999 }
Final status: OK

# cart: 2 keyboards + 1 mouse
{ totalQuantity: 3, totalCents: '11997' }

# chat
{ text: 'Support received: Hello!' }
{ text: 'Support received: Do you have keyboards?' }
Final status: OK
```

Object formatting may vary. `totalCents` is a string because the loader represents `int64` values as strings.

In `cart` and `chat`, `call.end()` means **the client has finished sending**. It does not mean the client stops receiving. This is called closing or half-closing the sending side.

Stop the server with Ctrl+C when finished. The lab creates no database or cloud resources.

**Checkpoint:** Point to the request, response, and completion mechanism for each of the four methods.

[Back to contents](#contents)

## 7. Understand Status Codes and Errors

A gRPC operation ends with a status. Keep failures distinct so callers can decide whether to fix input, authenticate, retry, or investigate.

| Status | Typical meaning | Example |
| --- | --- | --- |
| `OK` | Successful completion | Product found. |
| `INVALID_ARGUMENT` | Input is invalid | Empty product ID. |
| `NOT_FOUND` | Requested object is absent | Unknown product ID. |
| `UNAUTHENTICATED` | Valid authentication is missing | Expired access token. |
| `PERMISSION_DENIED` | Caller lacks permission | User cannot access this catalog. |
| `RESOURCE_EXHAUSTED` | A quota or capacity limit was reached | Too many cart items. |
| `FAILED_PRECONDITION` | System state prevents the operation | Order already finalized. |
| `UNAVAILABLE` | Service is currently unavailable | Connection or transient service failure. |
| `DEADLINE_EXCEEDED` | Caller ran out of waiting time | Dependency took too long. |
| `CANCELLED` | Call was cancelled | Caller abandoned the request. |
| `INTERNAL` | Unexpected internal failure | Server invariant failed. |

See the [status-code reference](https://grpc.io/docs/guides/status-codes/). HTTP status and gRPC status are different layers; an HTTP response alone does not tell you the RPC outcome.

### Try two failures

With the server running:

```bash
node client.js get missing
node client.js get ''
```

Expect `NOT_FOUND` and `INVALID_ARGUMENT`, respectively. These should not become generic `INTERNAL` errors.

Log internal diagnostic context on the server, but return a safe, useful error description to the client. Avoid exposing SQL queries, stack traces, or credentials in error messages.

## 8. Deadlines, Cancellation, and Retries

### Set a deadline

The client uses a five-second deadline for each demo invocation. Production deadlines should come from the user journey and expected service latency, not a universal timeout value.

A deadline includes time spent waiting for the call to succeed, not just the handler's computation. Without an explicit deadline, a caller may wait much longer than intended. See [gRPC deadlines](https://grpc.io/docs/guides/deadlines/).

If service A calls B and B calls C, B should pass a bounded remaining budget to C rather than giving every downstream request a fresh full timeout. In a Node.js server handler, `call.getDeadline()` exposes the incoming deadline; your application must connect that budget to downstream RPCs and other I/O.

### Cancellation must stop application work

For a client stream or call object:

```javascript
// Illustration: cancel an existing in-flight call.
call.cancel();
```

On the server, observe cancellation and stop timers, database queries, or other work when the dependency supports cancellation. The list handler clears its timer when the client cancels.

Cancellation does not undo a completed database transaction or external charge. A caller receiving `DEADLINE_EXCEEDED` cannot conclude that no side effect happened.

### Retry deliberately

A useful retry policy answers:

- Is the operation safe to repeat?
- Which failures are retryable?
- How many attempts fit within the deadline?
- What backoff and jitter prevent synchronized retry bursts?
- Does another layer already retry this call?

`GetProduct` is a read and is easier to retry than `ChargeCard`. For a mutation, use a stable operation ID and durable idempotency handling. Do not retry every error or replay a partially consumed stream without a resume/deduplication design.

The runtime can perform limited transparent retries, and configured policies can add attempts under defined conditions. Neither makes application side effects exactly-once. See [gRPC retry behavior](https://grpc.io/docs/guides/retry/).

## 9. Metadata, Authentication, and TLS

Metadata carries information alongside the request message. Our client sends `x-request-id`; the server can read it with:

```javascript
// Inside an existing handler:
const requestId = call.metadata.get('x-request-id')[0];
```

Request IDs help correlate logs. They are not proof of identity, and the server should validate or replace untrusted values when necessary.

### Authentication metadata

Over a secure channel, a client can attach a bearer token:

```javascript
const metadata = new grpc.Metadata();
metadata.set('authorization', `Bearer ${accessToken}`);
```

This is an integration snippet; `accessToken` comes from your authentication flow. Sending a token does not verify it. Server-side middleware or interceptors must validate it and enforce authorization for the operation and resource.

### TLS credentials

The lab uses plaintext only on loopback. In a TLS deployment, replace the client's insecure credentials with trusted certificate configuration:

```javascript
const fs = require('node:fs');

const client = new CatalogService(
  'catalog.example.com:443',
  grpc.credentials.createSsl(fs.readFileSync('ca.pem'))
);
```

For a server that terminates TLS itself, replace the credentials passed to `bindAsync`:

```javascript
const fs = require('node:fs');

const credentials = grpc.ServerCredentials.createSsl(
  null,
  [{
    private_key: fs.readFileSync('server-key.pem'),
    cert_chain: fs.readFileSync('server-cert.pem'),
  }],
  false
);
```

These snippets require real certificates, a matching hostname, and the corresponding TLS listener. The `false` means this server configuration does not require a client certificate. Mutual TLS adds client certificate verification; application authorization is still needed. See [gRPC authentication](https://grpc.io/docs/guides/auth/).

## 10. Evolve Protocol Buffer Contracts

Your clients and servers may deploy at different times. Keep old clients working while rolling out new behavior.

### Add fields without changing existing identities

For example, add a description to `Product` with a new field number:

```proto
message Product {
  string id = 1;
  string name = 2;
  int32 price_cents = 3;
  string description = 4;
}
```

Adding a field can be binary-compatible, but clients must still tolerate its absence and preserve meaningful behavior. Compatibility includes semantics and any JSON-facing interfaces, not just decoding.

If a field is removed, reserve its number and name rather than reusing them:

```proto
// Independent evolution example; not a replacement for the lab's Product.
message Customer {
  string id = 1;
  reserved 2;
  reserved "legacy_email";
}
```

### Presence matters

With implicit proto3 scalar fields, an absent value and its default can look the same. For an update where “leave unchanged” differs from “set to zero,” consider explicit presence, `oneof`, or a field mask.

Keep enum zero values meaningful as an unspecified/default state. Avoid changing field numbers or casually changing types. Use compatibility checks and mixed-version tests; review the [Protobuf schema evolution guidance](https://protobuf.dev/programming-guides/proto3/#updating).

A package name such as `catalog.v1` helps organize a versioned API. Introducing `v2` creates a new contract to deploy and migrate; it does not make breaking changes to `v1` safe.

## 11. Streaming and Backpressure

A stream lets you process messages incrementally, but it does not provide unlimited memory or automatic durable replay.

Suppose a producer sends 10,000 messages per second while a consumer handles 1,000. Buffering the difference indefinitely will eventually exhaust resources.

For Node.js writable streams, a `false` result from `write()` means pause writing until `drain`. The list handler demonstrates that behavior. Our other writers send a small, explicitly bounded number of messages; do not turn those loops into unbounded producers.

Transport flow control helps regulate delivery, but your application still needs bounded work queues and message limits. A successful write into a buffer is not an acknowledgment that the peer completed business processing. See [gRPC flow control](https://grpc.io/docs/guides/flow-control/).

### Questions for a long-lived stream

| Question | Why it matters |
| --- | --- |
| What limits message size and count? | Bounds memory and processing work. |
| What happens when the peer stops reading? | Prevents unbounded buffering. |
| How is cancellation handled? | Stops work no caller needs. |
| Can the client resume after a disconnect? | Requires a cursor, sequence, or application protocol. |
| How are duplicate messages recognized? | Reconnection may replay work. |
| What defines completion? | A message, half-close, and final status are different events. |

For large catalogs, define filters and bounded pagination or resumable streaming instead of always returning every product.

## 12. Testing and Debugging

### Test behavior, not only connectivity

| Test | Expected result |
| --- | --- |
| `GetProduct` with `p1` | Product with the documented fields. |
| Empty ID | `INVALID_ARGUMENT`. |
| Unknown ID | `NOT_FOUND`. |
| List products | Three messages followed by successful final status. |
| Two keyboards and one mouse | Quantity 3 and 11,997 cents. |
| Cart quantity 0 | `INVALID_ARGUMENT`; no successful summary. |
| Cancel a list call | Client sees cancellation; server stops scheduled work. |
| Deadline shorter than list completion | The call fails even if some products arrived. |
| Shutdown during a stream | It finishes within the grace period or is terminated at the limit. |

Unit-test business rules separately from transport. Integration tests should start a real gRPC server and call it using a real client, including failure and cancellation paths.

### Use grpcurl with the local contract

If `grpcurl` is installed, run this from the lab directory while the server is running:

```bash
grpcurl -plaintext \
  -import-path . \
  -proto catalog.proto \
  -d '{"id":"p1"}' \
  127.0.0.1:50051 \
  catalog.v1.CatalogService/GetProduct
```

`-plaintext` matches the lab's non-TLS listener. `-proto` supplies the contract because this server does not enable reflection. Reflection is an optional service that lets compatible clients discover schemas from a server.

Use `grpcurl`'s JSON interface for inspection; the RPC itself still uses the Protobuf contract. See the [grpcurl project](https://github.com/fullstorydev/grpcurl).

## 13. Deploying and Observing a Service

### Networking and load balancing

The loopback listener is for local practice. In a container deployment, choose the appropriate bind address and network exposure deliberately. Confirm that ingress and proxies support your gRPC transport, TLS configuration, and trailers.

A long-lived HTTP/2 connection can carry many calls. A load balancer that chooses a backend only when a connection opens may distribute traffic differently from one that routes per RPC. Test distribution under realistic client counts and long-lived streams.

### Health checks

A process accepting TCP connections may still be unable to serve requests. gRPC defines a standard health service that tooling can query. The lab does not register it; add a compatible implementation before configuring health probes that expect it. See [gRPC health checking](https://grpc.io/docs/guides/health-checking/).

Keep startup, readiness, and liveness purposes distinct. A temporarily failing shared dependency should not automatically cause every instance to restart.

### Observability

Track RPC service/method, duration, final status, traffic volume, and active streams. Connect calls across services with trace context. Do not use user IDs or request IDs as unbounded metric labels.

| Signal | Example question |
| --- | --- |
| Metrics | Did `GetProduct` latency increase after deployment? |
| Traces | Which downstream operation consumed the deadline? |
| Logs | Why did this cart request fail validation? |

Middleware and interceptors can centralize logging, metrics, and authentication. Confirm support in the chosen runtime and keep business authorization close to the relevant operation. Continue with the [Observability & Reliability guide](../Observability%20%26%20Reliability/readme.md).

### Graceful shutdown

The demo uses `tryShutdown()` and a five-second fallback to `forceShutdown()`. In production, coordinate this deadline with load-balancer draining, readiness, and the platform termination window. Long-lived streams need an explicit shutdown/reconnect policy. See [graceful shutdown](https://grpc.io/docs/guides/server-graceful-stop/).

## 14. Browser Clients and API Gateways

A browser cannot simply run this Node.js client against a native gRPC server. Browser networking APIs and gRPC transport requirements differ.

Common approaches include:

- A REST or GraphQL gateway that calls internal gRPC services.
- A gRPC-Web client with a compatible endpoint or translating proxy.

Check the selected implementation's streaming support. The gRPC-Web project documents unary and server-streaming support with mode-specific limitations; do not assume the native client-streaming and bidirectional examples work unchanged in a browser. See [gRPC-Web](https://github.com/grpc/grpc-web).

A gateway also needs deliberate mappings for authentication, deadlines, and errors. For example, decide how `NOT_FOUND` appears in your public HTTP API rather than leaking internal transport details.

## 15. Troubleshooting

| Symptom | First checks |
| --- | --- |
| `Cannot find module` | Run dependency installation in the lab directory. |
| `require is not defined` | CommonJS versus ES module configuration. |
| `UNAVAILABLE` | Server process, target address, port, TLS mismatch, and networking. |
| `UNIMPLEMENTED` | Service/package name, method name, and server registration. |
| Empty or default fields | Contract version and snake_case/camelCase loader settings. |
| `DEADLINE_EXCEEDED` | Deadline budget, server latency, connection establishment, and dependencies. |
| Cart request never finishes | Client must call `end()` after writing all items. |
| Some stream data arrives, then failure | Inspect the final RPC status and cancellation/deadline events. |
| grpcurl reports missing reflection | Supply `-proto` or intentionally enable reflection. |
| Works locally but fails behind a proxy | HTTP/2/gRPC support, TLS termination, trailers, and timeout settings. |
| One replica gets most traffic | Connection reuse and load-balancing strategy. |

When debugging, separate **connection failure**, **contract mismatch**, **application error**, and **time-budget exhaustion**. Each points to a different next step.

## 16. Practice Projects and Interview Questions

### Extend the lab

1. Add `GetProductsByIds` and compare one batch request with several unary calls.
2. Replace the in-memory catalog with a repository, keeping database details out of transport handlers.
3. Add filtering and a maximum result count to product listing.
4. Add authentication and prove that unauthorized callers cannot read protected products.
5. Cancel a stream halfway through and verify the server stops work.
6. Simulate a slow dependency and propagate the remaining deadline.
7. Add metrics and a trace linking two services.
8. Design a resumable stream with sequence numbers and duplicate handling.

### Explain these in your own words

- What does gRPC provide beyond serializing a message with Protobuf?
- Why is an asynchronous RPC different from a message queue?
- How do client streaming and bidirectional streaming finish?
- Why can a deadline failure leave a mutation's outcome uncertain?
- What makes an operation safe to retry?
- Why must a deleted Protobuf field number stay reserved?
- Why is a successful `write()` not proof of business processing?
- What changes when the client is a browser?
- How would you diagnose a slow RPC across three services?

You are ready to use the concepts when you can follow a call from client to server, explain its final status, and predict what happens during a timeout, retry, or disconnect.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
