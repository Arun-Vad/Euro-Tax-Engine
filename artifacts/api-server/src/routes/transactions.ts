import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, transactionsTable, categoriesTable, jurisdictionsTable } from "@workspace/db";
import {
  CalculateTaxBody,
  CalculateTaxResponse,
  CreateTransactionBody,
  GetTransactionParams,
  GetTransactionResponse,
  DeleteTransactionParams,
  ListTransactionsQueryParams,
  ListTransactionsResponse,
} from "@workspace/api-zod";
import { calculateTax, TaxConfigError } from "../lib/tax-engine";

const router: IRouter = Router();

router.post("/calculate", async (req, res): Promise<void> => {
  const parsed = CalculateTaxBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, parsed.data.categoryId));
  if (!category) {
    res.status(400).json({ error: "Product category not found" });
    return;
  }
  const jurisdictions = await db.select().from(jurisdictionsTable);
  let result;
  try {
    result = calculateTax(
      {
        sellerCountry: parsed.data.sellerCountry,
        buyerCountry: parsed.data.buyerCountry,
        customerType: parsed.data.customerType,
        customerVatId: parsed.data.customerVatId,
        netAmount: parsed.data.netAmount,
        category,
      },
      jurisdictions,
    );
  } catch (err) {
    if (err instanceof TaxConfigError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  res.json(CalculateTaxResponse.parse(result));
});

router.get("/transactions", async (req, res): Promise<void> => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt));
  let filtered = rows;
  if (query.data.region) {
    filtered = filtered.filter((r) => r.region === query.data.region);
  }
  if (query.data.customerType) {
    filtered = filtered.filter((r) => r.customerType === query.data.customerType);
  }
  res.json(
    ListTransactionsResponse.parse(
      filtered.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    ),
  );
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, parsed.data.categoryId));
  if (!category) {
    res.status(400).json({ error: "Product category not found" });
    return;
  }
  const jurisdictions = await db.select().from(jurisdictionsTable);
  let result;
  try {
    result = calculateTax(
      {
        sellerCountry: parsed.data.sellerCountry,
        buyerCountry: parsed.data.buyerCountry,
        customerType: parsed.data.customerType,
        customerVatId: parsed.data.customerVatId,
        netAmount: parsed.data.netAmount,
        category,
      },
      jurisdictions,
    );
  } catch (err) {
    if (err instanceof TaxConfigError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  const region =
    jurisdictions.find(
      (j) => j.code.toUpperCase() === parsed.data.buyerCountry.trim().toUpperCase(),
    )?.region ?? null;

  const [row] = await db
    .insert(transactionsTable)
    .values({
      reference: parsed.data.reference,
      transactionDate: parsed.data.transactionDate,
      sellerCountry: parsed.data.sellerCountry,
      buyerCountry: parsed.data.buyerCountry,
      region,
      customerType: parsed.data.customerType,
      customerVatId: parsed.data.customerVatId ?? null,
      categoryId: category.id,
      categoryName: category.name,
      jurisdictionName: result.jurisdictionName,
      netAmount: result.netAmount,
      taxRate: result.taxRate,
      taxAmount: result.taxAmount,
      grossAmount: result.grossAmount,
      taxTreatment: result.taxTreatment,
      currency: result.currency,
      explanation: result.explanation,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(
    GetTransactionResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }),
  );
});

router.get("/transactions/:id", async (req, res): Promise<void> => {
  const params = GetTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(
    GetTransactionResponse.parse({ ...row, createdAt: row.createdAt.toISOString() }),
  );
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
