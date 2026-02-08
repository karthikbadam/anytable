import React from 'react';

const formatter = new Intl.NumberFormat();

export interface NumberCellProps {
  value: any;
  className?: string;
  style?: React.CSSProperties;
}

export function NumberCell({ value, className, style }: NumberCellProps) {
  let display: string;
  if (value == null) {
    display = '';
  } else if (typeof value === 'object' && value.display != null) {
    // BigInt value from parseValue
    display = value.display;
  } else {
    display = formatter.format(Number(value));
  }

  return (
    <span
      className={className}
      style={{
        textAlign: 'right',
        width: '100%',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {display}
    </span>
  );
}
