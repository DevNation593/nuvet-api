-- DropForeignKey
ALTER TABLE "adoptions" DROP CONSTRAINT "adoptions_petId_fkey";

-- AlterTable
ALTER TABLE "adoptions" ADD COLUMN     "adoptionAnimalId" TEXT,
ALTER COLUMN "petId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "adoption_animals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "breed" TEXT,
    "sex" "PetSex" NOT NULL,
    "birthDate" TIMESTAMP(3),
    "color" TEXT,
    "weight" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "description" TEXT,
    "isNeutered" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoption_animals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adoption_animals_tenantId_idx" ON "adoption_animals"("tenantId");

-- CreateIndex
CREATE INDEX "adoptions_adoptionAnimalId_idx" ON "adoptions"("adoptionAnimalId");

-- AddForeignKey
ALTER TABLE "adoption_animals" ADD CONSTRAINT "adoption_animals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_adoptionAnimalId_fkey" FOREIGN KEY ("adoptionAnimalId") REFERENCES "adoption_animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
