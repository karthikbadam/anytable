import React from 'react';
import { useDataContext } from '../context/DataContext';
import { useLayoutContext } from '../context/LayoutContext';
import { useScrollContext } from '../context/ScrollContext';
import { getTotalHeight, computeRenderRange } from '@anytable/core';

export interface VisibleRow {
  key: string | number;
  index: number;
  data: Record<string, any> | null;
  top: number;
}

export interface TableViewportProps {
  children: (args: { rows: VisibleRow[] }) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TableViewport({ children, className, style }: TableViewportProps) {
  const data = useDataContext();
  const layout = useLayoutContext();
  const scroll = useScrollContext();

  const { rowHeight, totalWidth } = layout;
  const { totalRows } = data;
  const totalHeight = getTotalHeight(totalRows, rowHeight);

  // Compute visible rows
  const rows: VisibleRow[] = [];

  if (scroll && rowHeight > 0) {
    const { start, end } = scroll.visibleRowRange;
    // Add overscan
    const renderStart = Math.max(0, start - 5);
    const renderEnd = Math.min(totalRows, end + 5);

    for (let i = renderStart; i < renderEnd; i++) {
      rows.push({
        key: i,
        index: i,
        data: data.getRow(i),
        top: i * rowHeight,
      });
    }
  } else if (!scroll) {
    // Non-scroll mode (pagination or full render)
    const limit = Math.min(totalRows, 100);
    for (let i = 0; i < limit; i++) {
      rows.push({
        key: i,
        index: i,
        data: data.getRow(i),
        top: i * rowHeight,
      });
    }
  }

  return (
    <div
      role="rowgroup"
      className={className}
      onWheel={scroll?.onWheel}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        ...scroll?.scrollContainerStyle,
        ...style,
      }}
    >
      <div
        style={{
          height: totalHeight,
          width: totalWidth,
          position: 'relative',
        }}
      >
        {children({ rows })}
      </div>
    </div>
  );
}
