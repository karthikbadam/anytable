import { createContext, useContext } from 'react';
import type { CoordinatorLike } from '@anytable/core';

export interface MosaicContextValue {
  coordinator: CoordinatorLike | null;
}

export const MosaicContext = createContext<MosaicContextValue>({
  coordinator: null,
});

export function useMosaicCoordinator(): CoordinatorLike | null {
  return useContext(MosaicContext).coordinator;
}
