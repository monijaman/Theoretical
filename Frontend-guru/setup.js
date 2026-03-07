const fs = require('fs');
const path = require('path');

const target = 'Build a "Staff-Level" Portfolio Project';

const allDirs = [
  'src', 'src/features', 'src/features/rides', 'src/features/rides/hooks',
  'src/features/rides/components', 'src/features/rides/services',
  'src/features/rides/store', 'src/features/rides/types', 'src/features/rides/_private',
  'src/features/payments', 'src/features/users', 'src/shared', 'src/shared/ui',
  'src/shared/utils', 'src/shared/services', 'src/shared/constants', 'src/core',
  'tests/unit', 'tests/integration', 'tests/e2e', '.github', '.github/workflows'
];

allDirs.forEach(dir => {
  const fullPath = path.join(target, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('✅', dir);
  }
});

// Create package.json
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({
  name: 'staff-level-frontend',  
  version: '1.0.0',
  scripts: { dev: 'vite', build: 'tsc && vite build', test: 'vitest', lint: 'eslint src' },
  dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', zustand: '^4.4.0' }
}, null, 2));

console.log('✅ package.json');

// Create tsconfig.json
fs.writeFileSync(path.join(target, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2020', lib: ['ES2020', 'DOM'], module: 'ESNext', strict: true, jsx: 'react-jsx' },
  include: ['src', 'tests']
}, null, 2));

console.log('✅ tsconfig.json');

console.log('\n✅ All files created successfully!');
