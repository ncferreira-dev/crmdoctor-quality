-- CreateEnum
CREATE TYPE "StatusEtapa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "etapaId" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "abertoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "primeiraRespostaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "competencias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "criadoPorId" TEXT,
    "atualizadoPorId" TEXT,

    CONSTRAINT "competencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_projeto" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "responsavelId" TEXT,
    "prazo" DATE,
    "status" "StatusEtapa" NOT NULL DEFAULT 'PENDENTE',
    "concluidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluidoEm" TIMESTAMP(3),
    "criadoPorId" TEXT,
    "atualizadoPorId" TEXT,

    CONSTRAINT "etapas_projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompetenciaToConsultor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "competencias_nome_key" ON "competencias"("nome");

-- CreateIndex
CREATE INDEX "etapas_projeto_projetoId_ordem_idx" ON "etapas_projeto"("projetoId", "ordem");

-- CreateIndex
CREATE INDEX "etapas_projeto_prazo_idx" ON "etapas_projeto"("prazo");

-- CreateIndex
CREATE UNIQUE INDEX "_CompetenciaToConsultor_AB_unique" ON "_CompetenciaToConsultor"("A", "B");

-- CreateIndex
CREATE INDEX "_CompetenciaToConsultor_B_index" ON "_CompetenciaToConsultor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_etapaId_tipo_dataReferencia_key" ON "notificacoes"("etapaId", "tipo", "dataReferencia");

-- AddForeignKey
ALTER TABLE "etapas_projeto" ADD CONSTRAINT "etapas_projeto_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_projeto" ADD CONSTRAINT "etapas_projeto_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "etapas_projeto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetenciaToConsultor" ADD CONSTRAINT "_CompetenciaToConsultor_A_fkey" FOREIGN KEY ("A") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompetenciaToConsultor" ADD CONSTRAINT "_CompetenciaToConsultor_B_fkey" FOREIGN KEY ("B") REFERENCES "consultores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

