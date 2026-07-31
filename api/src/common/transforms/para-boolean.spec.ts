import { paraBoolean } from './para-boolean';

describe('paraBoolean (query param booleano)', () => {
  it("'true' vira boolean true", () => {
    expect(paraBoolean({ value: 'true' })).toBe(true);
  });

  it("'false' vira boolean false", () => {
    expect(paraBoolean({ value: 'false' })).toBe(false);
  });

  it('outros valores passam direto (pro @IsBoolean rejeitar)', () => {
    expect(paraBoolean({ value: 'talvez' })).toBe('talvez');
    expect(paraBoolean({ value: undefined })).toBeUndefined();
  });
});
