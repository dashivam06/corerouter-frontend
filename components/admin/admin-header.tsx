import { format } from "date-fns";

export function AdminHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        {subtitle ? (
          <p className="text-sm text-zinc-400">{subtitle}</p>
        ) : (
          <p className="text-sm text-zinc-400">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        )}
      </div>
    </header>
  );
}

