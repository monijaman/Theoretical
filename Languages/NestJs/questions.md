# NestJS — 100 Interview Questions

Questions are grouped by topic and go from foundational → advanced within each group.

---

## Modules (1–12)

1. What is a module in NestJS and what is its purpose?
2. What decorators and properties does `@Module()` accept?
3. What is the root module and why must every app have one?
4. What is the difference between `imports` and `providers` in a module?
5. How do you share a service from one module with another module?
6. What happens if you forget to `export` a service but another module tries to use it?
7. What is a global module? How do you create one and when should you use it?
8. What is a dynamic module? How does it differ from a static module?
9. What is the purpose of `forRoot()` and `forFeature()` naming conventions in dynamic modules?
10. Can a module import itself? What happens if it tries to?
11. What is lazy loading of modules and when would you use it?
12. How does NestJS resolve circular module dependencies?

---

## Controllers (13–24)

13. What is the role of a controller in NestJS?
14. What does `@Controller('users')` do to the routes inside it?
15. List five HTTP method decorators and the HTTP verbs they map to.
16. How do you extract a route parameter (e.g. `/users/:id`) in a controller?
17. What is the difference between `@Param()`, `@Query()`, and `@Body()`?
18. How do you set the HTTP status code of a response?
19. What is `@Res()` and when should you avoid using it?
20. How do you redirect a request in NestJS?
21. What is a route prefix and how do you set it globally?
22. How do you handle file uploads in a NestJS controller?
23. What does `@HttpCode(204)` do and when would you use it?
24. How do you access request headers inside a controller method?

---

## Providers & Services (25–34)

25. What makes a class a provider in NestJS?
26. What does `@Injectable()` actually do at the metadata level?
27. Where must a provider be listed before it can be injected?
28. What are the four types of custom provider tokens (`useClass`, `useValue`, `useFactory`, `useExisting`)?
29. When would you use `useFactory` over `useClass`?
30. How do you inject a non-class token (e.g. a string `'API_KEY'`)?
31. What is an async provider? Give a real use case.
32. What is `useExisting` and how is it different from `useClass`?
33. Can a service inject another service? What must be true for this to work?
34. What is the difference between a provider and a repository in NestJS conventions?

---

## Dependency Injection (35–44)

35. Explain NestJS dependency injection in one sentence.
36. What is an IoC container and what role does NestJS's container play?
37. What are the three injection scopes in NestJS?
38. What is the default scope, and why is it preferred?
39. What performance problem arises from using `Scope.REQUEST`?
40. What is scope bubbling / scope inheritance?
41. What is `ModuleRef` and when would you use it?
42. How do you get a provider instance from `ModuleRef`?
43. What does `{ strict: false }` mean in `moduleRef.get()`?
44. What is `forwardRef()` and when is it required?

---

## Circular Dependencies (45–47)

45. What is a circular dependency between two services and why is it a problem?
46. How do you resolve a circular dependency using `forwardRef()`?
47. What is the better long-term fix for circular dependencies instead of `forwardRef()`?

---

## Guards (48–56)

48. What is a guard and what interface does it implement?
49. What does `canActivate()` return and what are its three possible return values?
50. Where in the request lifecycle does a guard run?
51. How do you apply a guard to a single route? To an entire controller? Globally?
52. How do you access the HTTP request inside a guard?
53. How do you pass metadata (like roles) to a guard using a custom decorator?
54. What is `Reflector` and how is it used inside a guard?
55. What is the difference between a guard and middleware?
56. If `canActivate()` returns `false`, what response does the client receive by default?

---

## Pipes (57–65)

57. What are the two jobs of a pipe?
58. What interface does a custom pipe implement?
59. What is `ValidationPipe` and what library does it rely on?
60. List three built-in pipes provided by NestJS.
61. Where in the request lifecycle does a pipe run?
62. How do you apply a pipe to a single parameter? To an entire route? Globally?
63. What happens if a pipe throws an exception?
64. What is the difference between `transform()` returning the original value vs a new value?
65. What is the difference between a guard and a pipe?

---

## Interceptors (66–73)

66. What is an interceptor and what interface does it implement?
67. What does `next.handle()` return?
68. How does an interceptor run code both before and after a route handler?
69. Give three real-world use cases for an interceptor.
70. How do you apply an interceptor globally?
71. What is the difference between an interceptor and middleware?
72. How would you use an interceptor to wrap every response in `{ data: ..., success: true }`?
73. Can an interceptor catch and handle exceptions? If so, how?

---

## Middleware (74–80)

74. What is middleware and what does it have access to?
75. What happens if you forget to call `next()` in middleware?
76. How do you register middleware in NestJS?
77. How do you apply middleware to specific routes only?
78. What is functional middleware and when is it simpler than class-based middleware?
79. What is the difference between NestJS middleware and Express middleware?
80. Where in the request lifecycle does middleware run relative to guards and pipes?

---

## Exception Filters (81–87)

81. What is an exception filter and what interface does it implement?
82. What does `@Catch()` do? What happens if you pass no arguments to it?
83. What is the built-in global exception filter in NestJS?
84. How do you throw a 404 error in NestJS?
85. List five built-in `HttpException` subclasses.
86. How do you apply an exception filter globally?
87. What is `ArgumentsHost` and why is it needed in an exception filter?

---

## Lifecycle Hooks (88–92)

88. What are lifecycle hooks in NestJS? Name four of them in order.
89. What is the difference between `onModuleInit()` and `onApplicationBootstrap()`?
90. How do you enable graceful shutdown in NestJS?
91. What is `onModuleDestroy()` used for?
92. Which interface do you implement to use `onModuleInit()`?

---

## Execution Context (93–95)

93. What is `ExecutionContext` and why is it needed?
94. What does `context.switchToHttp()` return, and what methods does it expose?
95. How does `ExecutionContext` help you write code that works across HTTP, WebSockets, and microservices?

---

## Testing (96–100)

96. What is `Test.createTestingModule()` and what does `.compile()` return?
97. How do you replace a real service with a mock in a unit test?
98. What is the difference between a unit test and an e2e test in NestJS?
99. How do you test a guard in isolation?
100. What is Supertest used for in NestJS e2e tests?

---

## Quick Answer Reference

| # | One-line Answer |
|---|---|
| 1 | Groups related controllers, providers, and imports into a cohesive unit |
| 5 | Add to `exports[]` in the providing module; add that module to `imports[]` in the consuming module |
| 14 | Prefixes all routes inside with `/users` |
| 27 | In the module's `providers[]` array |
| 35 | NestJS reads constructor types and injects instances automatically via its IoC container |
| 37 | `DEFAULT` (singleton), `REQUEST` (per request), `TRANSIENT` (per injection) |
| 44 | A wrapper that defers class reference resolution — needed when two classes reference each other before both are defined |
| 49 | `boolean`, `Promise<boolean>`, or `Observable<boolean>` |
| 56 | 403 Forbidden |
| 57 | Validate input (throw if bad) and/or transform it (e.g. string → number) |
| 63 | NestJS catches it and sends an error response — same as throwing from a controller |
| 75 | The request hangs and the client gets no response |
| 82 | Filters to catch only specific exception types; no args = catch everything |
| 83 | `BaseExceptionFilter` — formats unhandled errors as `500 Internal Server Error` |
| 90 | `app.enableShutdownHooks()` — listens for `SIGTERM`/`SIGINT` and runs destroy hooks |
| 97 | Use `{ provide: RealService, useValue: { method: jest.fn() } }` |
