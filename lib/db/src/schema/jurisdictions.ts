import { pgTable, serial, text, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const jurisdictionsTable = pgTable("jurisdictions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  region: text("region").notNull(),
  taxType: text("tax_type").notNull(),
  standardRate: doublePrecision("standard_rate").notNull(),
  reducedRate: doublePrecision("reduced_rate"),
  currency: text("currency").notNull(),
  active: boolean("active").notNull().default(true),
});

export type Jurisdiction = typeof jurisdictionsTable.$inferSelect;
export type InsertJurisdiction = typeof jurisdictionsTable.$inferInsert;
