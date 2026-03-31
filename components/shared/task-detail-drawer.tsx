"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { fetchTasks, fetchUsageForTask } from "@/lib/api";
import { mockModels } from "@/lib/mock-data";
import { formatCost, formatDuration, formatRelative } from "@/lib/formatters";
import { maskApiKey } from "@/components/shared/masked-key";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function PayloadCollapsible({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const long = text.length > 500;
  const display =
    long && !showFull ? text.slice(0, 500) + "…" : text;

  return (
    <div className="mt-4 rounded-xl border border-zinc-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? (
          <ChevronDown className="size-4 text-zinc-400" />
        ) : (
          <ChevronRight className="size-4 text-zinc-400" />
        )}
      </button>
      {open ? (
        <div className="border-t border-zinc-100 px-4 pb-4">
          <pre className="max-h-[200px] overflow-y-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-200">
            {display}
          </pre>
          {long ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-zinc-600"
              onClick={() => setShowFull(!showFull)}
            >
              {showFull ? "Show less" : "Show full"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TaskDetailDrawer({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });
  const task = tasks?.find((t) => t.task_id === taskId) ?? null;

  const { data: usage } = useQuery({
    queryKey: ["task-usage", taskId],
    queryFn: () => fetchUsageForTask(taskId!),
    enabled: !!taskId && open,
  });

  const model = task
    ? mockModels.find((m) => m.model_id === task.model_id)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] max-w-[100vw] border-l border-zinc-200 shadow-none sm:max-w-[500px]"
        showCloseButton
      >
        {task ? (
          <>
            <SheetHeader className="p-6 pb-0">
              <SheetTitle className="font-mono text-sm font-normal text-zinc-500">
                {task.task_id}
              </SheetTitle>
              <div className="pt-2">
                <StatusBadge status={task.status} />
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-6 pb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-400">Model</p>
                  <p className="text-zinc-900">{model?.fullname ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">API Key</p>
                  <p className="font-mono text-xs text-zinc-600">
                    {maskApiKey("cr_demo_dummy1234")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Created</p>
                  <p className="text-zinc-900">
                    {formatRelative(new Date(task.created_at))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Completed</p>
                  <p className="text-zinc-900">
                    {task.completed_at
                      ? formatRelative(new Date(task.completed_at))
                      : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-zinc-400">Processing time</p>
                  <p className="text-zinc-900">
                    {formatDuration(task.processing_time_ms)}
                  </p>
                </div>
              </div>

              {task.status === "FAILED" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="mb-1 text-[11px] font-medium uppercase text-red-600">
                    Error
                  </p>
                  <pre className="font-mono text-xs whitespace-pre-wrap text-red-800">
                    {task.result_payload}
                  </pre>
                </div>
              ) : null}

              <PayloadCollapsible
                title="Request payload"
                text={task.request_payload || "—"}
              />
              <PayloadCollapsible
                title="Result payload"
                text={task.result_payload || "—"}
              />

              <div className="mt-4">
                <p className="mb-2 text-[13px] font-medium text-zinc-700">
                  Cost breakdown
                </p>
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(usage ?? []).map((u) => (
                        <tr
                          key={u.usage_id}
                          className="border-t border-zinc-100"
                        >
                          <td className="px-3 py-2 text-zinc-700">
                            {u.usage_unit_type.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {u.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {formatCost(u.rate_per_unit)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {formatCost(u.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between border-t border-zinc-100 px-3 py-2 font-medium">
                    <span>Total</span>
                    <span className="font-mono">
                      {formatCost(task.total_cost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-zinc-500">Select a task.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
