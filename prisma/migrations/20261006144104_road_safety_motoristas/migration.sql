-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('REALIZADO', 'PENDENTE');

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "cpfKey" TEXT,
    "plate" TEXT,
    "carrier" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "onboardingStatus" "TrainingStatus" NOT NULL DEFAULT 'PENDENTE',
    "onboardingAt" TIMESTAMP(3),
    "onboardingValid" TIMESTAMP(3),
    "defensiveStatus" "TrainingStatus" NOT NULL DEFAULT 'PENDENTE',
    "defensiveAt" TIMESTAMP(3),
    "defensiveValid" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Driver_unitId_carrier_idx" ON "Driver"("unitId", "carrier");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_unitId_cpfKey_key" ON "Driver"("unitId", "cpfKey");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
