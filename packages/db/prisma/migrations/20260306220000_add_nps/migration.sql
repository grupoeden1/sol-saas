-- CreateTable
CREATE TABLE "NpsCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "minDays" INTEGER NOT NULL DEFAULT 7,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpsCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpsResponse" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER,
    "viewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpsResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NpsCampaign_status_idx" ON "NpsCampaign"("status");

-- CreateIndex
CREATE INDEX "NpsResponse_userId_idx" ON "NpsResponse"("userId");

-- CreateIndex
CREATE INDEX "NpsResponse_campaignId_idx" ON "NpsResponse"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "NpsResponse_campaignId_userId_key" ON "NpsResponse"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "NpsResponse" ADD CONSTRAINT "NpsResponse_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NpsCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsResponse" ADD CONSTRAINT "NpsResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
