import { test, expect } from "@playwright/test";
test("agent tools share the visible real basket and reject invalid quantities", async ({
  page,
}) => {
  await page.route("https://prices.openfoodfacts.org/api/**", (r) => r.abort());
  await page.addInitScript(() => {
    const registry: Record<string, unknown> = {};
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (
          tool: { name: string },
          options: { signal: AbortSignal },
        ) => {
          registry[tool.name] = tool;
          options.signal.addEventListener(
            "abort",
            () => delete registry[tool.name],
          );
        },
      },
    });
    (window as unknown as { tools: unknown }).tools = registry;
  });
  await page.goto("/shop");
  await expect(page.locator(".product-card").first()).toBeVisible();
  const itemId = await page
    .locator(".product-card")
    .first()
    .getAttribute("data-item-id");
  const result = await page.evaluate((selectedItemId) => {
    const tools = (
      window as unknown as {
        tools: Record<string, { execute: (input: unknown) => unknown }>;
      }
    ).tools;
    tools.replace_basket.execute({
      lines: [{ itemId: selectedItemId, quantity: 2 }],
    });
    return tools.read_basket_comparison.execute({});
  }, itemId);
  expect(result).toMatchObject({
    dataset: { mode: "observed" },
    basket: [{ itemId, quantity: 2 }],
  });
  await expect(page.locator(".basket-lines .basket-line")).toHaveCount(1);
  const rejected = await page.evaluate(() => {
    try {
      (
        window as unknown as {
          tools: Record<string, { execute: (input: unknown) => unknown }>;
        }
      ).tools.replace_basket.execute({
        lines: [{ itemId: "3468572044629", quantity: 0 }],
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
});
test("offline bootstrap failure keeps navigation and recovery available", async ({
  page,
}) => {
  await page.route("**/data/france-market.json", (r) => r.abort());
  await page.route("https://prices.openfoodfacts.org/api/**", (r) => r.abort());
  await page.goto("/shop");
  await expect(
    page.getByRole("heading", { name: "No recent prices in this area yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change location", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Refresh prices", exact: true }),
  ).toBeEnabled();
});
test("comparison export is a real observed dataset", async ({ page }) => {
  await page.route("https://prices.openfoodfacts.org/api/**", (r) => r.abort());
  await page.goto("/shop");
  await page.locator(".product-card").first().locator(".add-product").click();
  await page
    .getByRole("button", { name: "Compare my basket", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download comparison" }).click();
  expect((await download).suggestedFilename()).toBe("basketmap-prices.csv");
});
