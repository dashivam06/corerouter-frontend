"use client";

import { useEffect, useState } from "react";

export function JsonTreeEditor({
  value,
  onChange,
  scaffold,
  requiredKeys,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  scaffold?: unknown;
  requiredKeys?: string[];
}) {
  const [text, setText] = useState(
    JSON.stringify(value ?? scaffold ?? {}, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value ?? scaffold ?? {}, null, 2));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  function apply() {
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError("Invalid JSON");
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        className="min-h-[220px] w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 font-mono text-xs text-zinc-700 outline-none focus:border-zinc-400"
        spellCheck={false}
      />
      {requiredKeys?.length ? (
        <p className="text-xs text-zinc-500">
          Required keys: {requiredKeys.join(", ")}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
            onClick={apply}
          >
            Save JSON
          </button>
        </div>
      )}
    </div>
  );
}

