export interface ResultadoPaginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function paginar<T>(params: {
  page: number;
  limit: number;
  buscar: (args: { skip: number; take: number }) => Promise<T[]>;
  contar: () => Promise<number>;
}): Promise<ResultadoPaginado<T>> {
  const { page, limit, buscar, contar } = params;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([buscar({ skip, take: limit }), contar()]);

  return { data, total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}
