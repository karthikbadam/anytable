import type { ColumnDef, ResolvedColumn, RowHeightConfig } from '../types/interfaces';
import { resolveWidth, resolveRowHeight } from '../units';

export interface LayoutInput {
  columns: ColumnDef[];
  containerWidth: number;
  rootFontSize: number;
  tableFontSize: number;
  rowHeightConfig?: RowHeightConfig;
}

export interface LayoutOutput {
  resolved: ResolvedColumn[];
  totalWidth: number;
  pinnedLeftWidth: number;
  pinnedRightWidth: number;
  scrollableWidth: number;
  rowHeight: number;
}

const DEFAULT_MIN_WIDTH_REM = 3.75; // ~60px at 16px root

export function computeLayout(input: LayoutInput): LayoutOutput {
  const { columns, containerWidth, rootFontSize, tableFontSize, rowHeightConfig } = input;

  const defaultMinPx = DEFAULT_MIN_WIDTH_REM * rootFontSize;
  const rowHeight = resolveRowHeight(rowHeightConfig, rootFontSize);

  // Step 1: Resolve all explicit widths to px
  const items = columns.map((col) => {
    const minPx = col.minWidth
      ? resolveWidth(col.minWidth, containerWidth, rootFontSize, tableFontSize)
      : defaultMinPx;
    const maxPx = col.maxWidth
      ? resolveWidth(col.maxWidth, containerWidth, rootFontSize, tableFontSize)
      : Infinity;

    let fixedPx: number | null = null;
    if (col.width != null) {
      fixedPx = resolveWidth(col.width, containerWidth, rootFontSize, tableFontSize);
      if (fixedPx === -1) fixedPx = null; // 'auto' → treat as flex
    }

    return {
      key: col.key,
      flex: col.flex ?? (fixedPx == null ? 1 : 0), // default flex=1 if no width
      fixedPx,
      minPx,
      maxPx,
    };
  });

  // Step 2: Separate fixed vs flex columns
  const fixedItems = items.filter((i) => i.fixedPx != null && i.flex === 0);
  const flexItems = items.filter((i) => i.fixedPx == null || i.flex > 0);

  // Step 3: Allocate fixed widths (clamped)
  let usedWidth = 0;
  const widths = new Map<string, number>();

  for (const item of fixedItems) {
    const w = Math.max(item.minPx, Math.min(item.maxPx, item.fixedPx!));
    widths.set(item.key, w);
    usedWidth += w;
  }

  // Step 4: Distribute remaining space among flex columns (iterate up to 3x for clamping)
  let remainingSpace = Math.max(0, containerWidth - usedWidth);
  let activeFlexItems = [...flexItems];

  for (let iteration = 0; iteration < 3 && activeFlexItems.length > 0; iteration++) {
    const totalFlex = activeFlexItems.reduce((sum, i) => sum + i.flex, 0);
    if (totalFlex === 0) break;

    const clampedThisRound: typeof activeFlexItems = [];
    const unclampedThisRound: typeof activeFlexItems = [];
    let clampedWidth = 0;

    for (const item of activeFlexItems) {
      const idealWidth = (item.flex / totalFlex) * remainingSpace;
      const clamped = Math.max(item.minPx, Math.min(item.maxPx, idealWidth));

      if (clamped !== idealWidth) {
        widths.set(item.key, clamped);
        clampedWidth += clamped;
        clampedThisRound.push(item);
      } else {
        unclampedThisRound.push(item);
      }
    }

    if (clampedThisRound.length === 0) {
      // No clamping needed — assign ideal widths
      for (const item of activeFlexItems) {
        widths.set(item.key, (item.flex / totalFlex) * remainingSpace);
      }
      break;
    }

    // Redistribute remaining space among unclamped items
    remainingSpace -= clampedWidth;
    activeFlexItems = unclampedThisRound;

    // Last iteration: assign whatever is left
    if (iteration === 2 || unclampedThisRound.length === 0) {
      const lastTotalFlex = unclampedThisRound.reduce((sum, i) => sum + i.flex, 0);
      for (const item of unclampedThisRound) {
        const w = lastTotalFlex > 0
          ? (item.flex / lastTotalFlex) * remainingSpace
          : remainingSpace / unclampedThisRound.length;
        widths.set(item.key, Math.max(item.minPx, w));
      }
    }
  }

  // Step 5: Compute cumulative offsets (all center region for v0.1)
  let offset = 0;
  const resolved: ResolvedColumn[] = columns.map((col) => {
    const w = widths.get(col.key) ?? defaultMinPx;
    const rc: ResolvedColumn = {
      key: col.key,
      width: Math.round(w),
      offset: Math.round(offset),
      region: 'center',
    };
    offset += w;
    return rc;
  });

  const totalWidth = Math.round(offset);

  return {
    resolved,
    totalWidth,
    pinnedLeftWidth: 0,
    pinnedRightWidth: 0,
    scrollableWidth: totalWidth,
    rowHeight: Math.round(rowHeight),
  };
}
