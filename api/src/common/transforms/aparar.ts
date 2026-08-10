// Tira espaço das pontas antes de validar.
//
// Nasceu dentro do CreateUserDto e virou compartilhado em 09/08/2026, quando o
// resgate de convite passou a receber e-mail: duas cópias da mesma regra é como
// esta base já produziu telas que discordam entre si.
//
// Por que aparar é trabalho da API e não do formulário: o formulário é um
// cliente, e cliente não é para confiar. Em 05/08/2026 dois membros entraram
// em produção com espaço no fim do nome ("Giovanna ", "Erica ") e o espaço
// vazou para o filtro de consultor da agenda e para a carga por responsável no
// dashboard. Em e-mail o estrago é maior: espaço no fim faz o login não achar
// a conta, e faz o resgate do convite recusar um código correto.
export const aparar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
