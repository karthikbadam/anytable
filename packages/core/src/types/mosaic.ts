/**
 * Mosaic interop types — structural interfaces matching the @uwdata/mosaic-core
 * and @uwdata/mosaic-sql API surfaces that anytable uses. Defined here so the
 * core package has zero hard dependencies on Mosaic at the type level (Mosaic
 * packages are optional peer deps).
 *
 * SQL expression types use `unknown` deliberately — we compose these opaque
 * values but never inspect them. Type safety comes from Mosaic's own types
 * at the dynamic import boundary.
 */

// ── Row data ────────────────────────────────────────────────────

/** A single row of table data with dynamic columns. */
export type RowRecord = Record<string, unknown>;

// ── Coordinator & Client ────────────────────────────────────────

/**
 * Minimal interface for Mosaic's Coordinator. Uses method syntax so
 * TypeScript applies bivariant parameter checking — this lets Mosaic's
 * Coordinator (which takes MosaicClient) satisfy this interface without
 * casts, since MosaicClient structurally overlaps with ClientLike.
 */
export interface CoordinatorLike {
  connect(client: ClientLike): Promise<unknown>;
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
 * Opaque SQL expression from mosaic-sql. We only compose these and pass
 * them to query builders — never inspect their internals.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type SqlExpr = unknown;

/** A window function expression that supports .orderby(). */
export interface WindowFnExpr {
  orderby(...exprs: unknown[]): unknown;
}

/** Query builder chain matching the mosaic-sql Query API surface we use. */
export interface QueryBuilder {
  select(...args: unknown[]): QueryBuilder;
  where(...args: unknown[]): QueryBuilder;
  orderby(...exprs: unknown[]): QueryBuilder;
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
  column(name: string): unknown;
  cast(expr: unknown, type: string): unknown;
  row_number(): WindowFnExpr;
  desc(expr: unknown): unknown;
}
