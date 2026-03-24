-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "modulesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "classification" JSONB,
ADD COLUMN     "personalContext" TEXT,
ADD COLUMN     "useExpertProfile" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExpertProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "location" TEXT,
    "maritalStatus" TEXT,
    "hasChildren" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "communicationStyle" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appearsOnCamera" TEXT,
    "preferredTone" TEXT,
    "usesHumor" TEXT,
    "commonExpressions" TEXT,
    "avoidExpressions" TEXT,
    "coreValues" TEXT,
    "religion" TEXT,
    "politicalPosition" TEXT,
    "causes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketFrustration" TEXT,
    "controversialOpinion" TEXT,
    "avoidTopics" TEXT,
    "bio" TEXT,
    "careerOrigin" TEXT,
    "hardestMoment" TEXT,
    "proudestMoment" TEXT,
    "personalStory" TEXT,
    "dailyRoutine" TEXT,
    "audienceIdentity" TEXT,
    "communityName" TEXT,
    "bestCompliment" TEXT,
    "commonCriticism" TEXT,
    "inspirations" TEXT,
    "preferredFormats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestPerformingVideo" TEXT,
    "worstPerformingVideo" TEXT,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpertProfile_userId_key" ON "ExpertProfile"("userId");

-- CreateIndex
CREATE INDEX "ExpertProfile_userId_idx" ON "ExpertProfile"("userId");

-- AddForeignKey
ALTER TABLE "ExpertProfile" ADD CONSTRAINT "ExpertProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
