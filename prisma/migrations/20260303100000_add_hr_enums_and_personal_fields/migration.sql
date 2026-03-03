-- CreateEnum
CREATE TYPE "Ethnicity" AS ENUM ('branco', 'preto', 'amarelo', 'indigena', 'pardo');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('masculino', 'feminino', 'outra');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('solteiro', 'casado', 'outra');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('ensino_medio', 'ensino_tecnico', 'superior_incompleto', 'superior_completo', 'pos_graduado');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('efetivo', 'estagio');

-- CreateEnum
CREATE TYPE "HealthPlanOption" AS ENUM ('regional', 'nacional', 'nao');

-- CreateEnum
CREATE TYPE "ShirtSize" AS ENUM ('p_fem', 'm_fem', 'g_fem', 'gg_fem', 'xg_fem', 'p_masc', 'm_masc', 'g_masc', 'gg_masc', 'xg_masc');

-- CreateEnum
CREATE TYPE "BankAccountOption" AS ENUM ('sim', 'nao', 'outra');

-- AlterTable: Personal data fields
ALTER TABLE "User" ADD COLUMN "rg" TEXT;
ALTER TABLE "User" ADD COLUMN "ethnicity" "Ethnicity";
ALTER TABLE "User" ADD COLUMN "gender" "Gender";
ALTER TABLE "User" ADD COLUMN "maritalStatus" "MaritalStatus";
ALTER TABLE "User" ADD COLUMN "educationLevel" "EducationLevel";
ALTER TABLE "User" ADD COLUMN "livesWithDescription" TEXT;

-- AlterTable: Contact
ALTER TABLE "User" ADD COLUMN "personalEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "addressNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "addressComplement" TEXT;

-- AlterTable: Financial & Benefits
ALTER TABLE "User" ADD COLUMN "hasBradescoAccount" "BankAccountOption";
ALTER TABLE "User" ADD COLUMN "bankAgency" TEXT;
ALTER TABLE "User" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "User" ADD COLUMN "hasOtherEmployment" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "healthPlanOption" "HealthPlanOption";
ALTER TABLE "User" ADD COLUMN "wantsTransportVoucher" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "contractType" "ContractType";
ALTER TABLE "User" ADD COLUMN "shirtSize" "ShirtSize";

-- AlterTable: Family
ALTER TABLE "User" ADD COLUMN "hasChildren" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "childrenAges" TEXT;
ALTER TABLE "User" ADD COLUMN "hasIRDependents" BOOLEAN;

-- AlterTable: About Me
ALTER TABLE "User" ADD COLUMN "hobbies" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "socialNetworks" JSONB;
ALTER TABLE "User" ADD COLUMN "favoriteBookMovieGenres" TEXT;
ALTER TABLE "User" ADD COLUMN "favoriteBooks" TEXT;
ALTER TABLE "User" ADD COLUMN "favoriteMovies" TEXT;
ALTER TABLE "User" ADD COLUMN "favoriteMusic" TEXT;
ALTER TABLE "User" ADD COLUMN "admiredValues" TEXT;
ALTER TABLE "User" ADD COLUMN "foodAllergies" TEXT;
ALTER TABLE "User" ADD COLUMN "hasPets" TEXT;
ALTER TABLE "User" ADD COLUMN "participateInVideos" BOOLEAN;
