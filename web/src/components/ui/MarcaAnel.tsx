// Marca provisória das telas de entrada: anel em brand dentro de um disco
// contornado. É deliberadamente abstrata — o logo definitivo ainda não foi
// decidido, e um placeholder neutro envelhece melhor que um monograma que
// depois precisa ser desfeito.
export function MarcaAnel() {
  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ink/15"
      aria-hidden="true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="12" fill="none" strokeWidth="8" className="stroke-brand" />
      </svg>
    </div>
  );
}
