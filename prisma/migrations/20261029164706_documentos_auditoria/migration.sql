-- CreateEnum
CREATE TYPE "AuditDocumentStatus" AS ENUM ('PENDENTE', 'RECEBIDO', 'NAO_APLICAVEL');

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "documentKey" TEXT;

-- CreateTable
CREATE TABLE "AuditDocument" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "AuditDocumentStatus" NOT NULL DEFAULT 'PENDENTE',
    "note" TEXT,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditDocument_assessmentId_elementId_key_key" ON "AuditDocument"("assessmentId", "elementId", "key");

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
