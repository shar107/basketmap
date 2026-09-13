import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://prices.openfoodfacts.org/api/**", (route) =>
    route.abort(),
  );
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
});

async function addComparisonReadyProduct(
  page: import("@playwright/test").Page,
) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Build your basket. Compare your total. Choose where to shop.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search products" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Start your shopping list", exact: true })
    .click();
  await expect(page).toHaveURL(/\/shop$/);
  const product = page.locator(".product-card").first();
  await expect(product).toBeVisible();
  await expect(product.locator(".product-coverage")).not.toHaveClass(/limited/);
  await expect(product.locator(".product-store-source")).toContainText(
    /Lowest observed at|Observed at/,
  );
  await expect(
    product.locator(".product-store-source .chain-wordmark"),
  ).toBeVisible();
  const itemId = await product.getAttribute("data-item-id");
  await product.locator(".add-product").click();
  return itemId!;
}

test("the landing page requires an explicit transition into shopping", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".shopping-layout")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Search products" }),
  ).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(
    page.getByRole("textbox", { name: "Search products" }),
  ).toHaveCount(0);

  await page
    .getByRole("link", { name: "Start your shopping list", exact: true })
    .click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(
    page.getByRole("heading", { name: "What’s on your list?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search products" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", {
      name: "Build your basket. Compare your total. Choose where to shop.",
    }),
  ).toBeVisible();
  await expect(page.locator(".shopping-layout")).toHaveCount(0);
});

test("comparison-ready products produce real complete branch totals and evidence", async ({
  page,
}) => {
  const itemId = await addComparisonReadyProduct(page);
  await page
    .getByRole("button", { name: "Compare my basket", exact: true })
    .click();
  await expect(
    page
      .locator(".basket-panel")
      .getByRole("button", { name: "Comparison shown", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".store-card")).toHaveCount(
    await page.locator(".store-card").count(),
  );
  expect(await page.locator(".store-card").count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".best-label").first()).toContainText(
    "Lowest complete basket",
  );
  await page
    .locator(".store-card")
    .first()
    .getByRole("button", { name: "View basket" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(/Recent observation|Historical observation/);
  await expect(
    page.getByRole("link", { name: "Price record" }),
  ).toHaveAttribute("href", /prices.openfoodfacts.org\/prices\/\d+/);
  await page.getByRole("button", { name: "Close store details" }).click();

  await page
    .locator(".basket-panel")
    .getByRole("button", { name: /Add one/ })
    .click();
  await expect(page.locator(".basket-panel")).toContainText("2 packs");
  await page.getByRole("button", { name: "Keep shopping" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.reload();
  await expect(
    page.locator(`.product-card[data-item-id="${itemId}"] .stepper`).first(),
  ).toContainText("2");
});

test("store-specific products are added directly and excluded from shared totals", async ({
  page,
}) => {
  await addComparisonReadyProduct(page);

  let limited = page.locator(".product-card:has(.product-coverage.limited)");
  for (
    let attempts = 0;
    attempts < 5 && (await limited.count()) === 0;
    attempts += 1
  ) {
    const more = page.getByRole("button", { name: /Show more products/ });
    if (!(await more.isVisible())) break;
    await more.click();
    limited = page.locator(".product-card:has(.product-coverage.limited)");
  }
  await expect(limited.first()).toBeVisible();
  const excludedName = (await limited.first().locator("h3").textContent())!;
  await limited.first().locator(".add-product").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Compare my basket", exact: true })
    .click();
  await expect(
    page.locator(".comparison-product-group.compared"),
  ).toContainText(/Compared\s+\d+/);
  await expect(
    page.locator(".comparison-product-group.not-compared"),
  ).toContainText(excludedName);
  await expect(
    page.locator(".comparison-product-group.not-compared"),
  ).toContainText(
    /Only at|Not available at the same stores|No recent local price/,
  );
  expect(
    await page.locator(".comparison-product-thumb").count(),
  ).toBeGreaterThanOrEqual(2);
  await expect(
    page
      .locator(".basket-panel")
      .getByRole("button", { name: "Comparison shown", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator(".basket-line-status.compared").first(),
  ).toBeVisible();
  await expect(
    page.locator(".basket-line-status.not-compared").first(),
  ).toBeVisible();
  await expect(
    page.locator(".results-toolbar"),
  ).toContainText(/\d+ stores compared/);
  await expect(
    page.locator(".comparison-product-group.not-compared"),
  ).toContainText("Not included in store totals");
  await expect(
    page.locator(".comparison-product-group.compared"),
  ).toContainText("Included in every total below");
  await expect(
    page.locator(".comparison-product-group.compared .comparison-product"),
  ).not.toHaveCount(0);
  await expect(
    page.locator(".comparison-product-group.not-compared .comparison-product"),
  ).not.toHaveCount(0);
  await expect(
    page.locator(".comparison-product-group.compared svg").first(),
  ).toBeVisible();
  await expect(
    page.locator(".comparison-product-group.not-compared svg").first(),
  ).toBeVisible();
  await expect(
    page.locator(".basket-coverage"),
  ).toContainText(/compared · \d+ not compared/);
  await expect(page.locator(".results-footnote")).toHaveText(
    "BasketMap uses the latest eligible observation within 90 days. Records older than 30 days are historical. Prices can change and stock may vary.",
  );
  expect(await page.locator(".store-card").count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".best-label").first()).toContainText(
    "Lowest total for shared products",
  );
  await expect(page.locator(".store-total").first()).toContainText(
    "Shared products total",
  );
});

test("milk search returns milk rather than milk chocolate", async ({ page }) => {
  await page.goto("/shop");
  const search = page.getByRole("textbox", { name: "Search products" });
  await expect(page.getByLabel("Find essentials")).toHaveCount(0);
  await expect(search).toHaveAttribute(
    "placeholder",
    "Search recorded products or enter a barcode",
  );
  await search.fill("milk");
  await expect(page.locator(".product-card").first()).toContainText(/Milk|Lait/);
  await expect(page.locator(".product-grid")).not.toContainText(
    /milk chocolate|chocolat au lait/i,
  );

  await page.locator(".location-button").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Paris", exact: true })
    .click();
  await search.fill("milk");
  await expect(page.locator(".product-card").first()).toContainText(/Milk|Lait/);
  await expect(page.locator(".product-grid")).not.toContainText(
    /milk chocolate|chocolat au lait/i,
  );
});

test("a returning visitor resumes their basket and can start a new one", async ({
  page,
}) => {
  const itemId = await addComparisonReadyProduct(page);
  await expect(page.locator(".basket-lines .basket-line")).toHaveCount(1);
  await page.reload();
  await expect(
    page.locator(`.product-card[data-item-id="${itemId}"] .stepper`).first(),
  ).toContainText("1");

  await page.getByRole("button", { name: "Start a new basket" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Create a new basket?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start a new basket", exact: true })
    .click();
  await expect(page.locator(".basket-lines .basket-line")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".basket-lines .basket-line")).toHaveCount(0);
  await expect(page.locator(".empty-basket")).toContainText(
    "Add your first product",
  );
});

test("location is deliberately limited to Lyon and Paris without losing the basket", async ({
  page,
}) => {
  await addComparisonReadyProduct(page);
  await expect(page.locator(".location-button")).toContainText("Lyon");
  await page.locator(".location-button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Lyon" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Paris" })).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Paris" }).click();
  await expect(page.locator(".location-button")).toContainText("Paris");
  await expect(page.locator(".basket-lines .basket-line")).toHaveCount(1);
});

test("homepage and result maps remain usable when map tiles fail", async ({
  page,
}) => {
  await page.goto("/");
  const homepageMap = page.locator(".homepage-map");
  const brands = homepageMap.locator(".chain-showcase");
  const mapCanvas = homepageMap.locator(".homepage-map-canvas");
  expect(await brands.locator(".chain-brand-card").count()).toBeGreaterThan(7);
  await expect(brands.locator(".chain-brand-card:disabled")).toHaveCount(0);
  for (const chain of [
    "Carrefour",
    "Auchan",
    "Intermarché",
    "Monoprix",
    "Lidl",
    "E.Leclerc",
    "Super U",
    "U Express",
    "Biocoop",
    "Franprix",
  ])
    await expect(
      brands.getByRole("button", { name: new RegExp(`^${chain.replace(".", "\\.")},`) }),
    ).toBeEnabled();
  expect(
    await brands.evaluate(
      (element) =>
        element.scrollHeight <= element.clientHeight &&
        getComputedStyle(element).overflowY !== "scroll" &&
        getComputedStyle(element).overflowY !== "auto",
    ),
  ).toBe(true);
  const brandsBox = await brands.boundingBox();
  const mapBox = await mapCanvas.boundingBox();
  expect(brandsBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  expect(mapBox!.x).toBeGreaterThan(brandsBox!.x);
  const homepageToggle = homepageMap.getByRole("button", {
    name: "Use simplified map",
  });
  if (await homepageToggle.isVisible()) await homepageToggle.click();
  await expect(homepageMap.locator(".bm-coordinate-plot")).toBeVisible();
  await page
    .locator(".homepage-map .bm-coordinate-plot")
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "products with eligible recorded prices",
  );
  await page.getByRole("button", { name: "Close store details" }).click();

  await page
    .getByRole("link", { name: "Start your shopping list", exact: true })
    .click();
  await page.locator(".product-card").first().locator(".add-product").click();
  await page
    .getByRole("button", { name: "Compare my basket", exact: true })
    .click();
  await page.getByRole("button", { name: "Map view", exact: true }).click();
  const resultsMap = page.locator(".shopping-main .bm-map-panel");
  await expect(resultsMap.locator(".bm-coordinate-plot")).toBeVisible();
  await page
    .locator(".bm-coordinate-plot")
    .getByRole("button")
    .first()
    .press("Enter");
  await expect(
    page.getByRole("link", { name: "Get directions" }),
  ).toHaveAttribute("href", /destination=4[5-9]\./);
});

test("mobile shopping and comparison have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addComparisonReadyProduct(page);
  await expect(page.locator(".mobile-basket-bar")).toBeVisible();
  await page
    .locator(".mobile-basket-bar")
    .getByRole("button", { name: "Compare basket", exact: true })
    .click();
  await expect(page.locator(".store-card").first()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.getByRole("button", { name: /Open basket/ }).click();
  await expect(page.locator(".basket-panel.mobile-open")).toBeVisible();
  await page.getByRole("button", { name: "Close basket", exact: true }).click();
});

test("old project pages resolve to the shopper product", async ({ page }) => {
  for (const route of ["/#/data", "/#/story", "/#/tools"]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", {
        name: "Build your basket. Compare your total. Choose where to shop.",
      }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Demo Store");
    await expect(
      page.getByRole("link", { name: "Product story", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".shopping-layout")).toHaveCount(0);
  }
});
