-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profilePicPublicId" TEXT,
ALTER COLUMN "profilePic" DROP NOT NULL;
