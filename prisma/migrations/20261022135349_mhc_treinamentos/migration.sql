-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "validityDays" INTEGER,
    "noExpiry" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT,
    "effectiveness" BOOLEAN,
    "passingScore" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTraining" (
    "roleId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "RoleTraining_pkey" PRIMARY KEY ("roleId","trainingId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Training_name_key" ON "Training"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_name_key" ON "JobRole"("name");

-- CreateIndex
CREATE INDEX "RoleTraining_trainingId_idx" ON "RoleTraining"("trainingId");

-- AddForeignKey
ALTER TABLE "RoleTraining" ADD CONSTRAINT "RoleTraining_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTraining" ADD CONSTRAINT "RoleTraining_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;
