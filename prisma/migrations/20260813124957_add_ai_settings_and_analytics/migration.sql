/*
  Warnings:

  - You are about to drop the column `metadata` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('DOCUMENT', 'FAQ', 'ARTICLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "KnowledgeDocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');

-- DropIndex
DROP INDEX "Company_name_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "metadata",
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "KnowledgeDocument" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "sourceType" "DocumentSourceType" NOT NULL DEFAULT 'DOCUMENT',
ADD COLUMN     "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "AISettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT,
    "model" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoResolveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "eventType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AISettings_companyId_key" ON "AISettings"("companyId");

-- CreateIndex
CREATE INDEX "AISettings_companyId_idx" ON "AISettings"("companyId");

-- CreateIndex
CREATE INDEX "AIAnalytics_companyId_idx" ON "AIAnalytics"("companyId");

-- CreateIndex
CREATE INDEX "AIAnalytics_conversationId_idx" ON "AIAnalytics"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Message_companyId_idx" ON "Message"("companyId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISettings" ADD CONSTRAINT "AISettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalytics" ADD CONSTRAINT "AIAnalytics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
