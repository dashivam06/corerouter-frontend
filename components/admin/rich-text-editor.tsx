"use client";

import { useEffect, useState } from "react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ?? "");

  useEffect(() => {
    setText(value ?? "");
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {["B", "I", "H1", "H2", "Code", "Link", "• List"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            onClick={() => {
              // Placeholder toolbar (no formatting logic yet)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text)}
        placeholder={placeholder ?? "Write documentation..."}
        className="min-h-[280px] w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 font-sans text-sm outline-none focus:border-zinc-400"
      />
    </div>
  );
}

