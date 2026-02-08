import React, { useState, useEffect, useRef } from 'react';
import { MosaicProvider, useTable, Table } from '@anytable/react';
import type { ColumnDef, CoordinatorLike } from '@anytable/react';
import { setupMosaic } from './setup-mosaic';

const columns: ColumnDef[] = [
  { key: 'source', width: '8rem' },
  { key: 'winner', width: '4rem' },
  { key: 'instruction', flex: 3, minWidth: '12rem' },
  { key: 'response_a', flex: 2, minWidth: '10rem' },
  { key: 'response_b', flex: 2, minWidth: '10rem' },
  { key: 'rubric', flex: 2, minWidth: '10rem' },
];

function RubricsTable() {
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    table: 'open_rubrics',
    columns,
    rowKey: 'instruction',
    containerRef,
  });

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}
    >
      <Table.Root {...table.rootProps}>
        <Table.Header style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
          {({ columns: cols }) =>
            cols.map((col) => (
              <Table.HeaderCell
                key={col.key}
                column={col.key}
                style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.8rem' }}
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
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        lineHeight: '1.4',
                      }}
                    >
                      {renderCell(cell.value, cell.column)}
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

function renderCell(value: unknown, column: string): React.ReactNode {
  if (value == null) return '';
  const str = String(value);

  if (column === 'winner') {
    const color = str === 'A' ? '#2563eb' : str === 'B' ? '#dc2626' : '#6b7280';
    return <span style={{ fontWeight: 600, color }}>{str}</span>;
  }

  if (str.length > 200) {
    return str.slice(0, 200) + '...';
  }
  return str;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coordinatorRef = useRef<CoordinatorLike | null>(null);

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
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>anytable Demo</h1>
        <p>Loading open_rubrics.parquet into DuckDB-WASM...</p>
      </div>
    );
  }

  return (
    <MosaicProvider coordinator={coordinatorRef.current}>
      <div style={{ padding: '1rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
          anytable — open_rubrics ({(11349).toLocaleString()} rows)
        </h1>
        <RubricsTable />
      </div>
    </MosaicProvider>
  );
}
