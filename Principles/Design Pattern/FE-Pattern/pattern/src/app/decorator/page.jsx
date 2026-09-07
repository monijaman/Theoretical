
'use client';

import Tea from './Tea';
import withMilk from './withMilk';
import withSugar from './withSugar';

const TeaWithMilk = withMilk(Tea);
const TeaWithMilkAndSugar = withSugar(TeaWithMilk);

export default function DecoratorPatternPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Decorator Pattern Example</h1>

      <p className="mt-4 mb-2">Tea with Milk:</p>
      <TeaWithMilk name="Milk" />

      <p className="mt-4 mb-2">Tea with Milk and Sugar:</p>
      <TeaWithMilkAndSugar name="Sugar" />
    </div>
  );
}


/*

✅ Pros of Decorator Pattern
  Reuse behavior across components
  Keeps base components clean
  Great for logging, permissions, theming, tooltips, analytics, etc.


🚫 Cons
  Too many decorators can lead to wrapper hell
  Debugging stack may get deeper
  Can be overused — prefer hooks or composition when more natural


*/