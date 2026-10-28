-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN     "controlHierarchy" TEXT,
ADD COLUMN     "rootCauseRef" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "rca" JSONB;
