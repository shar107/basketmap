import type {
  BasketLine,
  CatalogItem,
  Dataset,
  PriceObservation,
} from "../domain";

export const normalise = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .toLowerCase();

export const ESSENTIALS = [
  {
    name: "Milk",
    words: ["milk", "lait"],
    namePattern: /\b(lait|milk)\b/,
    tagPattern: /\b(en:milks|fr:laits?)\b/,
    exclude:
      /chocolat|cocoa|coco|concentr|condensed|poudre|powder|infant|riz au|rice pudding|laitue|cheese|fromage|cafe|coffee|biscuit|cookie|shower|corps|savon|anesse|pain au|pains au/,
    units: ["ml"],
  },
  {
    name: "Eggs",
    words: ["eggs", "egg", "oeufs", "oeuf"],
    namePattern: /\b(oeufs?|eggs?)\b/,
    tagPattern: /\b(en:eggs|fr:oeufs?)\b/,
    exclude:
      /pates|pasta|biscuit|chocolat|nouille|noodle|mayonnaise|gaufre|pudding|lompe|ravioli|tagliatelle|sauce/,
    units: ["count"],
  },
  {
    name: "Bread",
    words: ["bread", "pain"],
    namePattern: /\b(pain|bread|baguette)\b/,
    tagPattern: /\b(en:breads|en:sliced-breads|fr:pains?)\b/,
    exclude:
      /chocolat|epices|pudding|crouton|jambon|sandwich|burger|chapelure/,
    units: ["g"],
  },
  {
    name: "Rice",
    words: ["rice", "riz"],
    namePattern: /\b(riz|rice)\b/,
    tagPattern: /\b(en:rices|en:rice|fr:riz)\b/,
    exclude:
      /lait|chocolat|pudding|galette|salade|boisson|croustill|vinaigre|paella|prepare|cuisine/,
    units: ["g"],
  },
  {
    name: "Pasta",
    words: ["pasta", "pates"],
    namePattern:
      /\b(pates|pasta|spaghetti|penne|coquillette|fusilli|macaroni|tagliatelle)\b/,
    tagPattern: /\b(en:pastas|en:pasta|fr:pates)\b/,
    exclude:
      /tartiner|feuillete|sauce|salade|prepare|cuisine|bruschetta|pau[pv]iette/,
    units: ["g"],
  },
  {
    name: "Butter",
    words: ["butter", "beurre"],
    namePattern: /\b(beurre|butter)\b/,
    tagPattern: /\b(en:butters|en:butter|fr:beurres?)\b/,
    exclude:
      /biscuit|cookie|cacahuete|peanut|sable|petit beurre|croissant|haricot|sauce|caramel|galette|shortbread/,
    units: ["g"],
  },
  {
    name: "Yogurt",
    words: ["yogurt", "yoghurt", "yaourt"],
    namePattern: /\b(yaourt|yogurt|yoghurt)\b/,
    tagPattern: /\b(en:yogurts|en:yogurt|fr:yaourts?)\b/,
    exclude: /ferment|preparation|kit/,
  },
  {
    name: "Cheese",
    words: ["cheese", "fromage"],
    namePattern:
      /\b(fromage|cheese|emmental|comte|mozzarella|camembert|chevre)\b/,
    tagPattern: /\b(en:cheeses|en:cheese|fr:fromages?)\b/,
    exclude: /sauce|pizza|pasta|pates|galette|sandwich|girasoli/,
  },
  {
    name: "Oats",
    words: ["oats", "avoine"],
    namePattern: /\b(avoine|oats)\b/,
    tagPattern: /\b(en:oats|en:oat-flakes|fr:avoines?)\b/,
    exclude: /lait|boisson|drink|milk|biscuit|cuisine|creme|noodle/,
    units: ["g"],
  },
  {
    name: "Lentils",
    words: ["lentils", "lentilles"],
    namePattern: /\b(lentilles|lentils)\b/,
    tagPattern: /\b(en:lentils|fr:lentilles)\b/,
    exclude: /saucisse|prepare|tranches vege|quinoa|salade/,
  },
  {
    name: "Tomatoes",
    words: ["tomatoes", "tomato", "tomates", "tomate"],
    namePattern: /\b(tomates?|tomatoes?)\b/,
    tagPattern: /\b(en:tomatoes|fr:tomates)\b/,
    exclude:
      /sauce|ketchup|soupe|pizza|pasta|coulis|chair|sechee|houmous|tartinable|vinaigrette/,
  },
  {
    name: "Coffee",
    words: ["coffee", "cafe"],
    namePattern: /\b(cafe|coffee)\b/,
    tagPattern: /\b(en:coffees|en:coffee|fr:cafes?)\b/,
    exclude: /dessert|yaourt|chocolat|biscuit|boisson lactee/,
  },
  {
    name: "Flour",
    words: ["flour", "farine", "farines"],
    namePattern: /\b(farine|farines|flour)\b/,
    tagPattern: /\b(en:flours?|fr:farines?)\b/,
    exclude: /pain|bread|gateau|cake|biscuit|cookie|prepare|mix/,
    units: ["g"],
  },
  {
    name: "Sugar",
    words: ["sugar", "sucre", "sucres"],
    namePattern: /\b(sucre|sucres|sugar)\b/,
    tagPattern: /\b(en:sugars?|fr:sucres?)\b/,
    exclude: /biscuit|cookie|chocolat|bonbon|drink|boisson|sirop|syrup/,
    units: ["g"],
  },
  {
    name: "Cooking oil",
    words: ["oil", "huile", "huiles"],
    namePattern: /\b(huile|huiles|oil)\b/,
    tagPattern: /\b(en:(?:vegetable-)?oils?|fr:huiles?)\b/,
    exclude:
      /essentielle|essential|massage|corps|body|cheveux|hair|douche|shower|savon|soap|moteur|motor/,
    units: ["ml"],
  },
  {
    name: "Water",
    words: ["water", "eau", "eaux"],
    namePattern: /\b(eau|eaux|water)\b/,
    tagPattern: /\b(en:waters?|fr:eaux?)\b/,
    exclude:
      /toilette|micellaire|florale|rose|coco|coconut|bouche|mouth|parfum|perfume|nettoyante/,
    units: ["ml"],
  },
  {
    name: "Juice",
    words: ["juice", "jus"],
    namePattern: /\b(jus|juice)\b/,
    tagPattern: /\b(en:(?:fruit-)?juices?|fr:jus(?:-de-fruits?)?)\b/,
    exclude: /sauce|soupe|soup|cuisson|cooking/,
    units: ["ml"],
  },
  {
    name: "Cereal",
    words: ["cereal", "cereals", "cereale", "cereales"],
    namePattern:
      /\b(cereales?|cereals?|muesli|granola|corn flakes?|petales)\b/,
    tagPattern:
      /\b(en:breakfast-cereals?|fr:cereales?-pour-le-petit-dejeuner)\b/,
    exclude: /barre|bar|biscuit|drink|boisson|infant|bebe/,
    units: ["g"],
  },
] as const;

export type EssentialName = (typeof ESSENTIALS)[number]["name"];
const ESSENTIAL_ALIAS_PREFIX = "__basketmap_essential:";

export const COMPARABLE_SPECS = [
  {
    id: "essential:milk:1000:ml",
    essential: "Milk",
    name: "Milk · 1 L equivalent",
    packQuantity: 1000,
    packUnit: "ml",
    packLabel: "1 L equivalent",
    sourceQuantityRange: [250, 12000],
    category: "Fresh & dairy",
    attributes: ["dairy milk", "any brand"],
  },
  {
    id: "essential:eggs:6:count",
    essential: "Eggs",
    name: "Eggs · 6 equivalent",
    packQuantity: 6,
    packUnit: "count",
    packLabel: "6-egg equivalent",
    sourceQuantityRange: [4, 30],
    category: "Fresh & dairy",
    attributes: ["hen eggs", "any farming method"],
  },
  {
    id: "essential:bread:500:g",
    essential: "Bread",
    name: "Bread · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [200, 1500],
    category: "Food cupboard",
    attributes: ["bread", "any brand"],
  },
  {
    id: "essential:rice:500:g",
    essential: "Rice",
    name: "Rice · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [125, 5000],
    category: "Food cupboard",
    attributes: ["dry rice", "any variety"],
  },
  {
    id: "essential:pasta:500:g",
    essential: "Pasta",
    name: "Pasta · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [125, 5000],
    category: "Food cupboard",
    attributes: ["plain pasta", "any shape"],
  },
  {
    id: "essential:butter:250:g",
    essential: "Butter",
    name: "Butter · 250 g equivalent",
    packQuantity: 250,
    packUnit: "g",
    packLabel: "250 g equivalent",
    sourceQuantityRange: [100, 1000],
    category: "Fresh & dairy",
    attributes: ["dairy butter", "salted or unsalted"],
  },
  {
    id: "essential:yogurt:500:g",
    essential: "Yogurt",
    name: "Yogurt · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [100, 2000],
    category: "Fresh & dairy",
    attributes: ["yogurt", "any brand or flavour"],
  },
  {
    id: "essential:cheese:250:g",
    essential: "Cheese",
    name: "Cheese · 250 g equivalent",
    packQuantity: 250,
    packUnit: "g",
    packLabel: "250 g equivalent",
    sourceQuantityRange: [75, 1500],
    category: "Fresh & dairy",
    attributes: ["cheese", "any variety"],
  },
  {
    id: "essential:oats:500:g",
    essential: "Oats",
    name: "Oats · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [200, 2000],
    category: "Breakfast & treats",
    attributes: ["plain oats", "any brand"],
  },
  {
    id: "essential:lentils:500:g",
    essential: "Lentils",
    name: "Lentils · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [200, 3000],
    category: "Food cupboard",
    attributes: ["dry lentils", "any variety"],
  },
  {
    id: "essential:coffee:250:g",
    essential: "Coffee",
    name: "Coffee · 250 g equivalent",
    packQuantity: 250,
    packUnit: "g",
    packLabel: "250 g equivalent",
    sourceQuantityRange: [100, 2000],
    category: "Drinks",
    attributes: ["coffee", "any roast"],
  },
  {
    id: "essential:flour:1000:g",
    essential: "Flour",
    name: "Flour · 1 kg equivalent",
    packQuantity: 1000,
    packUnit: "g",
    packLabel: "1 kg equivalent",
    sourceQuantityRange: [250, 5000],
    category: "Food cupboard",
    attributes: ["flour", "any type"],
  },
  {
    id: "essential:sugar:1000:g",
    essential: "Sugar",
    name: "Sugar · 1 kg equivalent",
    packQuantity: 1000,
    packUnit: "g",
    packLabel: "1 kg equivalent",
    sourceQuantityRange: [250, 5000],
    category: "Food cupboard",
    attributes: ["sugar", "any type"],
  },
  {
    id: "essential:cooking-oil:1000:ml",
    essential: "Cooking oil",
    name: "Cooking oil · 1 L equivalent",
    packQuantity: 1000,
    packUnit: "ml",
    packLabel: "1 L equivalent",
    sourceQuantityRange: [250, 5000],
    category: "Food cupboard",
    attributes: ["edible cooking oil", "any type"],
  },
  {
    id: "essential:water:1000:ml",
    essential: "Water",
    name: "Water · 1 L equivalent",
    packQuantity: 1000,
    packUnit: "ml",
    packLabel: "1 L equivalent",
    sourceQuantityRange: [250, 12000],
    category: "Drinks",
    attributes: ["drinking water", "still or sparkling"],
  },
  {
    id: "essential:juice:1000:ml",
    essential: "Juice",
    name: "Fruit juice · 1 L equivalent",
    packQuantity: 1000,
    packUnit: "ml",
    packLabel: "1 L equivalent",
    sourceQuantityRange: [200, 5000],
    category: "Drinks",
    attributes: ["fruit juice", "any flavour"],
  },
  {
    id: "essential:cereal:500:g",
    essential: "Cereal",
    name: "Breakfast cereal · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [150, 2000],
    category: "Breakfast & treats",
    attributes: ["breakfast cereal", "any type"],
  },
  {
    id: "essential:tomatoes:500:g",
    essential: "Tomatoes",
    name: "Tomatoes · 500 g equivalent",
    packQuantity: 500,
    packUnit: "g",
    packLabel: "500 g equivalent",
    sourceQuantityRange: [100, 3000],
    category: "Food cupboard",
    attributes: ["whole tomatoes", "any variety"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  essential: EssentialName;
  name: string;
  packQuantity: number;
  packUnit: CatalogItem["packUnit"];
  packLabel: string;
  sourceQuantityRange: readonly [number, number];
  category: string;
  attributes: readonly string[];
}>;

export function essentialAlias(name: EssentialName) {
  return `${ESSENTIAL_ALIAS_PREFIX}${name}`;
}

export function visibleAliases(item: CatalogItem) {
  return item.aliases.filter((alias) => !alias.startsWith("__basketmap_"));
}

export function productImageCandidates(
  item: CatalogItem,
  dataset: Pick<Dataset, "items" | "selectedProducts">,
  images: Record<string, string>,
): string[] {
  return productImageMap(dataset, images).get(item.id) || [];
}

export function productImageMap(
  dataset: Pick<Dataset, "items" | "selectedProducts">,
  images: Record<string, string>,
): Map<string, string[]> {
  const byEssentialUnit = new Map<string, string[]>();
  const byCategoryUnit = new Map<string, string[]>();
  const byCategory = new Map<string, string[]>();
  const bySelectedItem = new Map<string, string[]>();
  const all: string[] = [];
  const addIndexed = (map: Map<string, string[]>, key: string, url: string) => {
    const values = map.get(key) || [];
    if (!values.includes(url) && values.length < 12)
      map.set(key, [...values, url]);
  };

  dataset.items.forEach((candidate) => {
    const url = images[candidate.id];
    if (!url) return;
    if (!all.includes(url) && all.length < 12) all.push(url);
    const essential = essentialType(candidate);
    if (essential)
      addIndexed(
        byEssentialUnit,
        `${essential}:${candidate.packUnit}`,
        url,
      );
    addIndexed(
      byCategoryUnit,
      `${candidate.category}:${candidate.packUnit}`,
      url,
    );
    addIndexed(byCategory, candidate.category, url);
  });

  dataset.selectedProducts?.forEach((selection) => {
    const url = images[selection.productCode];
    if (url) addIndexed(bySelectedItem, selection.itemId, url);
  });

  return new Map(
    dataset.items.map((item) => {
      const candidates: string[] = [];
      const add = (url?: string) => {
        if (url && !candidates.includes(url) && candidates.length < 12)
          candidates.push(url);
      };
      const addAll = (urls: string[] = []) => urls.forEach(add);
      add(images[item.id]);
      addAll(bySelectedItem.get(item.id));
      const essential = essentialType(item);
      if (essential)
        addAll(byEssentialUnit.get(`${essential}:${item.packUnit}`));
      addAll(byCategoryUnit.get(`${item.category}:${item.packUnit}`));
      addAll(byCategory.get(item.category));
      addAll(all);
      return [item.id, candidates];
    }),
  );
}

export function essentialType(
  item: CatalogItem,
  categoryTags: string[] = [],
): EssentialName | null {
  const marker = item.aliases.find((alias) =>
    alias.startsWith(ESSENTIAL_ALIAS_PREFIX),
  );
  if (marker)
    return marker.slice(ESSENTIAL_ALIAS_PREFIX.length) as EssentialName;

  const name = normalise(item.name);
  const tags = normalise(categoryTags.join(" "));
  const rule = ESSENTIALS.find(
    (candidate) =>
      candidate.namePattern.test(name) &&
      candidate.tagPattern.test(tags) &&
      !candidate.exclude.test(name) &&
      (!("units" in candidate) ||
        (candidate.units as readonly string[]).includes(item.packUnit)),
  );
  return rule?.name ?? null;
}

export function searchScore(item: CatalogItem, query: string): number {
  const normalizedQuery = normalise(query.trim());
  if (!normalizedQuery) return 1;
  if (item.barcode === normalizedQuery) return 100;

  const essential = ESSENTIALS.find((candidate) =>
    (candidate.words as readonly string[]).includes(normalizedQuery),
  );
  if (essential) return essentialType(item) === essential.name ? 100 : 0;

  const text = normalise(
    [item.name, ...visibleAliases(item), item.barcode].join(" "),
  );
  return normalizedQuery
    .split(/\s+/)
    .every((word) => text.includes(word))
    ? 10
    : 0;
}

export type Offers = Map<string, PriceObservation[]>;

export function sharedStores(ids: string[], offers: Offers): Set<string> {
  if (!ids.length) return new Set();
  let stores = new Set((offers.get(ids[0]) || []).map((row) => row.storeId));
  for (const id of ids.slice(1)) {
    const next = new Set((offers.get(id) || []).map((row) => row.storeId));
    stores = new Set([...stores].filter((storeId) => next.has(storeId)));
  }
  return stores;
}

export function candidateCoverage(
  itemId: string,
  basket: BasketLine[],
  offers: Offers,
) {
  return sharedStores(
    [...new Set([...basket.map((line) => line.itemId), itemId])],
    offers,
  ).size;
}

export interface SharedBasketMatch {
  itemIds: string[];
  storeIds: string[];
}

/** Find the largest basket subset priced at two or more of the same stores. */
export function bestSharedBasket(
  basket: BasketLine[],
  offers: Offers,
): SharedBasketMatch {
  const stores = [
    ...new Set(
      basket.flatMap(({ itemId }) =>
        (offers.get(itemId) || []).map((row) => row.storeId),
      ),
    ),
  ].sort();
  const candidates: SharedBasketMatch[] = [];
  for (let first = 0; first < stores.length; first += 1) {
    for (let second = first + 1; second < stores.length; second += 1) {
      const pair = new Set([stores[first], stores[second]]);
      const itemIds = basket.flatMap(({ itemId }) => {
        const itemStores = new Set(
          (offers.get(itemId) || []).map((row) => row.storeId),
        );
        return [...pair].every((storeId) => itemStores.has(storeId))
          ? [itemId]
          : [];
      });
      if (!itemIds.length) continue;
      candidates.push({
        itemIds,
        storeIds: [...sharedStores(itemIds, offers)].sort(),
      });
    }
  }
  return (
    candidates.sort(
      (left, right) =>
        right.itemIds.length - left.itemIds.length ||
        right.storeIds.length - left.storeIds.length ||
        left.itemIds.join().localeCompare(right.itemIds.join()) ||
        left.storeIds.join().localeCompare(right.storeIds.join()),
    )[0] || { itemIds: [], storeIds: [] }
  );
}

export function sharedSubset(
  basket: BasketLine[],
  offers: Offers,
): string[] {
  return bestSharedBasket(basket, offers).itemIds;
}

export function resolvePack(product: {
  product_quantity: number | null;
  product_quantity_unit?: string | null;
  quantity?: string | null;
  product_name: string;
  categories_tags?: string[] | null;
}): { quantity: number; unit: "g" | "ml" | "count"; label: string } | null {
  let quantity = product.product_quantity || 0;
  let unit = (product.product_quantity_unit || "").toLowerCase();
  if (unit === "kg") {
    quantity *= 1000;
    unit = "g";
  }
  if (unit === "l") {
    quantity *= 1000;
    unit = "ml";
  }
  if (unit === "cl") {
    quantity *= 10;
    unit = "ml";
  }
  if (
    quantity > 0 &&
    ["g", "ml", "count"].includes(unit) &&
    quantity <= 1_000_000
  ) {
    return {
      quantity,
      unit: unit as "g" | "ml" | "count",
      label: product.quantity || `${quantity} ${unit}`,
    };
  }

  const label = normalise(product.quantity || "").trim();
  const mass =
    /^(?:(\d+)\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)$/.exec(
      label,
    );
  if (mass) {
    const multiplier = { kg: 1000, g: 1, ml: 1, cl: 10, l: 1000 }[
      mass[3] as "kg" | "g" | "ml" | "cl" | "l"
    ];
    const parsed =
      Number(mass[1] || 1) *
      Number(mass[2].replace(",", ".")) *
      multiplier;
    if (parsed > 0 && parsed <= 1_000_000) {
      return {
        quantity: parsed,
        unit: ["kg", "g"].includes(mass[3]) ? "g" : "ml",
        label: product.quantity!,
      };
    }
  }

  const explicit =
    /^(\d+)\s*(?:unites?|units?|pieces?|oeufs?|eggs?)$/.exec(label);
  const egg = product.categories_tags?.includes("en:eggs");
  const named = egg
    ? /(?:^|\b)(\d+)\s*(?:oeufs?|eggs?)\b|\bboite de\s*(\d+)\b/.exec(
        normalise(product.product_name),
      )
    : null;
  const count = Number(
    explicit?.[1] ||
      named?.[1] ||
      named?.[2] ||
      (egg && /^\d+$/.test(label) ? label : 0),
  );
  return count > 0 && count <= 100
    ? {
        quantity: count,
        unit: "count",
        label: product.quantity || `${count} ${egg ? "œufs" : "units"}`,
      }
    : null;
}
