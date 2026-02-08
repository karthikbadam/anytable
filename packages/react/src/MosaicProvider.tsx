import React from 'react';
import type { CoordinatorLike } from '@anytable/core';
import { MosaicContext } from './context/MosaicContext';

interface MosaicProviderProps {
  coordinator?: CoordinatorLike | null;
  children: React.ReactNode;
}

export function MosaicProvider({ coordinator, children }: MosaicProviderProps) {
  const resolvedCoordinator = coordinator ?? null;

  return (
    <MosaicContext.Provider value={{ coordinator: resolvedCoordinator }}>
      {children}
    </MosaicContext.Provider>
  );
}
