-- CreateTable
CREATE TABLE "notificacao_destinatarios" (
    "id" TEXT NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "lidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_destinatarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacao_destinatarios_usuarioId_lidaEm_idx" ON "notificacao_destinatarios"("usuarioId", "lidaEm");

-- CreateIndex
CREATE UNIQUE INDEX "notificacao_destinatarios_notificacaoId_usuarioId_key" ON "notificacao_destinatarios"("notificacaoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "notificacao_destinatarios" ADD CONSTRAINT "notificacao_destinatarios_notificacaoId_fkey" FOREIGN KEY ("notificacaoId") REFERENCES "notificacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao_destinatarios" ADD CONSTRAINT "notificacao_destinatarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
