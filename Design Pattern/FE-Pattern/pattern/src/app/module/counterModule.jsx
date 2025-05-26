// This module manages a counter state and exposes increment/decrement methods

import { useState } from 'react';

const counterModule = (() => {
  let internalCount = 0; // private variable

  // React hook to expose the state and update functions
  function useCounter() {
    const [count, setCount] = useState(internalCount);

    const increment = () => {
      internalCount += 1;
      setCount(internalCount);
    };

    const decrement = () => {
      internalCount -= 1;
      setCount(internalCount);
    };

    return { count, increment, decrement };
  }

  return {
    useCounter, // public API
  };
})();

export default counterModule;
