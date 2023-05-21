/*
  Warnings:

  - The primary key for the `GuildUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `guildId` on the `GuildUser` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `GuildUser` table. All the data in the column will be lost.
  - Added the required column `guild_id` to the `GuildUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `GuildUser` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GuildUser" DROP CONSTRAINT "GuildUser_guildId_fkey";

-- DropForeignKey
ALTER TABLE "GuildUser" DROP CONSTRAINT "GuildUser_userId_fkey";

-- AlterTable
ALTER TABLE "GuildUser" DROP CONSTRAINT "GuildUser_pkey",
DROP COLUMN "guildId",
DROP COLUMN "userId",
ADD COLUMN     "guild_id" VARCHAR(32) NOT NULL,
ADD COLUMN     "user_id" VARCHAR(32) NOT NULL,
ADD CONSTRAINT "GuildUser_pkey" PRIMARY KEY ("guild_id", "user_id");

-- AddForeignKey
ALTER TABLE "GuildUser" ADD CONSTRAINT "GuildUser_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildUser" ADD CONSTRAINT "GuildUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
