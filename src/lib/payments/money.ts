/** Money is kept in pesewas (whole numbers), so sums never drift: GH₵ 1,200.50 = 120050. */

/** "1200", "1,200.5", "GH₵ 1 200.50" -> 120050. null if it isn't an amount. */
export function parseCedis(input: string): number | null {
  const s = input.replace(/gh₵|ghs|ghc|cedis?|[\s,]/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

const fmt = new Intl.NumberFormat("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 120050 -> "GH₵ 1,200.50" */
export const formatCedis = (pesewas: number) => `GH₵ ${fmt.format(pesewas / 100)}`;

/** 120050 -> "1200.50" (for form fields) */
export const cedisInput = (pesewas: number) => (pesewas / 100).toFixed(2);
