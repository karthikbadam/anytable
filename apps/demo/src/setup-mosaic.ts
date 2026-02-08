import * as duckdb from '@duckdb/duckdb-wasm';
import { Coordinator, coordinator as setGlobalCoordinator } from '@uwdata/mosaic-core';

export async function setupMosaic(): Promise<any> {
  // 1. Initialize DuckDB-WASM
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  // 2. Create a Mosaic-compatible connector
  const connection = await db.connect();

  const connector = {
    query: async (query: { sql?: string; type?: string } | string) => {
      const sql = typeof query === 'string' ? query : query.sql ?? String(query);
      const type = typeof query === 'string' ? 'arrow' : (query.type ?? 'arrow');

      if (type === 'arrow') {
        const result = await connection.query(sql);
        return result;
      } else {
        const result = await connection.query(sql);
        return result;
      }
    },
  };

  // 3. Create Coordinator
  const coord = new Coordinator(connector, {
    cache: true,
    consolidate: true,
  });

  // Set as global coordinator
  setGlobalCoordinator(coord);

  // 4. Generate sample data — 100K rows with mixed types
  await connection.query(`
    CREATE TABLE sample_data AS
    SELECT
      i AS id,
      'Customer ' || (i % 500) AS customer,
      ROUND(RANDOM() * 10000, 2)::DOUBLE AS revenue,
      CASE WHEN RANDOM() < 0.3 THEN 'active'
           WHEN RANDOM() < 0.6 THEN 'pending'
           ELSE 'closed' END AS status,
      DATE '2020-01-01' + INTERVAL (i % 1500) DAY AS order_date,
      RANDOM() > 0.5 AS is_premium,
      ROUND(RANDOM() * 100)::INTEGER AS quantity
    FROM generate_series(1, 100000) AS t(i)
  `);

  return coord;
}
