# CoreRouter — User Dashboard
> Product of **Fleebug.com** · Next.js 14 App Router · Tailwind CSS · shadcn/ui

---

## What You Are Building

The user-facing product for CoreRouter — an AI model routing and billing platform by Fleebug.com. Users sign up, get API keys, call AI models through the platform, top up their balance via eSewa, and track their usage and costs.

This is a **user product**, not an admin tool. It should feel clean, modern, and trustworthy — not like a back-office dashboard. Think Vercel dashboard, Stripe dashboard, Railway.app. Minimal, precise, generous whitespace.

---

## Non-Negotiable Design Rules

```
✓ Primary palette: black (#09090b zinc-950), white (#ffffff), zinc grays
✓ Rounded corners throughout: rounded-xl for cards, rounded-lg for inputs/buttons, rounded-full for pills/avatars/badges
✓ Generous spacing: p-6 on cards, gap-6 between sections minimum
✓ Typography-first: let weight, size, and spacing do the visual work
✓ Flat design: no shadows except subtle ring shadows on inputs (focus ring only)
✓ Borders: 1px zinc-200 for cards, 1px zinc-100 for table rows

✗ ZERO gradient backgrounds — forbidden everywhere, no exceptions
✗ No box-shadow on cards — use borders only
✗ No sharp square corners — minimum rounded-lg on everything
✗ No colorful decorative elements
✗ No illustrations or hero images
✗ No glassmorphism, no frosted glass, no backdrop-blur decorations
✗ No AI-slop aesthetics (no purple gradients, no glowing effects, no neon)
```

**The one exception for color:** The "Pay with eSewa" button uses eSewa's brand green `#60BB46`. Only this button, nowhere else.

---

## Tech Stack

```
Framework:     Next.js 14+ App Router
Styling:       Tailwind CSS (NO gradient utilities — ever)
Components:    shadcn/ui — Dialog, Sheet, Badge, Tabs, Switch, Select, Tooltip, Progress
Charts:        Recharts — BarChart, LineChart, AreaChart (flat fills only, NO linearGradient)
Icons:         Lucide React
Forms:         React Hook Form + Zod
State:         Zustand (global), TanStack Query (server state + caching)
Auth:          JWT — access token in memory, refresh token in httpOnly cookie
Font:          Geist Sans
Dates:         date-fns
```

---

## Database Schema (User-Relevant Tables Only)

```sql
users
  user_id        integer PK
  balance        numeric(12,2)    -- user's current wallet balance in NPR
  created_at     timestamp
  email          varchar(100) UNIQUE
  email_subscribed boolean
  full_name      varchar(100)
  last_login     timestamp
  password       varchar(255)
  profile_image  varchar(255)     -- URL or null
  role           USER | ADMIN
  status         ACTIVE | INACTIVE | BANNED | SUSPENDED

api_keys
  api_key_id     integer PK
  created_at     timestamp
  daily_limit    integer          -- max requests per day
  description    varchar(255)     -- user-provided name/label
  key            varchar(255) UNIQUE  -- the actual key value (NEVER show in full)
  last_used_at   timestamp        -- null if never used
  monthly_limit  integer
  status         ACTIVE | INACTIVE | REVOKED
  user_id        → users

models (read-only for users)
  model_id       integer PK
  description    varchar(255)
  fullname       varchar(255) UNIQUE  -- display name e.g. "GPT-4o November 2024"
  metadata       jsonb
  provider       varchar(255)
  status         NOTHING | ACTIVE | INACTIVE | DEPRECATED | ARCHIVED
  type           LLM | OCR | OTHER
  username       varchar(255) UNIQUE  -- slug e.g. "gpt-4o-2024-11"
  endpoint_url   varchar(255)

api_documentation (read-only for users)
  doc_id         integer PK
  content        text
  title          varchar(255)
  updated_at     timestamp
  model_id       → models

billing_configs (read-only for users — for showing pricing)
  billing_id     integer PK
  pricing_metadata jsonb           -- contains rates, tiers, currency
  pricing_type   varchar(30)       -- PER_TOKEN, PER_PAGE, PER_REQUEST, etc.
  model_id       → models UNIQUE

tasks
  task_id        varchar(255) PK
  completed_at   timestamp
  created_at     timestamp
  processing_time_ms bigint
  request_payload text             -- what the user sent
  result_payload  text             -- what came back (or error message)
  status         QUEUED | PROCESSING | COMPLETED | FAILED
  total_cost     numeric(12,6)     -- cost in NPR
  updated_at     timestamp
  usage_metadata jsonb
  api_key_id     → api_keys
  model_id       → models

usage_records
  usage_id       bigint PK
  cost           numeric(18,10)
  quantity       numeric(18,4)
  rate_per_unit  numeric(18,10)
  recorded_at    timestamp
  usage_unit_type  INPUT_TOKENS | OUTPUT_TOKENS | PAGES | IMAGES |
                   AUDIO_SECONDS | REQUESTS | CHARACTERS |
                   EMBEDDING_TOKENS | CUSTOM_UNITS
  api_key_id     → api_keys
  billing_config_id → billing_configs
  model_id       → models
  task_id        → tasks
  UNIQUE(task_id, usage_unit_type)

transactions
  transaction_id       integer PK
  amount               numeric(10,2)    -- NPR amount
  completed_at         timestamp
  created_at           timestamp
  esewa_transaction_id varchar(100)     -- eSewa's reference ID
  product_code         varchar(50)      -- may be null
  status               PENDING | COMPLETED | FAILED
  type                 WALLET | CARD | WALLET_TOPUP
  user_id              → users
  -- NOTE: ignore related_request_id entirely

user_tokens (auth — backend only, not rendered in UI)
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
  (public)/
    page.tsx                     ← landing page /
    login/page.tsx
    register/page.tsx
  (dashboard)/
    layout.tsx                   ← sidebar + header shell
    dashboard/page.tsx           ← /dashboard home
    dashboard/
      api-keys/page.tsx
      usage/page.tsx
      models/page.tsx
      billing/page.tsx
      settings/page.tsx

components/
  layout/
    user-sidebar.tsx
    user-header.tsx
  ui/                            ← shadcn components
  cards/
    stat-card.tsx
    api-key-card.tsx
    model-card.tsx
    quick-action-card.tsx
  charts/
    spend-line-chart.tsx
    usage-stacked-bar.tsx
  shared/
    status-badge.tsx
    currency-display.tsx
    masked-key.tsx
    one-time-reveal-modal.tsx
    task-detail-drawer.tsx

lib/
  formatters.ts
  auth.ts
  api.ts
```

---

## Formatters (use these everywhere, never raw numbers)

```typescript
// NPR currency — always रू symbol
formatNPR(amount: number): string
  // "रू 2,450.00"  always 2 decimal places
  // Negative: "रू -230.00" render in red (text-red-600)
  // Zero: "रू 0.00" render in zinc-400

// Token/unit counts
formatUnits(count: number, type: string): string
  // < 1,000:       "840 tokens"
  // < 1,000,000:   "84.2k tokens"
  // ≥ 1,000,000:   "1.24M tokens"
  // For pages:     "18 pages"

// Processing time
formatDuration(ms: number): string
  // < 1,000:       "842ms"
  // < 60,000:      "3.2s"
  // ≥ 60,000:      "1m 12s"

// Relative time
formatRelative(date: Date | null): string
  // null:           "Never"  (zinc-400 color)
  // < 1 min:        "just now"
  // < 1 hour:       "24 min ago"
  // < 24 hours:     "6h ago"
  // < 7 days:       "3 days ago"
  // else:           "Jan 15"

// Cost (high precision for unit rates)
formatCost(amount: number): string
  // < 0.01:    "रू 0.002450"  (up to 6 decimal places)
  // ≥ 0.01:    "रू 12.45"
```

---

## Status Badge Color Mapping

```tsx
// Use these exact Tailwind classes — no exceptions

const badgeStyles = {
  // API Key status
  ACTIVE:       "bg-green-50 text-green-700 border border-green-200",
  INACTIVE:     "bg-zinc-100 text-zinc-600 border border-zinc-200",
  REVOKED:      "bg-red-50 text-red-700 border border-red-200",
  // User status
  BANNED:       "bg-red-50 text-red-700 border border-red-200",
  SUSPENDED:    "bg-amber-50 text-amber-700 border border-amber-200",
  // Task status
  QUEUED:       "bg-blue-50 text-blue-600 border border-blue-200",
  PROCESSING:   "bg-amber-50 text-amber-700 border border-amber-200",  // + pulse dot
  COMPLETED:    "bg-green-50 text-green-700 border border-green-200",
  FAILED:       "bg-red-50 text-red-700 border border-red-200",
  // Transaction type
  WALLET:       "bg-blue-50 text-blue-700 border border-blue-200",
  CARD:         "bg-violet-50 text-violet-700 border border-violet-200",
  WALLET_TOPUP: "bg-teal-50 text-teal-700 border border-teal-200",
  // Model type
  LLM:          "bg-violet-50 text-violet-700 border border-violet-200",
  OCR:          "bg-teal-50 text-teal-700 border border-teal-200",
  OTHER:        "bg-zinc-100 text-zinc-600 border border-zinc-200",
  // Transaction status
  PENDING:      "bg-amber-50 text-amber-700 border border-amber-200",
}

// All badges: text-xs font-medium px-2.5 py-0.5 rounded-full
```

---

## Recharts Config (apply to every chart)

```tsx
// NEVER use linearGradient fills — solid colors or low-opacity solid fills only

// Shared chart theme
const chartTheme = {
  grid: { stroke: "#f4f4f5", strokeDasharray: "3 3" },  // zinc-100
  axis: { tick: { fontSize: 12, fill: "#71717a" } },     // zinc-500
  tooltip: {
    contentStyle: {
      background: "#ffffff",
      border: "1px solid #e4e4e7",   // zinc-200
      borderRadius: "12px",
      fontSize: "12px",
      boxShadow: "none"
    }
  }
}

// Unit type colors (flat — no gradients)
const unitTypeColors = {
  INPUT_TOKENS:      "#09090b",   // zinc-950
  OUTPUT_TOKENS:     "#52525b",   // zinc-600
  PAGES:             "#0d9488",   // teal-600
  IMAGES:            "#7c3aed",   // violet-600
  AUDIO_SECONDS:     "#2563eb",   // blue-600
  REQUESTS:          "#d97706",   // amber-600
  CHARACTERS:        "#db2777",   // pink-600
  EMBEDDING_TOKENS:  "#16a34a",   // green-600
  CUSTOM_UNITS:      "#ea580c",   // orange-600
}

// Legend: always custom HTML, never default Recharts legend
// Example:
// <div className="flex gap-4 mb-3">
//   {series.map(s => (
//     <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-500">
//       <span className="w-2.5 h-2.5 rounded-sm" style={{background: s.color}} />
//       {s.label}
//     </span>
//   ))}
// </div>
```

---

## User Sidebar Layout

```tsx
// Width: 240px fixed, zinc-950 background
// Logo: Fleebug wordmark top, white, 32px height max
// Nav items: 5 items, no nested groups

const navItems = [
  { label: "Dashboard",    href: "/dashboard",            icon: LayoutDashboard },
  { label: "API Keys",     href: "/dashboard/api-keys",   icon: Key },
  { label: "Models",       href: "/dashboard/models",     icon: Cpu },
  { label: "Usage",        href: "/dashboard/usage",      icon: BarChart2 },
  { label: "Billing",      href: "/dashboard/billing",    icon: CreditCard },
  { label: "Settings",     href: "/dashboard/settings",   icon: Settings },
]

// Active item: bg-white/10 text-white rounded-lg mx-2 px-3 py-2
// Inactive:    text-zinc-400 hover:bg-white/5 hover:text-zinc-200 rounded-lg mx-2 px-3 py-2
// Bottom: user avatar (40px circle) + full_name + email + sign out icon
```

---

## Page 1 — `/` Landing Page

```
Layout: full-width, white background

Navbar (sticky):
  Left:  Fleebug wordmark (zinc-950, 20px font-semibold lowercase)
  Right: "Sign in" (text button, zinc-600) + "Get started" (black filled, rounded-xl px-4 py-2)
  Border-bottom: 1px zinc-100

Hero section (py-24 text-center max-w-3xl mx-auto):
  Eyebrow: "Powered by Fleebug.com" — 12px zinc-400 uppercase tracking-widest mb-4
  Heading: "Route your AI requests.\nPay only for what you use."
    — 52px font-bold zinc-950 leading-tight
  Sub: "Access multiple AI models through one API. Token-based billing, eSewa payments, real-time usage tracking."
    — 18px zinc-500 mt-4 max-w-xl mx-auto
  Buttons (mt-8 flex gap-3 justify-center):
    "Get started" — black bg, white text, rounded-xl px-6 py-3 text-sm font-medium
    "Sign in"     — white bg, zinc-200 border, zinc-700 text, rounded-xl px-6 py-3 text-sm

Feature cards (mt-20 grid grid-cols-3 gap-5 max-w-4xl mx-auto):
  Each card: bg-white border border-zinc-200 rounded-2xl p-6
    Icon (24px, zinc-800, mb-3)
    Title (15px font-semibold zinc-900 mb-1)
    Description (14px zinc-500 leading-relaxed)

  Cards:
    1. [Cpu icon]       "Multiple AI models"
                        "Access LLMs, OCR, and custom models through a single unified API endpoint."
    2. [Zap icon]       "Pay as you go"
                        "Token-based billing. Only pay for exactly what your requests consume."
    3. [Wallet icon]    "eSewa payments"
                        "Top up your balance instantly with eSewa. Built for Nepal."

Pricing preview (mt-20 max-w-2xl mx-auto):
  Heading: "Simple, transparent pricing" (18px font-semibold zinc-900 text-center mb-6)
  Table: bg-zinc-50 rounded-2xl border border-zinc-200 overflow-hidden
    Headers: Model / Type / Pricing (12px zinc-500 uppercase)
    Rows: pulled from active models + billing config
    Example rows (use real data in production):
      GPT-4o       LLM   रू 0.0025/1k input · रू 0.010/1k output
      Claude 3.5   LLM   रू 0.003/1k input · रू 0.015/1k output
      OCR Engine   OCR   रू 0.15/page

Footer (mt-20 border-t border-zinc-100 py-8):
  "© 2025 Fleebug.com · All rights reserved"
  Links: Terms · Privacy (zinc-400, text-sm)
  Centered text
```

---

<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>CoreRouter - Authentication</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "surface-container-lowest": "#0e0e10",
                        "primary": "#ffffff",
                        "outline": "#919191",
                        "on-primary-fixed": "#ffffff",
                        "surface-bright": "#39393b",
                        "outline-variant": "#474747",
                        "tertiary-fixed": "#5d5e66",
                        "on-surface-variant": "#c6c6c6",
                        "on-tertiary-fixed": "#ffffff",
                        "on-primary-fixed-variant": "#e2e2e2",
                        "surface": "#131315",
                        "tertiary-fixed-dim": "#46464e",
                        "surface-tint": "#c6c6c7",
                        "primary-fixed-dim": "#454747",
                        "on-tertiary-container": "#000000",
                        "surface-container": "#201f22",
                        "on-background": "#e5e1e4",
                        "surface-container-highest": "#353437",
                        "surface-container-low": "#1c1b1d",
                        "surface-dim": "#131315",
                        "on-secondary-fixed": "#1a1b22",
                        "on-secondary-container": "#e2e1eb",
                        "inverse-surface": "#e5e1e4",
                        "on-error": "#690005",
                        "error": "#ffb4ab",
                        "on-surface": "#e5e1e4",
                        "on-tertiary": "#1a1b22",
                        "on-primary-container": "#000000",
                        "on-primary": "#1a1c1c",
                        "surface-container-high": "#2a2a2c",
                        "on-tertiary-fixed-variant": "#e3e1ec",
                        "secondary-fixed-dim": "#aaaab3",
                        "surface-variant": "#353437",
                        "inverse-primary": "#5d5f5f",
                        "secondary-container": "#45464e",
                        "on-error-container": "#ffdad6",
                        "secondary-fixed": "#c6c6cf",
                        "tertiary-container": "#909099",
                        "on-secondary-fixed-variant": "#3a3b42",
                        "tertiary": "#e3e1ec",
                        "error-container": "#93000a",
                        "primary-container": "#d4d4d4",
                        "inverse-on-surface": "#313032",
                        "secondary": "#c6c6cf",
                        "primary-fixed": "#5d5f5f",
                        "on-secondary": "#1a1b22",
                        "background": "#131315"
                    },
                    fontFamily: {
                        "headline": ["Geist", "sans-serif"],
                        "body": ["Geist", "sans-serif"],
                        "label": ["Geist", "sans-serif"],
                        "geist": ["Geist", "sans-serif"]
                    },
                    borderRadius: { "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem" },
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
            line-height: 1;
        }
        body {
            font-family: 'Geist', sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .otp-input {
            width: 3rem;
            height: 3.5rem;
            text-align: center;
            font-size: 1.25rem;
            background: #1c1b1d;
            border: 1px solid #474747;
            border-radius: 0.125rem;
        }
    </style>
</head>
<body class="bg-surface-container-lowest text-on-surface selection:bg-primary selection:text-black">
<main class="min-h-screen flex flex-col items-center justify-center p-6 gap-12">
<!-- Fleebug Logo Placeholder -->
<div class="flex flex-col items-center gap-2">
<div class="w-12 h-12 bg-white flex items-center justify-center rounded-sm">
<span class="material-symbols-outlined text-black text-3xl" data-icon="hub">hub</span>
</div>
<h1 class="font-geist font-bold tracking-tighter text-2xl text-white">CoreRouter</h1>
</div>
<div class="w-full max-w-[400px] space-y-12">
<!-- SECTION 1: LOGIN (Email Step) -->
<section class="bg-white p-8 rounded-sm shadow-2xl">
<div class="mb-8">
<h2 class="text-zinc-950 text-xl font-semibold tracking-tight">Sign in</h2>
<p class="text-zinc-500 text-sm mt-1">Enter your email to access your infrastructure.</p>
</div>
<form class="space-y-4">
<div class="space-y-1.5">
<label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email Address</label>
<input class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 outline-none transition-all placeholder:text-zinc-300" placeholder="name@company.com" type="email"/>
</div>
<button class="w-full bg-zinc-950 text-white font-medium py-3 rounded-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2" type="button">
                        Continue
                        <span class="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
</button>
</form>
<div class="mt-6 pt-6 border-t border-zinc-100 flex justify-between items-center">
<span class="text-zinc-400 text-xs">No account?</span>
<a class="text-zinc-950 text-xs font-semibold hover:underline" href="#">Create one now</a>
</div>
</section>
<!-- SECTION 2: LOGIN (Password Step - Simulation) -->
<section class="bg-white p-8 rounded-sm border border-zinc-100">
<div class="mb-8">
<button class="text-zinc-400 hover:text-zinc-950 transition-colors mb-4 flex items-center gap-1">
<span class="material-symbols-outlined text-sm" data-icon="arrow_back">arrow_back</span>
<span class="text-xs font-medium">back</span>
</button>
<h2 class="text-zinc-950 text-xl font-semibold tracking-tight">Welcome back</h2>
<p class="text-zinc-500 text-sm mt-1">admin@corerouter.ai</p>
</div>
<form class="space-y-4">
<div class="space-y-1.5">
<div class="flex justify-between items-end">
<label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Password</label>
<a class="text-[10px] font-bold uppercase tracking-widest text-zinc-950 hover:underline" href="#">Forgot?</a>
</div>
<div class="relative">
<input class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 outline-none transition-all" type="password" value="••••••••"/>
<button class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950" type="button">
<span class="material-symbols-outlined text-xl" data-icon="visibility">visibility</span>
</button>
</div>
</div>
<button class="w-full bg-zinc-950 text-white font-medium py-3 rounded-sm hover:opacity-90 transition-opacity" type="button">
                        Sign in
                    </button>
</form>
</section>
<!-- SECTION 3: REGISTER (Progress & OTP Step) -->
<section class="bg-surface p-8 rounded-sm border border-outline-variant/30">
<div class="flex items-center justify-center gap-2 mb-10">
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
<div class="w-1.5 h-1.5 rounded-full bg-outline-variant"></div>
</div>
<div class="mb-8 text-center">
<h2 class="text-white text-xl font-semibold tracking-tight">Verify email</h2>
<p class="text-on-surface-variant text-sm mt-1">We've sent a code to your inbox</p>
</div>
<form class="space-y-8">
<div class="flex justify-center gap-2">
<input class="otp-input text-white focus:border-primary focus:ring-0" maxlength="1" placeholder="0" type="text"/>
<input class="otp-input text-white focus:border-primary focus:ring-0" maxlength="1" placeholder="0" type="text"/>
<input class="otp-input text-white focus:border-primary focus:ring-0" maxlength="1" placeholder="0" type="text"/>
<input class="otp-input text-white focus:border-primary focus:ring-0" maxlength="1" placeholder="0" type="text"/>
<input class="otp-input text-white focus:border-primary focus:ring-0" maxlength="1" placeholder="0" type="text"/>
<input class="otp-input text-white focus:border-primary focus:ring-0" maxlength="1" placeholder="0" type="text"/>
</div>
<div class="space-y-4">
<button class="w-full bg-white text-zinc-950 font-semibold py-3 rounded-sm hover:bg-zinc-200 transition-colors" type="button">
                            Verify Code
                        </button>
<button class="w-full text-zinc-400 text-xs font-medium hover:text-white transition-colors" type="button">
                            Resend code (45s)
                        </button>
</div>
</form>
</section>
<!-- SECTION 4: REGISTER (Final Step - Form) -->
<section class="bg-surface p-8 rounded-sm border border-outline-variant/30">
<div class="flex items-center justify-center gap-2 mb-10">
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
</div>
<div class="mb-8">
<h2 class="text-white text-xl font-semibold tracking-tight">Complete Profile</h2>
<p class="text-on-surface-variant text-sm mt-1">Setup your architect credentials</p>
</div>
<form class="space-y-5">
<div class="space-y-1.5">
<label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Full Name</label>
<input class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant text-white focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-zinc-600" placeholder="John Architect" type="text"/>
</div>
<div class="space-y-1.5">
<label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Create Password</label>
<input class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant text-white focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-zinc-600" placeholder="••••••••" type="password"/>
</div>
<div class="space-y-1.5">
<label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Confirm Password</label>
<input class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant text-white focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-zinc-600" placeholder="••••••••" type="password"/>
</div>
<button class="w-full bg-white text-zinc-950 font-semibold py-3 rounded-sm hover:bg-zinc-200 transition-colors mt-4" type="button">
                        Create Account
                    </button>
</form>
<p class="mt-8 text-center text-[10px] text-zinc-500 leading-relaxed">
                    By clicking Create Account, you agree to our <a class="text-white hover:underline" href="#">Terms of Service</a> and <a class="text-white hover:underline" href="#">Infrastructure Policy</a>.
                </p>
</section>
</div>
<!-- Footer / Branding Bottom -->
<footer class="mt-12 text-center">
<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Industrial Strength AI Routing • CoreRouter System v4.0</p>
</footer>
</main>
</body></html>

## Page 4 — `/dashboard` Home

```
Page header:
  "Good morning, {first_name}" or "Good evening" — 20px font-semibold zinc-950
  Date: "Tuesday, January 14" — 13px zinc-400

Top row — Balance card + stat cards (grid grid-cols-4 gap-4):

  Balance card (col-span-1, special treatment):
    bg-zinc-950 text-white rounded-2xl p-5
    Label: "Your balance" (12px zinc-400)
    Amount: "रू 2,450.00" (28px font-semibold white)
    "Add balance →" link (12px zinc-300 mt-2, underline on hover)

  3 smaller stat cards (bg-white border border-zinc-200 rounded-2xl p-5 each):
    Active API keys:    count (24px semibold zinc-950) + label (12px zinc-500)
    Tasks this month:   count + label
    Spend this month:   "रू X.XX" (in green-600 if positive) + label

Spend chart more than half (mt-6):
  Section label: "Spending — last (week,mos,6mos,year) days there should be a drop down to select the timframe and chart will be adjusted on the basis of that" (13px font-medium zinc-500 mb-3)
  Recharts LineChart, height 180px
  Single line: zinc-950 stroke, strokeWidth 2
  Area fill: rgba(9,9,11,0.04) — NOT a gradient, a solid low-opacity fill
  No legend needed (single series)

round Pie chart(less than half) of the most type of models used like LLM, OCR or like anything

Two-column layout below chart (grid grid-cols-3 gap-5 mt-6):

 Left column (col-span-2) — Recent activity:
  Section label: "Recent activity" (13px font-medium zinc-500 mb-3)

  List of last 7 activities:
    Each row (flex justify-between items-center py-3 border-b border-zinc-100 last:border-0):

      Left:
        Action description (13px zinc-900)
        (e.g. "API key created", "API key revoked", "Wallet topped up via eSewa")

      Right:
        Relative time (11px zinc-400)
        (e.g. "2 min ago", "5 min ago")

  "View all activity →" link (12px zinc-400 mt-3 block text-right)


  Right column (col-span-1) — Quick actions:
    Section label: "Quick actions" (13px font-medium zinc-500 mb-3)
    4 action cards (stack, gap-2):
      Each card: bg-white border border-zinc-200 rounded-xl px-4 py-3
                 flex items-center gap-3 cursor-pointer
                 hover:bg-zinc-50 hover:border-zinc-300 transition-colors
        Icon (16px zinc-600) + Label (13px zinc-900 font-medium)
      Actions: "New API key" · "Add balance" · "Browse models" · "View usage"
      Each links to relevant page
```

---

## Page 5 — `/dashboard/api-keys`

```
Header row (flex justify-between items-center mb-6):
  "Your API keys" (20px font-semibold zinc-950)
  "New key" button: bg-zinc-950 text-white text-sm rounded-xl px-4 py-2

Empty state (if no keys):
  Centered, py-20:
  Key icon (40px zinc-300 mb-4)
  "No API keys yet" (16px font-semibold zinc-900)
  "Create a key to start making requests" (14px zinc-500 mt-1)
  "Create your first key" button (black, rounded-xl, mt-4)

Keys as cards (grid grid-cols-1 gap-3):
  Each key card: bg-white border border-zinc-200 rounded-2xl p-5

  Card header (flex justify-between items-start):
    Left: description/name (15px font-semibold zinc-950)
          status badge below (mt-1)
    Right: action icons (16px each, zinc-400 hover:zinc-700):
           [Copy masked key] [···  dropdown: Deactivate / Delete]

  Masked key display:
    Font: font-mono text-sm zinc-600 bg-zinc-50 rounded-lg px-3 py-1.5 mt-3 inline-block
    Format: sk-••••{last4chars}
    Copy icon right of it

  Limits section (mt-4 grid grid-cols-2 gap-4):
    Daily limit card:
      Label: "Daily" (11px zinc-400)
      Usage bar: Progress component, h-1.5, rounded-full
        <70%: bg-green-500  70-90%: bg-amber-500  >90%: bg-red-500
      Usage text: "{used} / {limit}" (12px zinc-600)
    Monthly limit card: same pattern

  Footer (flex justify-between items-center mt-4 pt-4 border-t border-zinc-100):
    "Last used: {relative}" (12px zinc-400) or "Never used" (zinc-300)
    "Created {date}" (12px zinc-400)

"New key" modal (shadcn Dialog):
  Title: "Create new API key"
  Description input: placeholder "e.g. Production server, Development..."
  Note (12px zinc-500 mt-2): "Daily and monthly limits are set by your plan."
  Buttons: Cancel (outline) + "Create key" (black)

One-time reveal modal (after creation):
  Red alert banner at top:
    "Copy this key now. It will never be shown again."
  Key display:
    Full key in monospace, bg-zinc-950 text-green-400 rounded-xl p-4 text-sm
    Copy button: "Copy key" → changes to "Copied ✓" for 3 seconds
  Dismiss: "I've copied my key" button (full-width black)
  Standard close disabled — force "I've copied" acknowledgment

Delete confirmation (shadcn AlertDialog):
  "Delete this API key?"
  "Any applications using sk-••••{last4} will immediately stop working."
  "Cancel" + "Delete key" (destructive red)
```

---

## Page 6 — `/dashboard/models`
Please remeber i want this models section and also the detail model page to be assseible without the like the login and ashboard so how you can manage that please manage that for me how could we do that manage please  
```
Header:
  "Available models" (20px font-semibold zinc-950)
  Sub: "Browse models available on the platform" (13px zinc-400 mt-1)

Filter row (flex gap-2 mt-5 mb-5):
  Type tabs (shadcn Tabs or custom pill group):
    All · LLM · OCR · Other
    Active: bg-zinc-950 text-white rounded-full px-3 py-1.5 text-sm
    Inactive: text-zinc-500 rounded-full px-3 py-1.5 text-sm hover:bg-zinc-100
  Search input (ml-auto, w-56):
    placeholder "Search models..." rounded-xl border-zinc-200

Only show models with status = ACTIVE

Model cards (grid grid-cols-3 gap-4):
  Each card: bg-white border border-zinc-200 rounded-2xl p-5
             hover:border-zinc-300 cursor-pointer transition-colors

  Card layout:
    Top row (flex justify-between items-start):
      Model fullname (15px font-semibold zinc-950)
      Type badge (LLM/OCR/OTHER)

    Provider (12px zinc-400 mt-0.5): "{provider}"

    Description (13px zinc-500 leading-relaxed mt-3 line-clamp-2):
      2 lines max, ellipsis overflow

    Pricing preview (mt-4 pt-4 border-t border-zinc-100):
      Pull from billing_configs.pricing_type and pricing_metadata
      Format examples:
        PER_TOKEN:   "From रू 0.0025 / 1k tokens"
        PER_PAGE:    "रू 0.15 / page"
        PER_REQUEST: "रू 0.05 / request"
      Text: 12px zinc-600 font-medium

    "View details →" (12px zinc-400 mt-3 hover:text-zinc-700)

Model detail drawer (shadcn Sheet, right side, 520px):
  Header: fullname (18px semibold) + provider chip + type badge
  Username: font-mono text-sm zinc-400 mt-1

  Tabs inside drawer: "Overview" · "Documentation" · "Pricing"

  Overview tab:
    Description (full, not truncated)
    Metadata rendered as clean key-value list:
      context_length: "128,000 tokens"
      supports_vision: "Yes"
      supports_tools: "Yes"

  Documentation tab:
    If zero docs: "No documentation available yet" (zinc-400 centered)
    If docs exist: list each api_documentation entry
      Title (15px semibold) + content (rendered as plain text with basic formatting)
      Divider between sections

  Pricing tab:
    Pricing type pill
    Rates table:
      Unit type | Rate
      Input tokens | रू 0.0025 / 1k
      Output tokens | रू 0.010 / 1k
    Show tiers if present in pricing_metadata

  Footer of drawer:
    "Use this model" button (full-width black)
    → links to /dashboard/api-keys (scrolls to create section or opens modal)
```

---

## Page 7 — `/dashboard/usage`

```
Header row (flex justify-between items-center mb-6):
  "Usage & activity" (20px font-semibold zinc-950)
  Period selector (shadcn Select, w-40):
    This month · Last month · Last 30 days · Custom range
    Default: This month

4 summary cards (grid grid-cols-4 gap-4 mb-6):
  Total spend (रू):    large value + delta vs previous period (↑12% green or ↓3% red, text-xs)
  Total requests:       count + delta
  Most used model:      model fullname (14px, truncate if long)
  Avg cost / request:   "रू X.XXXX" + delta

Usage chart (mb-6):
  Section label: "Daily cost breakdown" (13px font-medium zinc-500 mb-3)
  Recharts BarChart (stacked), height 220px
  One bar per day, stacked by usage_unit_type
  Only render unit types with actual data
  Colors: use unitTypeColors constant defined in Recharts Config section
  Custom legend above chart (colored squares + unit type labels)
  Tooltip: shows date + breakdown per unit type + total

Tasks table:
  Section label: "Activity log" (13px font-medium zinc-500 mb-3)

  Filter row (flex gap-2 mb-3):
    Status pills: All · Queued · Processing · Completed · Failed
    Model filter (Select dropdown, ml-auto)

  Table (bg-white border border-zinc-200 rounded-2xl overflow-hidden):
    thead: bg-zinc-50, th text-xs uppercase tracking-wide text-zinc-500 px-4 py-3
    tbody: tr border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer

    Columns:
      Task         font-mono text-xs zinc-500 (first 12 chars + "...")
      Model        13px zinc-900
      Status       badge
      Cost         "रू X.XXXXXX" text-right font-mono text-sm
      Time         formatDuration(processing_time_ms) text-right text-sm zinc-500
      Date         formatRelative(created_at) text-right text-sm zinc-400

    Empty state: centered in table, "No tasks in this period" (zinc-400)

  Row click → Task detail drawer (Sheet, right, 500px):
    Header: Task ID (full, font-mono text-sm) + status badge
    
    Info grid (grid grid-cols-2 gap-3 mt-4):
      Model · API Key (masked) · Created · Completed · Processing time
    
    If FAILED → error block first:
      bg-red-50 border border-red-200 rounded-xl p-4 mt-4
      "Error" label (11px red-600 font-medium uppercase mb-1)
      result_payload content (font-mono text-xs red-800)
    
    Request payload (collapsible, mt-4):
      Toggle header: "Request payload" (13px zinc-700 font-medium) + chevron
      Content: bg-zinc-950 text-zinc-200 rounded-xl p-4 font-mono text-xs
               max-height 200px overflow-y-auto
               Truncated at 500 chars with "Show full" toggle
    
    Result payload (collapsible, mt-3, same treatment)
    
    Cost breakdown (mt-4):
      "Cost breakdown" label (13px zinc-700 font-medium mb-2)
      Mini table: Unit type · Quantity · Rate · Cost
      Total row (font-medium border-t border-zinc-100 pt-2)
```

---

## Page 8 — `/dashboard/billing`

```
Header: "Billing" (20px font-semibold zinc-950)

1. (Balance card (bg-zinc-950 text-white rounded-2xl p-6 mt-5):
  "Current balance" (12px zinc-400)
  "रू 2,450.00" (36px font-semibold white mt-1)
  If balance < 100: amber warning below "Low balance — consider adding funds"
  If balance ≤ 0: red warning "Insufficient balance — API requests will be rejected"
  
  "Add balance" button (bg-white text-zinc-950 rounded-xl px-5 py-2.5 mt-4 text-sm font-medium)

Add balance modal (shadcn Dialog):
  Title: "Add balance")

2. Credits Used this month also with like how many it has been upfrom the last month 
  
  Quick amount buttons (grid grid-cols-4 gap-2 mb-4):
    [रू 500] [रू 1,000] [रू 2,000] [रू 5,000]
    Selected: bg-zinc-950 text-white border-zinc-950
    Unselected: bg-white text-zinc-700 border-zinc-200
    All: rounded-xl border text-sm font-medium py-2 text-center cursor-pointer
  
  Custom amount:
    Input: "Or enter amount" placeholder, rounded-xl, prefix "रू " inside input
    Min amount: 100, show validation if below
  
  eSewa button (mt-4):
    bg-[#60BB46] text-white rounded-xl w-full py-3 font-medium
    flex items-center justify-center gap-2
    eSewa logo/text + "Pay with eSewa"
    This is the ONLY place this green color appears in the entire app
  
  Note below button: "Powered by eSewa · Secure payment · Nepal's trusted wallet" 
    (11px zinc-400 text-center mt-2)


2nd part will be like the middle pat will be like the line graph of the user balance on like how this works like up down and all the user balance and everything linechart with red trend chart for this and also like hsi will be like the flow of lke 30 days they can see or like their 15 days or like 7 days or liek 3mosor 6mos 
then only at botton will be the capped 6 transaction history with pagination 

Transaction history (mt-8):
  Section label: "Transaction history" (15px font-semibold zinc-950 mb-4)
  
  Filter row: Type tabs (All / Wallet / Card / Wallet Topup) + date range select

  Table (bg-white border border-zinc-200 rounded-2xl overflow-hidden):
    Columns:
      eSewa ID    font-mono text-xs zinc-500 truncate max-w-[140px]
                  copy icon on hover (Clipboard, 12px)
      Type        badge
      Amount      "रू {amount}" text-right font-mono text-sm font-medium
      Status      badge (PENDING/COMPLETED/FAILED)
      Date        formatRelative(created_at) text-sm zinc-400 text-right

  Row click → Transaction drawer (Sheet, right, 400px):
    eSewa Transaction ID (large, copyable):
      font-mono text-sm zinc-950 bg-zinc-50 rounded-xl p-3
      "Copy" button below
    
    Details grid:
      Type badge · Amount (large, रू X.XX) · Status badge
      Created at (full timestamp)
      Completed at (full timestamp, or "—" if null)
      Product code (or "—" if null)
    
    No actions — transactions are read-only
```

---

## Page 9(please make this ui the best it shoulnt look empty and all and use the profile image as avatar if nothing is there simple acvarat of man ) — `/dashboard/settings`

```
Header: "Settings" (20px font-semibold zinc-950)

Layout: max-w-xl (settings pages should never be full-width — too hard to read)

Section 1 — Profile (mb-8):
  Section heading: "Profile" (15px font-semibold zinc-950 mb-4)
  
  Avatar upload:
    40px circle avatar, centered (or left-aligned — pick one, be consistent)
    If profile_image: show image
    If null: initials from full_name (bg-zinc-100 text-zinc-600 font-medium)
    Click avatar → hidden file input triggers
    Below avatar: "Click to change photo" (12px zinc-400)
  
  Form fields (mt-5 space-y-4):
    Full name: label + input (rounded-xl)
    Email:     label + read-only input (bg-zinc-50 cursor-not-allowed zinc-400)
               hint: "Email cannot be changed" (11px zinc-400 mt-1)
    Email subscribed:
               label + Switch (shadcn) inline (flex justify-between items-center)
               sublabel: "Receive product updates and announcements" (12px zinc-400)
  
  "Save profile" button (mt-5, black, rounded-xl px-5 py-2)
  Success state: "Saved ✓" inline confirmation next to button (green-600 text-sm)

Divider (border-t border-zinc-100 my-8)

Section 2 — Security (mb-8):
  Section heading: "Security" (15px font-semibold zinc-950 mb-4)
  
  "Change password" form (space-y-4):
    Current password (show/hide toggle)
    New password (show/hide toggle)
    Password strength bar:
      4px h bar, rounded-full, full-width
      Segments fill based on password score
      Colors: red/amber/blue/green
      Label: "Weak" / "Fair" / "Good" / "Strong" (text-xs, right-aligned)
    Confirm new password
  
  "Update password" button (mt-4, black, rounded-xl)
  Error inline: "Current password is incorrect" (red text-sm)

Divider (border-t border-zinc-100 my-8)

Section 3 — Danger zone:
  Section heading: "Danger zone" (15px font-semibold zinc-950 mb-4)
  
  Container: bg-zinc-50 border border-zinc-200 rounded-2xl p-5
    Description row (flex justify-between items-center):
      Left:
        "Delete account" (13px font-semibold zinc-900)
        "Permanently delete your account, API keys, and all usage data." (12px zinc-500 mt-0.5)
      Right:
        "Delete account" button — border border-red-200 text-red-600 rounded-xl px-4 py-2 text-sm
        hover: bg-red-50
  
  Delete confirmation dialog (shadcn AlertDialog):
    Title: "Delete your account?"
    Description: "This will permanently delete your account, all API keys, tasks, and usage records. This cannot be undone."
    
    Confirmation input:
      'Type "DELETE" to confirm' label
      Text input — submit button disabled until value === "DELETE"
    
    Buttons: "Cancel" + "Delete my account" (bg-red-600 text-white)
```

---

## Shared Components

### `<StatCard>`
```tsx
// bg-white border border-zinc-200 rounded-2xl p-5
// label: text-xs text-zinc-500 mb-1
// value: text-2xl font-semibold text-zinc-950
// delta (optional): text-xs mt-1 flex items-center gap-1
//   positive: text-green-600  negative: text-red-600
//   arrow icon (TrendingUp/TrendingDown, 12px)
```

### `<MaskedKey>`
```tsx
// Shows: sk-••••{last4}
// Font: font-mono text-sm text-zinc-500
// Copy button (Clipboard icon, 14px, zinc-400) on hover
// On copy: icon changes to Check for 2 seconds
```

### `<StatusBadge>`
```tsx
// Use badgeStyles mapping from Color section
// Base classes: text-xs font-medium px-2.5 py-0.5 rounded-full
// PROCESSING gets extra: animate-pulse dot before text
//   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5 inline-block" />
```

### `<OneTimeRevealModal>`
```tsx
// Used after creating API key or service token
// Cannot be closed without clicking "I've copied it"
// Full key: font-mono text-sm bg-zinc-950 text-green-400 rounded-xl p-4 break-all
// Warning banner: bg-red-50 border-red-200 text-red-800 text-sm rounded-xl p-3 mb-4
// Copy button: changes to "Copied ✓" for 3s on click
// Dismiss: "I've copied my key" — full-width black button
// onOpenChange blocked until user clicks dismiss
```

### `<TaskDetailDrawer>`
```tsx
// shadcn Sheet, side="right", className="w-[500px]"
// Props: taskId, onClose
// Fetches task + usage_records on open
// Shows all task fields + cost breakdown table
// Failed tasks: shows result_payload first in red-tinted code block
```

---

## What NOT To Build

```
✗ No gradient fills anywhere in Recharts (no linearGradient, no gradientId)
✗ No card box-shadows — borders only  
✗ No square corners (border-radius minimum rounded-lg everywhere)
✗ No full API key value ever shown after the one-time reveal
✗ No admin-only pages (models management, billing config editing, user management)
✗ No toast for authentication errors — always inline
✗ No dark mode
✗ No search globally — only page-specific search where listed
✗ No related_request_id from transactions — ignore entirely
✗ No social OAuth buttons
✗ No decorative animations — only functional transitions (hover states, 150ms ease)
✗ No heavy charting (no D3, no complex visualizations — Recharts only)
```

---

*Build the user-facing product exactly as described. Every page, every component, every formatter is specified. When ambiguous, choose the simpler option.*
