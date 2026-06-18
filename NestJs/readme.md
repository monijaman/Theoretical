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

Every app has a root `AppModule`. Feature modules (e.g. `UsersModule`) plug into it.

```ts
@Module({
  imports: [],          // other modules this one needs
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // share with other modules
})
export class UsersModule {}
```

**Rule:** If you want to use a service from another module, that module must `export` it and you must `import` the module.

---

## 2. Controllers

**Think:** The waiter. Receives orders (HTTP requests), delegates to the kitchen (service), returns the result.

Controllers should be thin — no business logic here.

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

Common decorators: `@Get()` `@Post()` `@Put()` `@Delete()` `@Patch()`  
Extract data: `@Param()` `@Body()` `@Query()` `@Headers()`

---

## 3. Providers / Services

**Think:** The kitchen. Does the actual work — database calls, calculations, business rules.

Mark with `@Injectable()` so NestJS can inject it.

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

---

## 4. Dependency Injection (DI)

**Think:** You don't fetch your tools — they're handed to you.

Instead of `new UserService()` inside your controller, you declare it in the constructor and NestJS creates and injects it automatically.

```ts
// NestJS wires this up — you never call new UserService()
constructor(private userService: UserService) {}
```

Benefits: loose coupling, easy to swap for mocks in tests.

---

## 5. Guards

**Think:** The bouncer. Checks if you're allowed in before you reach the controller.

Implements `CanActivate` → return `true` (allow) or `false`/throw (block).

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

Real use cases: JWT auth, role-based access (`@Roles('admin')`), API key checks.

---

## 6. Pipes

**Think:** Food prep. Validates and transforms input before it reaches the controller.

Two jobs:
1. **Validate** — throw if data is wrong
2. **Transform** — convert type (e.g. `"42"` → `42`)

Built-in pipes: `ParseIntPipe`, `ParseBoolPipe`, `ValidationPipe`, `DefaultValuePipe`

```ts
@Get(':id')
getUser(@Param('id', ParseIntPipe) id: number) {
  // id is already a number, not a string
  return id;
}
```

Custom pipe:

```ts
@Injectable()
export class AgeValidationPipe implements PipeTransform {
  transform(value: any) {
    if (value.age < 18) throw new BadRequestException('Must be 18+');
    return value;
  }
}

// Use it:
@Post()
create(@Body(AgeValidationPipe) body: CreateUserDto) { ... }
```

> **Guard vs Pipe:** Guard asks *"are you allowed?"* — Pipe asks *"is your data valid?"*

---

## 7. Interceptors

**Think:** The manager hovering over the waiter. Runs before AND after the handler. Good for logging, response shaping, caching, timing.

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before handler...');
    const start = Date.now();

    return next.handle().pipe(
      tap(() => console.log(`After... ${Date.now() - start}ms`)),
    );
  }
}
```

Apply with `@UseInterceptors(LoggingInterceptor)`.

Common uses: wrap response in `{ data: ... }`, strip sensitive fields, measure performance.

---

## 8. Middleware

**Think:** The lobby. Every request passes through before being seated (before guards/pipes).

```ts
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next(); // always call next() or the request hangs
  }
}
```

Register in the module:

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

> **Middleware vs Interceptor:** Middleware runs at the Express level (before NestJS pipeline). Interceptors run inside NestJS and have access to the execution context.

---

## 9. Exception Filters

**Think:** Customer service desk. Catches errors and formats them into clean responses.

```ts
@Catch(HttpException)
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

NestJS has built-in `HttpException` subclasses: `NotFoundException`, `UnauthorizedException`, `BadRequestException`, etc.

---

## 10. Custom Providers

Control exactly how a dependency is created.

```ts
// Provide a fixed value
{ provide: 'API_KEY', useValue: 'abc-123' }

// Use a specific class
{ provide: LoggerService, useClass: DevLoggerService }

// Use a factory function
{ provide: 'CONFIG', useFactory: () => ({ debug: true }) }

// Alias one provider to another
{ provide: 'AliasService', useExisting: RealService }
```

Inject non-class tokens with `@Inject()`:

```ts
constructor(@Inject('API_KEY') private apiKey: string) {}
```

---

## 11. Async Providers

Use when setup needs `await` (DB connections, config loading).

```ts
{
  provide: 'DB_CONNECTION',
  useFactory: async () => {
    const conn = await connectToDatabase();
    return conn;
  },
}
```

NestJS will wait for the promise before starting the app.

---

## 12. Dynamic Modules

Modules that configure themselves at runtime — common for libraries (`ConfigModule`, `TypeOrmModule`).

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

// Usage:
ConfigModule.forRoot({ envFilePath: '.env' })
```

---

## 13. Injection Scopes

Controls how long a provider instance lives.

| Scope       | Behavior                        | Use when                          |
|-------------|----------------------------------|-----------------------------------|
| `DEFAULT`   | One instance per app (singleton) | Almost always                     |
| `REQUEST`   | New instance per HTTP request    | Need request-specific data        |
| `TRANSIENT` | New instance per injection       | Stateless utilities               |

```ts
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {}
```

> Avoid `REQUEST` scope unless necessary — it disables singleton optimizations and cascades up the injection tree.

---

## 14. Circular Dependency

When ServiceA depends on ServiceB and ServiceB depends on ServiceA.

Fix with `forwardRef()` (use as a last resort — prefer redesigning):

```ts
@Injectable()
export class AService {
  constructor(
    @Inject(forwardRef(() => BService)) private b: BService,
  ) {}
}
```

Both sides must use `forwardRef()`.

---

## 15. ModuleRef (Manual DI Access)

Reach into the DI container to get a provider dynamically (e.g. in a factory or event handler).

```ts
constructor(private moduleRef: ModuleRef) {}

async doSomething() {
  const service = this.moduleRef.get(UserService, { strict: false });
}
```

---

## 16. Lifecycle Hooks

Run code at specific moments during app startup/shutdown.

```ts
@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    console.log('Module ready — connect to DB here');
  }

  onModuleDestroy() {
    console.log('Module teardown — close connections here');
  }
}
```

| Hook                       | When it runs                        |
|----------------------------|--------------------------------------|
| `onModuleInit()`           | After module's dependencies resolved |
| `onApplicationBootstrap()` | After all modules initialized        |
| `onModuleDestroy()`        | On app shutdown signal               |
| `beforeApplicationShutdown()` | Before shutdown hooks fire        |

Enable shutdown hooks: `app.enableShutdownHooks()`

---

## 17. Testing

NestJS has a testing module that creates a mini app with real DI.

```ts
// Unit test — swap real service with a mock
const module = await Test.createTestingModule({
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useValue: { findAll: jest.fn().mockReturnValue([]) },
    },
  ],
}).compile();

const controller = module.get(UserController);
```

```ts
// E2E test — full HTTP with Supertest
const app = module.createNestApplication();
await app.init();

await request(app.getHttpServer())
  .get('/users')
  .expect(200);
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
