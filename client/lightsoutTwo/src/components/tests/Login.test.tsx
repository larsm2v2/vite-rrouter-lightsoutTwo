import { test, expect, chromium, firefox, webkit } from "@playwright/test";

// Extend the Window interface to include _lastOpenedUrl
declare global {
  interface Window {
    _lastOpenedUrl?: string;
  }
}

// Test all browsers
const browsers = [
  { name: "Chromium", browser: chromium }, // Works for Chrome, Edge, Brave
  { name: "Firefox", browser: firefox },
  { name: "WebKit", browser: webkit }, // Safari
];

// Base URL for tests
const baseURL = process.env.TEST_BASE_URL || "http://localhost:5173";

// Tests that run for each browser
for (const { name, browser } of browsers) {
  test.describe(`Login component in ${name}`, () => {
    let page: import("@playwright/test").Page;

    test.beforeEach(async () => {
      // Launch browser
      const browserInstance = await browser.launch();
      const context = await browserInstance.newContext();
      page = await context.newPage();

      // Navigate to login page
      await page.goto(`${baseURL}/login`);

      // Wait for the page to fully load
      await page.waitForSelector(".login-container");
    });

    test("should display login form by default", async () => {
      await expect(page.locator(".auth-tabs button.active")).toHaveText(
        "Login"
      );
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("button.submit-button")).toContainText("Login");
      await expect(page.locator(".provider-button.google")).toBeVisible();
    });

    test("should validate email and password fields on login", async () => {
      // Click submit without entering data
      await page.locator("button.submit-button").click();
      await expect(page.locator(".error-message")).toContainText(
        "Email is required"
      );

      // Enter email but not password
      await page.locator("#email").fill("test@example.com");
      await page.locator("button.submit-button").click();
      await expect(page.locator(".error-message")).toContainText(
        "Password is required"
      );
    });

    test("should switch to registration form", async () => {
      await page.locator('.auth-tabs button:has-text("Register")').click();
      await expect(page.locator(".auth-tabs button.active")).toHaveText(
        "Register"
      );
      await expect(page.locator("#reg-email")).toBeVisible();
      await expect(page.locator("#reg-password")).toBeVisible();
      await expect(page.locator("#confirm-password")).toBeVisible();
      await expect(page.locator("button.submit-button")).toContainText(
        "Register"
      );
    });

    test("should validate password confirmation on registration", async () => {
      // Switch to registration tab
      await page.locator('.auth-tabs button:has-text("Register")').click();

      // Fill form with mismatched passwords
      await page.locator("#reg-email").fill("test@example.com");
      await page.locator("#reg-password").fill("password123");
      await page.locator("#confirm-password").fill("password456");
      await page.locator("button.submit-button").click();

      await expect(page.locator(".error-message")).toContainText(
        "Passwords do not match"
      );
    });

    test("should handle successful login", async () => {
      // Mock successful API response
      await page.route("/auth/login", async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      });

      // Fill login form
      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("password123");
      await page.locator("button.submit-button").click();

      // Check navigation to profile page
      await page.waitForURL("**/profile");
      expect(page.url()).toContain("/profile");
    });

    test("should handle login error", async () => {
      // Mock failed API response
      await page.route("/auth/login", async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ message: "Invalid credentials" }),
        });
      });

      // Fill login form
      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("wrongpassword");
      await page.locator("button.submit-button").click();

      await expect(page.locator(".error-message")).toContainText(
        "Invalid credentials"
      );
    });

    test("should handle successful registration", async () => {
      // Switch to registration tab
      await page.locator('.auth-tabs button:has-text("Register")').click();

      // Mock successful API response
      await page.route("/auth/register", async (route) => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ success: true }),
        });
      });

      // Fill registration form
      await page.locator("#reg-email").fill("newuser@example.com");
      await page.locator("#reg-password").fill("password123");
      await page.locator("#confirm-password").fill("password123");
      await page.locator("button.submit-button").click();

      // Check navigation to profile page
      await page.waitForURL("**/profile");
      expect(page.url()).toContain("/profile");
    });

    test("should open Google OAuth in same window", async () => {
      // Mock window.location change without actually navigating
      await page.evaluate(() => {
        window.open = function (url) {
          window._lastOpenedUrl = url?.toString();
          return null;
        };
      });

      // Click Google login button
      await page.locator(".provider-button.google").click();

      // Verify the OAuth URL would be opened
      const openedUrl = await page.evaluate(() => window._lastOpenedUrl);
      expect(openedUrl).toContain("/auth/google");
    });
  });
}

// Special tests for DuckDuckGo (using Chromium as base)
test.describe("Login component in DuckDuckGo", () => {
  test("should work in DuckDuckGo browser", async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 DuckDuckGo/7",
    });
    const page = await context.newPage();

    await page.goto(`${baseURL}/login`);
    await expect(page.locator(".login-container")).toBeVisible();

    // Basic functionality test
    await page.locator("#email").fill("test@example.com");
    await page.locator("#password").fill("password123");
    await expect(page.locator("button.submit-button")).toBeEnabled();

    await browser.close();
  });
});
