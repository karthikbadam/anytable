import React from 'react';
import { useLayoutContext } from '../context/LayoutContext';
import { useInteractionContext } from '../context/InteractionContext';
import type { SortField } from '@anytable/core';

export interface TableHeaderCellProps {
  column: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function getSortDirection(sort: any, column: string): 'ascending' | 'descending' | 'none' {
  if (!sort) return 'none';
  const fields: SortField[] = Array.isArray(sort) ? sort : [sort];
  const field = fields.find((f) => f.column === column);
  if (!field) return 'none';
  return field.desc ? 'descending' : 'ascending';
}

export function TableHeaderCell({
  column,
  children,
  className,
  style,
}: TableHeaderCellProps) {
  const layout = useLayoutContext();
  const width = layout.getWidth(column);
  const offset = layout.getOffset(column);
  const interaction = useInteractionContext();
  const sortDir = interaction ? getSortDirection(interaction.sort, column) : 'none';

  return (
    <div
      role="columnheader"
      aria-sort={sortDir}
      className={className}
      style={{
        position: 'absolute',
        left: offset,
        width,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
