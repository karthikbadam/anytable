import type {
  ClientConstructor,
  QueryStatic,
  QueryResult,
  SelectionLike,
  SqlExpr,
  CountClientInstance,
} from '../types/mosaic';

export interface CountClientConfig {
  tableName: string;
  onResult: (count: number) => void;
}

export function createCountClient(
  MosaicClient: ClientConstructor,
  Query: QueryStatic,
  countFn: () => SqlExpr,
  config: CountClientConfig,
  filterSelection?: SelectionLike,
): CountClientInstance {
  const tableName = config.tableName;
  const onCountResult = config.onResult;

  // MosaicClient is designed for query/queryResult to be overridden per-client.
  // We cast once after construction, then assign the required overrides.
  const client = new MosaicClient(filterSelection) as unknown as CountClientInstance;

  client.query = (filter?: unknown[]) => {
    return Query.from(tableName)
      .select({ count: countFn() })
      .where(filter);
  };

  client.queryResult = (data: QueryResult) => {
    const arr = data.toArray();
    const row = arr[0] as Record<string, unknown> | undefined;
    const count = Number(row?.count ?? 0);
    onCountResult(count);
    return client;
  };

  return client;
}
