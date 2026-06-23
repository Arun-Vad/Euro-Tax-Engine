import type { Jurisdiction, Category } from "@workspace/db";

const EU_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

export type TaxTreatment =
  | "STANDARD"
  | "REDUCED"
  | "ZERO_RATED"
  | "EXEMPT"
  | "REVERSE_CHARGE"
  | "EXPORT";

/**
 * Thrown when the engine cannot compute a defensible tax outcome because of
 * missing or invalid configuration (e.g. no registered jurisdiction for a
 * taxable destination). Callers should surface this as a 4xx rather than
 * silently persisting a zero-tax booking.
 */
export class TaxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaxConfigError";
  }
}

/**
 * Basic structural validation for an EU VAT identification number. Checks that
 * it begins with a two-letter EU country prefix followed by 2-12 alphanumeric
 * characters. This is a format check only — it does not confirm the number is
 * live in VIES.
 */
export function isValidEuVatId(vatId: string | null | undefined): boolean {
  if (!vatId) return false;
  const cleaned = vatId.replace(/[\s-]/g, "").toUpperCase();
  const match = /^([A-Z]{2})([0-9A-Z]{2,12})$/.exec(cleaned);
  if (!match) return false;
  // Greece uses "EL" as its VAT prefix instead of its ISO code "GR".
  const prefix = match[1] === "EL" ? "GR" : match[1];
  return EU_CODES.has(prefix);
}

export interface EngineInput {
  sellerCountry: string;
  buyerCountry: string;
  customerType: "B2B" | "B2C";
  customerVatId?: string | null;
  netAmount: number;
  category: Category;
}

export interface EngineResult {
  netAmount: number;
  taxRate: number;
  taxAmount: number;
  grossAmount: number;
  taxTreatment: TaxTreatment;
  currency: string;
  jurisdictionName: string | null;
  jurisdictionCode: string | null;
  explanation: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isEu(code: string): boolean {
  return EU_CODES.has(code.toUpperCase());
}

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Resolve the rate that applies for a jurisdiction given the product category's
 * rate tier. Returns a percentage (e.g. 19 for 19%).
 */
function rateForCategory(jur: Jurisdiction, category: Category): number {
  switch (category.rateType) {
    case "zero":
    case "exempt":
      return 0;
    case "reduced":
      return jur.reducedRate ?? jur.standardRate;
    case "standard":
    default:
      return jur.standardRate;
  }
}

function build(
  netAmount: number,
  taxRate: number,
  treatment: TaxTreatment,
  currency: string,
  jur: Jurisdiction | null,
  explanation: string,
): EngineResult {
  const taxAmount = round2((netAmount * taxRate) / 100);
  return {
    netAmount: round2(netAmount),
    taxRate,
    taxAmount,
    grossAmount: round2(netAmount + taxAmount),
    taxTreatment: treatment,
    currency,
    jurisdictionName: jur?.name ?? null,
    jurisdictionCode: jur?.code ?? null,
    explanation,
  };
}

/**
 * Core indirect tax engine. Determines the destination jurisdiction, the tax
 * treatment, and the applicable rate for a single transaction line.
 *
 * Rules implemented:
 * - Domestic sale: destination jurisdiction rate, by category tier.
 * - EU cross-border B2B with a valid VAT id: reverse charge (0%, buyer accounts).
 * - EU cross-border B2C: taxed at the buyer's (destination) rate.
 * - Sale from EU to a non-EU country: export, zero-rated.
 * - US: sales tax applies at the destination (ship-to) state rate.
 */
export function calculateTax(
  input: EngineInput,
  jurisdictions: Jurisdiction[],
): EngineResult {
  const seller = normalize(input.sellerCountry);
  const buyer = normalize(input.buyerCountry);
  const byCode = new Map(jurisdictions.map((j) => [normalize(j.code), j]));

  const destination = byCode.get(buyer) ?? null;
  const origin = byCode.get(seller) ?? null;
  const currency = destination?.currency ?? origin?.currency ?? "EUR";

  const category = input.category;

  // Exempt / zero-rated product categories short-circuit everything.
  if (category.rateType === "exempt") {
    return build(
      input.netAmount,
      0,
      "EXEMPT",
      currency,
      destination,
      `Product category "${category.name}" is exempt from indirect tax — no tax is charged.`,
    );
  }
  if (category.rateType === "zero") {
    return build(
      input.netAmount,
      0,
      "ZERO_RATED",
      currency,
      destination,
      `Product category "${category.name}" is zero-rated — taxable at 0%.`,
    );
  }

  const sellerEu = isEu(seller);
  const buyerEu = isEu(buyer);

  // Domestic sale (same country).
  if (seller === buyer) {
    if (!destination) {
      throw new TaxConfigError(
        `No registered jurisdiction found for ${buyer}. Add the jurisdiction before recording taxable transactions there.`,
      );
    }
    const rate = rateForCategory(destination, category);
    const treatment: TaxTreatment = category.rateType === "reduced" ? "REDUCED" : "STANDARD";
    const tierLabel = treatment === "REDUCED" ? "reduced" : "standard";
    return build(
      input.netAmount,
      rate,
      treatment,
      currency,
      destination,
      `Domestic ${destination.taxType} in ${destination.name} at the ${tierLabel} rate of ${rate}% for "${category.name}".`,
    );
  }

  // EU cross-border.
  if (sellerEu && buyerEu) {
    if (input.customerType === "B2B" && isValidEuVatId(input.customerVatId)) {
      return build(
        input.netAmount,
        0,
        "REVERSE_CHARGE",
        currency,
        destination,
        `Intra-EU B2B supply (${seller} → ${buyer}). Reverse charge applies: the buyer self-accounts for VAT under Article 196. Seller charges 0%.`,
      );
    }
    // B2C cross-border, or B2B without a valid VAT id: destination rate.
    if (!destination) {
      throw new TaxConfigError(
        `No registered jurisdiction found for destination ${buyer}. Add the jurisdiction before recording taxable transactions there.`,
      );
    }
    const rate = rateForCategory(destination, category);
    const treatment: TaxTreatment = category.rateType === "reduced" ? "REDUCED" : "STANDARD";
    const reason =
      input.customerType === "B2B"
        ? "B2B without a valid VAT id, so reverse charge cannot apply"
        : "B2C distance sale";
    return build(
      input.netAmount,
      rate,
      treatment,
      currency,
      destination,
      `Intra-EU ${reason} (${seller} → ${buyer}). Taxed at the destination VAT rate of ${rate}% in ${destination.name}.`,
    );
  }

  // Export out of the EU.
  if (sellerEu && !buyerEu) {
    return build(
      input.netAmount,
      0,
      "EXPORT",
      currency,
      destination,
      `Export of goods/services from ${seller} to non-EU ${buyer}. Zero-rated as an export.`,
    );
  }

  // US (and other) destination-based sales/use tax.
  if (destination) {
    const rate = rateForCategory(destination, category);
    const treatment: TaxTreatment = category.rateType === "reduced" ? "REDUCED" : "STANDARD";
    const tierLabel = treatment === "REDUCED" ? "reduced" : "standard";
    return build(
      input.netAmount,
      rate,
      treatment,
      currency,
      destination,
      `Destination-based ${destination.taxType} in ${destination.name} at the ${tierLabel} rate of ${rate}% (ship-to ${buyer}).`,
    );
  }

  // No destination jurisdiction on file for a taxable cross-border supply.
  throw new TaxConfigError(
    `No registered jurisdiction found for destination ${buyer}. Add the jurisdiction before recording taxable transactions there.`,
  );
}
