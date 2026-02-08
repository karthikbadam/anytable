import type { ColumnSchema, SortField, Sort } from '../types/interfaces';
import type {
  ClientConstructor,
  QueryResult,
  SelectionLike,
  MosaicSqlApi,
  RowsClientInstance,
  RowRecord,
} from '../types/mosaic';
import { getCastDescriptor } from '../types/casting';
import { parseValue } from '../types/parsing';

export interface RowsClientConfig {
  tableName: string;
  columns: ColumnSchema[];
  onResult: (rows: RowRecord[], offset: number) => void;
}

function normalizeSortFields(sort: Sort | null): SortField[] | null {
  if (sort == null) return null;
  return Array.isArray(sort) ? sort : [sort];
}

export function createRowsClient(
  MosaicClient: ClientConstructor,
  sqlApi: MosaicSqlApi,
  config: RowsClientConfig,
  filterSelection?: SelectionLike,
): RowsClientInstance {
  const { Query, column, cast, row_number, desc } = sqlApi;
  const schemaMap = new Map<string, ColumnSchema>();
  for (const s of config.columns) {
    schemaMap.set(s.name, s);
  }

  let currentSort: Sort | null = null;
  let currentOffset = 0;
  let currentLimit = 100;

  // MosaicClient is designed for query/queryResult to be overridden per-client.
  // We cast once after construction, then assign the required overrides.
  const client = new MosaicClient(filterSelection) as unknown as RowsClientInstance;

  Object.defineProperty(client, 'sort', {
    get: () => currentSort,
    set: (value: Sort | null) => { currentSort = value; },
    enumerable: true,
    configurable: true,
  });

  client.query = (filter?: unknown[]) => {
    const select: Record<string, unknown> = {};

    for (const col of config.columns) {
      const descriptor = getCastDescriptor(col);
      if (descriptor.castTo) {
        select[col.name] = cast(column(col.name), descriptor.castTo);
      } else {
        select[col.name] = column(col.name);
      }
    }

    // Stable positional ID via window function
    const sortFields = normalizeSortFields(currentSort);
    let rn: unknown = row_number();
    if (sortFields && sortFields.length > 0) {
      const orderExprs = sortFields.map((sf) =>
        sf.desc ? desc(column(sf.column)) : column(sf.column),
      );
      rn = row_number().orderby(...orderExprs);
    }
    select['__oid'] = rn;

    let q = Query.from(config.tableName)
      .select(select)
      .where(filter);

    if (sortFields && sortFields.length > 0) {
      q = q.orderby(
        ...sortFields.map((sf) =>
          sf.desc ? desc(column(sf.column)) : column(sf.column),
        ),
      );
    }

    return q.limit(currentLimit).offset(currentOffset);
  };

  client.queryResult = (data: QueryResult) => {
    const rawArr = data.toArray();
    const rows: RowRecord[] = [];

    for (const rawRow of rawArr) {
      const parsed: RowRecord = {};
      const record = rawRow as Record<string, unknown>;
      for (const col of config.columns) {
        parsed[col.name] = parseValue(record[col.name], col);
      }
      parsed['__oid'] = Number(record['__oid']);
      rows.push(parsed);
    }

    config.onResult(rows, currentOffset);
    return client;
  };

  client.fetchWindow = (offset: number, limit: number) => {
    currentOffset = offset;
    currentLimit = limit;
    // Does NOT call requestUpdate — the React layer owns that decision,
    // guarded by connection state. This keeps the client a pure data object.
  };

  return client;
}
