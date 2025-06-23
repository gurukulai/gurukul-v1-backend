/*
  Warnings:

  - You are about to drop the column `content` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `WhatsappConversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WhatsappMessage` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `message` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personaType` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WhatsappConversation" DROP CONSTRAINT "WhatsappConversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsappMessage" DROP CONSTRAINT "WhatsappMessage_conversationId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content",
DROP COLUMN "type",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "personaType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "authProvider" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "picture" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phoneNumber" DROP NOT NULL;

-- DropTable
DROP TABLE "WhatsappConversation";

-- DropTable
DROP TABLE "WhatsappMessage";

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
