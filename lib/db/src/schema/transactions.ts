import { pgTable, serial, text, doublePrecision, integer, timestamp } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull(),
  transactionDate: text("transaction_date").notNull(),
  sellerCountry: text("seller_country").notNull(),
  buyerCountry: text("buyer_country").notNull(),
  region: text("region"),
  customerType: text("customer_type").notNull(),
  customerVatId: text("customer_vat_id"),
  categoryId: integer("category_id"),
  categoryName: text("category_name"),
  jurisdictionName: text("jurisdiction_name"),
  netAmount: doublePrecision("net_amount").notNull(),
  taxRate: doublePrecision("tax_rate").notNull(),
  taxAmount: doublePrecision("tax_amount").notNull(),
  grossAmount: doublePrecision("gross_amount").notNull(),
  taxTreatment: text("tax_treatment").notNull(),
  currency: text("currency").notNull(),
  explanation: text("explanation"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
