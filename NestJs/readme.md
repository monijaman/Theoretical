# NestJS — Core Concepts

> **Restaurant Analogy** (use this to remember everything):
> Module = the restaurant | Controller = waiter | Service = kitchen | Guard = bouncer | Pipe = food prep | Interceptor = manager | Middleware = lobby | Exception Filter = customer service desk

---

## Request Lifecycle (the order things run)

```
Request →  Middleware → Guard → Pipe → Controller → Service → Interceptor → Response
                ↓                                                       ↑
          (Exception Filter catches errors anywhere in the chain)
```

| Step              | Job                              | Stops request? |
|-------------------|----------------------------------|----------------|
| Middleware        | Logging, CORS, cookies           | No             |
| Guard             | Auth / permission check          | Yes            |
| Pipe              | Validate & transform input       | Yes            |
| Controller        | Route handler                    | —              |
| Service           | Business logic                   | —              |
| Interceptor       | Wrap response, timing, caching   | No             |
| Exception Filter  | Format error responses           | —              |

---

## 1. Modules

**Think:** A restaurant. Groups everything related together (controllers, services, imports, exports).

A module is a class decorated with `@Module()`. It is the primary way NestJS organizes an application. Every app has exactly one root module (`AppModule`) which is the entry point. All other modules (feature modules) plug into it directly or through other modules — forming a tree.

The `@Module()` decorator accepts four properties:
- `imports` — other modules whose exported providers this module needs
- `controllers` — controllers defined in this module (NestJS registers their routes)
- `providers` — services, guards, pipes, etc. available for injection inside this module
- `exports` — the subset of providers that should be available to other modules that import this one

**Sharing between modules:** If `UsersModule` has `UserService` and `OrdersModule` needs it, `UsersModule` must put `UserService` in its `exports`, and `OrdersModule` must add `UsersModule` to its `imports`. Without this, NestJS will throw a dependency error at startup.

```ts
@Module({
  imports: [],              // other modules this one needs
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],   // makes UserService available to importing modules
})
export class UsersModule {}
```

**Global modules:** Decorating a module with `@Global()` makes its exports available everywhere without needing to import it each time. Use sparingly — it hides dependencies and makes code harder to reason about. Good use case: `ConfigModule`, `DatabaseModule`.

**Rule:** If you want to use a service from another module, that module must `export` it and you must `import` the module.

---

## 2. Controllers

**Think:** The waiter. Receives orders (HTTP requests), delegates to the kitchen (service), returns the result.

A controller is responsible for handling incoming HTTP requests and returning responses. It is the entry point of the NestJS request pipeline. Controllers should be **thin** — they extract data from the request, call a service method, and return the result. Business logic does not belong here.

The `@Controller('users')` decorator sets a **route prefix** — all routes inside the class are automatically prefixed with `/users`. NestJS reads the class metadata at startup and registers each decorated method as a route handler with the underlying HTTP server (Express or Fastify).

Each HTTP method decorator (`@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`) maps a method to a route. You can pass a path string: `@Get(':id')` creates a dynamic segment.

Parameter decorators extract data from the request:
- `@Param('id')` — URL segment (e.g. `/users/42` → `"42"`)
- `@Query('page')` — query string (e.g. `/users?page=2` → `"2"`)
- `@Body()` — request body (JSON parsed automatically)
- `@Headers('authorization')` — a specific header value

```ts
@Controller('users')        // base route: /users
export class UserController {
  constructor(private userService: UserService) {}

  @Get()                    // GET /users
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')               // GET /users/42
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Post()                   // POST /users
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

By default, NestJS automatically serializes the returned JavaScript object to JSON and sets the status code to `200` (or `201` for `@Post()`). You can override with `@HttpCode(204)`.

---

## 3. Providers / Services

**Think:** The kitchen. Does the actual work — database calls, calculations, business rules.

A provider is any class that can be **injected** as a dependency. The most common provider is a service. The `@Injectable()` decorator marks a class as a provider by attaching metadata that NestJS's IoC (Inversion of Control) container uses to manage its creation and injection.

Without `@Injectable()`, NestJS cannot discover the class's constructor dependencies, and injection will silently fail or throw at runtime.

Providers must be registered in a module's `providers` array before they can be injected. NestJS reads this list at startup, instantiates each provider once (singleton by default), and stores them in the module's DI container.

```ts
@Injectable()
export class UserService {
  private users = [];

  findAll() {
    return this.users;
  }

  create(data: any) {
    this.users.push(data);
    return data;
  }
}
```

Register in the module's `providers` array, then inject via constructor:

```ts
constructor(private userService: UserService) {}
```

Services can also inject other services — as long as both are registered as providers in the same module (or the providing module is imported and exports the service).

---

## 4. Dependency Injection (DI)

**Think:** You don't fetch your tools — they're handed to you.

Dependency Injection is a design pattern where a class declares what it needs (its dependencies) rather than creating them itself. NestJS's IoC container reads the TypeScript constructor type metadata at startup, resolves the dependency graph, instantiates everything in the right order, and injects instances automatically.

Without DI, you'd write `new UserService(new DatabaseService(...))` manually throughout your code. With DI, you just declare the type and NestJS handles creation:

```ts
// NestJS wires this up — you never call new UserService()
constructor(private userService: UserService) {}
```

This matters because:
- **Loose coupling** — the controller doesn't care how `UserService` is built
- **Easy testing** — swap the real service with a mock without changing the controller
- **Single source of truth** — one instance shared across the app (singleton scope)

NestJS uses TypeScript's `emitDecoratorMetadata` feature. When the code compiles, type information (`UserService`) is preserved in the metadata, and NestJS reads it to know what to inject.

---

## 5. Guards

**Think:** The bouncer. Checks if you're allowed in before you reach the controller.

A guard decides whether a request should proceed or be rejected. It runs **after middleware but before pipes and the controller**. This is where authorization logic lives — not authentication (that's middleware/passport), but *"does this authenticated user have permission to do this?"*.

Guards implement the `CanActivate` interface and its single method `canActivate()`. The method receives an `ExecutionContext` (the current request environment) and must return:
- `true` or `Promise<true>` — allow the request through
- `false` or `Promise<false>` — reject with `403 Forbidden`
- Throw an exception — sends that exception's response

The `ExecutionContext` gives you platform-agnostic access to the request. Call `context.switchToHttp().getRequest()` to get the Express/Fastify request object and inspect headers, user data, etc.

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.headers.authorization; // block if no token
  }
}
```

Apply to a route or whole controller:

```ts
@UseGuards(AuthGuard)
@Get('profile')
getProfile() { ... }
```

**Role-based access** is typically implemented by storing roles on a custom decorator (`@Roles('admin')`), then reading that metadata inside the guard using NestJS's `Reflector`:

```ts
const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
```

Real use cases: JWT auth, role-based access (`@Roles('admin')`), API key checks.

---

## 6. Pipes

**Think:** Food prep. Validates and transforms input before it reaches the controller.

A pipe is a class with a `transform()` method that processes incoming data before it reaches the route handler. Pipes run **after guards but before the controller method executes**, applied to specific parameters or route-wide.

Two jobs:
1. **Validate** — inspect the value and throw a `BadRequestException` if it doesn't meet requirements
2. **Transform** — convert the value to a different type or shape (e.g. string `"42"` → number `42`)

NestJS calls `transform(value, metadata)` where `value` is the raw input and `metadata` describes where it came from (`@Body`, `@Param`, etc.). Whatever `transform()` returns replaces the original value seen by the controller.

Built-in pipes: `ParseIntPipe`, `ParseBoolPipe`, `ParseUUIDPipe`, `ValidationPipe`, `DefaultValuePipe`

```ts
@Get(':id')
getUser(@Param('id', ParseIntPipe) id: number) {
  // ParseIntPipe calls parseInt() — if it fails, throws BadRequestException automatically
  return id; // id is already a number, not a string
}
```

`ValidationPipe` is the most powerful built-in pipe — it uses `class-validator` decorators on DTOs to validate request bodies automatically:

```ts
// DTO
export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

// Controller
@Post()
create(@Body(ValidationPipe) dto: CreateUserDto) { ... }
// throws 400 with details if validation fails
```

Custom pipe:

```ts
@Injectable()
export class AgeValidationPipe implements PipeTransform {
  transform(value: any) {
    if (value.age < 18) throw new BadRequestException('Must be 18+');
    return value; // return the (possibly modified) value
  }
}

@Post()
create(@Body(AgeValidationPipe) body: CreateUserDto) { ... }
```

> **Guard vs Pipe:** Guard asks *"are you allowed?"* — Pipe asks *"is your data valid?"*

---

## 7. Interceptors

**Think:** The manager hovering over the waiter. Runs before AND after the handler. Good for logging, response shaping, caching, timing.

An interceptor is a class that wraps the route handler execution. It implements `NestInterceptor` and its `intercept()` method, which receives the `ExecutionContext` and a `CallHandler`. The `CallHandler.handle()` method is what actually invokes the route handler — calling it continues the pipeline, not calling it would skip the handler entirely.

`handle()` returns an **RxJS Observable**. This means you can use RxJS operators (`.pipe(map(...))`, `.pipe(tap(...))`, `.pipe(catchError(...))`) to transform or react to the response after the handler runs. This is the key difference from guards and pipes — interceptors can run code both **before** (synchronous code before `next.handle()`) and **after** (inside `.pipe()`).

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before handler...');   // runs before the route handler
    const start = Date.now();

    return next.handle().pipe(          // next.handle() invokes the route handler
      tap(() => console.log(`After... ${Date.now() - start}ms`)), // runs after
    );
  }
}
```

Apply with `@UseInterceptors(LoggingInterceptor)`.

Common uses:
- **Response mapping** — wrap every response in `{ data: ..., success: true }` using `map()`
- **Exception mapping** — transform specific errors using `catchError()`
- **Logging** — log request/response timing with `tap()`
- **Caching** — return cached data before calling `next.handle()` at all

> **Interceptor vs Middleware:** Middleware runs before the NestJS pipeline and has no access to the route handler's result. Interceptors run inside NestJS and can read and modify the response.

---

## 8. Middleware

**Think:** The lobby. Every request passes through before being seated (before guards/pipes).

Middleware in NestJS is identical to Express middleware — a function with access to `req`, `res`, and `next`. It runs before any NestJS-specific features (guards, pipes, interceptors). Good for tasks that don't need awareness of the route handler: logging, CORS, body parsing, session management, attaching data to the request.

Middleware is either a class implementing `NestMiddleware` (with a `use()` method) or a plain function. Class-based middleware can inject services via its constructor. Functional middleware cannot.

```ts
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next(); // MUST call next() — otherwise the request hangs and the client times out
  }
}
```

Middleware cannot be applied with a decorator — it is registered in the module's `configure()` method. The `MiddlewareConsumer` fluent API lets you target specific routes:

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');              // all routes
      // .forRoutes('users')        // only /users/*
      // .forRoutes(UserController) // only routes of this controller
      // .exclude({ path: 'health', method: RequestMethod.GET }) // exclude specific
  }
}
```

> **Middleware vs Interceptor:** Middleware runs at the Express level before NestJS processes the request — it has no access to the DI-resolved route handler or its return value. Use middleware for cross-cutting infrastructure concerns, interceptors for application-level response manipulation.

---

## 9. Exception Filters

**Think:** Customer service desk. Catches errors and formats them into clean responses.

By default, NestJS has a built-in global exception filter that catches any unhandled exception. If the exception is an `HttpException`, it uses its status code and message. If it's anything else, it returns `500 Internal Server Error`. Custom exception filters let you override this behavior for specific exception types.

A filter implements `ExceptionFilter` with a `catch(exception, host)` method. The `@Catch()` decorator specifies which exception types this filter handles. Passing no arguments catches everything.

`ArgumentsHost` is an abstraction over the current execution context (HTTP, WebSocket, microservice). Call `host.switchToHttp()` to get the Express `request` and `response` objects so you can send a custom JSON body.

```ts
@Catch(HttpException)             // only catches HttpException and its subclasses
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Apply globally: `app.useGlobalFilters(new HttpExceptionFilter())`

NestJS's built-in `HttpException` subclasses (throw these from controllers/services):

| Exception | Status Code |
|---|---|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `InternalServerErrorException` | 500 |

---

## 10. Custom Providers

Control exactly how a dependency is created. The standard `providers: [UserService]` shorthand is sugar for `{ provide: UserService, useClass: UserService }`. Custom providers let you swap the implementation, inject non-class values, or use a factory.

| Token type | Use case |
|---|---|
| `useClass` | Swap one implementation for another (e.g. mock vs real) |
| `useValue` | Inject a plain value, config object, or mock |
| `useFactory` | Build the dependency with custom logic; can inject other deps |
| `useExisting` | Alias — make two tokens resolve to the same instance |

```ts
// Provide a fixed value (no instantiation)
{ provide: 'API_KEY', useValue: 'abc-123' }

// Swap implementation (e.g. environment-based)
{ provide: LoggerService, useClass: DevLoggerService }

// Factory — receives injected deps as arguments
{ provide: 'CONFIG', useFactory: (configService: ConfigService) => ({
    debug: configService.get('DEBUG'),
  }),
  inject: [ConfigService],        // these are injected as factory arguments
}

// Alias — 'AliasService' token resolves to the same instance as RealService
{ provide: 'AliasService', useExisting: RealService }
```

Since `'API_KEY'` is a string (not a class), TypeScript can't infer it. Use `@Inject()` to inject it explicitly:

```ts
constructor(@Inject('API_KEY') private apiKey: string) {}
```

---

## 11. Async Providers

Use when a dependency requires async initialization before it can be used — most commonly database connections, remote config services, or anything that returns a `Promise`.

NestJS will not start the application until all async provider promises have resolved. This guarantees that by the time any controller handles a request, the database connection is ready.

```ts
{
  provide: 'DB_CONNECTION',
  useFactory: async () => {
    const conn = await connectToDatabase(); // app waits for this
    return conn;
  },
}
```

You can also inject other providers into the factory with `inject: [ConfigService]` — the pattern is the same as `useFactory` above.

---

## 12. Dynamic Modules

A dynamic module is a module that configures itself at runtime and returns a `DynamicModule` object. This is the pattern behind NestJS's own libraries: `TypeOrmModule.forRoot()`, `ConfigModule.forRoot()`, `JwtModule.register()`.

The static `forRoot()` method (by convention) returns a regular module object but built programmatically. The `forFeature()` method (by convention) is used for per-feature configuration (e.g. `TypeOrmModule.forFeature([UserEntity])` in the users module).

The returned `DynamicModule` must include the `module` property pointing to the class itself, plus any `providers`, `imports`, `controllers`, and `exports` needed.

```ts
@Module({})
export class ConfigModule {
  static forRoot(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: 'CONFIG', useValue: options }],
      exports: ['CONFIG'],
      global: true, // available everywhere without importing
    };
  }
}

// Usage in AppModule:
@Module({
  imports: [ConfigModule.forRoot({ envFilePath: '.env' })],
})
export class AppModule {}
```

---

## 13. Injection Scopes

By default, every provider is a **singleton** — created once when the app starts and shared across the entire application. Scopes let you override this per-provider.

| Scope | Behavior | Use when |
|---|---|---|
| `DEFAULT` | One instance per app (singleton) | Almost always — most efficient |
| `REQUEST` | New instance per HTTP request | Need per-request state (e.g. request-scoped tenant) |
| `TRANSIENT` | New instance per injection point | Truly stateless utilities |

**Scope bubbling:** If a `REQUEST`-scoped provider is injected into a singleton, NestJS cannot inject a per-request instance into something that exists once. As a result, the singleton **also becomes request-scoped**. This cascades up the entire injection tree — use `REQUEST` scope only where truly needed.

```ts
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  // a new instance is created for every incoming HTTP request
}
```

> Avoid `REQUEST` scope unless necessary — it disables singleton optimizations and cascades up the injection tree.

---

## 14. Circular Dependency

A circular dependency occurs when ServiceA's constructor requires ServiceB, and ServiceB's constructor requires ServiceA. NestJS cannot resolve this because it doesn't know which to instantiate first.

The fix is `forwardRef()` — a wrapper that defers the class reference to after both classes are defined. NestJS resolves it lazily at the point of injection rather than at class definition time.

```ts
@Injectable()
export class AService {
  constructor(
    @Inject(forwardRef(() => BService)) private b: BService,
  ) {}
}

@Injectable()
export class BService {
  constructor(
    @Inject(forwardRef(() => AService)) private a: AService,
  ) {}
}
```

Both sides must use `forwardRef()`. This is a code smell — circular dependencies usually indicate that a third service should be extracted to hold the shared logic, breaking the cycle.

---

## 15. ModuleRef (Manual DI Access)

`ModuleRef` is NestJS's handle to its own DI container. It lets you retrieve provider instances imperatively (at runtime, outside of constructor injection). Useful when the dependency isn't known at class definition time — for example, inside a factory function, an event handler, or a strategy pattern.

`get(token)` retrieves an existing singleton. By default it only looks in the current module's scope; pass `{ strict: false }` to search the entire application container.

For `REQUEST` or `TRANSIENT` scoped providers, use `moduleRef.resolve()` (async) instead of `get()`.

```ts
constructor(private moduleRef: ModuleRef) {}

async doSomething() {
  // retrieve from current module
  const service = this.moduleRef.get(UserService);

  // retrieve globally (searches all modules)
  const service = this.moduleRef.get(UserService, { strict: false });
}
```

---

## 16. Lifecycle Hooks

NestJS calls specific methods on providers and modules at defined points during the application's startup and shutdown. To use a hook, implement the corresponding interface and add the method to your class.

This is where you connect to databases, start background jobs on boot, and gracefully close connections on shutdown.

```ts
@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    // called after this module's dependencies are fully resolved
    // safe to use injected services here
    console.log('Module ready — connect to DB here');
  }

  onModuleDestroy() {
    // called when the app receives a shutdown signal (SIGTERM, SIGINT)
    console.log('Module teardown — close connections here');
  }
}
```

| Hook | Interface | When it runs |
|---|---|---|
| `onModuleInit()` | `OnModuleInit` | After this module's dependencies are resolved |
| `onApplicationBootstrap()` | `OnApplicationBootstrap` | After all modules are initialized (app fully ready) |
| `onModuleDestroy()` | `OnModuleDestroy` | When app shutdown signal received |
| `beforeApplicationShutdown()` | `BeforeApplicationShutdown` | Just before the process exits |

Enable shutdown hooks: `app.enableShutdownHooks()` — without this, NestJS ignores `SIGTERM` and destroy hooks won't run.

---

## 17. Testing

NestJS provides `@nestjs/testing` which creates a stripped-down version of the NestJS runtime for tests. `Test.createTestingModule()` accepts the same structure as a real `@Module()` decorator — controllers, providers, imports — and `.compile()` builds the DI container just like a real app start.

The key testing technique is replacing real providers with mocks using `useValue`. Since NestJS resolves dependencies by token, passing `{ provide: UserService, useValue: mockUserService }` means any class that injects `UserService` will get the mock instead.

```ts
// Unit test — swap real service with a mock
const moduleRef = await Test.createTestingModule({
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useValue: { findAll: jest.fn().mockReturnValue([]) },
    },
  ],
}).compile();

const controller = moduleRef.get(UserController);
const service = moduleRef.get(UserService);

expect(controller.findAll()).toEqual([]);
expect(service.findAll).toHaveBeenCalled();
```

For e2e tests, call `.createNestApplication()` to get a real `INestApplication` instance with HTTP listening:

```ts
// E2E test — full HTTP with Supertest
const app = moduleRef.createNestApplication();
await app.init();

await request(app.getHttpServer())
  .get('/users')
  .expect(200)
  .expect([]);

await app.close();
```

---

## Quick Cheat Sheet

```
Module       → groups related things (import/export)
Controller   → routes + request/response (thin)
Service      → business logic (injectable)
Guard        → who can access (auth/roles)
Pipe         → is data valid/clean (validate/transform)
Interceptor  → before + after handler (logging/wrapping)
Middleware   → before NestJS pipeline (Express-level)
ExFilter     → format errors consistently

DI           → declare in constructor, NestJS provides it
forwardRef() → fix circular deps (but prefer redesign)
ModuleRef    → get provider dynamically at runtime
Scope        → DEFAULT (singleton) | REQUEST | TRANSIENT
```

> **One-liner to remember the pipeline:**
> `Middleware → Guard → Pipe → Handler → Interceptor`
