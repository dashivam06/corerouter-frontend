# CoreRouter — Admin Panel
> Product of **Fleebug.com** · Next.js 14 App Router · Tailwind CSS · shadcn/ui

---

## What You Are Building

The internal admin panel for CoreRouter — an AI model routing and billing platform by Fleebug.com. Admins manage models, users, API keys, billing configs, workers, service tokens, tasks, and analytics.

This is an **operator tool**. It should feel precise, information-dense, and functional — not a marketing page. Think Linear's admin interface, Vercel's team dashboard, Stripe's dashboard. Every pixel earns its place.

---

## Non-Negotiable Design Rules

```
✓ Primary palette: black (#09090b zinc-950), white (#ffffff), zinc grays
✓ Rounded corners: rounded-xl for cards/panels, rounded-lg for inputs/buttons, rounded-full for badges/pills
✓ Borders only — no box-shadows on cards or panels (1px zinc-200)
✓ Table rows: 1px zinc-100 dividers, hover:bg-zinc-50
✓ Dense but readable: p-4 on cards (admin needs more data per screen than user product)
✓ Flat design — no elevations, no shadows, no depth tricks

✗ ZERO gradient backgrounds — forbidden everywhere, no exceptions
✗ No decorative elements of any kind
✗ No glassmorphism, blur, glow, neon
✗ No AI-slop aesthetics (no purple gradient headers, no colored sidebars)
✗ No rounded-none (square corners) — minimum rounded-lg on interactive elements
✗ No dark mode
```

---

## Tech Stack

```
Framework:     Next.js 14+ App Router
Styling:       Tailwind CSS (NO gradient utilities — ever)
Components:    shadcn/ui — Dialog, Sheet, Table, Badge, Tabs, Select, Switch, Tooltip, Progress, AlertDialog
Charts:        Recharts — BarChart, LineChart, AreaChart (flat fills only, NO linearGradient)
Icons:         Lucide React
Forms:         React Hook Form + Zod
State:         Zustand (global), TanStack Query (server state)
Auth:          JWT — access token in memory, refresh token in httpOnly cookie
Font:          Geist Sans
Dates:         date-fns
```

---

## Full Database Schema

```sql
users
  user_id          integer PK
  balance          numeric(12,2)    -- NPR balance
  created_at       timestamp
  email            varchar(100) UNIQUE
  email_subscribed boolean
  full_name        varchar(100)
  last_login       timestamp        -- null if never logged in
  password         varchar(255)
  profile_image    varchar(255)     -- URL or null
  role             USER | ADMIN
  status           ACTIVE | INACTIVE | BANNED | SUSPENDED

api_keys
  api_key_id       integer PK
  created_at       timestamp
  daily_limit      integer
  description      varchar(255)
  key              varchar(255) UNIQUE   -- NEVER show in full
  last_used_at     timestamp            -- null if never used
  monthly_limit    integer
  status           ACTIVE | INACTIVE | REVOKED
  user_id          → users

models
  model_id         integer PK
  created_at       timestamp
  description      varchar(255)
  endpoint_url     varchar(255)
  fullname         varchar(255) UNIQUE
  metadata         jsonb
  provider         varchar(255)
  status           NOTHING | ACTIVE | INACTIVE | DEPRECATED | ARCHIVED
  type             LLM | OCR | OTHER
  updated_at       timestamp
  username         varchar(255) UNIQUE

api_documentation
  doc_id           integer PK
  content          text
  created_at       timestamp
  title            varchar(255)
  updated_at       timestamp
  model_id         → models

billing_configs
  billing_id       integer PK
  created_at       timestamp
  pricing_metadata jsonb        -- rates, tiers, currency structure
  pricing_type     varchar(30)  -- PER_TOKEN | PER_PAGE | PER_REQUEST | PER_IMAGE | CUSTOM
  updated_at       timestamp
  model_id         → models UNIQUE

tasks
  task_id          varchar(255) PK
  completed_at     timestamp
  created_at       timestamp
  processing_time_ms bigint
  request_payload  text
  result_payload   text
  status           QUEUED | PROCESSING | COMPLETED | FAILED
  total_cost       numeric(12,6)
  updated_at       timestamp
  usage_metadata   jsonb
  api_key_id       → api_keys
  model_id         → models

usage_records
  usage_id         bigint PK
  cost             numeric(18,10)
  quantity         numeric(18,4)
  rate_per_unit    numeric(18,10)
  recorded_at      timestamp
  usage_unit_type  INPUT_TOKENS | OUTPUT_TOKENS | PAGES | IMAGES |
                   AUDIO_SECONDS | REQUESTS | CHARACTERS |
                   EMBEDDING_TOKENS | CUSTOM_UNITS
  api_key_id       → api_keys
  billing_config_id → billing_configs (nullable)
  model_id         → models
  task_id          → tasks
  UNIQUE(task_id, usage_unit_type)

transactions
  transaction_id       integer PK
  amount               numeric(10,2)
  completed_at         timestamp
  created_at           timestamp
  esewa_transaction_id varchar(100)
  product_code         varchar(50)      -- may be null
  status               PENDING | COMPLETED | FAILED
  type                 WALLET | CARD | WALLET_TOPUP
  user_id              → users
  -- NOTE: related_request_id — ignore entirely

service_tokens
  id           bigint PK
  active       boolean
  created_at   timestamp
  last_used_at timestamp        -- null if never used
  name         varchar(255) UNIQUE
  role         WORKER | ANALYTICS | ADMIN
  token_hash   varchar(255)     -- NEVER show this
  token_id     varchar(32) UNIQUE   -- safe to show, non-sensitive

worker_instances
  instance_id    varchar(255) PK
  down_at        timestamp        -- null if currently up
  last_heartbeat timestamp
  reason         varchar(255)     -- why it went down, may be null
  service_name   varchar(255)
  started_at     timestamp
  status         varchar(255)     -- treat as: ONLINE | DOWN | (STALE = online but heartbeat old)

user_tokens (backend auth only — never rendered in UI)
  token_type     ACCESS | REFRESH
  token_value    varchar(500)
  revoked        boolean
  expires_at     timestamp
  user_id        → users
```

---

## File Structure

```
app/
  admin/
    layout.tsx                    ← admin sidebar + header shell
    page.tsx                      ← /admin dashboard
    users/page.tsx
    api-keys/page.tsx
    models/
      page.tsx                    ← catalog
      create/page.tsx             ← 4-step stepper
      [id]/page.tsx               ← detail page
    tasks/page.tsx
    usage-analytics/page.tsx
    transactions/page.tsx
    workers/page.tsx

components/
  admin/
    admin-sidebar.tsx
    admin-header.tsx
    stat-card.tsx
    data-table.tsx                ← reusable sortable/filterable table
    detail-drawer.tsx             ← base Sheet wrapper
    alert-banner.tsx
    activity-feed.tsx
    json-tree-editor.tsx          ← SHARED — used in 4 places
    json-preview.tsx              ← companion to json-tree-editor
    rich-text-editor.tsx          ← used in model documentation
    pricing-calculator.tsx        ← used in billing config sections
  shared/
    status-badge.tsx
    masked-key.tsx
    currency-display.tsx
    one-time-reveal-modal.tsx
  charts/
    stacked-bar-chart.tsx
    line-chart.tsx
    horizontal-bar-chart.tsx
    grouped-bar-chart.tsx

lib/
  formatters.ts
  auth.ts
  api.ts
```

---

## Formatters

```typescript
formatNPR(amount: number): string
  // "रू 2,450.00" — always 2dp, comma thousands
  // Negative: "रू -230.00" (render text-red-600)
  // Zero: "रू 0.00" (render text-zinc-400)

formatCost(amount: number): string
  // High precision for unit costs
  // < 0.01:  "रू 0.002450" (6dp)
  // ≥ 0.01:  "रू 12.45"

formatDuration(ms: number): string
  // < 1,000:    "842ms"
  // < 60,000:   "3.2s"
  // ≥ 60,000:   "1m 12s"

formatRelative(date: Date | null): string
  // null:        "Never" (text-zinc-300)
  // < 1 min:     "just now"
  // < 1 hour:    "24 min ago"
  // < 24 hours:  "6h ago"
  // < 7 days:    "3 days ago"
  // else:        "Jan 15"

formatUptime(startedAt: Date, downAt?: Date): string
  // "Up 3d 14h 22m" or "Down since 2h ago"

formatTokens(count: number): string
  // < 1k:   "840"
  // < 1M:   "84.2k"
  // ≥ 1M:   "1.24M"
```

---

## Status Badge Color Mapping

```tsx
const badgeStyles = {
  // API Keys
  ACTIVE:        "bg-green-50 text-green-700 border border-green-200",
  INACTIVE:      "bg-zinc-100 text-zinc-600 border border-zinc-200",
  REVOKED:       "bg-red-50 text-red-700 border border-red-200",
  // Users
  BANNED:        "bg-red-50 text-red-700 border border-red-200",
  SUSPENDED:     "bg-amber-50 text-amber-700 border border-amber-200",
  // Models
  NOTHING:       "bg-blue-50 text-blue-600 border border-blue-200",   // render label as "Draft"
  DEPRECATED:    "bg-orange-50 text-orange-700 border border-orange-200",
  ARCHIVED:      "bg-zinc-100 text-zinc-500 border border-zinc-200",
  // Tasks
  QUEUED:        "bg-blue-50 text-blue-600 border border-blue-200",
  PROCESSING:    "bg-amber-50 text-amber-700 border border-amber-200", // + pulse dot
  COMPLETED:     "bg-green-50 text-green-700 border border-green-200",
  FAILED:        "bg-red-50 text-red-700 border border-red-200",
  // Transactions
  PENDING:       "bg-amber-50 text-amber-700 border border-amber-200",
  // Model types
  LLM:           "bg-violet-50 text-violet-700 border border-violet-200",
  OCR:           "bg-teal-50 text-teal-700 border border-teal-200",
  OTHER:         "bg-zinc-100 text-zinc-600 border border-zinc-200",
  // Transaction types
  WALLET:        "bg-blue-50 text-blue-700 border border-blue-200",
  CARD:          "bg-violet-50 text-violet-700 border border-violet-200",
  WALLET_TOPUP:  "bg-teal-50 text-teal-700 border border-teal-200",
  // Service tokens
  WORKER:        "bg-zinc-100 text-zinc-700 border border-zinc-200",
  ANALYTICS:     "bg-blue-50 text-blue-700 border border-blue-200",
  ADMIN:         "bg-amber-50 text-amber-700 border border-amber-200",
  // Worker instances
  ONLINE:        "bg-green-50 text-green-700 border border-green-200",
  DOWN:          "bg-red-50 text-red-700 border border-red-200",
  STALE:         "bg-amber-50 text-amber-700 border border-amber-200",
}
// Base: text-xs font-medium px-2.5 py-0.5 rounded-full
// PROCESSING: prepend <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5 inline-block" />
```

---

## Recharts Config

```tsx
// NO linearGradient fills — ever. Solid fills only.
const unitTypeColors = {
  INPUT_TOKENS:      "#09090b",  // zinc-950
  OUTPUT_TOKENS:     "#52525b",  // zinc-600
  PAGES:             "#0d9488",  // teal-600
  IMAGES:            "#7c3aed",  // violet-600
  AUDIO_SECONDS:     "#2563eb",  // blue-600
  REQUESTS:          "#d97706",  // amber-600
  CHARACTERS:        "#db2777",  // pink-600
  EMBEDDING_TOKENS:  "#16a34a",  // green-600
  CUSTOM_UNITS:      "#ea580c",  // orange-600
}

// Shared options
grid:    { stroke: "#f4f4f5", strokeDasharray: "3 3" }      // zinc-100
xAxis:   { tick: { fontSize: 11, fill: "#71717a" } }         // zinc-500
yAxis:   { tick: { fontSize: 11, fill: "#71717a" } }
tooltip: { contentStyle: { background: "#fff", border: "1px solid #e4e4e7", borderRadius: "12px", fontSize: "12px", boxShadow: "none" } }

// Legend: always custom HTML, never default Recharts legend
// <div className="flex flex-wrap gap-4 mb-3">
//   {series.map(s => (
//     <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-500">
//       <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
//       {s.label}
//     </span>
//   ))}
// </div>
```

---

## Admin Sidebar

```tsx
// Width: 240px fixed, bg-zinc-950
// Logo: Fleebug wordmark top-left, white, max-h-8

const navGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }]
  },
  {
    label: "Users & Access",
    items: [
      { label: "Users",    href: "/admin/users",    icon: Users },
      { label: "API Keys", href: "/admin/api-keys", icon: Key },
    ]
  },
  {
    label: "AI Models",
    items: [{ label: "Models", href: "/admin/models", icon: Cpu }]
  },
  {
    label: "Usage",
    items: [
      { label: "Tasks",     href: "/admin/tasks",             icon: Activity },
      { label: "Analytics", href: "/admin/usage-analytics",   icon: BarChart2 },
    ]
  },
  {
    label: "Payments",
    items: [{ label: "Transactions", href: "/admin/transactions", icon: CreditCard }]
  },
  {
    label: "Infrastructure",
    items: [{ label: "Workers", href: "/admin/workers", icon: Server }]
  },
]

// Group label: text-xs uppercase tracking-widest text-zinc-500 px-3 mb-1 mt-4
// Active item:   bg-white/10 text-white rounded-lg mx-2 px-3 py-2 text-sm
// Inactive item: text-zinc-400 hover:bg-white/5 hover:text-zinc-200 rounded-lg mx-2 px-3 py-2 text-sm
// Bottom: admin avatar + name + email + sign out icon
```

---

## Page 1 — `/admin` Dashboard

```
Page title: "Dashboard" (20px font-semibold zinc-950)
Sub: current date (13px zinc-400)

SYSTEM HEALTH STRIP (most important element on entire admin panel):
  Horizontal row of 5 status pills
  Each pill: bg-white border border-zinc-200 rounded-full px-4 py-2
             flex items-center gap-2 cursor-pointer
  
  [colored dot 8px rounded-full] label (13px zinc-900) · value (13px font-medium)
  
  Dot colors: bg-green-500 (healthy) · bg-amber-500 (warning) · bg-red-500 (critical)
  
  Pills and their logic:
    API Keys:    dot=green "183 active"  |  dot=amber if dormant>0: "14 dormant"
    Models:      dot=green "8 active"   |  dot=amber if missing billing: "2 missing billing"
    Workers:     dot=green "12 online"  |  dot=red if any down: "2 down"
    Payments:    dot=green "All settled" (always green — status always COMPLETED)
    Task Queue:  dot=green "0 queued"   |  dot=amber if >10: "47 queued"
  
  Each pill → navigates to relevant page with filter pre-applied
  Pill container: flex gap-3 flex-wrap mt-0 mb-6

4 STAT CARDS (today's numbers only — grid grid-cols-4 gap-4 mb-6):
  Revenue today (रू)
  Tasks completed today
  Active users today (users with ≥1 task today)
  New API keys today
  
  Card: bg-white border border-zinc-200 rounded-2xl p-5
  Label: text-xs text-zinc-500 mb-1
  Value: text-2xl font-semibold text-zinc-950

TWO CHARTS (grid grid-cols-2 gap-5 mb-6):

  Left — Hourly task volume today:
    BarChart, height 200px
    24 bars (hours 0-23)
    Current hour: fill="#09090b" (zinc-950)
    Past hours: fill="#e4e4e7" (zinc-200)
    Future hours: fill="#f4f4f5" (zinc-100)
    No legend (single series, self-explanatory)
    xAxis: show every 4th hour label (0, 4, 8, 12, 16, 20)

  Right — Revenue today vs previous days:
    LineChart, height 200px, same hourly axis
    Three lines:
      Today:         stroke="#09090b" strokeWidth=2
      Yesterday:     stroke="#a1a1aa" strokeWidth=1.5
      7 days ago:    stroke="#d4d4d8" strokeWidth=1 strokeDasharray="4 4"
    Custom legend above chart

THREE PANELS (grid grid-cols-3 gap-5 mb-6):

  Left — Failed tasks (last 24h):
    Card: bg-white border border-zinc-200 rounded-2xl p-5
    If zero: centered green empty state
      CheckCircle icon (24px green-500 mb-2)
      "No failures in the last 24 hours" (13px zinc-500)
    If non-zero: list max 5 rows
      Each row (py-2.5 border-b border-zinc-100 last:border-0):
        task_id truncated (font-mono text-xs zinc-500) + model name (text-sm zinc-900)
        relative time (text-xs zinc-400) + error snippet (text-xs red-500 truncate)
    "View all failed →" link → /admin/tasks?status=FAILED

  Middle — Worker health:
    Card: same
    Each worker_instance row (py-2.5 border-b border-zinc-100 last:border-0):
      service_name (text-sm font-medium zinc-900)
      status dot + "last seen X ago" (text-xs zinc-400)
      If heartbeat stale (>5 min): entire row text-red-600
    "View all →" link → /admin/workers

  Right — Top models today:
    Card: same
    Ranked list 1-5:
      [rank number text-xs zinc-300 w-4] model fullname (text-sm zinc-900 flex-1)
      request count (text-xs zinc-500) + cost today (text-xs font-mono zinc-600)
    "View analytics →" link → /admin/usage-analytics

ACTIVITY FEED (full width):
  Section heading: "Recent activity" (15px font-semibold zinc-950 mb-4)
  Card: bg-white border border-zinc-200 rounded-2xl overflow-hidden
  
  List (max-height 480px overflow-y-auto):
    Each entry (flex items-start gap-3 px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50):
      Icon (16px, zinc-500, mt-0.5 flex-shrink-0):
        Key icon:       API key issued/revoked
        Cpu icon:       Model changed / billing updated
        ArrowDown icon: Worker went down
        ArrowUp icon:   Worker online
        CreditCard icon: Large transaction (>रू 5,000)
        UserPlus icon:  New user registered
      Description (text-sm zinc-700 flex-1)
      Timestamp (text-xs zinc-400 flex-shrink-0)
    
    Each entry clickable → deep-links to relevant record
```

---

## Page 2 — `/admin/users`

```
Header row (flex justify-between items-center mb-6):
  "Users" (20px font-semibold zinc-950)

4 STAT CARDS (grid grid-cols-4 gap-4 mb-5):
  Total users · Active · Restricted (BANNED+SUSPENDED) · Admins

REGISTRATION CHART (bg-white border border-zinc-200 rounded-2xl p-5 mb-5):
  Title row (flex justify-between items-center mb-4):
    "New registrations" (14px font-semibold zinc-900)
    Year selector (Select component):
      Shows max 4 years in dropdown
      If more than 4 years: dropdown is scrollable (max-height: 160px overflow-y-auto)
      Default: current year

  BarChart height 180px
  X: months Jan-Dec, Y: user count
  Bar fill: #09090b (zinc-950)
  Empty months: still show bar slot with zinc-100 fill

ALERT BANNERS (conditional, mb-5):
  Amber banner (if dormant actives > 0):
    "X users are active but haven't logged in for 60+ days"
    "Review dormant accounts →" (filters table to these users)
  
  Red banner (if users with balance ≤ 0 exist):
    "X users have zero or negative balance"
    "View affected users →"
  
  Each: rounded-xl p-3 pl-4 flex items-center gap-3 border text-sm
  Dismissible: × button right side, dismissed state stored in sessionStorage

USERS TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

  Filter row (px-4 py-3 border-b border-zinc-100 flex gap-2 items-center):
    Status tabs (pill group):
      All · Active · Restricted · Inactive
      Active pill: bg-zinc-950 text-white rounded-full px-3 py-1 text-xs font-medium
      Inactive pill: text-zinc-500 hover:bg-zinc-100 rounded-full px-3 py-1 text-xs
    Role toggle (ml-3):
      All · Users · Admins (same pill style)
    Search (ml-auto):
      Input placeholder "Search name or email..." w-56 text-sm rounded-xl border-zinc-200

  table (w-full):
    thead (bg-zinc-50 border-b border-zinc-200):
      th: text-xs uppercase tracking-wide text-zinc-500 px-4 py-3 text-left

    Columns:
      User      — profile_image (32px circle, initials fallback bg-zinc-100 text-zinc-600 text-xs)
                  + full_name (text-sm font-medium zinc-900 ml-2.5)
                  + email (text-xs zinc-400 block)
      Role      — badge
      Status    — clickable badge (click opens inline dropdown to change status)
                  Changing to BANNED/SUSPENDED: show AlertDialog confirmation first
      Balance   — "रू {amount}" text-right font-mono text-sm
                  negative/zero: text-red-600
      Last login — formatRelative(last_login), "Never" in zinc-300
      Actions   — "View" button (text-sm text-zinc-500 hover:text-zinc-900)

  Row click → User Detail Drawer (Sheet, right, 480px):
    Header: avatar (48px) + full_name (16px semibold) + email (13px zinc-400)
    
    Sections with border-t border-zinc-100 dividers:
    
    Account:
      Role: editable Select (USER/ADMIN)
      Status: editable Select (ACTIVE/INACTIVE/BANNED/SUSPENDED)
        Changing to BANNED: inline warning "This will immediately block all API access"
      created_at, last_login (both full timestamps)
    
    Balance:
      Current: "रू {balance}" (20px font-semibold, red if ≤ 0)
      Adjust: input field + "Save" button (inline, +/- adjustment)
    
    Subscription:
      email_subscribed: Switch toggle
    
    Security:
      "Force password reset" button (outline, zinc)
      "Revoke all tokens" button (outline, red text)
        Both require AlertDialog confirmation
    
    No action log (not in schema — do not fabricate)
```

---

## Page 3 — `/admin/api-keys`

```
Header: "API Keys" (20px font-semibold zinc-950)

4 STAT CARDS (grid grid-cols-4 gap-4 mb-5):
  Total Keys · Active · Inactive · Revoked

TWO CHARTS (grid grid-cols-2 gap-5 mb-5):

  Left — Status distribution (horizontal stacked bar — NOT a donut):
    Single full-width bar, height 48px, rounded-xl overflow-hidden
    [Active=green segment][Inactive=zinc segment][Revoked=red segment]
    Proportional widths based on counts
    Labels on each segment: "{count} ({pct}%)" text-xs font-medium
    Text color: white if segment wide enough, else positioned outside
    Legend below bar: colored squares + labels

  Right — Keys created vs revoked per month (last 6 months):
    Grouped BarChart, height 180px
    Two bars per month:
      Created: fill="#09090b" (zinc-950)
      Revoked: fill="#ef4444" (red-500)
    Custom legend above chart

MIDDLE ZONE (grid grid-cols-2 gap-5 mb-5):

  Left — Limit utilization:
    Card: bg-white border border-zinc-200 rounded-2xl p-5
    Title: "Keys near limit" (14px font-semibold zinc-900 mb-3)
    Top 5 keys closest to daily OR monthly cap:
      Each row (py-2.5 border-b border-zinc-100 last:border-0):
        Masked key (font-mono text-xs zinc-500) + user email (text-xs zinc-400)
        Which limit: "Daily" or "Monthly" pill (text-[10px] zinc-400 border border-zinc-200 px-1.5 rounded-full)
        Progress bar (h-1 rounded-full mt-1.5 mb-0.5):
          <70%: bg-green-500  70-90%: bg-amber-500  >90%: bg-red-500
        "{used} / {limit}" text-xs zinc-500 text-right

  Right — Dormant keys alert:
    If dormant (active, last_used_at null or >30 days) > 0:
      Amber card: bg-amber-50 border border-amber-200 rounded-2xl p-5
      ShieldAlert icon (20px amber-600 mb-2)
      "{count} active keys unused for 30+ days" (14px font-semibold amber-800)
      "Dormant active keys are a security risk" (13px amber-700 mt-1)
      "Review dormant keys →" button (outline amber, mt-3 rounded-xl text-sm)
    If no dormant:
      Green confirmation card: "All active keys have been used recently"

API KEYS TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

  Bulk action bar (hidden unless rows selected):
    bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-3
    "X keys selected" (text-sm blue-700) + "Revoke selected" (red outline button) + "Deactivate selected" (zinc outline button)

  Filter row (px-4 py-3 border-b border-zinc-100):
    Status tabs: All · Active · Inactive · Revoked
    Search (ml-auto): name/description debounced 300ms

  Columns:
    [checkbox]     (w-10, select all in header)
    User           name (text-sm zinc-900) + email (text-xs zinc-400)
    Key            sk-••••{last4} font-mono text-sm zinc-500
    Status         badge (clickable — click to deactivate inline)
    Limits         "D: {used}/{daily} · M: {used}/{monthly}" text-xs zinc-500
    Last used      formatRelative — "Never" zinc-300
    Created        date text-xs zinc-400
    Actions        "Revoke" button (text-xs red text) + "Deactivate" (text-xs zinc-500)

  Revoke modal (Dialog):
    "Revoke API key?"
    Key owner: avatar + name + email (card style)
    Masked key: font-mono bg-zinc-50 rounded-lg px-3 py-2 text-sm
    Reason textarea: optional, placeholder "Reason for revocation..."
    Buttons: "Cancel" + "Revoke key" (bg-red-600 text-white rounded-xl)

  Row click → Key Detail Drawer (Sheet, 440px):
    All key fields
    Usage stats: daily used today, monthly used this month (with progress bars)
    User card with link
```

---

## Page 4 — `/admin/models` Catalog

```
Header row (flex justify-between):
  "Models" (20px font-semibold zinc-950)
  "+ Add model" button → /admin/models/create

5 STAT CARDS (grid grid-cols-5 gap-4 mb-5):
  Total · Active · Inactive · Deprecated · Off-shelf (ARCHIVED+NOTHING)
  Note: Deprecated ≠ Archived — keep separate

TWO INSIGHT PANELS (grid grid-cols-2 gap-5 mb-5):

  Left — Provider concentration:
    Card: bg-white border border-zinc-200 rounded-2xl p-5
    Title: "Provider breakdown" (13px font-medium zinc-500 mb-3)
    Ranked list (not a chart):
      Each row (flex items-center gap-3 py-2):
        Provider name (text-sm zinc-900 w-24 flex-shrink-0)
        Thin bar (flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden):
          Fill: bg-zinc-950 width proportional to count
        Count (text-sm font-medium zinc-900 w-6 text-right)
    If one provider >70% of models:
      Amber note below: "High concentration in {provider} — consider diversifying"

  Right — Type split + billing health:
    Card: bg-white border border-zinc-200 rounded-2xl p-5
    Three large pills (flex gap-3 mb-4):
      Each: border rounded-xl px-4 py-3 text-center
        Count (20px font-semibold) + type label (11px text-zinc-500 block)
        LLM: border-violet-200 bg-violet-50
        OCR: border-teal-200 bg-teal-50
        OTHER: border-zinc-200 bg-zinc-50
    Billing gap (border-t border-zinc-100 pt-3):
      If any active models missing billing:
        Red dot + "{count} active models missing billing config" (text-sm red-700)
        "View affected →" link (text-xs red-500)
      Else:
        Green dot + "All active models have billing configured" (text-sm green-700)

ALERT BANNERS (conditional, mb-5):
  Red: "X active models have no billing configuration — requests cannot be billed"
  Amber: "X deprecated models received requests in the last 7 days — users haven't migrated"
  Both dismissible, return each session if condition persists

MODELS CATALOG TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

  Filter row:
    Status tabs: All · Active · Inactive · Deprecated · Archived · Draft
    Type segmented: All · LLM · OCR · Other
    Provider dropdown (Select)
    Search (ml-auto): fullname or username

  Columns:
    Provider     text-sm zinc-600
    Model        fullname (text-sm font-medium zinc-900)
                 + username pill below (font-mono text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-md inline)
    Type         badge
    Status       badge (NOTHING renders as "Draft")
    Billing      "Per token" text-xs zinc-600 | red "Missing" badge if null
    Docs         "{n} sections" text-xs zinc-500 | amber "None" if 0
    Updated      formatRelative(updated_at) text-xs zinc-400
    Actions      "Edit" button (→ /admin/models/:id) + "Deprecate" (red text button)

  Deprecate modal (AlertDialog):
    "Deprecate this model?"
    If still receiving traffic: "This model received X requests in the last 7 days. Users will lose access."
    Else: "This model has no recent traffic."
    Confirm + Cancel

  Row click → full page navigation to /admin/models/:id (not a drawer)
```

---

## Page 5 — `/admin/models/create`

```
Page header: "Add model" (20px font-semibold zinc-950)
Back link: "← Models" (13px zinc-400)

STEPPER (mb-8, flex items-center gap-0):
  4 steps: Identity · Documentation · Billing · Review
  
  Each step node:
    Completed: filled circle bg-zinc-950 + white checkmark icon (16px)
    Active:    filled circle bg-zinc-950 + white step number
    Upcoming:  hollow circle border-zinc-300 + zinc-300 step number
  
  Connector line between nodes: 
    Completed segment: bg-zinc-950 h-px flex-1
    Upcoming segment:  bg-zinc-200 h-px flex-1
  
  Step label below node: text-xs
    Active/Completed: text-zinc-900 font-medium
    Upcoming: text-zinc-400

STEP 1 — Identity (grid grid-cols-5 gap-8):

  Left (col-span-3) — Form:
    Full name: large input (text-base), autofocus, label "Full name"
    
    Username: monospace input, auto-slugged from fullname
      Slugging: lowercase, replace spaces with hyphens, remove special chars
      Right icon: CheckCircle (green-500) if unique | XCircle (red-500) if taken
      hint below: "used as the model identifier in API calls"
    
    Provider: text input with autocomplete datalist from existing providers
    
    Type: segmented control (3 options, not a Select)
      div with 3 buttons, active button: bg-zinc-950 text-white rounded-lg
      inactive: bg-white text-zinc-600 hover:bg-zinc-50 rounded-lg border border-zinc-200
      LLM · OCR · OTHER
    
    Status: Select dropdown
      Default: NOTHING
      Options: Draft (NOTHING) · Active · Inactive · Deprecated · Archived
      Helper text below: "Set to Active only after billing and docs are configured." (11px zinc-400)
    
    Endpoint URL: text input + "Test" button
      Test button: outline, text-sm, rounded-xl
      Result inline:
        Success: green text "124ms ✓"
        Fail:    red text "Connection refused ✗"
    
    Description: textarea 3 rows
    
    Metadata accordion (collapsed by default):
      Toggle: "+ Add model metadata" (text-sm zinc-500 cursor-pointer mt-2)
      When open: JsonTreeEditor component
      Pre-scaffold by type:
        LLM: { context_length: 128000, supports_vision: true, supports_tools: true }
        OCR: { supported_formats: ["pdf","png","jpg"], max_pages: 100 }
        OTHER: {}

  Right (col-span-2) — Live preview card:
    Label: "Preview in catalog" (11px uppercase zinc-400 mb-3)
    Card (bg-white border border-zinc-200 rounded-2xl p-4 sticky top-6):
      Provider text (12px zinc-400)
      fullname (15px font-semibold zinc-900, or "Model name" zinc-300 if empty)
      username pill (font-mono 10px, or placeholder if empty)
      Type badge + Status badge
      Billing pill: always "Missing" red until step 3 complete
      Updates in real time as left form fills

STEP 2 — Documentation (grid grid-cols-5 gap-8):

  Left (col-span-3) — Editor:
    Title input: text-lg font-medium, no-border-until-focus, autofocus
    Rich text toolbar (flex gap-1 mb-3):
      [B] [I] [H1] [H2] [Code] [```] [Link] [• List] [1. List] [Table]
      Each: border border-zinc-200 rounded-lg px-2 py-1 text-xs hover:bg-zinc-50
    Content area: contentEditable div
      border border-zinc-200 rounded-xl p-4 min-height 280px
      focus:border-zinc-400 outline-none

  Right (col-span-2) — Suggestions panel:
    Label: "Suggested sections" (11px uppercase zinc-400 mb-2)
    "Based on {type} model type" (12px zinc-500 mb-3)
    
    LLM chips:
      Overview · Authentication · Request format · Parameters · Examples · Rate limits
    OCR chips:
      Overview · Supported file types · Page limits · Output format · Examples
    OTHER chips:
      Overview · Getting started · Examples
    
    Each chip: border border-zinc-200 rounded-lg px-3 py-1.5 text-xs zinc-600
               hover:border-zinc-400 cursor-pointer
               Click → adds new section with that title pre-filled
    
    "Skip for now" link (text-xs zinc-400 block mt-6 hover:text-zinc-600)
    Note: "Skipping adds a 'No docs' badge to the model until documentation is added"

STEP 3 — Billing:

  Pricing type pills (flex gap-2 mb-6):
    Per token · Per page · Per request · Per image · Custom
    Selected: bg-zinc-950 text-white border-zinc-950
    Unselected: bg-white text-zinc-600 border-zinc-200
    All: border rounded-xl px-4 py-2 text-sm font-medium cursor-pointer
    Changing type → modal: "Reset pricing metadata?" with confirm/cancel

  Two columns (grid grid-cols-2 gap-6):
    Left: JsonTreeEditor (pre-scaffolded by pricing_type — see JsonTreeEditor spec)
    Right: JsonPreview (live, syntax highlighted)

  Pricing calculator (mt-6 bg-zinc-50 border border-zinc-200 rounded-2xl p-5):
    Title: "Sanity check calculator" (13px font-medium zinc-700 mb-3)
    Inputs swap by pricing_type:
      PER_TOKEN: "Input tokens" + "Output tokens" number inputs
      PER_PAGE: "Pages" number input
      PER_REQUEST: "Requests" number input
      PER_IMAGE: "Images" number input
    
    Live output: "Estimated cost: रू {calculated}" (16px font-semibold zinc-900 mt-3)
    Warning: if estimated cost > रू 10 for 1000 units: amber "Rates may be too high — double check"
    Warning: if estimated cost < रू 0.001 for 1000 units: amber "Rates may be too low — double check"

STEP 4 — Review:

  Read-only summary (grid grid-cols-3 gap-5):
    Left card: Identity fields (all from step 1)
    Middle card: Billing JSON preview
    Right card: Doc section titles list

  Status selector (mt-6):
    Label: "Publish status"
    Three large radio cards:
      "Publish as Active"   (green-50 border, recommended if everything complete)
      "Save as Inactive"    (zinc-50 border, for review before activating)
      "Save as Draft"       (zinc-50 border, sets status to NOTHING)

  "Create model" button (full-width black rounded-xl py-3 mt-4)
  On success → redirect to /admin/models/:id
```

---

## Page 6 — `/admin/models/:id`

```
STICKY PAGE HEADER (bg-white border-b border-zinc-100 px-6 py-4):

  Left:
    fullname (18px font-semibold zinc-950)
    username (font-mono text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md ml-2 inline)
    provider (text-sm zinc-400 ml-2)
    type badge (ml-2)
    status — clickable badge that opens inline Select:
      Clicking opens dropdown: Active · Inactive · Deprecated · Archived · Draft
      Changing to DEPRECATED or ARCHIVED: AlertDialog first
        "This model is still receiving X requests/day. Continue?" (if traffic)
        or "This model has no recent traffic."

  Right:
    "Updated {relative}" (text-xs zinc-400)
    "Edit identity" button (outline, text-sm, rounded-xl)
    "← Models" breadcrumb (text-sm zinc-400)

CONTEXTUAL ALERT STRIP (shows only highest priority, below header):
  Check order:
    1. RED:   No billing_configs record → "No billing config — cannot bill requests. Set up billing ↓"
    2. AMBER: output_tokens missing from pricing_metadata → "Output token rate missing — partial billing only"
    3. AMBER: zero api_documentation records → "No documentation published"
  
  Only one alert at a time. Rounded-none (strip full width). Dismissible.

ZONE 1 — Usage overview:

  4 stat cards (grid grid-cols-4 gap-4 mb-5 mt-5):
    Total requests this month · Total cost billed (रू) · Avg cost/request · Active API keys on this model

  Two charts (grid grid-cols-2 gap-5 mb-5):
    Left — Daily cost stacked bar (30 days):
      height 220px
      Stacked by usage_unit_type (only types with actual data)
      Colors: unitTypeColors constant
      Y-axis: रू amounts
      Custom legend above

    Right — Daily requests bar (30 days):
      height 220px
      Single series, zinc-900 bars
      Y-axis: request counts

  Three mini cards (grid grid-cols-3 gap-4 mb-6):
    Card 1: Top API key by spend
      Masked key + user email + "रू {amount} this month"
    Card 2: Top user by requests
      full_name + email + "{count} requests"
    Card 3: Dormant signal
      If requests down >40% week-over-week:
        Amber: "↓42% week-over-week — declining usage"
      Else green: "Stable usage ✓"

ZONE 2 — Identity (collapsible accordion):

  Collapsed header (flex justify-between items-center py-4 border-t border-zinc-100 cursor-pointer):
    "Identity" (14px font-semibold zinc-900)
    Sub: "{provider} · {endpoint truncated} · Created {date}" (text-xs zinc-400)
    Right: "Edit" button + chevron icon (rotates on open)
  
  Expanded content (3-column grid, gap-6, pb-6):
    Col 1: fullname, username, provider, type
    Col 2: status, created_at, updated_at,
            endpoint URL + "Test" inline button
    Col 3: description textarea (3 rows)
            + metadata JsonTreeEditor
    
    Save / Cancel buttons at bottom

ZONE 3 — Documentation (always visible, border-t border-zinc-100 pt-6):

  Two-panel layout (grid grid-cols-[200px_1fr] gap-0 border border-zinc-200 rounded-2xl overflow-hidden):

    Left nav (bg-zinc-50 border-r border-zinc-200):
      Each doc section (px-4 py-3 cursor-pointer border-b border-zinc-100):
        title (text-sm zinc-900)
        "edited {relative}" (text-xs zinc-400 mt-0.5)
        Amber dot (6px bg-amber-400 rounded-full ml-auto) if not edited in >30 days
        Active: bg-white border-l-2 border-l-zinc-950
      "+ Add section" (px-4 py-3 text-sm text-zinc-400 hover:text-zinc-700 cursor-pointer border-t border-zinc-100)

    Right editor (bg-white p-6):
      Title input (text-lg font-medium border-0 border-b border-zinc-100 pb-2 mb-4 w-full outline-none focus:border-zinc-400)
      Toolbar: same buttons as create step
      Content: contentEditable, min-height 240px
      Footer (flex justify-between items-center mt-4 pt-4 border-t border-zinc-100):
        Left: "● Saved · 2 min ago" (text-xs green-600, dot green-500)
        Right: "Duplicate" (text-xs zinc-400) + "Delete section" (text-xs red-500)
      
      Empty state (zero sections, centered in right panel py-16):
        "No documentation yet" (text-zinc-400)
        Section template chips (same as create flow)

ZONE 4 — Billing configuration (border-t border-zinc-100 pt-6):
  
  Two columns (grid grid-cols-2 gap-6):

    Left — Editor:
      Pricing type pills (same as create step, mb-4)
      Changing type → AlertDialog: "This will reset pricing metadata. Continue?"
      
      JsonTreeEditor (see spec)
      Required fields: red asterisk in key label + red border if empty/zero
      
      Pricing calculator (mt-4, same as create step)
      
      "Save billing config" button (full-width black rounded-xl py-2.5 mt-4 sticky bottom-4)

    Right — Context:
      JsonPreview:
        Live output, syntax highlighted
        Copy button
        "Raw edit" toggle (swaps tree for textarea, validates on blur, rebuilds tree)
      
      Usage breakdown table (mt-4):
        Title: "Usage this month" (13px font-medium zinc-700 mb-2)
        Table (compact, text-xs):
          Columns: Unit type · Qty · Cost (रू) · Rate (live from tree)
          Rate column updates as tree changes — shows repricing impact
        
      Top 5 API keys by spend (mt-4):
        Title: "Top keys this model" (13px font-medium zinc-700 mb-2)
        Each row: masked key + email + रू cost
        "View all usage →" → /admin/usage-analytics?model_id=X

ZONE 5 — Change log (border-t border-zinc-100 pt-6 pb-6):
  Title: "Change log" (14px font-semibold zinc-900 mb-3)
  List of up to 10 entries:
    Each (flex gap-3 py-2.5 border-b border-zinc-100 text-sm):
      Timestamp (text-xs zinc-400 w-28 flex-shrink-0)
      Description (zinc-600): "Status changed to Deprecated by admin@fleebug.com"
  Read-only. Code note: "Add changed_by field to billing_configs and models for full audit trail"
```

---

## JsonTreeEditor Component

```
Used in: models.metadata (create + detail), billing_configs.pricing_metadata (create + detail)
Build ONCE as <JsonTreeEditor> — single shared component

Props:
  value:        unknown              // current JSON value
  onChange:     (v: unknown) => void
  scaffold?:    unknown              // pre-populate with this structure on mount
  requiredKeys?: string[]            // show red asterisk, highlight if empty

Per-node row (flex items-center gap-2 py-1):
  [▼/▶ toggle, w-4, text-zinc-400]
  [key input, font-mono text-sm text-blue-700, min-w-0 flex-1 max-w-[140px]]
  [type badge, text-[10px] border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-500 cursor-pointer]
    Clicking cycles type: string → number → boolean → object → array → null → string
  [value input OR nothing if object/array, font-mono text-sm flex-1, border-0 bg-transparent outline-none]
    String value: text-green-700
    Number value: text-amber-700
    Boolean/null: text-red-500
  [required asterisk if in requiredKeys, text-red-500 text-xs, mr-1]
  [delete ✕, text-zinc-300 hover:text-red-500 text-xs cursor-pointer w-4]

Nesting:
  Children: ml-5 pl-3 border-l border-zinc-200
  Depth 1: border-l-zinc-300
  Depth 2: border-l-zinc-200
  Depth 3+: border-l-zinc-100
  Warning at depth 5: "Deep nesting may cause issues" (amber text-xs)

Array children:
  Toggle label shows [0], [1] etc. (text-zinc-400, font-mono, non-editable)
  "Add item" at bottom of array (text-xs text-zinc-400 cursor-pointer hover:text-zinc-700)

"+ Add field" link at bottom of each object level (text-xs text-zinc-400 hover:text-zinc-700)
"+ Add root field" at bottom of tree root

Pricing type scaffolds:
  PER_TOKEN:   { rates: { input_tokens: 0.0000025, output_tokens: 0 }, currency: "NPR", tiers: [{ up_to: 1000000, multiplier: 1.0 }, { up_to: null, multiplier: 0.85 }] }
  PER_PAGE:    { cost_per_page: 0.15, currency: "NPR" }
  PER_REQUEST: { cost_per_request: 0.05, currency: "NPR" }
  PER_IMAGE:   { cost_per_image: 0.10, currency: "NPR" }
  CUSTOM:      {}

Required keys per type:
  PER_TOKEN: ["rates.input_tokens", "rates.output_tokens", "currency"]
  PER_PAGE:  ["cost_per_page", "currency"]
  etc.
```

---

## Page 7 — `/admin/transactions`

```
Header: "Transactions" (20px font-semibold zinc-950)

3 STAT CARDS (grid grid-cols-3 gap-4 mb-5):
  Total transactions · Total volume (रू) · This month's volume (रू)

CHART (bg-white border border-zinc-200 rounded-2xl p-5 mb-5):
  Title: "Daily transaction volume — last 30 days" (13px font-medium zinc-500 mb-3)
  BarChart height 180px, single series zinc-950 bars
  Y-axis: formatNPR values

TRANSACTIONS TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

  Filter row:
    Type tabs: All · Wallet · Card · Wallet Topup
    Date range (Select): Today · 7 days · 30 days · This month · Custom
    Search (ml-auto): user name, email, or eSewa ID

  Columns:
    User      name (text-sm zinc-900) + email (text-xs zinc-400)
    eSewa ID  font-mono text-xs zinc-500, truncated 20 chars
              clipboard icon on row hover (copies full ID)
    Type      badge: WALLET / CARD / WALLET_TOPUP
    Amount    "रू {amount}" text-right font-mono text-sm font-medium
    Created   formatRelative + full date on hover (Tooltip)

  Row click → Transaction Drawer (Sheet, right, 400px):
    eSewa ID block: font-mono text-sm bg-zinc-50 rounded-xl p-3
                    "Copy" button below
    Grid: type badge · amount (20px semibold) · status badge
    Full timestamps: created_at + completed_at
    Product code (or "—")
    User link: → /admin/users (filtered to that user)
    No actions — read-only
```

---

## Page 8 — `/admin/workers`

```
Header: "Workers & Service Tokens" (20px font-semibold zinc-950)

SECTION 1 — Worker Instances:

  3 stat cards (grid grid-cols-3 gap-4 mb-5):
    Total instances · Online · Offline / Down

  Worker instance cards (grid grid-cols-1 gap-3, or grid-cols-2 if many):
    Each card (bg-white border border-zinc-200 rounded-2xl p-4):
      Header row (flex justify-between):
        service_name (15px font-semibold zinc-950)
        Status badge: ONLINE | DOWN | STALE
          STALE logic: status appears healthy in DB but last_heartbeat > 5 minutes ago
      
      instance_id (font-mono text-xs zinc-400 mt-0.5)
      
      Stats row (grid grid-cols-2 gap-3 mt-3 text-xs):
        "Last heartbeat": formatRelative(last_heartbeat)
          If >5 min: text-red-600 font-medium
        "Uptime": formatUptime(started_at, down_at)
          "Up 3d 14h" or "Down since 2h ago" in red
      
      Reason row (if status=DOWN and reason not null):
        bg-red-50 rounded-lg px-3 py-2 mt-2 text-xs text-red-700
        reason text
      
      No create/delete actions — workers self-register

DIVIDER with label: "Service Tokens" (border-t border-zinc-200 my-6 pt-6)

SECTION 2 — Service Tokens:

  4 stat cards (grid grid-cols-4 gap-4 mb-5):
    Total · Active · Inactive · Role pill group (W:{count} A:{count} Admin:{count})
    Role pill group in one card: three colored pills inline, not separate cards

  Issue token button (right of section heading):
    "Issue new token" → Dialog modal:
      Name input (required, unique — show uniqueness check)
      Role Select: WORKER · ANALYTICS · ADMIN
      ADMIN role warning: amber alert "Admin tokens have full system access. Issue with caution."
      "Create token" button (black)
    
    After creation — OneTimeRevealModal:
      Warning: bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm
               "Copy this token now. It will NEVER be shown again."
      Token: font-mono text-sm bg-zinc-950 text-green-400 rounded-xl p-4 break-all
      "Copy token" → "Copied ✓" 3s, then back
      "I've copied and stored my token" button (full-width black, required to dismiss)

  SERVICE TOKENS TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

    Filter row:
      Role tabs: All · Worker · Analytics · Admin

    Columns:
      Name       text-sm font-medium zinc-900
                 Amber icon if ADMIN role
                 Amber dot + tooltip if active=true + last_used_at null or >30 days
      Role       badge (WORKER/ANALYTICS/ADMIN)
      Active     Switch component (shadcn), inline toggle — no modal needed for this
      token_id   font-mono text-xs zinc-400 (NEVER show token_hash)
      Last used  formatRelative, "Never" in zinc-300
      Created    date text-xs zinc-400
      Actions    "Rotate" (outline, text-sm) + "Delete" (red text, text-sm)
        Rotate → new token generated → OneTimeRevealModal again
        Delete → AlertDialog confirmation
```

---

## Page 9 — `/admin/tasks`

```
Header: "Tasks" (20px font-semibold zinc-950)

5 STAT CARDS (grid grid-cols-5 gap-4 mb-5):
  Total · Completed · Failed · Processing · Queued
  
  Failed card special treatment (if count > 0):
    bg-red-50 border-red-200 (tinted)
    Value: text-red-700
    Sub-label: "{pct}% failure rate" (text-xs red-500)

TWO CHARTS (grid grid-cols-2 gap-5 mb-5):

  Left — Task volume by status, last 14 days:
    Stacked BarChart, height 200px
    COMPLETED: fill="#22c55e" (green-500)
    FAILED:    fill="#ef4444" (red-500)
    PROCESSING:fill="#f59e0b" (amber-500, muted)
    QUEUED:    fill="#3b82f6" (blue-500, muted)
    Custom legend above

  Right — Avg processing time per model, last 14 days:
    LineChart, height 200px
    One line per model (max 5 models — show top 5 by usage)
    Colors: cycle through zinc-900 / zinc-600 / teal-600 / violet-600 / amber-600
    Y-axis: formatted with formatDuration
    Dashed reference line at your P95 value (horizontal, zinc-300)
    Custom legend with model names

THREE METRIC PILLS (flex gap-3 mb-5):
  Avg processing time · P95 processing time · Success rate %
  Each: bg-white border border-zinc-200 rounded-full px-5 py-2
        label (text-xs zinc-500 mr-2) + value (text-sm font-semibold zinc-900)

FAILED TASKS ALERT (conditional, mb-5):
  Red banner: "{count} tasks failed in the last 24 hours"
  "Filter to failed →" button applies status=FAILED filter on table
  Dismissible

TASKS TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

  Filter row:
    Status tabs: All · Queued · Processing · Completed · Failed
    Model: Select dropdown (all models)
    Date range: Select
    Search: task_id or masked API key

  Columns:
    Task ID    font-mono text-xs zinc-500, first 12 chars + "..."
               clipboard icon on hover
    Model      text-sm zinc-900
    API Key    sk-••••{last4} font-mono text-xs zinc-400
    Status     badge (PROCESSING: + animate-pulse amber dot)
    Cost       formatCost(total_cost) text-right font-mono text-sm
    Time       formatDuration(processing_time_ms) text-right text-sm zinc-500
    Created    formatRelative text-xs zinc-400 text-right
    Actions    "View" button (text-sm zinc-500)

  Row click → Task Detail Drawer (Sheet, right, 560px — wider for payloads):
    Header: task_id (font-mono text-sm, full) + status badge
    
    Info grid (grid grid-cols-2 gap-3 text-sm mt-4):
      Model name · API key (masked)
      Created at · Completed at (full timestamps)
      Processing time · Total cost
    
    If FAILED — error first:
      bg-red-50 border border-red-200 rounded-xl p-4 mt-4
      "Error" (text-[10px] font-medium uppercase red-600 mb-1)
      result_payload (font-mono text-xs red-800, overflow-y-auto max-h-40)
    
    Request payload (collapsible, mt-4):
      Header: chevron + "Request payload" (text-sm font-medium zinc-700)
      Content (when open): bg-zinc-950 text-zinc-200 rounded-xl p-4 font-mono text-xs
                           max-h-52 overflow-y-auto
                           Truncated at 500 chars + "Show full" toggle
    
    Result payload (collapsible, mt-3, same treatment — skip if FAILED, shown above)
    
    Usage metadata (collapsible, mt-3):
      Render usage_metadata jsonb as indented tree (same visual as JsonPreview but read-only)
    
    Cost breakdown (mt-4):
      "Cost breakdown" (text-sm font-medium zinc-700 mb-2)
      Mini table (text-xs):
        Columns: Unit type · Quantity · Rate · Cost
        Rows: from usage_records for this task_id
        Total row: font-medium border-t border-zinc-100 pt-2
```

---

## Page 10 — `/admin/usage-analytics`

```
Header row (flex justify-between items-center mb-6):
  "Analytics" (20px font-semibold zinc-950)
  Time range selector (pill group, prominent):
    Today · Last 7 days · Last 30 days · This month · Last month · Custom
    Selected: bg-zinc-950 text-white rounded-full px-4 py-2 text-sm
    All charts and cards respond to this selection

5 SUMMARY CARDS (grid grid-cols-5 gap-4 mb-5):
  Total revenue (रू) · Total tasks · Units consumed · Unique API keys · Avg cost/task
  
  Each card has delta row (text-xs mt-1):
    Positive: "↑12% vs prev period" text-green-600
    Negative: "↓3% vs prev period" text-red-600
  
  "Units consumed" adapts label: "2.4B tokens" or "18,400 pages" based on dominant type

FULL-WIDTH STACKED BAR CHART (bg-white border border-zinc-200 rounded-2xl p-5 mb-5):
  Title: "Daily revenue by unit type" (13px font-medium zinc-500 mb-1)
  Sub: "Showing {selected period}" (11px zinc-400 mb-3)
  
  BarChart stacked, height 260px
  One bar per day, stacked by usage_unit_type
  Only render unit types with actual data in period
  Colors: unitTypeColors constant
  Custom legend above (colored squares + unit type names)
  Y-axis: formatNPR
  Tooltip: date + per-type breakdown + total

THREE CHARTS (grid grid-cols-3 gap-5 mb-5):

  Left — Revenue by model (horizontal bar):
    HorizontalBarChart, height auto (40px per bar + 80px padding)
    Sorted descending by revenue
    LLM: fill="#7c3aed" (violet-600)
    OCR: fill="#0d9488" (teal-600)
    OTHER: fill="#71717a" (zinc-500)
    Bar labels: model fullname on Y axis
    Value labels: formatNPR on bar end

  Middle — Revenue by API key top 10 (horizontal bar):
    Same horizontal bar style
    Y labels: masked key + user email (text-xs, truncated)
    fill="#09090b" (zinc-950)

  Right — Task success rate trend (line):
    LineChart, height 220px
    Y: 0-100 percentage
    Line: zinc-900 when >95%, red-500 when <90%
    Dashed reference at 95%: stroke="#d4d4d8" (zinc-300) + label "95% target"
    Y-axis ticks: "100%" "95%" "90%" "80%"

UNIT TYPE BREAKDOWN TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden mb-5):
  Title row: "Usage composition" (14px font-semibold zinc-900 px-5 pt-4 pb-3)
  
  Compact table (not the raw ledger — a summary):
    Columns: Unit type badge · Total quantity · Total cost (रू) · Avg rate/unit · % of total · Trend (↑↓)
    Sort: total cost desc
    Trend: ↑ text-green-600 / ↓ text-red-600 / → text-zinc-400 vs prior period

TWO PANELS (grid grid-cols-2 gap-5 mb-5):

  Left — Top users by spend (table):
    Title: "Top users by spend" (14px font-semibold zinc-900 mb-3)
    10 rows:
      avatar (32px circle) + full_name + email + "रू {total}" + task count + most used model
      Row click → /admin/users (filter to that user)

  Right — Cost per model over time (multi-line):
    LineChart, height 240px
    One line per active model, same time axis as main chart
    Declining line on ACTIVE model: add small amber annotation "Declining"
    Custom legend with model names

RAW USAGE RECORDS TABLE (bg-white border border-zinc-200 rounded-2xl overflow-hidden):

  Header row (px-5 pt-4 pb-3 flex justify-between):
    "Usage records" (14px font-semibold zinc-900)
    "Export CSV" button (outline, text-sm, rounded-xl, Download icon)
      Exports current filtered view
      Filename: usage_records_{start}_{end}.csv

  Filter row (px-5 py-3 border-b border-zinc-100 flex gap-3 flex-wrap):
    Unit type: multi-select (Popover with checkboxes — too many for tabs)
    Model: Select
    API key: search input (text-sm)
    Cost range: "Min रू" + "Max रू" number inputs (compact, w-24 each)
    Date: inherits global time range but overridable

  Columns:
    Recorded at   text-xs zinc-500
    Model         text-sm zinc-900
    API Key       sk-••••{last4} font-mono text-xs zinc-400
    Unit type     badge
    Quantity      formatTokens(quantity) text-right text-sm
    Rate/unit     font-mono text-xs zinc-500 text-right
    Cost          formatCost(cost) text-right font-mono text-sm font-medium
    Task ID       font-mono text-xs zinc-400, first 10 chars
                  Underline on hover — click opens task detail drawer INLINE
                  (Sheet opens without page navigation)

  Default sort: recorded_at DESC
  Pagination: 50 per page (no infinite scroll on financial ledger)
```

---

## What NOT To Build

```
✗ No gradient fills in Recharts (no linearGradient, no gradientId)
✗ No box-shadows on cards
✗ No square corners — minimum rounded-lg everywhere
✗ No donut/pie charts — use horizontal stacked bars or horizontal bars
✗ No full API key or token_hash displayed — masked keys only, token_id for service tokens
✗ No user-facing pages — this prompt covers /admin routes only
✗ No toast for auth errors — inline error messages
✗ No dark mode
✗ No related_request_id from transactions — ignore entirely
✗ No action log on users — not in schema, do not fabricate
✗ No "changed_by" data on change log — note it as a TODO in code
✗ No pagination with "load more" on financial tables — standard prev/next pagination
✗ No decorative animations — transitions (150ms ease) on hover/focus states only
```

---

*This is the complete admin panel specification. Build exactly what is described. When in doubt, choose the more information-dense option — this is an operator tool, not a consumer product.*
