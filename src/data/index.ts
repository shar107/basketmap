import fixture from "./demo.json";
import registry from "./datasets.json";
import { parisDate, validateDataset } from "../domain";
import type { BasketLine, ComparisonSettings } from "../domain";
const validated = validateDataset(fixture);
if (!validated.success)
  throw new Error(
    `Invalid bundled demo: ${validated.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}`,
  );
export const demoDataset = validated.data;
export const datasetRegistry = registry;
export const starterBasket: BasketLine[] = [
  { itemId: "milk", quantity: 2 },
  { itemId: "eggs", quantity: 1 },
  { itemId: "spaghetti", quantity: 2 },
  { itemId: "rice", quantity: 1 },
];
export const presetBaskets: Array<{
  id: string;
  name: string;
  lines: BasketLine[];
}> = [
  { id: "starter", name: "The starter basket", lines: starterBasket },
  {
    id: "breakfast",
    name: "Breakfast basics",
    lines: [
      { itemId: "milk", quantity: 1 },
      { itemId: "eggs", quantity: 1 },
      { itemId: "oats", quantity: 1 },
      { itemId: "yogurt", quantity: 1 },
      { itemId: "bread", quantity: 1 },
    ],
  },
  {
    id: "vegetarian",
    name: "Vegetarian week",
    lines: [
      { itemId: "tofu", quantity: 2 },
      { itemId: "chickpeas", quantity: 2 },
      { itemId: "rice", quantity: 1 },
      { itemId: "carrots", quantity: 1 },
      { itemId: "peas", quantity: 1 },
      { itemId: "tomatoes", quantity: 2 },
    ],
  },
  {
    id: "pantry",
    name: "Pantry refill",
    lines: [
      { itemId: "olive-oil", quantity: 2 },
      { itemId: "coffee", quantity: 2 },
      { itemId: "rice", quantity: 1 },
      { itemId: "spaghetti", quantity: 2 },
      { itemId: "sugar", quantity: 1 },
    ],
  },
];
export const defaultSettings: ComparisonSettings = {
  origin: { lat: 48.853, lon: 2.369, label: "Bastille, Paris" },
  radiusKm: 3,
  maxObservationAgeDays: 90,
  asOfDate: parisDate(),
};
