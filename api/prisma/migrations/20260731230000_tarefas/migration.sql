-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- AlterTable: telefone + fluxo de convite/primeiro acesso
ALTER TABLE "users" ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "codigoConvite" TEXT,
ADD COLUMN     "senhaDefinidaEm" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_codigoConvite_key" ON "users"("codigoConvite");

-- CreateTable
CREATE TABLE "tarefas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusTarefa" NOT NULL DEFAULT 'PENDENTE',
    "prazo" DATE,
    "responsavelId" TEXT NOT NULL,
    "projetoId" TEXT,
    "concluidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "criadoPorId" TEXT,
    "atualizadoPorId" TEXT,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarefas_responsavelId_status_idx" ON "tarefas"("responsavelId", "status");

-- CreateIndex
CREATE INDEX "tarefas_prazo_idx" ON "tarefas"("prazo");

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
