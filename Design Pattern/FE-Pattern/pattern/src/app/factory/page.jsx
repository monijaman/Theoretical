'use client';
import TeaFactory from './teaFactory';

export default function FactoryPatternPage() {
  const MilkTea = TeaFactory('milk');
  const GreenTea = TeaFactory('green');
  const BlackTea = TeaFactory('black');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Factory Pattern Example</h1>

      <MilkTea name="Tea Type" />
      <GreenTea name="Tea Type" />
      <BlackTea name="Tea Type" />
    </div>
  );
}
