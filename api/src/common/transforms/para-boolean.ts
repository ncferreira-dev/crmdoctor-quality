// Transform reutilizável para query params booleanos: '?ativo=true' chega como
// string, então convertemos 'true'/'false' para boolean e deixamos o resto
// passar (pra o @IsBoolean rejeitar valores inválidos). `value` é unknown de
// propósito — o TransformFnParams do class-transformer entrega any.
export function paraBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
