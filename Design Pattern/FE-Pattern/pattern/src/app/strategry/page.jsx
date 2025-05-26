// src/app/strategy-pattern/page.jsx
'use client';
import { useState, useRef } from 'react';
import TeaMaker from './TeaMaker';
import { sugarStrategy } from './strategies/sugarStrategy';
import { honeyStrategy } from './strategies/honeyStrategy';
import { plainStrategy } from './strategies/plainStrategy';

export default function StrategyPatternPage() {
  const [message, setMessage] = useState('');
  const teaMakerRef = useRef(new TeaMaker(plainStrategy)); // create only once

  const handleServe = (strategy, name) => {
    teaMakerRef.current.setStrategy(strategy);
    setMessage(teaMakerRef.current.serve(name));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Strategy Pattern Example</h1>

      <button
        className="mr-2 px-4 py-1 bg-blue-500 text-white rounded"
        onClick={() => handleServe(sugarStrategy, 'Monir')}
      >
        Sugar
      </button>
      <button
        className="mr-2 px-4 py-1 bg-yellow-500 text-white rounded"
        onClick={() => handleServe(honeyStrategy, 'Monir')}
      >
        Honey
      </button>
      <button
        className="px-4 py-1 bg-gray-500 text-white rounded"
        onClick={() => handleServe(plainStrategy, 'Monir')}
      >
        Plain
      </button>

      <p className="mt-6 text-lg">{message}</p>
    </div>
  );
}


/*
✅ Summary
    Each sweetening method is a strategy.
    You can swap strategies at runtime using setStrategy().
    The client (StrategyPatternPage) doesn't need to know how each sweetener works—it just selects one.
*/
