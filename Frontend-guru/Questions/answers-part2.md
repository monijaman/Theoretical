# Frontend Interview Questions Answers - Part 2 (Questions 21-30)

## 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 (continued)

### 21. Memoization pitfalls

```javascript
// PITFALL 1: Memoizing everything (premature optimization)
// Bad: Unnecessary memoization
function SimpleComponent({ name }) {
  const fullName = useMemo(() => `Mr. ${name}`, [name]); // Overkill!
  const isLong = useMemo(() => name.length > 10, [name]); // Overkill!
  
  return <div>{fullName}</div>;
}

// Good: Just compute directly
function SimpleComponent({ name }) {
  const fullName = `Mr. ${name}`; // Fast enough!
  const isLong = name.length > 10; // Fast enough!
  
  return <div>{fullName}</div>;
}

// WHEN TO MEMOIZE:
// ✓ Expensive calculations (>5ms)
// ✓ Referential equality for deps
// ✗ Simple string concatenation
// ✗ Basic arithmetic
// ✗ Array access

// PITFALL 2: Incorrect dependencies
function BadMemo({ items }) {
  const filtered = useMemo(() => {
    console.log('Filtering...');
    return items.filter(item => item.active);
  }, [items.length]); // Wrong! Should be [items]
  
  // Won't update when items change value (only when length changes)
  return <div>{filtered.map(...)}</div>;
}

// Fix:
function GoodMemo({ items }) {
  const filtered = useMemo(() => {
    return items.filter(item => item.active);
  }, [items]);
  
  return <div>{filtered.map(...)}</div>;
}

// PITFALL 3: Memoizing with object/array dependencies
function BadObjectMemo() {
  const config = { threshold: 100 }; // New object every render!
  
  const filtered = useMemo(() => {
    return items.filter(item => item.value > config.threshold);
  }, [config]); // Infinite memoization!
}

// Fix 1: Extract primitive
function GoodPrimitiveMemo() {
  const threshold = 100;
  
  const filtered = useMemo(() => {
    return items.filter(item => item.value > threshold);
  }, [threshold]);
}

// Fix 2: useMemo the dependency
function GoodNestedMemo() {
  const config = useMemo(() => ({ threshold: 100 }), []);
  
  const filtered = useMemo(() => {
    return items.filter(item => item.value > config.threshold);
  }, [config]);
}

// PITFALL 4: useMemo vs. useCallback confusion
// useMemo: Memoize VALUE
// useCallback: Memoize FUNCTION

function Example() {
  // useMemo returns the RESULT of the function
  const expensiveValue = useMemo(() => {
    return computeExpensiveValue(a, b);
  }, [a, b]);
  
  // useCallback returns the FUNCTION itself
  const handleClick = useCallback(() => {
    doSomething(a, b);
  }, [a, b]);
  
  // This is the same:
  const handleClickSame = useMemo(() => {
    return () => doSomething(a, b);
  }, [a, b]);
}

// PITFALL 5: Memoizing component props
function Bad({ items }) {
  return (
    <ExpensiveList
      data={items}
      config={{ sortOrder: 'asc' }} // New object every render!
      onItemClick={(id) => handleClick(id)} // New function every render!
    />
  );
}

// Fix:
function Good({ items }) {
  const config = useMemo(() => ({ sortOrder: 'asc' }), []);
  const handleItemClick = useCallback((id) => {
    handleClick(id);
  }, []);
  
  return (
    <ExpensiveList
      data={items}
      config={config}
      onItemClick={handleItemClick}
    />
  );
}

// Or better: Move static values outside
const LIST_CONFIG = { sortOrder: 'asc' };

function Better({ items }) {
  const handleItemClick = useCallback((id) => {
    handleClick(id);
  }, []);
  
  return (
    <ExpensiveList
      data={items}
      config={LIST_CONFIG}
      onItemClick={handleItemClick}
    />
  );
}

// PITFALL 6: Memory overhead
function MemoryHeavy({ data }) {
  // Creates closure over large data array
  const expensiveCalc = useMemo(() => {
    const result = data.map(/* expensive operation */);
    return result.slice(0, 10); // Only need first 10!
  }, [data]);
  
  // useMemo holds reference to BOTH data and result
  // Memory = size(data) + size(result)
}

// Better: Calculate what you need
function MemoryEfficient({ data }) {
  const topTen = useMemo(() => {
    return data
      .slice(0, 100) // Limit input first
      .map(/* expensive operation */)
      .slice(0, 10);
  }, [data]);
}

// PITFALL 7: useMemo for side effects
function BadSideEffect({ userId }) {
  useMemo(() => {
    // DON'T: Side effects in useMemo
    fetch(`/api/users/${userId}`);
    localStorage.setItem('user', userId);
  }, [userId]);
}

// Fix: Use useEffect for side effects
function GoodSideEffect({ userId }) {
  useEffect(() => {
    fetch(`/api/users/${userId}`);
    localStorage.setItem('user', userId);
  }, [userId]);
}

// PITFALL 8: Stale closures
function StaleClosureIssue() {
  const [count, setCount] = useState(0);
  
  const increment = useCallback(() => {
    setCount(count + 1); // Captures 'count' at callback creation
  }, []); // Empty deps - 'count' is stale!
  
  // Clicking button multiple times only increments once
  return <button onClick={increment}>{count}</button>;
}

// Fix: Use functional update
function FixedClosure() {
  const [count, setCount] = useState(0);
  
  const increment = useCallback(() => {
    setCount(c => c + 1); // Always gets current value
  }, []); // Can stay empty!
  
  return <button onClick={increment}>{count}</button>;
}

// PITFALL 9: Over-memoizing with React.memo
const BadMemo = React.memo(({ value }) => {
  // Component re-renders are cheap (just returns JSX)
  return <div>{value}</div>;
});
// Adds overhead without benefit!

// Only memo if:
// 1. Component renders often
// 2. Component is expensive
// 3. Props change infrequently

const GoodMemo = React.memo(({ data }) => {
  // Expensive: Large list rendering
  return (
    <div>
      {data.map(item => (
        <ExpensiveItem key={item.id} {...item} />
      ))}
    </div>
  );
});

// PITFALL 10: Array dependencies
function ArrayDependency() {
  const items = [1, 2, 3];
  
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item, 0);
  }, [items]); // New array every render! Always re-memoizes
}

// Fix: Stringify or use external/state
function FixedArrayDependency() {
  const [items] = useState([1, 2, 3]); // Stable reference
  
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item, 0);
  }, [items]); // Only changes when state changes
}

// MEASUREMENT: When to actually memo
function measureRenderTime(componentName, callback) {
  const start = performance.now();
  callback();
  const end = performance.now();
  console.log(`${componentName}: ${end - start}ms`);
}

// Use React DevTools Profiler instead of premature optimization!

// RULES OF THUMB:
/*
✓ Memo calculations that take >5-10ms
✓ Memo to prevent child re-renders (with React.memo)
✓ Memo referential values used as deps
✗ Don't memo simple operations
✗ Don't memo everything "just in case"
✗ Don't memo with wrong dependencies
✗ Measure before optimizing!
*/
```

---

### 22. Prevent unnecessary re-renders

```javascript
// PROBLEM: Parent re-renders, children re-render
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <Child1 />
      <Child2 />
      <Child3 />
    </div>
  );
  // Every click re-renders ALL children!
}

// SOLUTION 1: React.memo
const Child1 = React.memo(() => {
  console.log('Child1 rendered');
  return <div>Child 1</div>;
});
// Only re-renders if props change

// SOLUTION 2: Children prop pattern
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* count is here, children are outside */}
    </div>
  );
}

function Wrapper({ children }) {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {children} {/* Children don't re-render! */}
    </>
  );
}

// Usage:
<Wrapper>
  <Child1 />
  <Child2 />
</Wrapper>

// SOLUTION 3: Split components
// Bad: Everything in one component
function Dashboard() {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState([]);
  
  return (
    <div>
      <FilterBar value={filter} onChange={setFilter} />
      <ExpensiveChart data={data} />
      <ExpensiveTable data={data} />
    </div>
  );
  // Changing filter re-renders chart & table!
}

// Good: Separate concerns
function Dashboard() {
  const [data, setData] = useState([]);
  
  return (
    <div>
      <FilterBar />
      <DataVisualizations data={data} />
    </div>
  );
}

function FilterBar() {
  const [filter, setFilter] = useState('all');
  // Filter state isolated here
  return <div>...</div>;
}

const DataVisualizations = React.memo(({ data }) => {
  return (
    <>
      <ExpensiveChart data={data} />
      <ExpensiveTable data={data} />
    </>
  );
});

// SOLUTION 4: useMemo for expensive renders
function ProductList({ products }) {
  const [sortBy, setSortBy] = useState('name');
  const [filter, setFilter] = useState('');
  
  const processedProducts = useMemo(() => {
    let result = products;
    
    // Filter
    if (filter) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    // Sort
    result = result.sort((a, b) => 
      a[sortBy].localeCompare(b[sortBy])
    );
    
    return result;
  }, [products, sortBy, filter]);
  
  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="name">Name</option>
        <option value="price">Price</option>
      </select>
      
      {processedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// SOLUTION 5: Avoid inline functions/objects
// Bad:
function Parent() {
  return (
    <Child
      onClick={() => console.log('clicked')} // New function every render
      style={{ padding: 10 }} // New object every render
    />
  );
}

// Good:
const CHILD_STYLE = { padding: 10 };

function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <Child onClick={handleClick} style={CHILD_STYLE} />;
}

// SOLUTION 6: Optimize context
// Bad: Single context with all state
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [settings, setSettings] = useState({});
  
  return (
    <AppContext.Provider value={{ user, theme, settings, setUser, setTheme, setSettings }}>
      {children}
    </AppContext.Provider>
  );
  // ANY change re-renders ALL consumers!
}

// Good: Split contexts
const UserContext = createContext();
const ThemeContext = createContext();
const SettingsContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [settings, setSettings] = useState({});
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <SettingsContext.Provider value={{ settings, setSettings }}>
          {children}
        </SettingsContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
  // Only relevant consumers re-render
}

// Or split state/dispatch:
const StateContext = createContext();
const DispatchContext = createContext();

function Provider({ children }) {
  const [state, setState] = useState(initialState);
  
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={setState}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// SOLUTION 7: Key optimization for lists
// Bad: No key causes all items to re-render
<ul>
  {items.map((item, index) => (
    <li key={index}>{item.name}</li>
  ))}
</ul>

// Good: Stable keys prevent re-renders
<ul>
  {items.map(item => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>

// SOLUTION 8: Lazy state initialization
// Bad: Expensive function runs every render
function Component() {
  const [state, setState] = useState(expensiveComputation());
  // expensiveComputation() runs on every render!
}

// Good: Function only runs once
function Component() {
  const [state, setState] = useState(() => expensiveComputation());
  // Only runs on mount
}

// SOLUTION 9: React 18 concurrent features
import { useDeferredValue, useTransition } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  const results = useMemo(() => {
    // Expensive search
    return searchItems(deferredQuery);
  }, [deferredQuery]);
  
  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        // Input stays responsive!
      />
      <Results data={results} />
    </>
  );
}

function TabContainer() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();
  
  const selectTab = (newTab) => {
    startTransition(() => {
      setTab(newTab); // Low priority
    });
  };
  
  return (
    <>
      <Tabs onSelect={selectTab} />
      {isPending && <Spinner />}
      <TabContent tab={tab} />
    </>
  );
}

// SOLUTION 10: Bailout of state updates
function Component() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    // If new value === old value, React bails out (no re-render)
    setCount(5);
    setCount(5); // No re-render
    setCount(5); // No re-render
  };
  
  return <button onClick={handleClick}>{count}</button>;
}

// Use this for conditional updates:
function ConditionalUpdate({ newValue }) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    // Only update if different
    setValue(prev => {
      if (prev === newValue) return prev; // Bailout
      return newValue;
    });
  }, [newValue]);
}

// DEBUGGING RE-RENDERS:
// 1. React DevTools Profiler
// 2. why-did-you-render library
// 3. Manual logging:

function Component(props) {
  useEffect(() => {
    console.log('Component rendered');
    console.log('Props:', props);
  });
  
  return <div>...</div>;
}

// Or more detailed:
function useWhyDidYouUpdate(name, props) {
  const previousProps = useRef();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};
      
      allKeys.forEach(key => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

// Usage:
function MyComponent(props) {
  useWhyDidYouUpdate('MyComponent', props);
  return <div>...</div>;
}
```

---

### 23. Image optimization techniques

```javascript
// TECHNIQUE 1: Lazy loading images
// Native lazy loading
<img
  src="/images/large-image.jpg"
  loading="lazy" // Browser handles lazy loading
  alt="Description"
/>

// React implementation
function LazyImage({ src, alt }) {
  const imgRef = useRef();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

// TECHNIQUE 2: Responsive images
// Different sizes for different screens
<picture>
  <source
    media="(min-width: 1200px)"
    srcSet="/images/hero-large.webp"
  />
  <source
    media="(min-width: 768px)"
    srcSet="/images/hero-medium.webp"
  />
  <img
    src="/images/hero-small.webp"
    alt="Hero image"
  />
</picture>

// Or use srcset:
<img
  src="/images/product.jpg"
  srcSet="
    /images/product-400w.jpg 400w,
    /images/product-800w.jpg 800w,
    /images/product-1200w.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  alt="Product"
/>

// TECHNIQUE 3: Modern formats (WebP, AVIF)
<picture>
  <source srcSet="/images/photo.avif" type="image/avif" />
  <source srcSet="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.jpg" alt="Photo" />
</picture>

// React component for format detection
function OptimizedImage({ src, alt }) {
  const formats = {
    avif: src.replace(/\.[^.]+$/, '.avif'),
    webp: src.replace(/\.[^.]+$/, '.webp'),
    jpeg: src
  };
  
  return (
    <picture>
      <source srcSet={formats.avif} type="image/avif" />
      <source srcSet={formats.webp} type="image/webp" />
      <img src={formats.jpeg} alt={alt} />
    </picture>
  );
}

// TECHNIQUE 4: Blur-up placeholder (Progressive loading)
function BlurUpImage({ src, placeholder, alt }) {
  const [imgSrc, setImgSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImgSrc(src);
      setIsLoaded(true);
    };
  }, [src]);
  
  return (
    <div style={{ position: 'relative' }}>
      <img
        src={imgSrc}
        alt={alt}
        style={{
          filter: isLoaded ? 'none' : 'blur(10px)',
          transition: 'filter 0.3s'
        }}
      />
    </div>
  );
}

// Generate tiny placeholder (LQIP - Low Quality Image Placeholder)
// Use tools like blurhash, sqip, or lqip when building

// TECHNIQUE 5: Next.js Image component (automatic optimization)
import Image from 'next/image';

function ProductCard({ product }) {
  return (
    <div>
      <Image
        src={product.image}
        alt={product.name}
        width={400}
        height={300}
        loading="lazy"
        quality={75}
        placeholder="blur"
        blurDataURL={product.placeholder}
      />
    </div>
  );
}
// Next.js automatically optimizes, resizes, serves WebP

// TECHNIQUE 6: CDN with image transformations
// Cloudinary example
const cloudinaryUrl = (publicId, transformations) => {
  const base = 'https://res.cloudinary.com/demo/image/upload';
  return `${base}/${transformations}/${publicId}`;
};

function CloudinaryImage({ publicId, width, height, alt }) {
  return (
    <img
      src={cloudinaryUrl(publicId, `w_${width},h_${height},c_fill,f_auto,q_auto`)}
      alt={alt}
      width={width}
      height={height}
    />
  );
}
// f_auto: automatic format (WebP if supported)
// q_auto: automatic quality
// c_fill: crop/resize

// TECHNIQUE 7: Aspect ratio containers (prevent layout shift)
function AspectRatioImage({ src, alt, ratio = '16/9' }) {
  return (
    <div style={{ aspectRatio: ratio, position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

// Or using padding trick (older browsers)
function AspectRatioOldSchool({ src, alt }) {
  return (
    <div style={{
      position: 'relative',
      paddingBottom: '56.25%', // 16:9 ratio
      height: 0
    }}>
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

// TECHNIQUE 8: Preload critical images
// In document <head>:
<link
  rel="preload"
  as="image"
  href="/images/hero.webp"
  type="image/webp"
/>

// Or programmatically:
function preloadImage(src) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

// React hook
function usePreloadImage(src) {
  useEffect(() => {
    const img = new Image();
    img.src = src;
  }, [src]);
}

// TECHNIQUE 9: SVG optimization
// Use SVGO to optimize SVGs
// Inline critical SVGs
function Logo() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <path d="M10,10 L90,90" stroke="black" />
    </svg>
  );
}

// Or load as React component (with SVGR)
import { ReactComponent as LogoSVG } from './logo.svg';

function Header() {
  return <LogoSVG width={100} height={100} />;
}

// TECHNIQUE 10: Image compression
// Build-time optimization with webpack/vite

// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: { progressive: true, quality: 75 },
              optipng: { enabled: true },
              pngquant: { quality: [0.65, 0.90], speed: 4 },
              gifsicle: { interlaced: false },
              webp: { quality: 75 }
            }
          }
        ]
      }
    ]
  }
};

// TECHNIQUE 11: Client hints
// Server can serve optimal image based on client capabilities
<img
  src="/images/photo.jpg"
  alt="Photo"
  // Browser sends viewport width, DPR, etc.
/>

// Server-side (Express example):
app.get('/images/:name', (req, res) => {
  const viewportWidth = req.headers['viewport-width'];
  const dpr = req.headers['dpr'] || 1;
  
  const optimalWidth = Math.min(viewportWidth * dpr, 2000);
  const optimizedImage = resizeImage(req.params.name, optimalWidth);
  
  res.sendFile(optimizedImage);
});

// TECHNIQUE 12: Art direction
// Different crops for different screen sizes
<picture>
  <source
    media="(min-width: 768px)"
    srcSet="/images/landscape.jpg" // Wide crop
  />
  <source
    media="(max-width: 767px)"
    srcSet="/images/portrait.jpg" // Tall crop
  />
  <img src="/images/default.jpg" alt="Responsive image" />
</picture>

// PERFORMANCE CHECKLIST:
/*
✓ Use lazy loading for below-the-fold images
✓ Serve responsive images (srcset/picture)
✓ Use modern formats (WebP, AVIF)
✓ Compress images (75-85% quality)
✓ Use CDN for images
✓ Set explicit width/height (prevent CLS)
✓ Preload critical images
✓ Use blur-up placeholders
✓ Optimize SVGs
✓ Monitor image bytes in bundle

TOOLS:
- Squoosh (online image optimizer)
- ImageOptim (Mac)
- TinyPNG (online)
- SVGO (SVG optimizer)
- Lighthouse (audit images)
*/
```

---

### 24. Web Vitals (what actually matters)

```javascript
// CORE WEB VITALS (Google ranking factors)

// 1. LCP - Largest Contentful Paint (Loading)
// Target: < 2.5s
// Measures: When main content becomes visible

// Measure LCP:
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LCP:', entry.renderTime || entry.loadTime);
  }
}).observe({ entryTypes: ['largest-contentful-paint'] });

// Or use web-vitals library:
import { getLCP } from 'web-vitals';

getLCP(({ name, value, delta, id }) => {
  console.log('LCP:', value);
  // Send to analytics
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(value),
    event_label: id
  });
});

// How to improve LCP:
// ✓ Optimize server response time (TTFB < 600ms)
// ✓ Use CDN
// ✓ Optimize images (see previous section)
// ✓ Preload critical resources
// ✓ Minimize render-blocking JavaScript/CSS
// ✓ Use SSR/SSG

function ImproveLCP() {
  // Preload hero image
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/images/hero.webp';
    document.head.appendChild(link);
  }, []);
  
  return (
    <img
      src="/images/hero.webp"
      width={1200}
      height={600}
      alt="Hero"
      fetchpriority="high" // High priority
    />
  );
}

// 2. FID - First Input Delay (Interactivity)
// Target: < 100ms  
// Measures: Time from user interaction to browser response

// Measure FID:
import { getFID } from 'web-vitals';

getFID(({ name, value, delta, id }) => {
  console.log('FID:', value);
});

// How to improve FID:
// ✓ Break up long JavaScript tasks
// ✓ Use code splitting
// ✓ Defer non-critical JavaScript
// ✓ Use web workers for heavy computation
// ✓ Optimize event handlers

// Bad: Long task blocks main thread
function processData() {
  const result = []; 
  for (let i = 0; i < 1000000; i++) {
    result.push(expensiveOperation(i));
  }
  return result;
}

// Good: Break into chunks
async function processDataChunked() {
  const result = [];
  const chunkSize = 1000;
  
  for (let i = 0; i < 1000000; i += chunkSize) {
    const chunk = [];
    for (let j = i; j < i + chunkSize && j < 1000000; j++) {
      chunk.push(expensiveOperation(j));
    }
    result.push(...chunk);
    
    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return result;
}

// Or use Web Worker:
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ items: data });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = processExpensiveData(e.data.items);
  self.postMessage(result);
};

// 3. CLS - Cumulative Layout Shift (Visual Stability)
// Target: < 0.1
// Measures: Unexpected layout shifts

// Measure CLS:
import { getCLS } from 'web-vitals';

getCLS(({ name, value, delta, id }) => {
  console.log('CLS:', value);
});

// How to improve CLS:
// ✓ Set explicit width/height on images/videos
// ✓ Reserve space for ads/embeds
// ✓ Don't insert content above existing content
// ✓ Use CSS aspect-ratio or padding-bottom
// ✓ Preload fonts with font-display: swap

// Bad: No dimensions
<img src="/images/product.jpg" alt="Product" />
// Image loads → layout shifts

// Good: Explicit dimensions
<img
  src="/images/product.jpg"
  alt="Product"
  width={400}
  height={300}
/>

// Better: Aspect ratio container
<div style={{ aspectRatio: '4/3' }}>
  <img
    src="/images/product.jpg"
    alt="Product"
    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  />
</div>

// Font loading without CLS:
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>

// CSS:
@font-face {
  font-family: 'Inter';
  font-display: swap; // or optional
  src: url('/fonts/inter.woff2') format('woff2');
}

// Reserve space for dynamic content:
function AdSlot() {
  const [adLoaded, setAdLoaded] = useState(false);
  
  return (
    <div
      style={{
        minHeight: 250, // Reserve space
        backgroundColor: '#f0f0f0'
      }}
    >
      {adLoaded ? <Ad /> : <Skeleton />}
    </div>
  );
}

// ADDITIONAL WEB VITALS:

// TTFB - Time to First Byte
// Target: < 600ms
// Server response time

import { getTTFB } from 'web-vitals';

getTTFB(({ value }) => {
  console.log('TTFB:', value);
});

// Improve:
// ✓ Use CDN
// ✓ Cache static assets
// ✓ Optimize server processing
// ✓ Use HTTP/2 or HTTP/3
// ✓ Enable compression (gzip/brotli)

// FCP - First Contentful Paint
// Target: < 1.8s
// When first content renders

import { getFCP } from 'web-vitals';

getFCP(({ value }) => {
  console.log('FCP:', value);
});

// Improve:
// ✓ Eliminate render-blocking resources
// ✓ Inline critical CSS
// ✓ Defer non-critical CSS
// ✓ Minimize DOM size

// Critical CSS example:
function App() {
  return (
    <>
      <style>{`
        /* Critical CSS inline */
        body { margin: 0; font-family: sans-serif; }
        .header { background: #333; color: white; }
      `}</style>
      
      {/* Non-critical CSS loaded async */}
      <link
        rel="stylesheet"
        href="/styles.css"
        media="print"
        onLoad="this.media='all'"
      />
    </>
  );
}

// INP - Interaction to Next Paint (replacing FID)
// Target: < 200ms
// Measures all interactions (not just first)

import { getINP } from 'web-vitals';

getINP(({ value }) => {
  console.log('INP:', value);
});

// REAL-WORLD MONITORING:

// Setup comprehensive monitoring:
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id, rating }) {
  // Google Analytics example
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(value),
    event_label: id,
    non_interaction: true,
    rating
  });
  
  // Or custom endpoint
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ name, value, id, rating }),
    headers: { 'Content-Type': 'application/json' }
  });
}

// Register all vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// React component wrapper:
function WebVitalsReporter() {
  useEffect(() => {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(sendToAnalytics);
      getFID(sendToAnalytics);
      getFCP(sendToAnalytics);
      getLCP(sendToAnalytics);
      getTTFB(sendToAnalytics);
    });
  }, []);
  
  return null;
}

// DEBUGGING TOOLS:
/*
- Chrome DevTools Lighthouse
- PageSpeed Insights
- WebPageTest
- Chrome User Experience Report (CrUX)
- Search Console (Core Web Vitals report)
- web-vitals library
- perfume.js (RUM monitoring)
*/

// PERFORMANCE BUDGET:
// Set budgets and fail builds if exceeded
// lighthouse-ci.json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

---

## 𝗙𝗿𝗼𝗻𝘁𝗲𝗻𝗱 𝗦𝘆𝘀𝘁𝗲𝗺 𝗗𝗲𝘀𝗶𝗴𝗻 (𝗦𝗲𝗻𝗶𝗼𝗿 𝗹𝗲𝘃𝗲𝗹)

### 25. Design a scalable dashboard

```javascript
// REQUIREMENTS GATHERING:
// 1. What data? (metrics, charts, tables)
// 2. How often updates? (real-time, polling, manual)
// 3. Customization? (drag-drop, filters, saved views)
// 4. Performance? (data volume, number of widgets)
// 5. Permissions? (role-based access)

// HIGH-LEVEL ARCHITECTURE:

/*
┌─────────────────────────────────────────┐
│           Client (React)                │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  Layout      │  │  Widget Factory │ │
│  │  Manager     │  │                 │ │
│  └──────────────┘  └─────────────────┘ │
│  ┌─────────────────────────────────────┤
│  │  State Management (Zustand/Redux)  ││
│  └─────────────────────────────────────┤
│  ┌─────────────────────────────────────┤
│  │  Data Layer (React Query / SWR)    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
              ↕ API calls
┌─────────────────────────────────────────┐
│     Backend (Node.js / Python)          │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  API Gateway │  │  WebSocket Hub  │ │
│  └──────────────┘  └─────────────────┘ │
│  ┌─────────────────────────────────────┤
│  │  Cache Layer (Redis)                ││
│  └─────────────────────────────────────┤
│  ┌─────────────────────────────────────┤
│  │  Database (PostgreSQL / MongoDB)    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
*/

// IMPLEMENTATION:

// 1. Data Layer - React Query for server state
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Fetch dashboard configuration
function useDashboardConfig(dashboardId) {
  return useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => fetch(`/api/dashboards/${dashboardId}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
}

// Fetch widget data with auto-refresh
function useWidgetData(widgetId, refreshInterval = 30000) {
  return useQuery({
    queryKey: ['widget', widgetId],
    queryFn: () => fetch(`/api/widgets/${widgetId}/data`).then(r => r.json()),
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true
  });
}

// 2. State Management - Zustand for layout state
import create from 'zustand';
import { persist } from 'zustand/middleware';

const useDashboardStore = create(
  persist(
    (set, get) => ({
      // Layout state
      widgets: [],
      layout: 'grid', // 'grid' | 'list' | 'custom'
      
      // Filters
      dateRange: { start: null, end: null },
      filters: {},
      
      // Actions
      addWidget: (widget) => set((state) => ({
        widgets: [...state.widgets, widget]
      })),
      
      removeWidget: (widgetId) => set((state) => ({
        widgets: state.widgets.filter(w => w.id !== widgetId)
      })),
      
      updateWidgetPosition: (widgetId, position) => set((state) => ({
        widgets: state.widgets.map(w =>
          w.id === widgetId ? { ...w, position } : w
        )
      })),
      
      setFilters: (filters) => set({ filters }),
      
      setDateRange: (dateRange) => set({ dateRange })
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        layout: state.layout,
        widgets: state.widgets
        // Don't persist filters/dateRange
      })
    }
  )
);

// 3. Widget Factory Pattern
// widgets/index.tsx
const widgetRegistry = {
  chart: lazy(() => import('./ChartWidget')),
  table: lazy(() => import('./TableWidget')),
  metric: lazy(() => import('./MetricWidget')),
  map: lazy(() => import('./MapWidget')),
  custom: lazy(() => import('./CustomWidget'))
};

function WidgetFactory({ widget }) {
  const Component = widgetRegistry[widget.type];
  
  if (!Component) {
    return <div>Unknown widget type: {widget.type}</div>;
  }
  
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <ErrorBoundary fallback={<WidgetError />}>
        <Component {...widget.props} />
      </ErrorBoundary>
    </Suspense>
  );
}

// 4. Grid Layout with react-grid-layout
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

function DashboardGrid() {
  const { widgets, updateWidgetPosition } = useDashboardStore();
  
  const layout = widgets.map(w => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.position.width,
    h: w.position.height
  }));
  
  const handleLayoutChange = (newLayout) => {
    newLayout.forEach(item => {
      updateWidgetPosition(item.i, {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h
      });
    });
  };
  
  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={30}
      width={1200}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
    >
      {widgets.map(widget => (
        <div key={widget.id} className="widget-container">
          <div className="drag-handle">
            <GripVertical size={16} />
          </div>
          <WidgetFactory widget={widget} />
        </div>
      ))}
    </GridLayout>
  );
}

// 5. Real-time Updates with WebSocket
function useRealtimeData(widgetId) {
  const [data, setData] = useState(null);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/widgets/${widgetId}`);
    
    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(newData);
      
      // Update React Query cache
      queryClient.setQueryData(['widget', widgetId], newData);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Fall back to polling
    };
    
    return () => ws.close();
  }, [widgetId]);
  
  return data;
}

// 6. Performance Optimizations
// Virtualized widget rendering for many widgets
import { FixedSizeGrid } from 'react-window';

function VirtualizedDashboard() {
  const { widgets } = useDashboardStore();
  
  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * COLUMNS + columnIndex;
    const widget = widgets[index];
    
    if (!widget) return null;
    
    return (
      <div style={style}>
        <WidgetFactory widget={widget} />
      </div>
    );
  };
  
  return (
    <FixedSizeGrid
      columnCount={COLUMNS}
      columnWidth={400}
      height={800}
      rowCount={Math.ceil(widgets.length / COLUMNS)}
      rowHeight={300}
      width={1200}
    >
      {Cell}
    </FixedSizeGrid>
  );
}

// Memoize expensive widget renders
const ChartWidget = React.memo(({ data, config }) => {
  const processedData = useMemo(() => {
    return transformDataForChart(data, config);
  }, [data, config]);
  
  return <Chart data={processedData} />;
});

// 7. Data Aggregation & Caching Strategy
// Backend (Express)
const redis = require('redis');
const client = redis.createClient();

app.get('/api/widgets/:id/data', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `widget:${id}:data`;
  
  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Fetch from database
  const data = await fetchWidgetData(id);
  
  // Cache for 1 minute
  await client.setex(cacheKey, 60, JSON.stringify(data));
  
  res.json(data);
});

// 8. Filters & Cross-widget Communication
function DashboardFilters() {
  const { filters, setFilters, dateRange, setDateRange } = useDashboardStore();
  
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };
  
  return (
    <div className="filters">
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
      />
      
      <Select
        value={filters.region}
        onChange={(val) => handleFilterChange('region', val)}
        options={['US', 'EU', 'APAC']}
      />
      
      <Select
        value={filters.product}
        onChange={(val) => handleFilterChange('product', val)}
        options={['Premium', 'Basic', 'Enterprise']}
      />
    </div>
  );
}

// Widgets react to filter changes
function MetricWidget({ metricId }) {
  const { filters, dateRange } = useDashboardStore();
  
  const { data, isLoading } = useQuery({
    queryKey: ['metric', metricId, filters, dateRange],
    queryFn: () => fetchMetric(metricId, filters, dateRange)
  });
  
  if (isLoading) return <Skeleton />;
  
  return <div className="metric">{data.value}</div>;
}

// 9. Export & Sharing
function DashboardExport() {
  const { widgets, filters, dateRange } = useDashboardStore();
  
  const exportToPDF = async () => {
    const pdf = new jsPDF();
    
    // Capture dashboard as image
    const canvas = await html2canvas(document.querySelector('.dashboard'));
    const imgData = canvas.toDataURL('image/png');
    
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
    pdf.save('dashboard.pdf');
  };
  
  const shareLink = () => {
    const config = {
      widgets: widgets.map(w => ({ type: w.type, props: w.props })),
      filters,
      dateRange
    };
    
    const encoded = btoa(JSON.stringify(config));
    const shareUrl = `${window.location.origin}/dashboard?config=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!');
  };
  
  return (
    <div>
      <button onClick={exportToPDF}>Export PDF</button>
      <button onClick={shareLink}>Share Link</button>
    </div>
  );
}

// 10. Permissions & RBAC
function DashboardPermissions() {
  const { user } = useAuth();
  const canEdit = user.permissions.includes('dashboard:edit');
  const canExport = user.permissions.includes('dashboard:export');
  
  return (
    <Dashboard>
      {canEdit && <EditControls />}
      {canExport && <ExportButton />}
    </Dashboard>
  );
}

// ARCHITECTURE DECISIONS:
/*
✓ React Query for server state (caching, refetching)
✓ Zustand for client state (lightweight, persistent)
✓ react-grid-layout for drag-drop
✓ Code splitting by widget type
✓ WebSocket for real-time (with polling fallback)
✓ Redis for backend caching
✓ Virtualization for 50+ widgets
✓ Memoization for expensive computations
✓ Error boundaries per widget
✓ Granular permissions
*/

// SCALABILITY CONSIDERATIONS:
/*
- Widget lazy loading (only load visible)  
- Database query optimization (indexes, aggregations)
- CDN for static assets
- Horizontal scaling (load balancer + multiple servers)
- Data pagination/chunking for large datasets
- Use aggregations/materialized views for heavy queries
- Consider separate microservices for different widget types
- Implement rate limiting
- Cache strategy (per-user vs global)
- Monitor performance (Prometheus, Grafana)
*/
```

---

I've now completed Part 2 with questions 21-24. Would you like me to continue with the final questions 25-30 (including the one I just started)? I should complete:
- Question 25 (already started above - Design a scalable dashboard)
- Question 26 (Infinite scroll for millions of items)
- Question 27 (Real-time updates architecture)
- Question 28 (Offline-first app design)
- Question 29 (Feature flag system)
- Question 30 (Role-based access control RBAC)

Shall I continue?