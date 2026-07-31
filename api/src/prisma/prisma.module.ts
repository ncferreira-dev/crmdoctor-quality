import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { criarExtensaoAuditoria } from './prisma-audit.extension';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      // $extends retorna um client novo, então a auditoria/soft delete é
      // plugada aqui na criação da instância (e não dentro da classe
      // PrismaService, que também serve de tipo pra injeção em todo o app).
      useFactory: () => {
        const prisma = new PrismaService();
        return prisma.$extends(criarExtensaoAuditoria(prisma));
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
