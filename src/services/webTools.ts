import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { BasketLine, Dataset, StoreComparison } from "../domain";
import { normalizeBasket } from "../domain";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: Tool,
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
};
export function useWebTools(
  dataset: Dataset,
  basket: BasketLine[],
  comparisons: StoreComparison[],
  replace: (lines: BasketLine[]) => void,
) {
  const ref = useRef({ dataset, basket, comparisons, replace });
  ref.current = { dataset, basket, comparisons, replace };
  useEffect(() => {
    const context = (document as ModelDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported proposal does not affect the visible app. */
      }
    };
    register({
      name: "read_basket_comparison",
      description:
        "Read the current basket and computed store totals, including missing-price status and observation dates and dataset label.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        dataset: {
          id: ref.current.dataset.id,
          version: ref.current.dataset.version,
          mode: ref.current.dataset.mode,
        },
        basket: ref.current.basket,
        stores: ref.current.comparisons.map((x) => ({
          storeId: x.storeId,
          status: x.status,
          completeTotalCents: x.completeTotalCents,
          knownSubtotalCents: x.knownSubtotalCents,
          withinRadius: x.withinRadius,
        })),
      }),
    });
    register({
      name: "replace_basket",
      description:
        "Replace the visible basket with catalog item IDs and whole-pack quantities. Use an empty array to clear. Does not import prices or purchase groceries.",
      inputSchema: {
        type: "object",
        properties: {
          lines: {
            type: "array",
            maxItems: 40,
            items: {
              type: "object",
              properties: {
                itemId: { type: "string" },
                quantity: { type: "integer", minimum: 1, maximum: 20 },
              },
              required: ["itemId", "quantity"],
              additionalProperties: false,
            },
          },
        },
        required: ["lines"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).some((x) => x !== "lines")
        )
          throw Error("Expected only lines.");
        const proposed = (input as { lines: BasketLine[] }).lines;
        if (
          !Array.isArray(proposed) ||
          proposed.length > 40 ||
          proposed.some(
            (line) =>
              !line ||
              typeof line !== "object" ||
              Object.keys(line).some(
                (key) => !["itemId", "quantity"].includes(key),
              ),
          )
        )
          throw Error("Expected up to 40 lines with only itemId and quantity.");
        const lines = normalizeBasket(proposed, ref.current.dataset);
        flushSync(() => ref.current.replace(lines));
        return {
          basket: ref.current.basket,
          datasetMode: ref.current.dataset.mode,
        };
      },
    });
    return () => lifecycle.abort();
  }, []);
}
