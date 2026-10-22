-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('PRIVATE', 'UNITS');

-- CreateTable
CREATE TABLE "SafetyContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'UNITS',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyContentUnit" (
    "contentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "SafetyContentUnit_pkey" PRIMARY KEY ("contentId","unitId")
);

-- CreateTable
CREATE TABLE "SafetyContentItem" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SafetyContentUnit_unitId_idx" ON "SafetyContentUnit"("unitId");

-- CreateIndex
CREATE INDEX "SafetyContentItem_contentId_idx" ON "SafetyContentItem"("contentId");

-- AddForeignKey
ALTER TABLE "SafetyContent" ADD CONSTRAINT "SafetyContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyContentUnit" ADD CONSTRAINT "SafetyContentUnit_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "SafetyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyContentUnit" ADD CONSTRAINT "SafetyContentUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyContentItem" ADD CONSTRAINT "SafetyContentItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "SafetyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
