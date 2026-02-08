import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SparseDataModel,
  fetchSchema,
  createCountClient,
  createRowsClient,
  type ColumnSchema,
  type Sort,
  type SortField,
  type RowRecord,
  type RowsClientInstance,
  type CountClientInstance,
  type SelectionLike,
  type CoordinatorLike,
  type QueryFieldInfoFn,
} from '@anytable/core';
import { useMosaicCoordinator } from '../context/MosaicContext';
import type { TableData } from '../context/DataContext';

export interface UseTableDataOptions {
  table?: string;
  rows?: RowRecord[];
  columns: string[];
  rowKey: string;
  filter?: SelectionLike;
}

export function useTableData(options: UseTableDataOptions): TableData {
  const { table, rows: arrayRows, columns, rowKey, filter } = options;
  const coordinator = useMosaicCoordinator();

  const [version, setVersion] = useState(0);
  const [schema, setSchema] = useState<ColumnSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSortState] = useState<Sort | null>(null);

  const modelRef = useRef(new SparseDataModel());
  const rowsClientRef = useRef<RowsClientInstance | null>(null);
  const countClientRef = useRef<CountClientInstance | null>(null);
  // Guard: setWindow is a no-op until clients are connected to the coordinator
  const connectedRef = useRef(false);

  // ── Array mode ──
  const isArrayMode = arrayRows != null;

  useEffect(() => {
    if (!isArrayMode) return;

    const inferredSchema: ColumnSchema[] = columns.map((name) => ({
      name,
      sqlType: 'VARCHAR',
      typeCategory: 'text' as const,
    }));
    setSchema(inferredSchema);

    const model = modelRef.current;
    model.clear();
    model.setTotalRows(arrayRows!.length);
    model.mergeRows(0, arrayRows!);
    setIsLoading(false);
    setVersion((v) => v + 1);
  }, [isArrayMode, arrayRows, columns]);

  // ── Mosaic mode ──
  useEffect(() => {
    if (isArrayMode || !table || !coordinator) return;

    let cancelled = false;
    connectedRef.current = false;
    setIsLoading(true);

    async function init() {
      try {
        const [mosaicCore, mosaicSql] = await Promise.all([
          import('@uwdata/mosaic-core'),
          import('@uwdata/mosaic-sql'),
        ]);

        if (cancelled) return;

        const { MosaicClient, queryFieldInfo } = mosaicCore;
        const { Query, column, cast, row_number, desc, count } = mosaicSql;

        const schemaResult = await fetchSchema(
          coordinator as CoordinatorLike,
          table!,
          queryFieldInfo as unknown as QueryFieldInfoFn,
        );

        if (cancelled) return;

        const filteredSchema = columns.length > 0
          ? schemaResult.filter((s) => columns.includes(s.name))
          : schemaResult;

        setSchema(filteredSchema);

        const model = modelRef.current;
        model.clear();

        const countClient = createCountClient(
          MosaicClient,
          Query,
          count,
          {
            tableName: table!,
            onResult: (totalCount: number) => {
              model.setTotalRows(totalCount);
              setVersion((v) => v + 1);
            },
          },
          filter,
        );
        countClientRef.current = countClient;

        const rowsClient = createRowsClient(
          MosaicClient,
          { Query, column, cast, row_number, desc },
          {
            tableName: table!,
            columns: filteredSchema,
            onResult: (rows: RowRecord[], offset: number) => {
              model.mergeRows(offset, rows);
              setIsLoading(false);
              setVersion((v) => v + 1);
            },
          },
          filter,
        );
        rowsClientRef.current = rowsClient;

        await coordinator.connect(countClient);
        await coordinator.connect(rowsClient);

        if (!cancelled) {
          connectedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[anytable] Failed to initialize data:', err);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      connectedRef.current = false;
      if (rowsClientRef.current && coordinator) {
        coordinator.disconnect(rowsClientRef.current);
      }
      if (countClientRef.current && coordinator) {
        coordinator.disconnect(countClientRef.current);
      }
    };
  }, [isArrayMode, table, coordinator, filter, columns]);

  // ── Sort handling ──
  const setSort = useCallback(
    (newSort: Sort | null) => {
      setSortState(newSort);

      if (isArrayMode) {
        if (!arrayRows) return;
        const model = modelRef.current;
        model.clear();

        let sorted = [...arrayRows];
        if (newSort) {
          const fields: SortField[] = Array.isArray(newSort)
            ? newSort
            : [newSort];
          sorted.sort((a, b) => {
            for (const field of fields) {
              const aVal = a[field.column];
              const bVal = b[field.column];
              if (aVal != null && bVal != null && aVal < bVal) return field.desc ? 1 : -1;
              if (aVal != null && bVal != null && aVal > bVal) return field.desc ? -1 : 1;
            }
            return 0;
          });
        }

        model.setTotalRows(sorted.length);
        model.mergeRows(0, sorted);
        setVersion((v) => v + 1);
      } else {
        const client = rowsClientRef.current;
        if (client && connectedRef.current) {
          client.sort = newSort;
          modelRef.current.clear();
          setVersion((v) => v + 1);
          client.requestUpdate();
        }
      }
    },
    [isArrayMode, arrayRows],
  );

  const setWindow = useCallback((offset: number, limit: number) => {
    const client = rowsClientRef.current;
    if (client && connectedRef.current) {
      client.fetchWindow(offset, limit);
    }
  }, []);

  const model = modelRef.current;

  return {
    getRow: (index: number) => model.getRow(index),
    hasRow: (index: number) => model.hasRow(index),
    totalRows: model.totalRows,
    schema,
    isLoading,
    setWindow,
    sort,
    setSort,
  };
}
