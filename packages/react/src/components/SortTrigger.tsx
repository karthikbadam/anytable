import React, { useCallback } from 'react';
import { useInteractionContext } from '../context/InteractionContext';
import type { SortField, Sort } from '@anytable/core';

export interface SortTriggerProps {
  column: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function getCurrentDirection(sort: Sort | null, column: string): 'asc' | 'desc' | null {
  if (!sort) return null;
  const fields: SortField[] = Array.isArray(sort) ? sort : [sort];
  const field = fields.find((f) => f.column === column);
  if (!field) return null;
  return field.desc ? 'desc' : 'asc';
}

export function SortTrigger({ column, children, className, style }: SortTriggerProps) {
  const interaction = useInteractionContext();

  const currentDir = interaction ? getCurrentDirection(interaction.sort, column) : null;

  const handleClick = useCallback(() => {
    if (!interaction) return;

    // Cycle: null → asc → desc → null
    if (currentDir === null) {
      interaction.setSort({ column, desc: false });
    } else if (currentDir === 'asc') {
      interaction.setSort({ column, desc: true });
    } else {
      interaction.setSort(null);
    }
  }, [interaction, column, currentDir]);

  const indicator = currentDir === 'asc' ? ' \u25B2' : currentDir === 'desc' ? ' \u25BC' : '';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label={`Sort by ${column}`}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 4px',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
      {indicator}
    </button>
  );
}
