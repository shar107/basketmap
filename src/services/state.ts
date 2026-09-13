import type { BasketLine, Dataset } from "../domain";
import { starterBasket } from "../data";
export const STORAGE_KEY = "basketmap:v1:state";
export const origins = [
  { id: "bastille", label: "Bastille, Paris", lat: 48.853, lon: 2.369 },
  { id: "republique", label: "République, Paris", lat: 48.8675, lon: 2.3638 },
  { id: "nation", label: "Nation, Paris", lat: 48.8483, lon: 2.3959 },
];
export interface AppState {
  basket: BasketLine[];
  radiusKm: number;
  originId: string;
  selectedStoreId: string | null;
  notice: string;
  budget: string;
}
export type Action =
  | { type: "quantity"; id: string; quantity: number }
  | { type: "basket"; basket: BasketLine[] }
  | { type: "radius"; value: number }
  | { type: "origin"; id: string }
  | { type: "select"; id: string | null }
  | { type: "notice"; message: string }
  | { type: "budget"; value: string }
  | { type: "reset" };
export const initialState: AppState = {
  basket: starterBasket,
  radiusKm: 3,
  originId: "bastille",
  selectedStoreId: "demo-b",
  notice: "",
  budget: "",
};
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "quantity": {
      if (
        !Number.isInteger(action.quantity) ||
        action.quantity < 0 ||
        action.quantity > 20
      )
        return state;
      const basket = state.basket.filter((x) => x.itemId !== action.id);
      if (action.quantity)
        basket.push({ itemId: action.id, quantity: action.quantity });
      return { ...state, basket };
    }
    case "basket":
      return { ...state, basket: action.basket.map((x) => ({ ...x })) };
    case "radius":
      return Number.isFinite(action.value) &&
        action.value >= 0.1 &&
        action.value <= 10
        ? { ...state, radiusKm: action.value }
        : state;
    case "origin":
      return origins.some((x) => x.id === action.id)
        ? { ...state, originId: action.id }
        : state;
    case "select":
      return { ...state, selectedStoreId: action.id };
    case "notice":
      return { ...state, notice: action.message };
    case "budget":
      return { ...state, budget: action.value };
    case "reset":
      return {
        ...initialState,
        basket: starterBasket.map((x) => ({ ...x })),
        notice: "Starter basket restored.",
      };
  }
}
export function cleanBasket(input: unknown, dataset: Dataset): BasketLine[] {
  if (!Array.isArray(input) || input.length > 100)
    throw Error("Invalid basket.");
  const seen = new Set<string>();
  return input.flatMap((row) => {
    if (
      !row ||
      typeof row.itemId !== "string" ||
      !Number.isInteger(row.quantity) ||
      row.quantity < 1 ||
      row.quantity > 20 ||
      seen.has(row.itemId)
    )
      throw Error("Invalid basket quantity or duplicate item.");
    seen.add(row.itemId);
    return dataset.items.some((x) => x.id === row.itemId)
      ? [{ itemId: row.itemId, quantity: row.quantity }]
      : [];
  });
}
export function loadState(dataset: Dataset): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    if (raw.length > 16000) throw Error();
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      data.datasetId !== dataset.id ||
      data.datasetVersion !== dataset.version
    )
      throw Error();
    const basket = cleanBasket(data.basket, dataset);
    return {
      ...initialState,
      basket,
      originId: origins.some((x) => x.id === data.originId)
        ? data.originId
        : "bastille",
      radiusKm:
        Number.isFinite(data.radiusKm) &&
        data.radiusKm >= 0.1 &&
        data.radiusKm <= 10
          ? data.radiusKm
          : 3,
      budget:
        typeof data.budget === "string" &&
        /^\d{0,4}([.,]\d{0,2})?$/.test(data.budget)
          ? data.budget
          : "",
      notice:
        basket.length !== data.basket.length
          ? "Unavailable saved items were removed."
          : "",
    };
  } catch (e) {
    return {
      ...initialState,
      notice:
        e instanceof DOMException
          ? "Storage is unavailable. Your basket stays in memory for this visit."
          : "Saved basket could not be loaded. The starter basket is shown.",
    };
  }
}
export function persistState(state: AppState, dataset: Dataset): boolean {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        datasetId: dataset.id,
        datasetVersion: dataset.version,
        basket: state.basket,
        radiusKm: state.radiusKm,
        originId: state.originId,
        budget: state.budget,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
