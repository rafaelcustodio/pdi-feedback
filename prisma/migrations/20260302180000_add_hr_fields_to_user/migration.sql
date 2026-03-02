-- Add HR fields to User
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "cpf" TEXT;
ALTER TABLE "User" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "state" TEXT;
ALTER TABLE "User" ADD COLUMN "zipCode" TEXT;

-- CPF unique constraint (only non-null values)
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");
