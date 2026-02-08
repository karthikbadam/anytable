import React from 'react';

export interface TextCellProps {
  value: unknown;
  className?: string;
  style?: React.CSSProperties;
}

export function TextCell({ value, className, style }: TextCellProps) {
  return (
    <span
      className={className}
      style={{
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {value == null ? '' : String(value)}
    </span>
  );
}
