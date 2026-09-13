import { z } from "zod";
import { catalogItemSchema } from "../domain";
import type { BasketLine, CatalogItem } from "../domain";

export const SHOPPING_SESSION_KEY = "basketmap:real-session:v2";
export const LEGACY_BASKET_KEY = "basketmap:real-basket:v1";
export const SUPPORTED_RADII = [3, 5, 10, 15, 30] as const;

type PlaceLabel = "Lyon" | "Paris";
type Radius = (typeof SUPPORTED_RADII)[number];

export interface ShoppingSession {
  basket: BasketLine[];
  items: CatalogItem[];
  placeLabel: PlaceLabel;
  radius: Radius;
}

export interface LoadedShoppingSession {
  session: ShoppingSession;
  restored: boolean;
  warning: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

const basketSchema = z
  .array(lineSchema)
  .max(40)
  .refine(
    (lines) => new Set(lines.map((line) => line.itemId)).size === lines.length,
    "Basket contains duplicate products.",
  );

const sessionSchema = z.object({
  version: z.literal(2),
  basket: basketSchema,
  items: z.array(catalogItemSchema).max(40),
  placeLabel: z.enum(["Lyon", "Paris"]),
  radius: z.union([
    z.literal(3),
    z.literal(5),
    z.literal(10),
    z.literal(15),
    z.literal(30),
  ]),
});

const legacySchema = z.object({
  basket: basketSchema,
  items: z.array(catalogItemSchema).max(40),
});

export const emptyShoppingSession = (): ShoppingSession => ({
  basket: [],
  items: [],
  placeLabel: "Lyon",
  radius: 15,
});

function cleanSession(
  value: z.infer<typeof sessionSchema> | z.infer<typeof legacySchema>,
  placeLabel: PlaceLabel,
  radius: Radius,
): LoadedShoppingSession {
  const itemIds = new Set(value.items.map((item) => item.id));
  const basket = value.basket.filter((line) => itemIds.has(line.itemId));
  const usedIds = new Set(basket.map((line) => line.itemId));
  return {
    session: {
      basket,
      items: value.items.filter((item) => usedIds.has(item.id)),
      placeLabel,
      radius,
    },
    restored: basket.length > 0,
    warning:
      basket.length === value.basket.length
        ? ""
        : "Some unavailable saved products were removed from your basket.",
  };
}

export function loadShoppingSession(
  storage: StorageLike = localStorage,
): LoadedShoppingSession {
  try {
    const current = storage.getItem(SHOPPING_SESSION_KEY);
    if (current) {
      if (current.length > 100_000) throw Error("Saved session is too large.");
      const parsed = sessionSchema.parse(JSON.parse(current));
      return cleanSession(parsed, parsed.placeLabel, parsed.radius);
    }

    const legacy = storage.getItem(LEGACY_BASKET_KEY);
    if (legacy) {
      if (legacy.length > 100_000) throw Error("Saved basket is too large.");
      const parsed = legacySchema.parse(JSON.parse(legacy));
      return cleanSession(parsed, "Lyon", 15);
    }
  } catch (error) {
    return {
      session: emptyShoppingSession(),
      restored: false,
      warning:
        error instanceof DOMException
          ? "Browser storage is unavailable. This basket will last only for this visit."
          : "Your previous basket could not be restored. A new basket is ready.",
    };
  }

  return {
    session: emptyShoppingSession(),
    restored: false,
    warning: "",
  };
}

export function persistShoppingSession(
  session: ShoppingSession,
  storage: StorageLike = localStorage,
): boolean {
  try {
    const basketIds = new Set(session.basket.map((line) => line.itemId));
    storage.setItem(
      SHOPPING_SESSION_KEY,
      JSON.stringify({
        version: 2,
        basket: session.basket,
        items: session.items.filter((item) => basketIds.has(item.id)),
        placeLabel: session.placeLabel,
        radius: session.radius,
      }),
    );
    storage.removeItem(LEGACY_BASKET_KEY);
    return true;
  } catch {
    return false;
  }
}
