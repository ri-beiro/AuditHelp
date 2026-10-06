-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FATALIDADE', 'LTA', 'NLTA', 'FAC', 'INCIDENTE', 'NEAR_MISS', 'CONDICAO_INSEGURA', 'OBSERVACAO');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'AGENDADO', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN     "auditRecordId" TEXT,
ADD COLUMN     "evidence" TEXT,
ADD COLUMN     "incidentId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "safetyStartDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "area" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "hipo" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "spheraId" TEXT,
    "responsibleId" TEXT,
    "reportedById" TEXT,
    "reportStatus" "StepStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "investigationStatus" "StepStatus" NOT NULL DEFAULT 'NAO_INICIADO',
    "meetingAt" TIMESTAMP(3),
    "participants" TEXT,
    "meetingNotes" TEXT,
    "planStatus" "StepStatus" NOT NULL DEFAULT 'NAO_INICIADO',
    "lessonsStatus" "StepStatus" NOT NULL DEFAULT 'NAO_INICIADO',
    "rootCause" TEXT,
    "whatHappened" TEXT,
    "howToPrevent" TEXT,
    "goodPractices" TEXT,
    "sharedWith" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAttachment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "auditor" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "result" TEXT,
    "reportUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_number_key" ON "Incident"("number");

-- CreateIndex
CREATE INDEX "Incident_unitId_occurredAt_idx" ON "Incident"("unitId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditRecord_unitId_date_idx" ON "AuditRecord"("unitId", "date");

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_auditRecordId_fkey" FOREIGN KEY ("auditRecordId") REFERENCES "AuditRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAttachment" ADD CONSTRAINT "IncidentAttachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAttachment" ADD CONSTRAINT "IncidentAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
