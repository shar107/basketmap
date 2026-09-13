import type { AppState } from "./state";
import { origins } from "./state";
import { normalizeBasket } from "../domain";
import type { BasketLine, Dataset } from "../domain";
const MAX_PAYLOAD = 10000;
export function encodeBasket(
  dataset: Dataset,
  basket: BasketLine[],
  originId: string,
): string {
  const lines = normalizeBasket(basket, dataset);
  if (lines.length > 100)
    throw Error("A shared basket is limited to 100 items.");
  const json = JSON.stringify({
    v: 1,
    d: dataset.id,
    dv: dataset.version,
    b: lines,
    o: originId,
  });
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  if (encoded.length > MAX_PAYLOAD)
    throw Error("This basket is too large for a share link.");
  return encoded;
}
export type ShareResult =
  | { status: "none" }
  | { status: "valid"; basket: BasketLine[]; originId: string }
  | { status: "error"; message: string };
export function readShareHash(hash: string, dataset: Dataset): ShareResult {
  if (!hash.includes("?")) return { status: "none" };
  try {
    if (hash.length > MAX_PAYLOAD + 100)
      throw Error("The shared basket is too large.");
    const params = new URLSearchParams(hash.split("?").slice(1).join("?"));
    const encoded = params.get("basket");
    if (!encoded) return { status: "none" };
    if (!/^[A-Za-z0-9_-]+$/.test(encoded))
      throw Error("This basket link is malformed.");
    const raw = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
    const data = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(raw, (c) => c.charCodeAt(0)),
      ),
    );
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).some((x) => !["v", "d", "dv", "b", "o"].includes(x)) ||
      data.v !== 1
    )
      throw Error("This share format is not supported.");
    if (data.d !== dataset.id || data.dv !== dataset.version)
      throw Error(
        "This link uses a dataset version that is not available. Load the current demo explicitly to start a new comparison.",
      );
    if (
      !Array.isArray(data.b) ||
      data.b.length > 100 ||
      !origins.some((x) => x.id === data.o)
    )
      throw Error("The shared basket or area is invalid.");
    for (const line of data.b) {
      if (
        !line ||
        Object.keys(line).some((x) => !["itemId", "quantity"].includes(x))
      )
        throw Error("The shared basket contains unsupported fields.");
    }
    if (new Set(data.b.map((x: BasketLine) => x.itemId)).size !== data.b.length)
      throw Error("The shared basket contains duplicate items.");
    return {
      status: "valid",
      basket: normalizeBasket(data.b, dataset),
      originId: data.o,
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "This share link is invalid.",
    };
  }
}
export function shareURL(
  dataset: Dataset,
  state: Pick<AppState, "basket" | "originId">,
  base: string,
) {
  const url = new URL(base);
  url.search = "";
  url.hash =
    "/compare?basket=" + encodeBasket(dataset, state.basket, state.originId);
  return url.toString();
}
