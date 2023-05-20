-- CreateTable
CREATE TABLE "GuildUser" (
    "guildId" VARCHAR(32) NOT NULL,
    "userId" VARCHAR(32) NOT NULL,

    CONSTRAINT "GuildUser_pkey" PRIMARY KEY ("guildId","userId")
);

-- AddForeignKey
ALTER TABLE "GuildUser" ADD CONSTRAINT "GuildUser_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildUser" ADD CONSTRAINT "GuildUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
