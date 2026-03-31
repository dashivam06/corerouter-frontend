"use client";

export function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

