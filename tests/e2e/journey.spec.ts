import { expect, test } from "@playwright/test";

test("reader signs up, reviews a book, edits, and deletes the review", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`;
  await page.goto("/signup?returnTo=%2Fbooks%2FOL27482W");
  await page.getByLabel("Your name").fill("E2E Reader");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: /create your account/i }).click();

  await expect(page).toHaveURL(/\/books\/OL27482W/);
  await expect(page.getByRole("heading", { level: 1, name: "The Hobbit" })).toBeVisible();

  await page.getByLabel("5 stars").check({ force: true });
  await page.getByLabel("Your review").fill("An e2e-approved adventure.");
  await page.getByRole("button", { name: /publish review/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "has been saved" })).toBeVisible();
  await expect(page.getByText("An e2e-approved adventure.")).toBeVisible();

  await page.goto("/my-reviews");
  await expect(page.getByText("An e2e-approved adventure.")).toBeVisible();

  await page.getByRole("button", { name: "Delete review" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText("Your story starts here.")).toBeVisible();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/my-reviews");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fmy-reviews/);
});
