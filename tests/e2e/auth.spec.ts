import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { authenticator } from "otplib";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/codepad_test",
    },
  },
});

test.describe("Authentication and Security Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies/localstorage and start fresh
    await page.context().clearCookies();
  });

  test("recruiter cannot sign up with public domain email", async ({ page }) => {
    await page.goto("/login");
    // Switch to Join mode
    await page.getByRole("button", { name: "Join here" }).click();
    
    // Select Recruiter role
    await page.getByRole("button", { name: "Recruiter", exact: true }).click();
    
    // Fill in credentials and details
    await page.getByPlaceholder("Full name").fill("Test Recruiter");
    await page.getByPlaceholder("Company name").fill("Public Company");
    await page.getByPlaceholder("Job title").fill("Manager");
    await page.locator("select").selectOption("11-50");
    await page.getByPlaceholder("Email address").fill("recruiter@gmail.com");
    await page.getByPlaceholder("Create a password").fill("password123");
    
    // Check Terms
    await page.locator("input[type=\"checkbox\"]").check();
    
    // Submit
    await page.getByRole("button", { name: "Create Account", exact: true }).first().click();
    
    // Verify validation message
    await expect(page.locator("text=Please register with your official company email address").first()).toBeVisible();
  });

  test("candidate can sign up, verify OTP, and sign in", async ({ page }) => {
    const testEmail = `candidate-${Date.now()}@example.com`;
    
    await page.goto("/login");
    await page.getByRole("button", { name: "Join here" }).click();
    await page.getByRole("button", { name: "Candidate", exact: true }).click();
    
    await page.getByPlaceholder("Display name").fill("Fresh Candidate");
    await page.getByPlaceholder("Email address").fill(testEmail);
    await page.getByPlaceholder("Create a password").fill("password123");
    await page.locator("input[type=\"checkbox\"]").check();
    
    await page.getByRole("button", { name: "Create Account", exact: true }).first().click();
    
    // Wait for the verify OTP screen
    await expect(page.getByRole("heading", { level: 1, name: "Verify your email", exact: true })).toBeVisible();
    
    // Retrieve OTP token from database
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail },
      orderBy: { expires: "desc" },
    });
    
    expect(tokenRecord).not.toBeNull();
    const otp = tokenRecord!.token;
    
    // Enter OTP
    await page.getByPlaceholder("123456").fill(otp);
    
    // Wait for the verify button and click
    await page.getByRole("button", { name: "Verify and Create Account", exact: true }).first().click();
    
    // Should successfully create account and redirect to /
    await page.waitForURL("**/");
    
    // Verify user profile menu is visible
    await expect(page.getByLabel("Open user menu")).toBeVisible();
  });

  test("recruiter can sign up, verify OTP, and sign in with official company email", async ({ page }) => {
    const testEmail = `recruiter-${Date.now()}@mycompany.com`;
    
    await page.goto("/login");
    await page.getByRole("button", { name: "Join here" }).click();
    await page.getByRole("button", { name: "Recruiter", exact: true }).click();
    
    await page.getByPlaceholder("Full name").fill("Official Recruiter");
    await page.getByPlaceholder("Company name").fill("My Company Ltd");
    await page.getByPlaceholder("Job title").fill("Director of Talent");
    await page.locator("select").selectOption("11-50");
    await page.getByPlaceholder("Email address").fill(testEmail);
    await page.getByPlaceholder("Create a password").fill("password123");
    await page.locator("input[type=\"checkbox\"]").check();
    
    await page.getByRole("button", { name: "Create Account", exact: true }).first().click();
    
    // Wait for OTP
    await expect(page.getByRole("heading", { level: 1, name: "Verify your email", exact: true })).toBeVisible();
    
    // Retrieve OTP
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail },
      orderBy: { expires: "desc" },
    });
    expect(tokenRecord).not.toBeNull();
    const otp = tokenRecord!.token;
    
    // Enter OTP
    await page.getByPlaceholder("123456").fill(otp);
    await page.getByRole("button", { name: "Verify and Create Account", exact: true }).first().click();
    
    // Redirect to home
    await page.waitForURL("**/");
    await expect(page.getByLabel("Open user menu")).toBeVisible();
  });

  test("login with wrong credentials fails", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill("candidate@codepad.test");
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
    
    // Check for "Wrong email or password." or "CredentialsSignin" or "Sign-in failed"
    await expect(
      page.locator("text=Wrong email or password.")
        .or(page.locator("text=CredentialsSignin"))
        .or(page.locator("text=Sign-in failed"))
        .first()
    ).toBeVisible();
  });

  test("login with correct credentials works and can sign out", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill("candidate@codepad.test");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
    
    await page.waitForURL("**/");
    await expect(page.getByLabel("Open user menu")).toBeVisible();
    
    // Now test sign out
    await page.getByLabel("Open user menu").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    
    // Verify redirected back
    await page.waitForURL("**/");
    await expect(page.getByLabel("Open user menu")).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
  });

  test("user can enroll 2FA, log in with TOTP, and log in with backup code", async ({ page }) => {
    // 1. Sign in as candidate@codepad.test
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill("candidate@codepad.test");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
    await page.waitForURL("**/");
    
    // Navigate to security settings page
    await page.goto("/profile/security");
    await expect(page.getByRole("heading", { level: 1, name: "Security", exact: true })).toBeVisible();
    
    // Start setup
    await page.getByRole("button", { name: "Set up 2FA" }).click();
    
    // Retrieve secret from code tag
    const secretLocator = page.locator("code.break-all");
    await expect(secretLocator).toBeVisible();
    const secret = (await secretLocator.innerText()).trim();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    
    // Generate TOTP
    const firstOtp = authenticator.generate(secret);
    await page.getByPlaceholder("123456").fill(firstOtp);
    await page.getByRole("button", { name: "Verify & enable" }).click();
    
    // Verify backup codes are displayed
    await expect(page.locator("text=Save these backup codes now")).toBeVisible();
    
    // Read the backup codes from the page
    const backupCodeLocators = page.locator("code.text-center");
    const count = await backupCodeLocators.count();
    expect(count).toBeGreaterThan(0);
    const backupCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      backupCodes.push((await backupCodeLocators.nth(i).innerText()).trim());
    }
    expect(backupCodes).toHaveLength(10);
    
    // Confirm saved
    await page.getByRole("button", { name: "I've saved them" }).click();
    
    // Wait for the page reload to complete and show the enrolled actions
    await expect(page.getByRole("button", { name: "Disable 2FA" })).toBeVisible();
    
    // Sign out
    await page.goto("/");
    await page.getByLabel("Open user menu").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/");
    
    // 2. Test logging in with password + TOTP
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill("candidate@codepad.test");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
    
    // Expecting 2FA prompt
    await expect(page.locator("text=Two-factor authentication is on").first()).toBeVisible();
    
    // Generate fresh TOTP
    const secondOtp = authenticator.generate(secret);
    await page.getByPlaceholder("123456").fill(secondOtp);
    await page.getByRole("button", { name: "Verify and Sign In", exact: true }).first().click();
    
    // Redirect to home
    await page.waitForURL("**/");
    await expect(page.getByLabel("Open user menu")).toBeVisible();
    
    // Sign out again
    await page.getByLabel("Open user menu").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/");
    
    // 3. Test logging in using a backup code
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill("candidate@codepad.test");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
    
    // Expect 2FA prompt
    await expect(page.locator("text=Two-factor authentication is on").first()).toBeVisible();
    
    // Fill in a backup code (the first one)
    const backupCode = backupCodes[0];
    await page.getByPlaceholder("123456").fill(backupCode);
    await page.getByRole("button", { name: "Verify and Sign In", exact: true }).first().click();
    
    // Redirect to home
    await page.waitForURL("**/");
    await expect(page.getByLabel("Open user menu")).toBeVisible();
    
    // Clean up: Disable 2FA on candidate@codepad.test so subsequent runs start clean
    await page.goto("/profile/security");
    await page.getByRole("button", { name: "Disable 2FA" }).click();
    
    // Enter TOTP to disable
    const disableOtp = authenticator.generate(secret);
    await page.locator("input[placeholder=\"123456\"]").fill(disableOtp);
    await page.getByRole("button", { name: "Disable", exact: true }).first().click();
    
    // Wait for page to reload and show Setup 2FA or Restart setup button
    await expect(
      page.getByRole("button", { name: "Set up 2FA" })
        .or(page.getByRole("button", { name: "Restart setup" }))
        .first()
    ).toBeVisible();
    
    // Verify 2FA is now disabled
    await expect(page.locator("text=Not enabled").first()).toBeVisible();
  });
});
