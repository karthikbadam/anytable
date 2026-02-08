import React from 'react';
import { useLayoutContext } from '../context/LayoutContext';
import { useScrollContext } from '../context/ScrollContext';
import type { ResolvedColumn } from '@any_table/core';

export interface TableHeaderProps {
  children: (args: { columns: ResolvedColumn[] }) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TableHeader({ children, className, style }: TableHeaderProps) {
  const layout = useLayoutContext();
  const scroll = useScrollContext();
  const scrollLeft = scroll?.scrollLeft ?? 0;

  return (
    <div
      role="rowgroup"
      className={className}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        ...style,
      }}
    >
      <div
        role="row"
        style={{
          display: 'flex',
          position: 'relative',
          width: layout.totalWidth,
          transform: `translateX(${-scrollLeft}px)`,
        }}
      >
        {children({ columns: layout.resolved })}
      </div>
    </div>
  );
}
