-- CreateTable
CREATE TABLE "Guild" (
    "id" VARCHAR(32) NOT NULL,
    "birthday_role_id" VARCHAR(32),
    "birthday_channel_id" VARCHAR(32),

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(32) NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateMessage" (
    "id" BIGSERIAL NOT NULL,
    "senderId" VARCHAR(32) NOT NULL,
    "receiverId" VARCHAR(32) NOT NULL,
    "year" TIMESTAMP(3) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,

    CONSTRAINT "PrivateMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicMessage" (
    "id" BIGSERIAL NOT NULL,
    "senderId" VARCHAR(32) NOT NULL,
    "receiverId" VARCHAR(32) NOT NULL,
    "guildId" VARCHAR(32) NOT NULL,
    "year" TIMESTAMP(3) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,

    CONSTRAINT "PublicMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicMessage" ADD CONSTRAINT "PublicMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicMessage" ADD CONSTRAINT "PublicMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
