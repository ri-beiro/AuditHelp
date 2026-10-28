-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "finalPagerStatus" "StepStatus" NOT NULL DEFAULT 'NAO_INICIADO',
ADD COLUMN     "onePager" JSONB,
ADD COLUMN     "onePagerStatus" "StepStatus" NOT NULL DEFAULT 'NAO_INICIADO';
