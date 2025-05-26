import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">

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

        </ol>


      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
