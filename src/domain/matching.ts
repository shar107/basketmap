import type { CatalogItem, PriceObservation } from "./types";
const canonical = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
export function matchingReason(
  item: CatalogItem,
  observation: PriceObservation,
): string | null {
  if (
    observation.packUnit !== item.packUnit ||
    observation.packQuantity !== item.packQuantity
  )
    return "Package quantity or unit differs from the catalog pack.";
  if (
    observation.packLabel !== undefined &&
    canonical(observation.packLabel) !== canonical(item.packLabel)
  )
    return "Package format differs from the catalog pack.";
  if (observation.matchBasis === "normalized_unit") {
    if (!observation.matchNote.trim())
      return "Normalized matching requires a recorded normalization decision.";
    if (!observation.productCode)
      return "Normalized matching requires an explicit source product identity.";
    if (observation.priceBasis !== "quantity_equivalent")
      return "Normalized matching requires a quantity-equivalent price basis.";
    if (
      observation.sourcePackQuantity === undefined ||
      observation.sourcePackUnit === undefined ||
      observation.sourcePackLabel === undefined ||
      observation.sourcePriceCents === undefined
    )
      return "Normalized matching must retain the original observed pack and price.";
    if (observation.sourcePackUnit !== item.packUnit)
      return "The source pack unit cannot be normalized to this catalog unit.";
    const expectedPrice = Math.round(
      (observation.sourcePriceCents * item.packQuantity) /
        observation.sourcePackQuantity,
    );
    if (expectedPrice !== observation.priceCents)
      return "The quantity-equivalent price does not match the retained source pack price.";
  }
  if (
    observation.matchBasis === "exact_barcode" &&
    (!item.barcode || item.barcode !== observation.productCode)
  )
    return "The exact barcode does not match the catalog.";
  if (observation.matchBasis === "curated_spec") {
    if (!observation.matchNote.trim())
      return "Curated matching requires a recorded mapping decision.";
    if (!observation.productCode)
      return "Curated matching requires an explicit product identity.";
    if (
      !observation.packLabel ||
      canonical(observation.packLabel) !== canonical(item.packLabel)
    )
      return "Curated matching requires the same explicit package format.";
    const attributes = new Set((observation.attributes ?? []).map(canonical));
    if (
      attributes.size !==
        new Set(item.requiredAttributes.map(canonical)).size ||
      !item.requiredAttributes.every((attribute) =>
        attributes.has(canonical(attribute)),
      )
    )
      return "The product does not match all defining catalog attributes.";
  }
  return null;
}
