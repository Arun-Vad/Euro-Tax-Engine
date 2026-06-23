import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, jurisdictionsTable } from "@workspace/db";
import {
  CreateJurisdictionBody,
  UpdateJurisdictionBody,
  UpdateJurisdictionParams,
  GetJurisdictionParams,
  DeleteJurisdictionParams,
  ListJurisdictionsResponse,
  GetJurisdictionResponse,
  UpdateJurisdictionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/jurisdictions", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(jurisdictionsTable)
    .orderBy(jurisdictionsTable.name);
  res.json(ListJurisdictionsResponse.parse(rows));
});

router.post("/jurisdictions", async (req, res): Promise<void> => {
  const parsed = CreateJurisdictionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(jurisdictionsTable)
    .values({
      ...parsed.data,
      active: parsed.data.active ?? true,
    })
    .returning();
  res.status(201).json(GetJurisdictionResponse.parse(row));
});

router.get("/jurisdictions/:id", async (req, res): Promise<void> => {
  const params = GetJurisdictionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(jurisdictionsTable)
    .where(eq(jurisdictionsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Jurisdiction not found" });
    return;
  }
  res.json(GetJurisdictionResponse.parse(row));
});

router.patch("/jurisdictions/:id", async (req, res): Promise<void> => {
  const params = UpdateJurisdictionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateJurisdictionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(jurisdictionsTable)
    .set(parsed.data)
    .where(eq(jurisdictionsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Jurisdiction not found" });
    return;
  }
  res.json(UpdateJurisdictionResponse.parse(row));
});

router.delete("/jurisdictions/:id", async (req, res): Promise<void> => {
  const params = DeleteJurisdictionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(jurisdictionsTable)
    .where(eq(jurisdictionsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Jurisdiction not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
