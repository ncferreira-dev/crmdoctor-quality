// Validação de formulário do design system.
//
// Existe para tirar da tela o balão nativo do navegador ("Preencha este
// campo"), que aparece flutuando, some sozinho, não segue a tipografia do
// sistema e, quando o campo obrigatório está dentro de um select escondido ou
// fora da área visível, aparece ancorado num canto qualquer da janela, longe
// do campo que ele cobra.
//
// O uso é sempre o mesmo:
//   <form noValidate onSubmit={enviar}>
//   ...
//   const problemas = validarObrigatorios(dados, { titulo: 'Informe o título' })
//   if (temErro(problemas)) { setErros(problemas); focarPrimeiroErro(problemas); return }
//   ...
//   <Input erro={erros.titulo} />

export type ErrosForm = Record<string, string>;

// `campos` mapeia o name do campo para a mensagem que ele deve exibir vazio.
// A mensagem diz o que fazer ("Escolha a empresa"), não o que houve de errado.
export function validarObrigatorios(
  dados: FormData,
  campos: Record<string, string>,
): ErrosForm {
  const erros: ErrosForm = {};
  for (const [campo, mensagem] of Object.entries(campos)) {
    const valor = dados.get(campo);
    if (typeof valor !== 'string' || valor.trim() === '') {
      erros[campo] = mensagem;
    }
  }
  return erros;
}

export function temErro(erros: ErrosForm): boolean {
  return Object.keys(erros).length > 0;
}

// Leva o foco ao primeiro campo com problema. Sem isso, num formulário longo a
// pessoa aperta Salvar, nada acontece na parte visível da tela e o erro fica
// fora do campo de visão.
export function focarPrimeiroErro(erros: ErrosForm) {
  const primeiro = Object.keys(erros)[0];
  if (!primeiro) return;
  const campo = document.querySelector<HTMLElement>(`[name="${primeiro}"]`);
  campo?.focus();
  campo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
