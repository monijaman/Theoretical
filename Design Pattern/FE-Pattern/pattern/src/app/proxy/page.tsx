// src/app/proxy-pattern/page.jsx
'use client';
import { useState } from 'react';
import TeaProxy from './TeaProxy';

export default function ProxyPatternPage() {
  const [count, setCount] = useState(0);

  const handleDrink = () => setCount((prev) => prev + 1);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Proxy Pattern Example</h1>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleDrink}
      >
        Request Tea
      </button>

      <div className="mt-4">
        {[...Array(count)].map((_, i) => (
          <TeaProxy key={i} name="Monir" />
        ))}
      </div>
    </div>
  );
}

/*
🎯 Summary
    Tea is the real object.
    TeaProxy is the proxy, controlling how many times it can be accessed.
    The page uses a button to simulate user interactions.
*/