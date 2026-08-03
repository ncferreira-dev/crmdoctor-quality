-- CreateTable
CREATE TABLE "cron_execucoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "executadoEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cron_execucoes_nome_key" ON "cron_execucoes"("nome");
