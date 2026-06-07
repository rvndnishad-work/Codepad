import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function globalSetup() {
  // Set environment variables for the test process
  const testDbUrl = "postgresql://postgres:postgres@localhost:5432/codepad_test";
  process.env.DATABASE_URL = testDbUrl;
  process.env.DIRECT_URL = testDbUrl;
  process.env.ADMIN_EMAILS = "admin@codepad.test,rvndnishad@gmail.com";

  console.log("\n[E2E Setup] Initializing isolated E2E test database...");
  try {
    // Force deployment of migrations to the test database
    console.log("[E2E Setup] Running migrations against codepad_test...");
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
        DIRECT_URL: testDbUrl,
      },
    });
    console.log("[E2E Setup] E2E test database migrated successfully.");

    // Seed test users
    console.log("[E2E Setup] Seeding test users...");
    const prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });

    const passwordHash = await bcrypt.hash("password123", 12);

    // Delete existing users to ensure clean slate
    await prisma.user.deleteMany({});

    // 1. Recruiter user
    await prisma.user.create({
      data: {
        email: "recruiter@codepad.test",
        name: "Test Recruiter",
        passwordHash,
        userType: "recruiter",
        companyName: "Test Company",
        companySize: "11-50",
        jobTitle: "Hiring Manager",
      },
    });

    // 2. Candidate user
    await prisma.user.create({
      data: {
        email: "candidate@codepad.test",
        name: "Test Candidate",
        passwordHash,
        userType: "candidate",
        portfolioPublic: true,
      },
    });

    // 3. Admin user
    await prisma.user.create({
      data: {
        email: "admin@codepad.test",
        name: "Test Admin",
        passwordHash,
        userType: "recruiter",
        companyName: "Codepad Inc",
        companySize: "1000+",
        jobTitle: "Super Admin",
      },
    });

    await prisma.$disconnect();
    console.log("[E2E Setup] Test users seeded successfully.\n");
  } catch (error) {
    console.error("[E2E Setup] E2E test database setup failed:", error);
    throw error;
  }
}

export default globalSetup;

