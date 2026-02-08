/**
 * Mosaic interop types — structural interfaces matching the @uwdata/mosaic-core
 * and @uwdata/mosaic-sql API surfaces that anytable uses. Defined here so the
 * core package has zero hard dependencies on Mosaic at the type level (Mosaic
 * packages are optional peer deps).
 */

// ── Row data ────────────────────────────────────────────────────

/** A single row of table data with dynamic columns. */
export type RowRecord = Record<string, unknown>;

// ── Coordinator & Client ────────────────────────────────────────

/** Minimal interface for Mosaic's Coordinator. */
export interface CoordinatorLike {
  connect(client: ClientLike): Promise<void>;
  disconnect(client: ClientLike): void;
}

/** Minimal interface for a connected MosaicClient instance. */
export interface ClientLike {
  requestUpdate(): void;
}

/** Constructor signature for MosaicClient. */
export interface ClientConstructor {
  new (filterSelection?: SelectionLike): ClientLike;
}

/** Mosaic Selection — opaque cross-filter object. */
export interface SelectionLike {
  readonly [key: string]: unknown;
}

// ── Schema ──────────────────────────────────────────────────────

/** A single field returned by queryFieldInfo. */
export interface FieldInfo {
  column: string;
  sqlType: string;
}

/** Signature of mosaic-core's queryFieldInfo function. */
export type QueryFieldInfoFn = (
  coordinator: CoordinatorLike,
  fields: Array<{ table: string; column: string }>,
) => Promise<FieldInfo[]>;

// ── SQL expressions & query builder ─────────────────────────────

/**
 * Opaque SQL expression from mosaic-sql. We compose these but never
 * inspect their internals.
 */
export type SqlExpr = object;

/** A window function expression that supports .orderby(). */
export interface WindowFnExpr {
  orderby(...exprs: SqlExpr[]): SqlExpr;
}

/** Query builder chain matching the mosaic-sql Query API surface we use. */
export interface QueryBuilder {
  select(selections: Record<string, SqlExpr>): QueryBuilder;
  where(filter?: unknown): QueryBuilder;
  orderby(...exprs: SqlExpr[]): QueryBuilder;
  limit(n: number): QueryBuilder;
  offset(n: number): QueryBuilder;
}

/** Static side of the mosaic-sql Query class. */
export interface QueryStatic {
  from(table: string): QueryBuilder;
}

// ── Query results ───────────────────────────────────────────────

/** Query result from Mosaic coordinator — typically an Apache Arrow Table. */
export interface QueryResult {
  toArray(): unknown[];
}

// ── Concrete client instance types ──────────────────────────────

/** A fully configured count client as returned by createCountClient. */
export interface CountClientInstance extends ClientLike {
  query(filter?: unknown[]): QueryBuilder;
  queryResult(data: QueryResult): CountClientInstance;
}

/** A fully configured rows client as returned by createRowsClient. */
export interface RowsClientInstance extends ClientLike {
  query(filter?: unknown[]): QueryBuilder;
  queryResult(data: QueryResult): RowsClientInstance;
  fetchWindow(offset: number, limit: number): void;
  sort: import('./interfaces').Sort | null;
}

/** SQL functions from @uwdata/mosaic-sql that createRowsClient needs. */
export interface MosaicSqlApi {
  Query: QueryStatic;
  column: (name: string) => SqlExpr;
  cast: (expr: SqlExpr, type: string) => SqlExpr;
  row_number: () => WindowFnExpr;
  desc: (expr: SqlExpr) => SqlExpr;
}
