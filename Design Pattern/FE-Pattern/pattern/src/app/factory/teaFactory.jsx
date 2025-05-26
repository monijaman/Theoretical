// src/patterns/teaFactory.jsx

function MilkTea({ name }) {
  return <p>{name}: Milk Tea 🥛</p>;
}

function GreenTea({ name }) {
  return <p>{name}: Green Tea 🍵</p>;
}

function BlackTea({ name }) {
  return <p>{name}: Black Tea 🖤</p>;
}

function TeaFactory(type) {
  switch (type) {
    case 'milk':
      return MilkTea;
    case 'green':
      return GreenTea;
    case 'black':
      return BlackTea;
    default:
      return () => <p>Unknown Tea</p>;
  }
}

export default TeaFactory;
