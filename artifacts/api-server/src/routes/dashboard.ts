import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, transactionsTable, jurisdictionsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetTaxByJurisdictionResponse,
  GetRecentTransactionsResponse,
  GetFilingSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const rows = await db.select().from(transactionsTable);
  const jurisdictions = await db.select().from(jurisdictionsTable);

  let totalNet = 0;
  let totalTax = 0;
  let totalGross = 0;
  let euTax = 0;
  let usTax = 0;
  let reverseChargeCount = 0;
  const jurisdictionSet = new Set<string>();

  for (const r of rows) {
    totalNet += r.netAmount;
    totalTax += r.taxAmount;
    totalGross += r.grossAmount;
    if (r.region === "EU") euTax += r.taxAmount;
    if (r.region === "US") usTax += r.taxAmount;
    if (r.taxTreatment === "REVERSE_CHARGE") reverseChargeCount += 1;
    if (r.jurisdictionName) jurisdictionSet.add(r.jurisdictionName);
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      totalNet: round2(totalNet),
      totalTax: round2(totalTax),
      totalGross: round2(totalGross),
      transactionCount: rows.length,
      jurisdictionCount: jurisdictionSet.size,
      reverseChargeCount,
      euTax: round2(euTax),
      usTax: round2(usTax),
    }),
  );
});

router.get("/dashboard/by-jurisdiction", async (_req, res): Promise<void> => {
  const rows = await db.select().from(transactionsTable);
  const jurisdictions = await db.select().from(jurisdictionsTable);
  const byCode = new Map(jurisdictions.map((j) => [j.code.toUpperCase(), j]));

  const groups = new Map<
    string,
    {
      jurisdictionName: string;
      jurisdictionCode: string;
      region: string;
      taxType: string;
      transactionCount: number;
      totalNet: number;
      totalTax: number;
    }
  >();

  for (const r of rows) {
    const code = r.buyerCountry.toUpperCase();
    const jur = byCode.get(code);
    const key = code;
    const existing = groups.get(key);
    if (existing) {
      existing.transactionCount += 1;
      existing.totalNet += r.netAmount;
      existing.totalTax += r.taxAmount;
    } else {
      groups.set(key, {
        jurisdictionName: r.jurisdictionName ?? jur?.name ?? r.buyerCountry,
        jurisdictionCode: jur?.code ?? r.buyerCountry,
        region: r.region ?? jur?.region ?? "OTHER",
        taxType: jur?.taxType ?? "VAT",
        transactionCount: 1,
        totalNet: r.netAmount,
        totalTax: r.taxAmount,
      });
    }
  }

  const result = Array.from(groups.values())
    .map((g) => ({
      ...g,
      totalNet: round2(g.totalNet),
      totalTax: round2(g.totalTax),
    }))
    .sort((a, b) => b.totalTax - a.totalTax);

  res.json(GetTaxByJurisdictionResponse.parse(result));
});

router.get("/dashboard/recent-transactions", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(8);
  res.json(
    GetRecentTransactionsResponse.parse(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    ),
  );
});

router.get("/dashboard/filings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(transactionsTable);
  const jurisdictions = await db.select().from(jurisdictionsTable);
  const byCode = new Map(jurisdictions.map((j) => [j.code.toUpperCase(), j]));

  const groups = new Map<
    string,
    {
      period: string;
      jurisdictionName: string;
      jurisdictionCode: string;
      taxType: string;
      currency: string;
      netAmount: number;
      taxAmount: number;
      transactionCount: number;
    }
  >();

  for (const r of rows) {
    const period = (r.transactionDate || "").slice(0, 7) || "unknown";
    const code = r.buyerCountry.toUpperCase();
    const jur = byCode.get(code);
    const key = `${period}|${code}`;
    const existing = groups.get(key);
    if (existing) {
      existing.netAmount += r.netAmount;
      existing.taxAmount += r.taxAmount;
      existing.transactionCount += 1;
    } else {
      groups.set(key, {
        period,
        jurisdictionName: r.jurisdictionName ?? jur?.name ?? r.buyerCountry,
        jurisdictionCode: jur?.code ?? r.buyerCountry,
        taxType: jur?.taxType ?? "VAT",
        currency: r.currency,
        netAmount: r.netAmount,
        taxAmount: r.taxAmount,
        transactionCount: 1,
      });
    }
  }

  const result = Array.from(groups.values())
    .map((g) => ({
      ...g,
      netAmount: round2(g.netAmount),
      taxAmount: round2(g.taxAmount),
    }))
    .sort((a, b) =>
      a.period === b.period
        ? b.taxAmount - a.taxAmount
        : b.period.localeCompare(a.period),
    );

  res.json(GetFilingSummaryResponse.parse(result));
});

export default router;
