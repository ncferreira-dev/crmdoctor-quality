-- Funde Consultor em User: consultor passa a ser um User (cargo Consultor),
-- em vez de um cadastro à parte que nunca teve tela própria. A tabela
-- consultores nunca teve uma tela de cadastro no front, então não existe
-- dado real esperado aqui — mas em vez de simplesmente apagar, este guard
-- aborta a migration (e o boot) se encontrar alguma linha, para não perder
-- dado de produção silenciosamente. Se isto disparar, pare e migre os dados
-- manualmente antes de tentar de novo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "consultores") THEN
    RAISE EXCEPTION 'Migração abortada: tabela consultores não está vazia. Migre os dados manualmente antes de rodar esta migration.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "especialidade" TEXT;

-- DropForeignKey
ALTER TABLE "visitas" DROP CONSTRAINT "visitas_consultorId_fkey";

-- DropForeignKey
ALTER TABLE "_CompetenciaToConsultor" DROP CONSTRAINT "_CompetenciaToConsultor_A_fkey";
ALTER TABLE "_CompetenciaToConsultor" DROP CONSTRAINT "_CompetenciaToConsultor_B_fkey";

-- DropTable
DROP TABLE "_CompetenciaToConsultor";

-- DropTable
DROP TABLE "consultores";

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_consultorId_fkey" FOREIGN KEY ("consultorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "_CompetenciaToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CompetenciaToUser_AB_unique" ON "_CompetenciaToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CompetenciaToUser_B_index" ON "_CompetenciaToUser"("B");

-- AddForeignKey
ALTER TABLE "_CompetenciaToUser" ADD CONSTRAINT "_CompetenciaToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetenciaToUser" ADD CONSTRAINT "_CompetenciaToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
