import { useMemo } from "react";
import { formatEuro, parseEuroToCents } from "../domain";
import type { StoreComparison } from "../domain";
export default function BudgetBreakdown({
  comparison,
  budget,
  onBudget,
}: {
  comparison: StoreComparison;
  budget: string;
  onBudget: (value: string) => void;
}) {
  const categories = useMemo(() => {
    const sums = new Map<string, number>();
    for (const line of comparison.lines) {
      if (line.lineTotalCents !== null)
        sums.set(
          line.item.category,
          (sums.get(line.item.category) || 0) + line.lineTotalCents,
        );
    }
    return [...sums].sort((a, b) => b[1] - a[1]);
  }, [comparison]);
  let message = "Optional: set a budget for this basket.";
  let error = false;
  if (budget) {
    try {
      const cents = parseEuroToCents(budget);
      if (cents > 10000000) throw Error("Enter a budget up to €100,000.");
      message =
        comparison.status !== "complete"
          ? "A full budget comparison needs a complete basket."
          : cents >= comparison.completeTotalCents!
            ? `${formatEuro(cents - comparison.completeTotalCents!)} within your budget.`
            : `${formatEuro(comparison.completeTotalCents! - cents)} over your budget.`;
    } catch (e) {
      message = e instanceof Error ? e.message : "Enter a valid euro amount.";
      error = true;
    }
  }
  return (
    <section className="budget-breakdown">
      <div className="budget-heading">
        <h3>Your basket budget</h3>
        <div className="budget-input">
          <span>€</span>
          <input
            aria-label="Basket budget in euros"
            inputMode="decimal"
            placeholder="Optional"
            value={budget}
            maxLength={12}
            onChange={(e) => onBudget(e.target.value)}
            aria-describedby="budget-message"
            aria-invalid={error}
          />
        </div>
      </div>
      <p id="budget-message" role={error ? "alert" : undefined}>
        {message}
      </p>
      {comparison.status === "complete" && (
        <>
          <h3>Where the total goes</h3>
          <table className="category-chart">
            <caption className="sr-only">
              Category costs in the selected complete basket
            </caption>
            <tbody>
              {categories.map(([category, cents]) => (
                <tr key={category}>
                  <th scope="row">{category}</th>
                  <td>
                    <div className="chart-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${(cents / comparison.completeTotalCents!) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td>{formatEuro(cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
