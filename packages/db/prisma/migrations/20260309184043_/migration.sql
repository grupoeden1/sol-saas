-- DropIndex
DROP INDEX "CreditTransaction_type_idx";

-- CreateIndex
CREATE INDEX "CreditTransaction_type_createdAt_idx" ON "CreditTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_modelUsed_idx" ON "CreditTransaction"("modelUsed");

-- CreateIndex
CREATE INDEX "Message_createdAt_role_idx" ON "Message"("createdAt", "role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
