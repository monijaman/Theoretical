
export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
<h2>Design Pattern Example</h2>
        <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/decorator"
              target="_blank"
              rel="noopener noreferrer"
            >Decorator Pattern
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/factory"
              target="_blank"
              rel="noopener noreferrer"
            >Factory Pattern
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/module"
              target="_blank"
              rel="noopener noreferrer"
            >Module Pattern
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/observer"
              target="_blank"
              rel="noopener noreferrer"
            >Observer
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/proxy"
              target="_blank"
              rel="noopener noreferrer"
            >Proxy
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/singleton"
              target="_blank"
              rel="noopener noreferrer"
            >singleton
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/strategry"
              target="_blank"
              rel="noopener noreferrer"
            >Strategry
            </a>
          </li>
          <li className="mb-2 tracking-[-.01em]">
            <a
              className="rounded-full border border-solid border-transparent"
              href="/composite"
              target="_blank"
              rel="noopener noreferrer"
            >Composite
            </a>
          </li>

        </ol>


      </main>
      
    </div>
  );
}
