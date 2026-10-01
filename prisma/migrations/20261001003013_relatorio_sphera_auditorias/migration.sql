-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN     "auditId" TEXT,
ADD COLUMN     "auditItemCode" TEXT,
ADD COLUMN     "spheraId" TEXT;

-- CreateTable
CREATE TABLE "ClosingReport" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "auditDates" TEXT,
    "auditors" TEXT,
    "format" TEXT,
    "highlights" TEXT,
    "quotes" TEXT,
    "groups" JSONB,
    "conclusion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ClosingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "contractor" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "auditorId" TEXT,
    "accompaniedBy" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "strengths" TEXT,
    "opportunities" TEXT,
    "conclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAnswer" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "value" TEXT,
    "observation" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AuditAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAttachment" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "itemCode" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClosingReport_assessmentId_key" ON "ClosingReport"("assessmentId");

-- CreateIndex
CREATE INDEX "Audit_unitId_template_idx" ON "Audit"("unitId", "template");

-- CreateIndex
CREATE UNIQUE INDEX "AuditAnswer_auditId_itemCode_key" ON "AuditAnswer"("auditId", "itemCode");

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingReport" ADD CONSTRAINT "ClosingReport_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingReport" ADD CONSTRAINT "ClosingReport_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAnswer" ADD CONSTRAINT "AuditAnswer_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAnswer" ADD CONSTRAINT "AuditAnswer_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAttachment" ADD CONSTRAINT "AuditAttachment_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAttachment" ADD CONSTRAINT "AuditAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
