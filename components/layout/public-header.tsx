import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/corerouter-logo.png" 
            alt="CoreRouter" 
            className="h-8 w-8 object-contain"
          />
          <span className="font-montserrat text-[15px] font-bold tracking-[0.08em] text-zinc-950">
            COREROUTER
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/models"
            className="font-montserrat text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
          >
            Models
          </Link>
          <Link
            href="/login"
            className="font-montserrat text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="font-montserrat rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-zinc-950/20"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
