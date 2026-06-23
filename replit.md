# Global Tax Engine

An indirect tax engine for a global enterprise: computes VAT (Europe) and Sales/Use Tax (US/Americas) on transactions, with configurable jurisdiction rates, product tax categories, B2B/B2C handling (including EU reverse-charge), and a compliance dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract (source of truth): `lib/api-spec/openapi.yaml` → run codegen to regenerate hooks/schemas
- Generated Zod schemas + React Query hooks: `lib/api-zod/src/generated/`
- DB schema: `lib/db/src/schema/{jurisdictions,categories,transactions}.ts` (re-exported in `index.ts`)
- Tax engine logic: `artifacts/api-server/src/lib/tax-engine.ts`
- API routes: `artifacts/api-server/src/routes/` (registered in `index.ts`)
- Frontend (React + Vite): `artifacts/tax-engine/src/` — pages in `src/pages/`

## Architecture decisions

- Tax engine is a pure function `calculateTax(input, jurisdictions)`; routes fetch the category + jurisdictions and pass them in.
- Engine throws `TaxConfigError` (→ 400) for missing jurisdictions on taxable supplies, rather than silently zero-rating. EU→non-EU exports are legitimately zero-rated without a destination jurisdiction.
- Intra-EU B2B reverse charge requires a structurally valid EU VAT ID (`isValidEuVatId`); invalid IDs fall through to destination taxation.
- Transactions denormalize computed fields (rate, tax, treatment, jurisdiction/category names, explanation) at creation time so the ledger is an immutable record even if config later changes.
- Money/rates stored as `doublePrecision`; `transactionDate` is text (YYYY-MM-DD); `createdAt` is timestamptz.

## Product

- Tax calculator (hero): compute VAT / sales tax for a single transaction with a plain-language explanation of the treatment.
- Transactions ledger: record transactions (auto-calculated), filter, and delete.
- Jurisdictions & Categories: full CRUD for rates and product tax tiers.
- Compliance dashboard: liability summary, EU vs US split, tax by jurisdiction, filing periods, recent activity.

## User preferences

- No emojis in the UI.

## Gotchas

- Do NOT restart the `tax-engine` web workflow while a design subagent is mid-build (shows a broken app).
- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before relying on hooks/schemas.
- First-run `tsc` typecheck is slow and may time out from bash; the running workflows are the source of truth for health.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
