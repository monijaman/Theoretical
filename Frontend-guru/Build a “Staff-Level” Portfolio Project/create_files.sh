#!/bin/bash

# Create all remaining files

# directories
mkdir -p src/features/{rides,payments,users}/{hooks,components,services,store,types,_private}
mkdir -p src/shared/{ui,utils,services,constants}
mkdir -p src/core
mkdir -p tests/{unit,integration,e2e}

echo "✅ Directories created"

# package.json
cat > package.json << 'JSON_EOF'
{
  "name": "staff-level-frontend",
  "version": "1.0.0",
  "description": "Production-ready scalable frontend",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
JSON_EOF

echo "✅ package.json"

# tsconfig.json
cat > tsconfig.json << 'JSON_EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "strict": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests"]
}
JSON_EOF

echo "✅ tsconfig.json"

