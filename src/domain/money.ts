/** Accepts optional € prefix/suffix, decimal dot or comma, no grouping or free text. */
export function parseEuroToCents(input: string): number {
  const match = /^(?:€\s*)?(\d+)(?:[.,](\d+))?(?:\s*€)?$/.exec(input.trim());
  if (!match || (input.trim().startsWith("€") && input.trim().endsWith("€")))
    throw new Error("Enter a non-negative euro amount such as 1.20 or 1,20.");
  const fraction = match[2] ?? "";
  if (/[1-9]/.test(fraction.slice(2)))
    throw new Error("Prices cannot contain nonzero fractions of a cent.");
  const cents =
    BigInt(match[1]) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Amount is too large.");
  return Number(cents);
}
export function formatEuro(cents: number): string {
  if (!Number.isSafeInteger(cents))
    throw new Error("Expected an integer number of cents.");
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
