"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarDays, Pencil, RefreshCw } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import {
  adminFetchTechnicalAverageResponseTime,
  adminFetchTechnicalErrorRate,
  adminFetchTechnicalErrors,
  adminFetchTechnicalFailedRequests,
  adminFetchTechnicalFailedRequestsOverTime,
  adminFetchTechnicalHealth,
  adminFetchTechnicalOverview,
  adminFetchTechnicalP95ResponseTime,
  adminFetchTechnicalRequestsOverTime,
  adminFetchTechnicalTopEndpoints,
  adminFetchTechnicalTotalRequests,
  adminFetchTechnicalWarnings,
  type AdminKqlResponse,
  type AdminTechnicalHealth,
  type AdminTechnicalRange,
} from "@/lib/admin-api";
import {
  type ComponentResult,
  type TechnicalErrorItem,
  type TechnicalWarningItem,
  type WorkerResult,
} from "@/lib/api";
import { chartTheme } from "@/lib/charts";

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseKqlResponse<T extends Record<string, unknown>>(data: AdminKqlResponse | undefined): T[] {
  if (!data?.tables?.[0]) return [];
  const table = data.tables[0];
  const colNames = table.columns.map((c) => c.name);
  return table.rows.map((row) => {
    const out: Record<string, unknown> = {};
    colNames.forEach((name, idx) => {
      out[name] = row[idx];
    });
    return out as T;
  });
}

function parseLocalDateTime(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function toTimeValue(value: string): string {
  const date = parseLocalDateTime(value);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function applyTimeToDate(date: Date, timeValue: string): Date {
  const [h, m, s] = timeValue.split(":").map((v) => Number(v));
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, Number.isFinite(s) ? s : 0, 0);
  return next;
}

function formatDisplayTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" });
  return `${datePart} ${timePart} UTC`;
}

function formatRangeSummary(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function safeNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}

function getRangeKey(fromIso: string, toIso: string): AdminTechnicalRange {
  const from = parseLocalDateTime(fromIso);
  const to = parseLocalDateTime(toIso);
  const diffHours = Math.max(1, (to.getTime() - from.getTime()) / (1000 * 60 * 60));

  if (diffHours <= 24) return "1d";
  if (diffHours <= 72) return "3d";
  if (diffHours <= 24 * 7) return "7d";
  if (diffHours <= 24 * 31) return "1m";
  if (diffHours <= 24 * 90) return "3m";
  return "6m";
}

function getComponent(
  health: AdminTechnicalHealth | undefined,
  key: "redis" | "vllm" | "database",
): ComponentResult | undefined {
  if (!health) return undefined;
  return health[key];
}

export default function AdminInsightsPage() {
  const now = useMemo(() => new Date(), []);
  const initialFrom = useMemo(() => toLocalDateTimeInputValue(new Date(now.getTime() - 24 * 60 * 60 * 1000)), [now]);
  const initialTo = useMemo(() => toLocalDateTimeInputValue(now), [now]);
  const [from, setFrom] = useState(() => initialFrom);
  const [to, setTo] = useState(() => initialTo);
  const [startTime, setStartTime] = useState(() => toTimeValue(initialFrom));
  const [endTime, setEndTime] = useState(() => toTimeValue(initialTo));
  const [logType, setLogType] = useState<"warnings" | "errors">("warnings");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => ({
    from: parseLocalDateTime(initialFrom),
    to: parseLocalDateTime(initialTo),
  }));
  const calendarStartMonth = useMemo(() => new Date(now.getFullYear() - 10, 0), [now]);
  const calendarEndMonth = useMemo(() => new Date(now.getFullYear() + 10, 11), [now]);
  const selectedMetricRange = useMemo(() => getRangeKey(from, to), [from, to]);

  const healthQuery = useQuery({
    queryKey: ["admin-technical-health"],
    queryFn: adminFetchTechnicalHealth,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin-technical-overview", from, to],
    queryFn: () => adminFetchTechnicalOverview({ from, to }),
  });

  const totalRequestsQuery = useQuery({
    queryKey: ["admin-technical-total-requests", from, to],
    queryFn: () => adminFetchTechnicalTotalRequests({ from, to, range: selectedMetricRange }),
  });
  const failedRequestsQuery = useQuery({
    queryKey: ["admin-technical-failed-requests", from, to],
    queryFn: () => adminFetchTechnicalFailedRequests({ from, to, range: selectedMetricRange }),
  });
  const errorRateQuery = useQuery({
    queryKey: ["admin-technical-error-rate", from, to],
    queryFn: () => adminFetchTechnicalErrorRate({ from, to, range: selectedMetricRange }),
  });
  const avgResponseQuery = useQuery({
    queryKey: ["admin-technical-avg-response", from, to],
    queryFn: () => adminFetchTechnicalAverageResponseTime({ from, to, range: selectedMetricRange }),
  });
  const p95ResponseQuery = useQuery({
    queryKey: ["admin-technical-p95-response", from, to],
    queryFn: () => adminFetchTechnicalP95ResponseTime({ from, to, range: selectedMetricRange }),
  });
  const requestsOverTimeQuery = useQuery({
    queryKey: ["admin-technical-requests-over-time", from, to],
    queryFn: () => adminFetchTechnicalRequestsOverTime({ from, to, range: selectedMetricRange }),
  });
  const failedOverTimeQuery = useQuery({
    queryKey: ["admin-technical-failed-over-time", from, to],
    queryFn: () => adminFetchTechnicalFailedRequestsOverTime({ from, to, range: selectedMetricRange }),
  });
  const topEndpointsRangeQuery = useQuery({
    queryKey: ["admin-technical-top-endpoints", from, to],
    queryFn: () => adminFetchTechnicalTopEndpoints({ from, to, range: selectedMetricRange }),
  });

  const errorsQuery = useInfiniteQuery({
    queryKey: ["admin-technical-errors", from, to],
    queryFn: ({ pageParam }) =>
      adminFetchTechnicalErrors({
        from,
        to,
        pageSize: 6,
        cursorTimestamp: (pageParam as { t?: string; i?: string } | undefined)?.t,
        cursorItemId: (pageParam as { t?: string; i?: string } | undefined)?.i,
      }),
    initialPageParam: undefined as { t?: string; i?: string } | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursorTimestamp
        ? { t: lastPage.nextCursorTimestamp, i: lastPage.nextCursorItemId ?? undefined }
        : undefined,
  });

  const warningsQuery = useInfiniteQuery({
    queryKey: ["admin-technical-warnings", from, to],
    queryFn: ({ pageParam }) =>
      adminFetchTechnicalWarnings({
        from,
        to,
        pageSize: 6,
        cursorTimestamp: (pageParam as { t?: string; i?: string } | undefined)?.t,
        cursorItemId: (pageParam as { t?: string; i?: string } | undefined)?.i,
      }),
    initialPageParam: undefined as { t?: string; i?: string } | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursorTimestamp
        ? { t: lastPage.nextCursorTimestamp, i: lastPage.nextCursorItemId ?? undefined }
        : undefined,
  });

  const requestStatsRows = parseKqlResponse<Record<string, unknown>>(overviewQuery.data?.requestStats);
  const requestStats = requestStatsRows[0] ?? {};

  const trafficRows = parseKqlResponse<Record<string, unknown>>(overviewQuery.data?.trafficByHour).map((r) => ({
    timestamp: String(r.timestamp ?? ""),
    Calls: safeNumber(r.Calls),
    Failed: safeNumber(r.Failed),
  }));
  const topEndpointsRows = parseKqlResponse<Record<string, unknown>>(overviewQuery.data?.topEndpoints).map((r) => ({
    name: String(r.name ?? ""),
    Calls: safeNumber(r.Calls),
    Failed: safeNumber(r.Failed),
    AvgDuration: safeNumber(r.AvgDuration),
  })).slice(0, 7);

  const totalRequests = safeNumber(parseKqlResponse<Record<string, unknown>>(totalRequestsQuery.data)[0]?.totalRequests);
  const failedRequests = safeNumber(parseKqlResponse<Record<string, unknown>>(failedRequestsQuery.data)[0]?.failedRequests);
  const errorRate = safeNumber(parseKqlResponse<Record<string, unknown>>(errorRateQuery.data)[0]?.errorRate);
  const avgResponseMs = safeNumber(parseKqlResponse<Record<string, unknown>>(avgResponseQuery.data)[0]?.avgDurationMs);
  const p95ResponseMs = safeNumber(parseKqlResponse<Record<string, unknown>>(p95ResponseQuery.data)[0]?.p95DurationMs);

  const requestsOverTime = parseKqlResponse<Record<string, unknown>>(requestsOverTimeQuery.data);
  const failedOverTime = parseKqlResponse<Record<string, unknown>>(failedOverTimeQuery.data);
  const combinedOverTime = requestsOverTime.map((row, idx) => ({
    timestamp: String(row.timestamp ?? idx),
    requests: safeNumber(row.requests),
    failures: safeNumber(failedOverTime[idx]?.failures),
  }));

  const topEndpointsRangeRows = parseKqlResponse<Record<string, unknown>>(topEndpointsRangeQuery.data)
    .map((r) => ({ name: String(r.name ?? ""), requestCount: safeNumber(r.requestCount) }))
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, 10);

  const health = healthQuery.data;
  const selectedFromDate = parseLocalDateTime(from);
  const selectedToDate = parseLocalDateTime(to);
  const selectedDateRangeLabel = `${format(selectedFromDate, "dd MMM")} - ${format(selectedToDate, "dd MMM")}`;
  const selectedDateRangeLongLabel = `${format(selectedFromDate, "dd MMM yyyy")} to ${format(selectedToDate, "dd MMM yyyy")}`;
  const pickedStartLabel = selectedRange?.from ? format(selectedRange.from, "dd MMM yyyy") : "Not selected";
  const pickedEndLabel = selectedRange?.to ? format(selectedRange.to, "dd MMM yyyy") : "Pick end date";
  const errorItems = errorsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const warningItems = warningsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const selectedLogItems = logType === "warnings" ? warningItems : errorItems;

  return (
    <div>
      <AdminHeader
        title="Insights"
        subtitle="Technical health, Azure Application Insights observability, and operational diagnostics."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-zinc-950 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-300">Total Requests</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totalRequests.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Failed Requests</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{failedRequests.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Error Rate</p>
          <p className={`mt-1 text-2xl font-semibold ${errorRate > 5 ? "text-red-600" : errorRate >= 1 ? "text-amber-600" : "text-green-600"}`}>
            {errorRate.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Avg Response</p>
          <p className={`mt-1 text-2xl font-semibold ${avgResponseMs > 500 ? "text-red-600" : avgResponseMs >= 200 ? "text-amber-600" : "text-green-600"}`}>
            {avgResponseMs.toFixed(1)} ms
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">P95 Response</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">
            {(p95ResponseMs > 0 ? p95ResponseMs : safeNumber(requestStats.P95Duration)).toFixed(1)} ms
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              { key: "redis", label: "Redis", item: getComponent(health, "redis") },
              { key: "vllm", label: "VLLM", item: getComponent(health, "vllm") },
              { key: "database", label: "Database", item: getComponent(health, "database") },
              { key: "worker", label: "Workers", item: health?.worker },
            ].map((card) => {
              const status = (card.item as ComponentResult | WorkerResult | undefined)?.status ?? "DOWN";
              const up = status === "UP";
              const workerItem = card.key === "worker" ? (card.item as WorkerResult | undefined) : undefined;
              const componentItem = card.key !== "worker" ? (card.item as ComponentResult | undefined) : undefined;
              return (
                <div key={card.key} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">{card.label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {status}
                    </span>
                  </div>
                  {card.key === "worker" ? (
                    <div className="space-y-1 text-xs text-zinc-500">
                      {up ? (
                        <>
                          <p>{safeNumber(workerItem?.totalRunning)} active workers</p>
                          {workerItem?.notice ? (
                            <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">{workerItem.notice}</p>
                          ) : null}
                        </>
                      ) : (
                        <p>{workerItem?.reason ?? "No active workers."}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      {up ? <p>Latency: {componentItem?.latency ?? "-"}</p> : <p>{componentItem?.reason ?? "Unavailable"}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative mx-auto w-full max-w-[360px] xl:mx-0">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (showDatePicker) {
                    setShowDatePicker(false);
                    return;
                  }

                  const currentFrom = parseLocalDateTime(from);
                  const currentTo = parseLocalDateTime(to);
                  setSelectedRange({ from: currentFrom, to: currentTo });
                  setStartTime(toTimeValue(from));
                  setEndTime(toTimeValue(to));
                  setShowDatePicker(true);
                }}
                className="inline-flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-zinc-500" />
                  Date & Time
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                  {selectedDateRangeLabel}
                  <Pencil className="size-3.5" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  healthQuery.refetch();
                  overviewQuery.refetch();
                  warningsQuery.refetch();
                  errorsQuery.refetch();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-50"
              >
                <RefreshCw className={`size-3.5 ${healthQuery.isFetching || overviewQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                <p className="font-medium text-zinc-700">Selected range</p>
                <p className="mt-1 inline-flex items-center gap-2 leading-5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  {selectedDateRangeLongLabel}
                </p>
                <p className="mt-1">{formatRangeSummary(from)} to {formatRangeSummary(to)}</p>
              </div>
            </div>

            {showDatePicker ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/25 px-4 backdrop-blur-sm"
                onClick={() => setShowDatePicker(false)}
              >
                <div
                  className="w-[min(96vw,940px)] rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Date Range</p>
                        <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          {selectedDateRangeLongLabel}
                        </p>
                      </div>
                      <p className="mb-3 text-xs text-zinc-500">
                        {selectedRange?.from && !selectedRange?.to
                          ? "Start date selected. Click an end date to complete the range."
                          : "Pick a start date, then pick an end date. Use the month/year dropdown to jump across months."}
                      </p>
                      <DayPicker
                        mode="range"
                        selected={selectedRange}
                        onSelect={(range) => {
                          setSelectedRange(range);
                        }}
                        defaultMonth={selectedRange?.from ?? selectedFromDate}
                        startMonth={calendarStartMonth}
                        endMonth={calendarEndMonth}
                        captionLayout="dropdown"
                        hideNavigation
                        pagedNavigation
                        numberOfMonths={2}
                        className="p-3"
                        classNames={{
                          months: "flex flex-col gap-4 sm:flex-row",
                          month: "space-y-3",
                          month_caption: "flex items-center justify-center pb-1",
                          caption_label: "inline-flex items-center gap-1 text-xs font-medium text-zinc-700",
                          dropdowns: "inline-flex items-center gap-2",
                          dropdown_root: "relative inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700",
                          dropdown: "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
                          nav: "hidden",
                          button_previous: "hidden",
                          button_next: "hidden",
                          chevron: "h-4 w-4",
                          month_grid: "w-full border-collapse",
                          weekdays: "flex",
                          weekday: "w-10 text-center text-xs font-medium text-zinc-500",
                          week: "mt-1 flex w-full",
                          day: "h-10 w-10 text-center text-sm p-0",
                          day_button:
                            "inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-center leading-none font-medium text-zinc-700 hover:bg-zinc-100",
                          selected: "bg-emerald-600 text-white hover:bg-emerald-600 rounded-full",
                          range_start: "bg-emerald-600 text-white rounded-full",
                          range_end: "bg-emerald-600 text-white rounded-full",
                          range_middle: "bg-emerald-100 text-emerald-900 rounded-none",
                          today: "ring-1 ring-zinc-300",
                          outside: "text-zinc-400 opacity-60",
                          disabled: "text-zinc-300 opacity-50",
                          hidden: "invisible",
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 xl:w-[280px]">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                        <p className="font-semibold text-emerald-700">Start</p>
                        <p className="mt-1 text-emerald-800">{pickedStartLabel}</p>
                      </div>
                      <div className={`rounded-lg border px-3 py-2 text-xs ${selectedRange?.to ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-600"}`}>
                        <p className={`font-semibold ${selectedRange?.to ? "text-emerald-700" : "text-zinc-500"}`}>End</p>
                        <p className="mt-1">{pickedEndLabel}</p>
                      </div>
                      <label className="space-y-2 text-xs font-medium text-zinc-600">
                        <span className="block uppercase tracking-wide text-zinc-500">Start Time</span>
                        <input
                          type="time"
                          step={1}
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value);
                          }}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800"
                          aria-label="Start time"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-medium text-zinc-600">
                        <span className="block uppercase tracking-wide text-zinc-500">End Time</span>
                        <input
                          type="time"
                          step={1}
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value);
                          }}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800"
                          aria-label="End time"
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          disabled={!selectedRange?.from || !selectedRange?.to}
                          onClick={() => {
                            if (!selectedRange?.from || !selectedRange?.to) return;

                            setFrom(toLocalDateTimeInputValue(applyTimeToDate(selectedRange.from, startTime)));
                            setTo(toLocalDateTimeInputValue(applyTimeToDate(selectedRange.to, endTime)));
                            setShowDatePicker(false);
                          }}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                        >
                          Apply Date & Time
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-950">Requests Over Time</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedOverTime} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...chartTheme.grid} vertical={false} />
                <XAxis dataKey="timestamp" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failures" stroke="#dc2626" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="self-start rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-950">Top Endpoints</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEndpointsRangeRows} layout="vertical" margin={{ top: 4, right: 20, left: 30, bottom: 0 }}>
                <CartesianGrid {...chartTheme.grid} horizontal={false} />
                <XAxis type="number" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={160} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Bar dataKey="requestCount" fill="#09090b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-zinc-950">Traffic By Hour</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trafficRows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartTheme.grid} vertical={false} />
              <XAxis dataKey="timestamp" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
              <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              <Bar dataKey="Calls" fill="#2563eb" />
              <Bar dataKey="Failed" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-zinc-950">Technical Overview</p>
        <div className="grid grid-cols-1 gap-5">
          <div className="w-full">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Top Endpoints (Overview)</p>
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-[760px] w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Endpoint</th>
                    <th className="px-3 py-2 text-right">Calls</th>
                    <th className="px-3 py-2 text-right">Failed</th>
                    <th className="px-3 py-2 text-right">AvgDuration</th>
                  </tr>
                </thead>
                <tbody>
                  {topEndpointsRows.map((r, idx) => (
                    <tr key={`${r.name}-${idx}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-700">{r.name || "-"}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.Calls.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.Failed.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.AvgDuration.toFixed(1)} ms</td>
                    </tr>
                  ))}
                  {topEndpointsRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-zinc-400">No endpoint data.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-950">Logs</p>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setLogType("warnings")}
              className={`rounded-full px-3 py-1.5 ${logType === "warnings" ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-500 hover:bg-zinc-100"}`}
            >
              Warnings
            </button>
            <button
              type="button"
              onClick={() => setLogType("errors")}
              className={`rounded-full px-3 py-1.5 ${logType === "errors" ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-500 hover:bg-zinc-100"}`}
            >
              Errors
            </button>
          </div>
        </div>

        <div className="mb-3 text-xs text-zinc-500">
          Showing {selectedLogItems.length} {logType} logs (6 per page)
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2">Instance</th>
              </tr>
            </thead>
            <tbody>
              {selectedLogItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-zinc-400" colSpan={6}>
                    {logType === "warnings"
                      ? warningsQuery.isLoading
                        ? "Loading warnings..."
                        : "No warnings in selected range."
                      : errorsQuery.isLoading
                        ? "Loading errors..."
                        : "No errors in selected range."}
                  </td>
                </tr>
              ) : (
                (selectedLogItems as Array<TechnicalWarningItem | TechnicalErrorItem>).map((item) => (
                  <tr key={item.itemId} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-600">{formatDisplayTime(item.timestamp)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${logType === "errors" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {logType === "errors" ? "ERROR" : "WARN"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{item.service}</td>
                    <td className="px-3 py-2">{item.message}</td>
                    <td className="px-3 py-2 max-w-[360px] break-words">{logType === "errors" ? (item as TechnicalErrorItem).detail : "-"}</td>
                    <td className="px-3 py-2">{item.instanceId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              if (logType === "warnings") {
                warningsQuery.fetchNextPage();
              } else {
                errorsQuery.fetchNextPage();
              }
            }}
            disabled={
              logType === "warnings"
                ? !warningsQuery.hasNextPage || warningsQuery.isFetchingNextPage
                : !errorsQuery.hasNextPage || errorsQuery.isFetchingNextPage
            }
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(logType === "warnings" ? warningsQuery.isFetchingNextPage : errorsQuery.isFetchingNextPage)
              ? "Loading..."
              : "Load More"}
          </button>
        </div>
      </div>

      <div className="mt-5 text-xs text-zinc-400">
        Last checked: {formatDisplayTime(new Date().toISOString())}
      </div>
    </div>
  );
}
