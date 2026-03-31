import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold lowercase text-zinc-950">
          fleebug
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/models"
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Models
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:text-zinc-950"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
