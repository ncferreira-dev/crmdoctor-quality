import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// No Next.js 16 o middleware.ts virou proxy.ts (export `proxy`, não `middleware`).
// Mesma API de sempre (request.cookies / NextResponse), só o arquivo mudou de nome.
export function proxy(request: NextRequest) {
  const token = request.cookies.get('accessToken');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// primeiro-acesso é público como o login: quem resgata o código ainda não tem
// senha nem sessão. Sem excluir aqui, o proxy expulsa a pessoa para /login —
// onde ela não consegue entrar, porque a senha só existe depois do resgate.
export const config = {
  matcher: ['/((?!login|primeiro-acesso|_next/static|_next/image|favicon.ico).*)'],
};
