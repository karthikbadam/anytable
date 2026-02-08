import type { ColumnSchema } from '../types/interfaces';
import type { CoordinatorLike, QueryFieldInfoFn } from '../types/mosaic';
import { categorizeType } from '../types/categories';

export async function fetchSchema(
  coordinator: CoordinatorLike,
  tableName: string,
  queryFieldInfo: QueryFieldInfoFn,
): Promise<ColumnSchema[]> {
  const info = await queryFieldInfo(coordinator, [
    { table: tableName, column: '*' },
  ]);

  return info.map((f) => ({
    name: f.column,
    sqlType: f.sqlType,
    typeCategory: categorizeType(f.sqlType),
  }));
}
