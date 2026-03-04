-- Re-add CHECK constraint ensuring credits never goes negative.
-- This was originally created in 20260225193516 but was dropped during
-- pricing refactoring migrations and never re-added.
ALTER TABLE "User" ADD CONSTRAINT "user_credits_non_negative" CHECK ("credits" >= 0);
