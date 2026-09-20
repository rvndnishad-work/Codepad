const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const testDbUrl = "postgresql://postgres:postgres@localhost:5432/codepad_test";
process.env.DATABASE_URL = testDbUrl;
process.env.DIRECT_URL = testDbUrl;
process.env.ADMIN_EMAILS = "admin@codepad.test,rvndnishad@gmail.com";
process.env.NEXT_DIST_DIR = ".next-test";

async function run() {
  console.log("\n[E2E Runner] Preparing isolated test database...");
  try {
    // 1. Deploy migrations
    console.log("[E2E Runner] Running prisma migrate deploy...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    
    // 2. Seed test users
    console.log("[E2E Runner] Seeding test users...");
    const prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });

    const passwordHash = await bcrypt.hash("password123", 12);

    // Clean existing users
    await prisma.user.deleteMany({});

    // Seed recruiter
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

    // Seed candidate
    await prisma.user.create({
      data: {
        email: "candidate@codepad.test",
        name: "Test Candidate",
        passwordHash,
        userType: "candidate",
        portfolioPublic: true,
      },
    });

    // Seed admin
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

    // Seed grading fixture: a tiny python harness challenge whose starter
    // already passes, so the e2e grading spec exercises the judge pipeline
    // (grade route -> Piston) without Monaco typing.
    await prisma.challenge.deleteMany({ where: { slug: "e2e-harness-add" } });
    await prisma.challenge.create({
      data: {
        slug: "e2e-harness-add",
        title: "E2E Add",
        description: "Add two integers.",
        difficulty: "easy",
        template: "python",
        starterFiles: "{}",
        testFiles: "{}",
        published: true,
        visibility: "public",
        steps: {
          create: [
            {
              position: 0,
              description: "Implement `add(a, b)`.",
              template: "python",
              starterFiles: "{}",
              testFiles: "{}",
              judgingMode: "harness",
              functionName: "add",
              signatureJson: JSON.stringify({
                params: [
                  { name: "a", type: "int" },
                  { name: "b", type: "int" },
                ],
                returnType: "int",
              }),
              languagesJson: JSON.stringify(["python"]),
              starterCodeJson: JSON.stringify({
                python: "def add(a, b):\n    return a + b\n",
              }),
              harnessTestsJson: JSON.stringify([
                {
                  id: "t1",
                  name: "adds positives",
                  argsJson: "[1, 2]",
                  expectedJson: "3",
                  isHidden: false,
                  weight: 1,
                  compare: "exact",
                },
                {
                  id: "t2",
                  name: "adds negatives",
                  argsJson: "[-1, -2]",
                  expectedJson: "-3",
                  isHidden: true,
                  weight: 1,
                  compare: "exact",
                },
              ]),
            },
          ],
        },
      },
    });

    await prisma.$disconnect();
    console.log("[E2E Runner] Database prepared and seeded successfully.\n");
  } catch (error) {
    console.error("[E2E Runner] Database preparation failed:", error);
    process.exit(1);
  }

  console.log("[E2E Runner] Launching Playwright tests...");
  try {
    const args = process.argv.slice(2).join(" ");
    execSync(`npx playwright test ${args}`, { stdio: "inherit" });
  } catch (error) {
    console.error("[E2E Runner] Playwright tests execution failed.");
    process.exit(1);
  }
}

run();
