-- ElevenLabs TTS: new fields on CreditTransaction
ALTER TABLE "CreditTransaction" ADD COLUMN "elevenLabsChars" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN "elevenLabsCredits" INTEGER;

-- TTS Audio Cache
CREATE TABLE "TtsAudioCache" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "characters" INTEGER NOT NULL,
    "audioPath" TEXT NOT NULL,
    "durationMs" INTEGER,
    "fileSizeBytes" INTEGER,
    "creditsCharged" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TtsAudioCache_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "TtsAudioCache_conversationId_idx" ON "TtsAudioCache"("conversationId");
CREATE INDEX "TtsAudioCache_messageId_idx" ON "TtsAudioCache"("messageId");
CREATE UNIQUE INDEX "TtsAudioCache_messageId_voiceId_key" ON "TtsAudioCache"("messageId", "voiceId");

-- Foreign key
ALTER TABLE "TtsAudioCache" ADD CONSTRAINT "TtsAudioCache_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
