import Tea from './Tea';

let teaCount = 0;
const TEA_LIMIT = 2;

export default function TeaProxy({ name }) {
  teaCount++;

  if (teaCount > TEA_LIMIT) {
    return <p>{name} has had enough tea for today. 🚫</p>;
  }

  return <Tea name={name} />;
}