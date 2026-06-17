# Testing Strategy

Comprehensive testing ensures users have reliable, bug-free experiences. This module teaches you to test like a senior engineer, catching bugs before they reach production.

## ⚡ Quick Start: Real-World Analogies

Understand testing levels with these simple analogies:

- **Unit Testing:** Like a restaurant checking that each ingredient is fresh before cooking. You test salt, flour, eggs individually to ensure quality. If one ingredient is bad, the whole dish fails. Takes 5 minutes per ingredient but saves hours of wasted cooking. (Testing functions in isolation)
  - Detection: Fast (milliseconds)
  - Coverage: Easy to achieve 80%+
  - Cost: Very cheap

- **Integration Testing:** Like testing a multi-course meal preparation. You check: Does the sauce pair with the steak? Does the timing work (appetizer → main → dessert)? Individual ingredients passed tests, but do they work together? (Component interactions)
  - Detection: Medium speed (seconds)
  - Coverage: Catches 60-70% of bugs
  - Cost: Moderate

- **E2E Testing:** Like a secret shopper visiting your restaurant. They experience the entire journey: reservation → seating → ordering → eating → paying → leaving. This is what your customer actually does. Only tests critical paths. (Complete user journey)
  - Detection: Slow but realistic (seconds-minutes per test)
  - Coverage: Only 10-20% of scenarios (too expensive for all)
  - Cost: Expensive (real browser automation)

- **Mocking (MSW):** Like using a "Training Stage" for a concert performer. Instead of performing at a stadium with 50K people, you practice on a small stage that mirrors the real one. You test your performance without the real audience/network. (API simulation)
  - Benefit: Tests run offline, 100% reliable
  - Limitation: Tests API behavior, not real backend bugs
  - Use case: Speed up tests, ensure tests aren't flaky

- **Snapshot Testing:** Like taking a photo of your website and saying "if it changes, show me the diff." Takes 1 second to verify 1000 lines of UI code. Danger: You might approve bad snapshots without thinking. (Detect unintended UI changes)
  - Good for: UI structure, error messages
  - Bad for: Random data, timestamps

- **Regression Testing:** Making sure that after you added a new feature, you didn't break existing ones. A restaurant adds a new appetizer but the main course recipe should still work perfectly. Modern CI/CD runs ALL tests on every PR automatically. (Checking if new changes broke old code)
  - Detection: Comprehensive but slow
  - Value: Prevents "fixing one thing, breaking another"
  - Implementation: Automated in CI/CD pipeline

---

## 🔍 Core Testing Types & Implementation

### 1. **Unit Testing (Jest/Vitest)** - Fastest feedback loop

**What it is:** Test one function/hook in isolation. No component rendering, no database, no network. Pure functions in pure isolation.

**Real-world impact:**
```typescript
// ❌ WITHOUT unit tests
const calculateDiscount = (price, discount) => {
  return price - discount; // Bug: Should multiply!
};

// You deploy. Customer with $1000 purchase gets $10 off → $990
// Should be $900 (10% off)
// Team spends 2 days debugging in production
// Value lost: $100 × 10K customers = $1M

// ✅ WITH unit tests
test('calculateDiscount applies percentage correctly', () => {
  expect(calculateDiscount(1000, 0.1)).toBe(900); // Test fails! Bug caught immediately
});

// Fix: return price * (1 - discount)
// Cost to fix: 2 minutes
// Value saved: $1M
```

**Implementation:**
```typescript
// utils/priceCalculator.ts
export const calculateDiscount = (price: number, discountPercent: number): number => {
  if (discountPercent < 0 || discountPercent > 1) {
    throw new Error('Discount must be between 0 and 1');
  }
  return Math.round(price * (1 - discountPercent) * 100) / 100;
};

export const calculateShipping = (subtotal: number, weight: number): number => {
  const baseCost = 5;
  const perPound = 0.5;
  return baseCost + weight * perPound;
};

// __tests__/priceCalculator.test.ts
import { calculateDiscount, calculateShipping } from '../priceCalculator';

describe('priceCalculator', () => {
  describe('calculateDiscount', () => {
    test('❌ applies 10% discount correctly', () => {
      expect(calculateDiscount(1000, 0.1)).toBe(900);
    });

    test('❌ applies 0% discount (no discount)', () => {
      expect(calculateDiscount(100, 0)).toBe(100);
    });

    test('❌ applies 100% discount (free)', () => {
      expect(calculateDiscount(100, 1)).toBe(0);
    });

    test('❌ throws error if discount < 0', () => {
      expect(() => calculateDiscount(100, -0.1)).toThrow('Discount must be between 0 and 1');
    });

    test('❌ handles decimal prices (rounding)', () => {
      expect(calculateDiscount(99.99, 0.15)).toBe(84.99);
    });
  });

  describe('calculateShipping', () => {
    test('❌ calculates shipping for 2 pounds', () => {
      expect(calculateShipping(100, 2)).toBe(6); // $5 base + $1 (2 * $0.50)
    });

    test('❌ uses free shipping for heavy items', () => {
      // TODO: Implement free shipping logic
      // expect(calculateShipping(100, 50)).toBe(0); // If over 50 lbs
    });
  });
});
```

**Tips for unit testing:**
- ✅ Test edge cases (0, negative, empty, null)
- ✅ Test error conditions
- ✅ Keep tests fast (milliseconds)
- ✅ Test behavior, not implementation
- ❌ Don't test infrastructure (don't mock everything)
- ❌ Don't test libraries themselves (assume they work)

### 2. **Component/Integration Testing (React Testing Library)** - Test behavior, not implementation

**What it is:** Test how users interact with components. Click button, type input, verify output. Test components in a REAL DOM environment.

**Common mistake:**
```typescript
// ❌ TESTING IMPLEMENTATION (BAD)
test('button has onClick handler', () => {
  const mockFn = jest.fn();
  const { getByRole } = render(<LoginButton onClick={mockFn} />);
  
  const button = getByRole('button');
  expect(button.props.onClick).toBe(mockFn); // Testing the implementation!
  // Problem: Refactoring code doesn't break the feature, but breaks this test
});

// ✅ TESTING BEHAVIOR (GOOD)
test('calls login when button is clicked', async () => {
  const mockLogin = jest.fn();
  const user = userEvent.setup();
  
  const { getByRole } = render(<LoginButton onLogin={mockLogin} />);
  
  await user.click(getByRole('button'));
  
  expect(mockLogin).toHaveBeenCalled();
});
```

**Real-world example:**
```typescript
// Component: LoginForm.tsx
export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.includes('@')) {
      setError('Invalid email');
      return;
    }
    
    if (password.length < 6) {
      setError('Password too short');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError('Login failed');
        return;
      }

      onLoginSuccess();
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <span role="alert">{error}</span>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// __tests__/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  test('❌ shows error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onLoginSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText('Email'), 'invalid-email');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  test('❌ shows error for short password', async () => {
    const user = userEvent.setup();
    render(<LoginForm onLoginSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText('Email'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Password'), '123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Password too short');
  });

  test('❌ calls onLoginSuccess when login succeeds', async () => {
    const mockSuccess = jest.fn();
    const user = userEvent.setup();

    // Mock API
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'abc' }),
    });

    render(<LoginForm onLoginSuccess={mockSuccess} />);

    await user.type(screen.getByPlaceholderText('Email'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(mockSuccess).toHaveBeenCalled();
  });

  test('❌ shows loading state while submitting', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

    render(<LoginForm onLoginSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText('Email'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    
    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toHaveTextContent('Logging in...');
    expect(button).toBeDisabled();
  });

  test('❌ shows network error message', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    render(<LoginForm onLoginSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText('Email'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });
});
```

**Key principles:**
- ✅ Use `screen` queries (find by role/label, not test ID)
- ✅ Test user interactions (clicks, typing)
- ✅ Test accessibility (a11y)
- ✅ Verify what user sees (text, errors)
- ❌ Don't test internal state
- ❌ Don't test component props directly

### 3. **API Mocking (MSW)** - Mock network requests reliably

**Why mock APIs:**
- Tests run offline (no WiFi needed)
- Tests never fail due to server being down
- Run 1000x faster than real API calls
- Deterministic (same results every time)

**Setup:**
```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET /api/users returns list
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),

  // POST /api/login handles login
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    
    if (body.email === 'user@example.com' && body.password === 'password123') {
      return HttpResponse.json(
        { token: 'abc123', user: { id: 1, email: body.email } },
        { status: 200 }
      );
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // GET /api/user/:id
  http.get('/api/user/:id', ({ params }) => {
    if (params.id === '1') {
      return HttpResponse.json({ id: 1, name: 'Alice', email: 'alice@example.com' });
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// setup.ts (Jest configuration)
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Using mocks in tests:**
```typescript
test('fetches users on mount', async () => {
  render(<UserList />);
  
  // Wait for API call to complete
  const users = await screen.findAllByRole('listitem');
  
  expect(users).toHaveLength(2);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
});

test('handles API error gracefully', async () => {
  // Override the GET /api/users handler for this test
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  render(<UserList />);
  
  expect(await screen.findByText('Failed to load users')).toBeInTheDocument();
});
```

### 4. **End-to-End Testing (Playwright)** - Real browser, real user flows

**What it is:** Automated browser that clicks buttons, types text, navigates pages. Tests the entire app like a real user would.

**When to use E2E:**
- ✅ Critical user flows (login, checkout, payment)
- ✅ Cross-browser compatibility issues
- ✅ Visual regressions
- ✅ Complex multi-step workflows
- ❌ Every possible scenario (too slow)
- ❌ Individual component behavior (use component tests)

**Example:**
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login and view dashboard', async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:3000/login');
  
  // Fill form
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password123');
  
  // Submit
  await page.click('button:has-text("Login")');
  
  // Verify redirected to dashboard
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});

test('shows error for invalid credentials', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  
  await page.click('button:has-text("Login")');
  
  // Error message appears
  await expect(page.locator('role=alert')).toContainText('Invalid credentials');
  
  // Still on login page
  await expect(page).toHaveURL('http://localhost:3000/login');
});

test('complete checkout flow', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Login")');
  await page.waitForURL('**/dashboard');

  // Browse products
  await page.goto('http://localhost:3000/products');
  await page.click('text=Add to Cart', { hasText: 'Laptop' });

  // Verify added to cart
  await expect(page.locator('badge')).toHaveText('1');

  // Checkout
  await page.click('button:has-text("Checkout")');
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.fill('input[name="expiry"]', '12/25');
  await page.fill('input[name="cvc"]', '123');

  await page.click('button:has-text("Complete Purchase")');

  // Verify order confirmation
  await expect(page.locator('h1')).toContainText('Order Confirmed');
});
```

**Best practices:**
- ✅ Test critical user journeys only
- ✅ Use data-testid for difficult-to-query elements
- ✅ Wait for elements explicitly
- ✅ Run tests in parallel
- ❌ Test every possible combination
- ❌ Use brittle selectors (position-based)

---

## 📊 Testing Pyramid & Strategy

```
        E2E Tests (Playwright)
       /    CRITICAL FLOWS     \
      /     10-20% of tests     \
     /         (Slow)             \
    ────────────────────────────
   /   Integration Tests            \
  /   (React Testing Library)        \
 /        30-40% of tests             \
/__________  (Medium)  _______________\
/          Unit Tests (Jest)          \
/__  40-50% of tests (Fast)  ________/

RULE: 
- Lots of cheap fast tests (unit)
- Some medium tests (integration)
- Few expensive tests (E2E)
- = Complete coverage, fast feedback
```

**Coverage targets:**
```typescript
{
  "lines": 70-80,       // Line coverage 70-80% unless critical feature
  "statements": 70-80,
  "functions": 70-80,
  "branches": 60-70,    // Branches are harder, don't obsess
  "e2e": [              // Specific critical paths at 100%
    "Login",
    "Checkout", 
    "Payment",
    "Account Creation"
  ]
}
```

---

## 🛠️ Building a Complete Test Suite

### Project: E-Commerce Testing Strategy

```typescript
// Project structure
src/
  components/
    __tests__/
      ProductCard.test.tsx
      LoginForm.test.tsx
    ProductCard.tsx
    LoginForm.tsx
  pages/
    __tests__/
      CheckoutPage.test.tsx
  utils/
    __tests__/
      priceCalculator.test.ts
    priceCalculator.ts

e2e/
  checkout.spec.ts
  login.spec.ts

mocks/
  handlers.ts
  server.ts
```

### Step 1: Unit Tests (Foundation)
```typescript
// src/utils/__tests__/priceCalculator.test.ts
import { calculateTotal, calculateTax } from '../priceCalculator';

describe('priceCalculator', () => {
  test('calculates total with tax', () => {
    const total = calculateTotal([
      { price: 100, quantity: 2 }, // $200
      { price: 50, quantity: 1 },   // $50
    ], 0.08); // 8% tax
    
    expect(total).toBe(270); // ($200 + $50) * 1.08
  });

  test('applies discount before tax', () => {
    const total = calculateTotal(
      [{ price: 100, quantity: 1 }],
      0.08,
      0.1 // 10% discount
    );
    
    expect(total).toBe(97.2); // ($100 * 0.9) * 1.08
  });
});
```

### Step 2: Component Tests (Behavior)
```typescript
// src/components/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../ProductCard';

test('adds product to cart on button click', async () => {
  const mockAdd = jest.fn();
  const user = userEvent.setup();
  
  render(
    <ProductCard 
      product={{ id: 1, name: 'Laptop', price: 999 }}
      onAddToCart={mockAdd}
    />
  );

  await user.click(screen.getByRole('button', { name: /add to cart/i }));

  expect(mockAdd).toHaveBeenCalledWith({ id: 1, quantity: 1 });
});
```

### Step 3: Integration Tests (API Mocking)
```typescript
// src/pages/__tests__/CheckoutPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutPage } from '../CheckoutPage';

test('processes payment successfully', async () => {
  const user = userEvent.setup();
  render(<CheckoutPage />);

  // Wait for cart to load
  await waitFor(() => {
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
  });

  // Proceed to payment
  await user.click(screen.getByRole('button', { name: /checkout/i }));

  // Fill payment info
  await user.type(screen.getByPlaceholderText('Card number'), '4242424242424242');
  
  // Submit
  await user.click(screen.getByRole('button', { name: /pay/i }));

  // Verify success
  await expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
});
```

### Step 4: E2E Tests (Critical Paths)
```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('complete purchase flow', async ({ page }) => {
  // Start at home
  await page.goto('http://localhost:3000');
  
  // Add item to cart
  await page.click('text=Add to Cart', { hasText: 'MacBook Pro' });
  
  // Checkout
  await page.click('button:has-text("Cart")');
  await page.click('button:has-text("Checkout")');
  
  // Login
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Login")');
  
  // Payment
  await page.frameLocator('iframe[title="Payment"]').locator('input[placeholder="Card number"]').fill('4242424242424242');
  await page.click('button:has-text("Complete Purchase")');
  
  // Verify
  await expect(page.locator('h1')).toContainText('Order Confirmed');
});
```

### Step 5: CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 🎯 Common Testing Mistakes & Fixes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Test implementation, not behavior | Refactoring breaks tests | Test what user sees/does |
| Mock everything | Tests don't catch real bugs | Mock only external APIs |
| Test at wrong level | Slow, fragile tests | Use pyramid: unit > integration > E2E |
| 100% coverage obsession | Tests become unmaintainable | Target 70-80%, focus on critical paths |
| Flaky tests | Build fails randomly | Mark selectors explicitly, wait for elements |
| No E2E tests | Critical user flows untested | Test checkout, login, payment with E2E |
| Slow test suite | Developers skip tests | Keep unit tests under 5 mins total |
| Testing libraries | Don't test React, Jest, etc | Assume libraries work, test your code |
| Tests in /src folder | Confusing folder structure | Use __tests__ or .test.ts pattern |
| No CI/CD | Tests only run locally | Automate tests on PR/merge |

---

## 📈 Real-World Testing Impact

**Before comprehensive testing:**
- 3-4 bugs per release reaching production
- Average resolution time: 1-2 hours (user impact, debugging, fixing, deploying)
- Support tickets: 15-20 per week related to bugs
- Cost: $30K-50K annually in lost productivity

**After comprehensive testing:**
- 0.1-0.2 bugs per release reaching production (95% reduction)
- Average resolution time: 5 minutes (caught in CI/CD)
- Support tickets: 1-2 per week
- Cost: $2K-5K annually + testing time investment

**ROI:** For 50-person company = saves $25K-45K annually + saves engineers 5+ hours/week

---

## 💼 Career Impact

> **Companies hire for testing expertise. Testing engineers earn 15-20% more.**

### Interview Questions You'll Crush

**Q: "We have 0% test coverage. How would you add tests?"**

✅ Great answer:
- Start with critical paths (login, checkout, payment)
- Write E2E tests for those first (highest ROI)
- Add unit tests for business logic
- Build pyramid: 40% unit, 40% integration, 20% E2E
- Automate in CI/CD (fail PR if tests fail)
- Team agrees on coverage targets (70%+ for new code)
- Target 80% coverage in 3 months

**Q: "Our test suite takes 2 hours to run. What do we do?"**

✅ Great answer:
- Split tests: unit (<5 min), integration (10-15 min), E2E (parallel in CI)
- Parallelize test execution (50+ parallel jobs)
- Run quick tests on every PR, full suite before merge
- Identify slow tests (often from bad mocking)
- Mock external APIs (tests run offline)
- Use test sharding

**Q: "What's the difference between unit, integration, and E2E tests?"**

✅ Great answer (with code):
- **Unit:** Test function in isolation (calculateDiscount(100, 0.1) = 90)
- **Integration:** Test component + API mock (user fills form, clicks button, data loads)
- **E2E:** Test entire app flow in real browser (user logs in, shops, checks out)
- **Rule:** Fast coverage with unit, realistic behavior with integration, critical paths with E2E

### What Makes You Senior

```typescript
// Junior: "I wrote tests because I was told to"
// Mid: "I write tests for every feature, maintain good coverage"
// Senior: "I design systems to be testable, catch bugs before they're written"
// Staff: "I built testing culture for the team, mentored 20 engineers on testing strategy"

// That progression = 50% faster development + 95% fewer production bugs
```

### Test-Driven Development (TDD)

```typescript
// TDD Cycle: Red → Green → Refactor

// 1. RED: Write failing test
test('user can login', async () => {
  const { getByRole } = render(<LoginForm />);
  await userEvent.click(getByRole('button'));
  // Test fails because LoginForm doesn't exist yet
});

// 2. GREEN: Write minimal code to pass test
function LoginForm() {
  return <button>Login</button>;
}

// 3. REFACTOR: Improve code without breaking test
function LoginForm() {
  return (
    <form>
      <input type="email" />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 🔧 Testing Best Practices Checklist

### Before Shipping
- ✅ Unit tests cover business logic (70%+)
- ✅ Component tests verify user interactions
- ✅ E2E tests cover critical flows (login, checkout)
- ✅ No console errors or warnings
- ✅ Tests pass locally and in CI/CD
- ✅ Coverage reports generated
- ✅ Linting passes (ESLint, Prettier)

### Ongoing Maintenance
- ✅ Flaky tests fixed immediately
- ✅ Tests updated when features change
- ✅ Coverage targets maintained
- ✅ Test suite runs under 5 minutes
- ✅ Mock data kept realistic
- ✅ Regular test reviews with team

### Performance
- ✅ Unit tests: < 50ms each
- ✅ Integration tests: < 1s each
- ✅ E2E tests: < 20s each
- ✅ Full suite: < 5-10 minutes
- ✅ Parallel execution enabled

---

## 📚 Learn More

### Tools & Libraries
- **Jest:** Unit testing (fastest, most popular)
- **Vitest:** Modern Jest alternative
- **React Testing Library:** Component testing (test behavior)
- **Playwright:** E2E testing (real browser)
- **MSW:** API mocking (reliable, no network)
- **Coverage reporters:** Codecov, Coveralls

### Resources
- [Testing JavaScript](https://testingjavascript.com/) - Best-in-class resource
- [Kent C. Dodds](https://kentcdodds.com/) - Testing expert, creator of Testing Library
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Jest Docs](https://jestjs.io/) - Comprehensive reference
- [Playwright Docs](https://playwright.dev/) - E2E testing guide

---

**Test like a professional. Your users (and your job security) depend on it!** ✅