import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type RefObject,
  type CSSProperties,
} from 'react';
import {
  computeVisibleRange,
  computeFetchWindow,
  getTotalHeight,
  type FetchWindow,
} from '@any_table/core';
import type { TableData } from '../context/DataContext';
import type { ColumnLayout } from '../context/LayoutContext';
import type { TableScroll } from '../context/ScrollContext';

export interface UseTableScrollOptions {
  data: TableData;
  layout: ColumnLayout;
  overscan?: number;
  containerRef: RefObject<HTMLElement | null>;
}

export function useTableScroll(options: UseTableScrollOptions): TableScroll {
  const { data, layout, overscan = 5, containerRef } = options;
  const { totalRows, setWindow } = data;
  const { rowHeight, totalWidth } = layout;

  const rafIdRef = useRef<number | null>(null);
  const bindRetryRafRef = useRef<number | null>(null);
  const fetchWindowRef = useRef<FetchWindow | null>(null);
  const boundContainerRef = useRef<HTMLElement | null>(null);
  const unbindContainerRef = useRef<(() => void) | null>(null);
  const syncFromElementRef = useRef<() => void>(() => {});

  const [visibleRowRange, setVisibleRowRange] = useState({ start: 0, end: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const totalHeight = getTotalHeight(totalRows, rowHeight);

  const getViewportHeight = useCallback(() => {
    return Math.max(1, containerRef.current?.clientHeight ?? 0);
  }, [containerRef]);

  const getViewportWidth = useCallback(() => {
    return containerRef.current?.clientWidth ?? 0;
  }, [containerRef]);

  const clampScrollLeft = useCallback(
    (value: number) => {
      const max = Math.max(0, totalWidth - getViewportWidth());
      return Math.max(0, Math.min(max, value));
    },
    [totalWidth, getViewportWidth],
  );

  const updateFromNativeScroll = useCallback(() => {
    rafIdRef.current = null;

    const el = containerRef.current;
    if (!el || rowHeight <= 0) return;

    const contentScrollTop = Math.max(0, el.scrollTop);
    const contentScrollLeft = el.scrollLeft;

    const state = {
      scrollTop: contentScrollTop,
      scrollLeft: contentScrollLeft,
      viewportHeight: getViewportHeight(),
      viewportWidth: getViewportWidth(),
      rowHeight,
      totalRows,
    };

    const visible = computeVisibleRange(state);
    setVisibleRowRange((prev) => {
      if (prev.start === visible.start && prev.end === visible.end) return prev;
      return visible;
    });

    setScrollTop(contentScrollTop);
    setScrollLeft(contentScrollLeft);

    const newWindow = computeFetchWindow(state, fetchWindowRef.current, overscan);
    if (newWindow) {
      fetchWindowRef.current = newWindow;
      setWindow(newWindow.offset, newWindow.limit);
    }
  }, [
    containerRef,
    rowHeight,
    totalRows,
    overscan,
    setWindow,
    getViewportHeight,
    getViewportWidth,
  ]);

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(updateFromNativeScroll);
    }
  }, [updateFromNativeScroll]);

  const syncFromElement = useCallback(() => {
    scheduleUpdate();
  }, [scheduleUpdate]);
  syncFromElementRef.current = syncFromElement;

  const bindContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      if (bindRetryRafRef.current == null) {
        bindRetryRafRef.current = requestAnimationFrame(() => {
          bindRetryRafRef.current = null;
          bindContainer();
        });
      }
      return;
    }
    if (bindRetryRafRef.current != null) {
      cancelAnimationFrame(bindRetryRafRef.current);
      bindRetryRafRef.current = null;
    }
    if (boundContainerRef.current === el) return;

    unbindContainerRef.current?.();
    boundContainerRef.current = el;

    const prevOverflow = el.style.overflow;
    const prevWebkitOverflowScrolling = el.style.getPropertyValue(
      'webkit-overflow-scrolling',
    );

    el.style.overflow = 'auto';
    el.style.setProperty('webkit-overflow-scrolling', 'touch');

    const onScroll = () => syncFromElementRef.current();
    el.addEventListener('scroll', onScroll, { passive: true });

    unbindContainerRef.current = () => {
      el.removeEventListener('scroll', onScroll);
      el.style.overflow = prevOverflow;
      if (prevWebkitOverflowScrolling) {
        el.style.setProperty(
          'webkit-overflow-scrolling',
          prevWebkitOverflowScrolling,
        );
      } else {
        el.style.removeProperty('webkit-overflow-scrolling');
      }
      if (boundContainerRef.current === el) {
        boundContainerRef.current = null;
      }
    };

    syncFromElementRef.current();
    requestAnimationFrame(() => syncFromElementRef.current());
  }, [containerRef]);

  const viewportRef = useCallback(
    (el: HTMLElement | null) => {
      if (el) {
        bindContainer();
      }
    },
    [bindContainer],
  );

  // Fallback binding path in case viewportRef runs before containerRef is assigned.
  useEffect(() => {
    bindContainer();
  }, [bindContainer]);

  // Refresh virtualization when dimensions/data change.
  useEffect(() => {
    if (rowHeight > 0) {
      syncFromElement();
      const id = requestAnimationFrame(syncFromElement);
      return () => cancelAnimationFrame(id);
    }
  }, [rowHeight, totalRows, syncFromElement]);

  // Keep DOM scroll in bounds when content dimensions change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScrollTop = Math.max(0, totalHeight - el.clientHeight);
    const maxScrollLeft = Math.max(0, totalWidth - el.clientWidth);
    if (el.scrollTop > maxScrollTop) el.scrollTop = maxScrollTop;
    if (el.scrollLeft > maxScrollLeft) el.scrollLeft = maxScrollLeft;
    syncFromElement();
  }, [containerRef, totalHeight, totalWidth, syncFromElement]);

  useEffect(() => {
    return () => {
      unbindContainerRef.current?.();
      if (bindRetryRafRef.current != null) {
        cancelAnimationFrame(bindRetryRafRef.current);
        bindRetryRafRef.current = null;
      }
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const scrollToRow = useCallback(
    (index: number) => {
      const el = containerRef.current;
      if (!el) return;
      const maxScrollTop = Math.max(0, totalHeight - el.clientHeight);
      const target = index * rowHeight;
      el.scrollTop = Math.max(0, Math.min(maxScrollTop, target));
      syncFromElement();
    },
    [containerRef, rowHeight, totalHeight, syncFromElement],
  );

  const scrollToTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
    syncFromElement();
  }, [containerRef, syncFromElement]);

  const scrollToX = useCallback(
    (x: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollLeft = clampScrollLeft(x);
      syncFromElement();
    },
    [containerRef, clampScrollLeft, syncFromElement],
  );

  const scrollContainerStyle: CSSProperties = {
    position: 'relative',
  };

  return {
    scrollTop,
    scrollLeft,
    visibleRowRange,
    viewportRef,
    scrollContainerStyle,
    scrollToRow,
    scrollToX,
    scrollToTop,
  };
}
