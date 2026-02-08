import { useState, useEffect, useRef } from 'react';
import { MosaicProvider, useTable, Table } from '@anytable/react';
import type { ColumnDef } from '@anytable/react';
import { setupMosaic } from './setup-mosaic';

const columns: ColumnDef[] = [
  { key: 'id', width: '5rem' },
  { key: 'customer', flex: 2 },
  { key: 'revenue', width: '7.5rem' },
  { key: 'status', width: '6.25rem' },
  { key: 'order_date', width: '10rem' },
  { key: 'is_premium', width: '5rem' },
  { key: 'quantity', width: '6rem' },
];

function SampleTable() {
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    table: 'sample_data',
    columns,
    rowKey: 'id',
    containerRef,
  });

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}
    >
      <Table.Root {...table.rootProps}>
        <Table.Header style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
          {({ columns: cols }) =>
            cols.map((col) => (
              <Table.HeaderCell
                key={col.key}
                column={col.key}
                style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <Table.SortTrigger column={col.key}>
                  {col.key}
                </Table.SortTrigger>
              </Table.HeaderCell>
            ))
          }
        </Table.Header>
        <Table.Viewport>
          {({ rows }) =>
            rows.map((row) => (
              <Table.Row
                key={row.key}
                row={row}
                style={{
                  borderBottom: '1px solid #eee',
                  background: row.index % 2 === 0 ? '#fff' : '#fafafa',
                }}
              >
                {({ cells }) =>
                  cells.map((cell) => (
                    <Table.Cell
                      key={cell.column}
                      column={cell.column}
                      width={cell.width}
                      offset={cell.offset}
                      style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                    >
                      {formatValue(cell.value, cell.column)}
                    </Table.Cell>
                  ))
                }
              </Table.Row>
            ))
          }
        </Table.Viewport>
        <Table.VerticalScrollbar />
      </Table.Root>
    </div>
  );
}

function formatValue(value: any, column: string): React.ReactNode {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object' && value.display != null) {
    return value.display;
  }
  if (column === 'revenue' && typeof value === 'number') {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(value);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coordinatorRef = useRef<any>(null);

  useEffect(() => {
    setupMosaic()
      .then((coord) => {
        coordinatorRef.current = coord;
        setReady(true);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>Error</h1>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>anytable Demo</h1>
        <p>Initializing DuckDB-WASM and generating 100K rows...</p>
      </div>
    );
  }

  return (
    <MosaicProvider coordinator={coordinatorRef.current}>
      <div style={{ padding: '1rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
          anytable Demo — 100K rows
        </h1>
        <SampleTable />
      </div>
    </MosaicProvider>
  );
}
