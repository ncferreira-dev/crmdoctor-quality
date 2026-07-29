-- CreateEnum
CREATE TYPE "AcaoAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable
ALTER TABLE "consultores" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "empresas_clientes" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "interacoes" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "projetos" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "visitas" ADD COLUMN     "atualizadoPorId" TEXT,
ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" "AcaoAudit" NOT NULL,
    "usuarioId" TEXT,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entidade_entidadeId_idx" ON "audit_logs"("entidade", "entidadeId");
