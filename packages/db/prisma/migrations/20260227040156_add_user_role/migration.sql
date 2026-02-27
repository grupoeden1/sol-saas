/*
  Warnings:

  - You are about to alter the column `exchangeRate` on the `CreditTransaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `costUsd` on the `CreditTransaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "CreditTransaction" ALTER COLUMN "exchangeRate" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "costUsd" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
