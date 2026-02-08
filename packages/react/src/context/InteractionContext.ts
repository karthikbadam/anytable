import { createContext, useContext } from 'react';
import type { Sort } from '@any_table/core';

export interface InteractionContextValue {
  sort: Sort | null;
  setSort(sort: Sort | null): void;
}

export const InteractionContext = createContext<InteractionContextValue | null>(null);

export function useInteractionContext(): InteractionContextValue | null {
  return useContext(InteractionContext);
}
