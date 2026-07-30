import { expect, test } from "@playwright/test";

test("renders qualified channels and the evidence shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("FICTIONAL SCENARIO — NOT A REAL EMERGENCY"),
  ).toBeVisible();
  await expect(page.getByText("The channels are live.")).toBeVisible();
  await expect(page.getByText("telegram", { exact: true })).toBeVisible();
  await expect(page.getByText("discord", { exact: true })).toBeVisible();
  await expect(page.getByText("email", { exact: true })).toBeVisible();
  const expectedHealth =
    process.env.PLAYWRIGHT_BASE_URL === undefined ? "CHECKING" : "LIVE";
  await expect(page.getByText(expectedHealth, { exact: true })).toHaveCount(3);
});

test("keeps operator controls behind authentication", async ({ page }) => {
  await page.goto("/operator");
  await expect(
    page.getByRole("heading", { name: "Operator access" }),
  ).toBeVisible();
  await expect(page.getByLabel("Operator secret")).toHaveAttribute(
    "type",
    "password",
  );
});

test("public dashboard payload excludes private addressing fields", async ({
  request,
}) => {
  const response = await request.get("/api/dashboard");
  expect(response.ok()).toBe(true);
  const serialized = JSON.stringify(await response.json());
  expect(serialized).not.toContain("conversationId");
  expect(serialized).not.toContain("connectionId");
  expect(serialized).not.toContain("senderFingerprint");
  expect(serialized).not.toContain("joinCodeHash");
});
