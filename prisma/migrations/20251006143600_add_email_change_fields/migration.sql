-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailChangeToken" TEXT,
ADD COLUMN     "emailChangeTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "pendingEmail" TEXT;

-- CreateIndex
CREATE INDEX "users_emailChangeToken_idx" ON "users"("emailChangeToken");

-- CreateIndex
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_verificationToken_idx" ON "users"("verificationToken");
