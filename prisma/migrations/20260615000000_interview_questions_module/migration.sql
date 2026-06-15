-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "hiringRoles" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepQuestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "answer" TEXT,
    "companyId" TEXT,
    "technology" TEXT,
    "role" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "round" TEXT,
    "experienceLevel" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "yearsAsked" TEXT NOT NULL DEFAULT '[]',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepExperience" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "companyName" TEXT,
    "role" TEXT,
    "experienceLevel" TEXT,
    "location" TEXT,
    "year" INTEGER,
    "process" TEXT,
    "rounds" TEXT,
    "questionsAsked" TEXT NOT NULL DEFAULT '[]',
    "result" TEXT,
    "tips" TEXT,
    "difficulty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PrepQuestion_slug_key" ON "PrepQuestion"("slug");

-- CreateIndex
CREATE INDEX "PrepQuestion_companyId_idx" ON "PrepQuestion"("companyId");

-- CreateIndex
CREATE INDEX "PrepQuestion_technology_status_idx" ON "PrepQuestion"("technology", "status");

-- CreateIndex
CREATE INDEX "PrepQuestion_status_idx" ON "PrepQuestion"("status");

-- CreateIndex
CREATE INDEX "PrepQuestion_slug_idx" ON "PrepQuestion"("slug");

-- CreateIndex
CREATE INDEX "PrepExperience_companyId_idx" ON "PrepExperience"("companyId");

-- CreateIndex
CREATE INDEX "PrepExperience_status_idx" ON "PrepExperience"("status");

-- AddForeignKey
ALTER TABLE "PrepQuestion" ADD CONSTRAINT "PrepQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepExperience" ADD CONSTRAINT "PrepExperience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
