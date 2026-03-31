"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MoreHorizontal, Plus } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdminStatCard } from "@/components/admin/stat-card";
import { adminFetchModels } from "@/lib/admin-api";
import { formatRelative } from "@/lib/formatters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelTypePie, ModelTypePieLegend } from "@/components/charts/model-type-pie";

function usernamePill(username: string) {
  return (
    <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
      {username}
    </span>
  );
}

export default function AdminModelsPage() {
  const { data: models } = useQuery({
    queryKey: ["admin-models"],
    queryFn: adminFetchModels,
  });

  const list = models ?? [];
  const [q, setQ] = useState("");
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [countrySelectOpen, setCountrySelectOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerCompany, setProviderCompany] = useState("");
  const [providerCountry, setProviderCountry] = useState("");
  const [providerImage, setProviderImage] = useState<File | null>(null);
  const [providerImageName, setProviderImageName] = useState("");
  const [providerImagePreview, setProviderImagePreview] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [isSelectingProviders, setIsSelectingProviders] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [deleteProviderDialog, setDeleteProviderDialog] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (m) =>
        m.fullname.toLowerCase().includes(s) ||
        m.username.toLowerCase().includes(s) ||
        m.provider.toLowerCase().includes(s)
    );
  }, [list, q]);

  const modelTypeBreakdown = useMemo(() => {
    if (list.length === 0) return [];

    const counts = list.reduce<Record<string, number>>((acc, model) => {
      acc[model.type] = (acc[model.type] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type,
        type,
        value: Math.round((count / list.length) * 100),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [list]);

  const handleFileSelect = (file: File) => {
    setProviderImage(file);
    setProviderImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProviderImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-950">Models</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage model publication status and billing configuration.
        </p>
      </div>

      {/* Stat cards section */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total models"
          value={list.length}
          className="border-zinc-950 bg-zinc-950"
          labelClassName="text-zinc-300"
          valueClassName="text-white"
        />
        <AdminStatCard
          label="Active models"
          value={list.filter(m => m.status === "ACTIVE").length}
          className="border-emerald-200 bg-emerald-50"
        />
        <AdminStatCard
          label="Providers"
          value={new Set(list.map(m => m.provider)).size}
        />
        <AdminStatCard
          label="With billing config"
          value={list.filter(m => m.metadata?.billing).length}
        />
      </div>

      {/* Provider + analytics section */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 xl:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-900">Providers</p>
          {isSelectingProviders && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{selectedProviders.size} selected</span>
              <button
                onClick={() => {
                  console.log("Disabling providers:", Array.from(selectedProviders));
                  alert(`Disabled ${Array.from(selectedProviders).join(", ")}`);
                  setSelectedProviders(new Set());
                }}
                disabled={selectedProviders.size === 0}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable selected
              </button>
              <button
                onClick={() => {
                  const first = Array.from(selectedProviders)[0];
                  setProviderToDelete(first);
                  setDeleteProviderDialog(true);
                }}
                disabled={selectedProviders.size === 0}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete selected
              </button>
              <button
                onClick={() => {
                  setIsSelectingProviders(false);
                  setSelectedProviders(new Set());
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          )}
          {!isSelectingProviders && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                <MoreHorizontal className="mr-1 inline size-4" />
                Actions
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setIsSelectingProviders(true)}>
                  Select
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={() => {
                  const allProviders = Array.from(new Set(list.map(m => m.provider)));
                  console.log("Deleting all providers:", allProviders);
                  alert(`Delete all ${allProviders.length} provider(s)?`);
                }}>
                  Delete all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {Array.from(new Set(list.map(m => m.provider))).map((provider) => {
            const isSelected = selectedProviders.has(provider);
            return (
            <div key={provider} className="group relative flex w-24 flex-col items-center gap-2">
              <div className="relative">
                <div 
                  className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-md"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 group-hover:shadow-md"
                  } ${isSelectingProviders ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (isSelectingProviders) {
                      const newSelected = new Set(selectedProviders);
                      if (isSelected) {
                        newSelected.delete(provider);
                      } else {
                        newSelected.add(provider);
                      }
                      setSelectedProviders(newSelected);
                    }
                  }}
                >
                  {provider.slice(0, 2).toUpperCase()}
                </div>
                {isSelectingProviders && (
                  <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-400 bg-white">
                    {isSelected && (
                      <svg className="h-3 w-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              <div className="relative flex w-full flex-col items-center">
                <p className="text-center text-xs text-zinc-600 block">{provider}</p>
                {!isSelectingProviders && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="absolute -right-6 top-0 rounded-md p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem>
                      Edit provider
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => {
                        setProviderToDelete(provider);
                        setDeleteProviderDialog(true);
                      }}
                    >
                      Delete provider
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>
            </div>
            );
          })}
          <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
            <DialogTrigger className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-100">
              <Plus className="size-6" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] font-[Montserrat]">
              <DialogHeader>
                <DialogTitle className="font-[Montserrat] text-xl font-bold">Add Provider</DialogTitle>
                <DialogDescription className="font-[Montserrat]">
                  Add a new model provider to the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-8">
                {/* Left side - Form fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider-name" className="text-sm font-semibold text-zinc-900 font-[Montserrat]">Provider name *</Label>
                    <Input
                      id="provider-name"
                      placeholder="e.g., OpenAI"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      className="rounded-lg border-zinc-200 font-[Montserrat]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider-company" className="text-sm font-semibold text-zinc-900 font-[Montserrat]">Company name</Label>
                    <Input
                      id="provider-company"
                      placeholder="e.g., OpenAI Inc."
                      value={providerCompany}
                      onChange={(e) => setProviderCompany(e.target.value)}
                      className="rounded-lg border-zinc-200 font-[Montserrat]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider-country" className="text-sm font-semibold text-zinc-900 font-[Montserrat]">Country</Label>
                    <Select value={providerCountry} onValueChange={(value) => {
                      setProviderCountry(value);
                      setCountrySelectOpen(false);
                    }} open={countrySelectOpen} onOpenChange={setCountrySelectOpen}>
                      <SelectTrigger className="w-full rounded-lg border-zinc-200 font-[Montserrat]">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent side="bottom" sideOffset={8} className="font-[Montserrat] z-50">
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="China">China</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="UAE">United Arab Emirates</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right side - Image upload - Centered */}
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="space-y-2 text-center">
                      <Label className="text-sm font-semibold text-zinc-900 font-[Montserrat]">Logo image *</Label>
                      <p className="text-xs text-zinc-500 font-[Montserrat]">PNG, JPG, SVG up to 5MB</p>
                    </div>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed transition-all ${
                        dragActive
                          ? "border-zinc-950 bg-zinc-100 shadow-md"
                          : providerImagePreview
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
                      }`}
                    >
                      {providerImagePreview ? (
                        <img
                          src={providerImagePreview}
                          alt="Preview"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <>
                          <input
                            id="provider-image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileSelect(file);
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="provider-image"
                            className="flex cursor-pointer flex-col items-center gap-1 text-center font-[Montserrat]"
                          >
                            <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <div className="text-xs font-medium text-zinc-700">Click to upload</div>
                          </label>
                        </>
                      )}
                    </div>
                    {providerImagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setProviderImage(null);
                          setProviderImageName("");
                          setProviderImagePreview("");
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium font-[Montserrat]"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="font-[Montserrat]">
                <button
                  type="button"
                  onClick={() => {
                    setProviderDialogOpen(false);
                    setProviderName("");
                    setProviderCompany("");
                    setProviderCountry("");
                    setProviderImage(null);
                    setProviderImageName("");
                    setProviderImagePreview("");
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 font-[Montserrat]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (providerName.trim() && providerImage) {
                      // Handle adding provider (mock for now)
                      console.log("Adding provider:", { 
                        name: providerName, 
                        company: providerCompany,
                        country: providerCountry,
                        image: providerImage 
                      });
                      setProviderDialogOpen(false);
                      setProviderName("");
                      setProviderCompany("");
                      setProviderCountry("");
                      setProviderImage(null);
                      setProviderImageName("");
                      setProviderImagePreview("");
                    }
                  }}
                  className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-50 font-[Montserrat]"
                  disabled={!providerName.trim() || !providerImage}
                >
                  Add provider
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 xl:col-span-1">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-900">Model Type Mix</p>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
            {list.length} total
          </span>
        </div>
        {modelTypeBreakdown.length > 0 ? (
          <>
            <ModelTypePie data={modelTypeBreakdown} />
            <ModelTypePieLegend data={modelTypeBreakdown} />
          </>
        ) : (
          <div className="flex h-[170px] items-center justify-center text-sm text-zinc-400">
            No model data yet.
          </div>
        )}
      </div>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px]">
            <p className="text-sm font-medium text-zinc-900">
              Search and review available models.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Update, deprecate, and audit changes from the model detail page.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fullname or username..."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:w-80 lg:w-72"
            />
            <Link
              href="/admin/models/create"
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
            >
              + Add model
            </Link>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white py-20">
          <p className="text-base font-semibold text-zinc-900">No models found</p>
          <p className="mt-1 text-sm text-zinc-500">Try a different search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="min-w-[980px] w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.model_id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
                        {m.provider.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-zinc-600">{m.provider}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-[14px] font-medium text-zinc-900">
                      {m.fullname}
                    </div>
                    <div className="mt-1">{usernamePill(m.username)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={m.type} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-600">
                    Missing
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-500">
                    None
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-400">
                    {formatRelative(new Date(m.updated_at))}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="rounded-md p-2 text-zinc-400 outline-none hover:bg-zinc-50 hover:text-zinc-700"
                        aria-label="Model actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem
                          onClick={() => {
                            window.location.href = `/admin/models/${m.model_id}`;
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          Deprecate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Provider Confirmation Dialog */}
      <Dialog open={deleteProviderDialog} onOpenChange={setDeleteProviderDialog}>
        <DialogContent className="sm:max-w-[500px] font-[Montserrat]">
          <DialogHeader>
            <DialogTitle className="font-[Montserrat] text-xl font-bold">Delete Provider?</DialogTitle>
            <DialogDescription className="font-[Montserrat]">
              This action will delete the provider and all respective models will be turned off and shut down.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Warning</p>
              <p className="mt-2 text-xs text-red-700">
                All models from <strong>{providerToDelete}</strong> will be disabled and shut down. This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-700">Affected models:</p>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 max-h-32 overflow-y-auto">
                <ul className="space-y-1 text-xs text-zinc-600">
                  {list
                    .filter(m => m.provider === providerToDelete)
                    .map(m => (
                      <li key={m.model_id}>• {m.fullname}</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter className="font-[Montserrat]">
            <button
              type="button"
              onClick={() => setDeleteProviderDialog(false)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 font-[Montserrat]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                console.log("Deleting provider:", providerToDelete);
                setDeleteProviderDialog(false);
                setProviderToDelete(null);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 font-[Montserrat]"
            >
              Delete provider
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

