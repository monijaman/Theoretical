# NestJS Concepts — Quick Reference

A compact overview of common NestJS building blocks with small examples.

## Controllers

Handle incoming HTTP requests and return responses.

- Responsibilities: define routes, delegate to services, return responses.

Example:

```ts
@Controller('users')
export class UserController {
  @Get()
  findAll() {
    return 'All users';
  }
}
```

## Providers (Services)

Reusable classes that contain business logic and are injectable via DI.

- Marked with `@Injectable()` and listed in a module's `providers`.

```ts
@Injectable()
## Custom Providers

Control exactly how dependencies are created and injected. Useful for configs, mocks, or swapping implementations.

```ts
// examples of provider options
useClass
useValue
useFactory
useExisting

{
  provide: 'API_KEY',
  useValue: '123456',
}
```

## Asynchronous Providers

Use when a dependency requires async initialization (DB connections, remote services). Commonly used in `forRootAsync()` patterns.

```ts
{
  provide: 'DB_CONNECTION',
  useFactory: async () => {
    return await connectToDB();
  },
}
```

## Dynamic Modules

Modules that configure themselves at runtime and export configured providers.

```ts
@Module({})
export class ConfigModule {
  static forRoot(options): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        { provide: 'CONFIG', useValue: options },
      ],
      exports: ['CONFIG'],
    };
  }
}
```

## Injection Scopes

Control provider lifetimes:

- Singleton (default): one instance per app
- Request: new instance per request
- Transient: new instance per injection

```ts
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {}
```

Use request scope sparingly due to performance cost.

## Circular Dependency

When two services depend on each other, resolve with `forwardRef()` or refactor to remove the cycle.

```ts
@Injectable()
export class AService {
  constructor(@Inject(forwardRef(() => BService)) private b: BService) {}
}
```

## ModuleRef (Manual DI Access)

Access the DI container directly for dynamic or conditional injection.

```ts
constructor(private moduleRef: ModuleRef) {}

const service = this.moduleRef.get(Service);
```

## Lazy-loading Modules

Load modules on demand (e.g., large features or microservices) to improve startup performance. Often done via dynamic imports or `ModuleRef`.

## Execution Context

Represents the current request environment and works across HTTP, WebSockets, and microservices.

```ts
const ctx = context.switchToHttp();
const request = ctx.getRequest();
```

## Lifecycle Events

Hooks that run during application/module lifecycle for setup/cleanup.

```ts
onModuleInit() {
  console.log('Module initialized');
}
```

Common hooks: `onModuleInit()`, `onApplicationBootstrap()`, `onModuleDestroy()`.

## Discovery Service

Scan and access metadata (decorators, providers) — useful for building plugins and automation tools. Provided by `@nestjs/core`.

## Platform Agnosticism

NestJS supports multiple runtimes (Express, Fastify) and microservice transports (Kafka, Redis, gRPC). The application code stays largely the same while adapters change.

## Testing

Built-in support for unit and e2e testing using `@nestjs/testing` with Jest and Supertest.

```ts
const module = await Test.createTestingModule({
  providers: [UserService],
}).compile();
```

## Quick Mental Model

- Custom/Async Providers → how dependencies are created
- Dynamic Modules → configurable modules
- Scopes → lifecycle of instances
- Execution Context / Lifecycle → runtime behavior
- ModuleRef / Discovery → advanced DI control
- Testing → reliability
- Platform Agnostic → flexibility

## Guards in NestJS

### What is a Guard?

A Guard determines whether a request should be handled or not.

Think: “Is this user allowed to access this route?”

Guards implement `CanActivate`.

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.headers.authorization;
  }
}
```

Use it in a controller:

```ts
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@Get('profile')
getProfile() {
  return 'This is protected';
}
```

Real use cases:
- Authentication (JWT check)
- Role-based access (admin/user)
- API key validation

Execution order (important):

Guards run before:

- Pipes
- Interceptors
- Controllers

So they block early 🚫

## Pipes in NestJS

### What is a Pipe?

A Pipe is used to validate or transform data.

Think: “Is the input valid? If yes, clean/convert it.”

Built-in example — `ParseIntPipe`:

```ts
@Get(':id')
getUser(@Param('id', ParseIntPipe) id: number) {
  return id;
}
```

Converts string → number and throws if invalid.

Custom Pipe example:

```ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AgeValidationPipe implements PipeTransform {
  transform(value: any) {
    if (value.age < 18) {
      throw new BadRequestException('Age must be 18+');
    }
    return value;
  }
}
```

Use it:

```ts
@Post()
createUser(@Body(AgeValidationPipe) body: any) {
  return body;
}
```

Real use cases:
- DTO validation
- Sanitizing input
- Transforming query params

Key difference (simple):

Feature | Guard | Pipe
---|---:|---
Purpose | Authorization | Validation / Transformation
Runs When | Before request reaches handler | After guard, before controller
Stops Request? | Yes | Yes (if validation fails)

---
Added concise Guards and Pipes explanations, examples, and when to use them.
Control lifetime of providers:

Singleton (default) → one instance per app
Request → new instance per request
Transient → new instance per injection
@Injectable({ scope: Scope.REQUEST })

👉 Use request scope carefully (performance cost).

🔹 Circular Dependency

When two services depend on each other.

@Injectable()
export class AService {
  constructor(@Inject(forwardRef(() => BService)) private b: BService) {}
}

👉 Use forwardRef() to resolve, but better to redesign.

🔹 Module Reference (ModuleRef)

Gives manual access to DI container.

constructor(private moduleRef: ModuleRef) {}

const service = this.moduleRef.get(Service);

👉 Useful for dynamic or conditional injection.

🔹 Lazy-loading Modules

Load modules only when needed instead of at startup.

Improves performance for large apps
Useful for microservices or feature-heavy systems

👉 Often done via ModuleRef or dynamic imports.

🔹 Execution Context

Represents current request environment.

const ctx = context.switchToHttp();
const request = ctx.getRequest();

👉 Works across:

HTTP
WebSockets
Microservices
🔹 Lifecycle Events

Hooks that run during app lifecycle:

onModuleInit()
onApplicationBootstrap()
onModuleDestroy()
onModuleInit() {
  console.log('Module initialized');
}

👉 Used for setup/cleanup logic.

🔹 Discovery Service

Used to scan and access metadata (decorators, providers).

Comes from @nestjs/core
Helps build plugins, automation tools

👉 Advanced use case (framework-level features).

🔹 Platform Agnosticism

NestJS works on multiple platforms:

Express (default)
Fastify
Microservices (Kafka, Redis, gRPC)

👉 Same code, different runtime adapters.

🔹 Testing

NestJS has built-in support for unit + e2e testing.

const module = await Test.createTestingModule({
  providers: [UserService],
}).compile();

👉 Tools:

Jest (default)
Supertest (for APIs)
🧠 Quick Mental Model
Custom/Async Providers → how dependencies are created
Dynamic Modules → configurable modules
Scopes → lifecycle of instances
Execution Context / Lifecycle → runtime behavior
ModuleRef / Discovery → advanced DI control
Testing → reliability
Platform Agnostic → flexibility