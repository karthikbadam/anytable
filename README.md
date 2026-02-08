# anytable

A headless, virtualized React table for large datasets.

## Philosophy

**Composable, not configurable.** No boolean flags. Behaviors are opt-in by using the relevant hook or component.

**Scoped concerns.** Each hook owns one concern. They coordinate through shared identities and narrow context, not a monolithic engine.

**React-idiomatic surface, performance-pragmatic internals.** You write normal React. Under the hood, scroll and positioning bypass React's render cycle for 60fps. These optimizations are invisible.

**Mosaic-native, but not Mosaic-exclusive.** The data layer speaks Mosaic natively. But every hook degrades to plain arrays for prototyping and testing.

**Headless with minimal defaults.** Unstyled compound components with correct ARIA. All visual styling is yours.

## Packages

- `@anytable/core` — Framework-agnostic TypeScript: type system, layout algorithm, scroll math, sparse data model, Mosaic clients
- `@anytable/react` — React hooks and compound components

## Quick Start

```tsx
import { useTable, Table, MosaicProvider } from '@anytable/react';

function MyTable() {
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    table: 'orders',
    columns: [
      { key: 'id', width: '5rem' },
      { key: 'customer', flex: 2 },
      { key: 'revenue', width: '7.5rem' },
    ],
    rowKey: 'id',
    containerRef,
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Table.Root {...table.rootProps}>
        <Table.Header>
          {({ columns }) =>
            columns.map(col => (
              <Table.HeaderCell key={col.key} column={col.key}>
                <Table.SortTrigger column={col.key}>{col.key}</Table.SortTrigger>
              </Table.HeaderCell>
            ))
          }
        </Table.Header>
        <Table.Viewport>
          {({ rows }) =>
            rows.map(row => (
              <Table.Row key={row.key} row={row}>
                {({ cells }) =>
                  cells.map(cell => (
                    <Table.Cell key={cell.column} column={cell.column}
                      width={cell.width} offset={cell.offset}>
                      {cell.value}
                    </Table.Cell>
                  ))
                }
              </Table.Row>
            ))
          }
        </Table.Viewport>
      </Table.Root>
    </div>
  );
}
```

## Development

```bash
pnpm install
pnpm build
pnpm dev     # launches demo app
```

## Architecture

Two-tier hook system:

- **Tier 1: `useTable`** — single convenience hook, covers 90% of cases
- **Tier 2: `useTableData`, `useTableLayout`, `useTableScroll`** — granular escape hatches that `useTable` composes internally

Override any piece by spreading `rootProps` and replacing:

```tsx
<Table.Root {...table.rootProps} selection={customSelection}>
```
