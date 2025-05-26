'use client';

import { useState } from 'react';
import TeaManager from './TeaManagerSingleton';

export default function SingletonPatternPage() {
  const [messages, setMessages] = useState([]);

  const handleServe = () => {
    const manager = new TeaManager();
    const message = manager.serveTea('Monir');
    setMessages([...messages, message]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Singleton Pattern Example</h1>
      <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleServe}>
        Serve Tea
      </button>

      <ul className="mt-4 list-disc list-inside">
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}
