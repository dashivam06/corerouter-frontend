export function UserHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </header>
  );
}
