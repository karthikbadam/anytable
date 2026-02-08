import { useState, useCallback, useRef, useEffect, type RefObject, type CSSProperties } from 'react';
import {
  computeVisibleRange,
  computeFetchWindow,
  getTotalHeight,
  type FetchWindow,
} from '@any_table/core';
import type { TableData } from '../context/DataContext';
import type { ColumnLayout } from '../context/LayoutContext';
import type { TableScroll } from '../context/ScrollContext';

const MAX_PENDING_DELTA = 10000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface UseTableScrollOptions {
  data: TableData;
  layout: ColumnLayout;
  overscan?: number;
  containerRef: RefObject<HTMLElement | null>;
}

export function useTableScroll(options: UseTableScrollOptions): TableScroll {
  const { data, layout, overscan = 5, containerRef } = options;

  // Destructure primitives and stable callbacks — NOT the data object itself.
  // This prevents re-creating callbacks when data's object identity changes.
  const { totalRows, setWindow } = data;
  const { rowHeight, totalWidth } = layout;

  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const fetchWindowRef = useRef<FetchWindow | null>(null);
  const viewportElRef = useRef<HTMLElement | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDeltaXRef = useRef(0);
  const pendingDeltaYRef = useRef(0);

  const [visibleRowRange, setVisibleRowRange] = useState({ start: 0, end: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const totalHeight = getTotalHeight(totalRows, rowHeight);

  const getViewportHeight = useCallback(() => {
    return containerRef.current?.clientHeight ?? 0;
  }, [containerRef]);

  const getViewportWidth = useCallback(() => {
    return containerRef.current?.clientWidth ?? 0;
  }, [containerRef]);

  // Core scroll update — runs in rAF.
  // Dependencies are all primitives or stable callbacks — no object refs.
  const updateScroll = useCallback(() => {
    const viewportHeight = getViewportHeight();
    if (viewportHeight === 0 || rowHeight === 0) return;

    const state = {
      scrollTop: scrollTopRef.current,
      scrollLeft: scrollLeftRef.current,
      viewportHeight,
      viewportWidth: getViewportWidth(),
      rowHeight,
      totalRows,
    };

    const visible = computeVisibleRange(state);
    setVisibleRowRange((prev) => {
      if (prev.start === visible.start && prev.end === visible.end) return prev;
      return visible;
    });

    setScrollTop(scrollTopRef.current);
    setScrollLeft(scrollLeftRef.current);

    const newWindow = computeFetchWindow(state, fetchWindowRef.current, overscan);
    if (newWindow) {
      fetchWindowRef.current = newWindow;
      setWindow(newWindow.offset, newWindow.limit);
    }
  }, [rowHeight, totalRows, overscan, setWindow, getViewportHeight, getViewportWidth]);

  const flushQueuedScroll = useCallback(() => {
    rafIdRef.current = null;

    const queuedDeltaX = pendingDeltaXRef.current;
    const queuedDeltaY = pendingDeltaYRef.current;
    pendingDeltaXRef.current = 0;
    pendingDeltaYRef.current = 0;

    if (queuedDeltaX !== 0 || queuedDeltaY !== 0) {
      const maxScrollTop = Math.max(0, totalHeight - getViewportHeight());
      const maxScrollLeft = Math.max(0, totalWidth - getViewportWidth());
      scrollTopRef.current = clamp(scrollTopRef.current + queuedDeltaY, 0, maxScrollTop);
      scrollLeftRef.current = clamp(scrollLeftRef.current + queuedDeltaX, 0, maxScrollLeft);
    }

    updateScroll();

    if (
      (pendingDeltaXRef.current !== 0 || pendingDeltaYRef.current !== 0) &&
      rafIdRef.current == null
    ) {
      rafIdRef.current = requestAnimationFrame(flushQueuedScroll);
    }
  }, [getViewportHeight, getViewportWidth, totalHeight, totalWidth, updateScroll]);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(flushQueuedScroll);
    }
  }, [flushQueuedScroll]);

  const enqueueDelta = useCallback(
    (deltaX: number, deltaY: number) => {
      if (deltaX === 0 && deltaY === 0) return;
      pendingDeltaXRef.current = clamp(
        pendingDeltaXRef.current + deltaX,
        -MAX_PENDING_DELTA,
        MAX_PENDING_DELTA,
      );
      pendingDeltaYRef.current = clamp(
        pendingDeltaYRef.current + deltaY,
        -MAX_PENDING_DELTA,
        MAX_PENDING_DELTA,
      );
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Ref that always points to the latest wheel handler closure.
  const handleWheelRef = useRef<(e: WheelEvent) => void>(() => {});
  handleWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    enqueueDelta(e.deltaX, e.deltaY);
  };

  // Stable per-instance handler created once — delegates to handleWheelRef
  // so the DOM listener never needs to be re-attached.
  const stableHandlerRef = useRef<(e: WheelEvent) => void>();
  if (!stableHandlerRef.current) {
    stableHandlerRef.current = (e: WheelEvent) => {
      handleWheelRef.current(e);
    };
  }

  const handleTouchStartRef = useRef<(e: TouchEvent) => void>(() => {});
  handleTouchStartRef.current = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMoveRef = useRef<(e: TouchEvent) => void>(() => {});
  handleTouchMoveRef.current = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const last = lastTouchRef.current;
    const touch = e.touches[0];
    if (!last) {
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      return;
    }

    const deltaX = touch.clientX - last.x;
    const deltaY = touch.clientY - last.y;
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

    const queuedX = -deltaX;
    const queuedY = -deltaY;
    const maxScrollTop = Math.max(0, totalHeight - getViewportHeight());
    const maxScrollLeft = Math.max(0, totalWidth - getViewportWidth());
    const baseTop = clamp(scrollTopRef.current + pendingDeltaYRef.current, 0, maxScrollTop);
    const baseLeft = clamp(scrollLeftRef.current + pendingDeltaXRef.current, 0, maxScrollLeft);
    const nextTop = clamp(baseTop + queuedY, 0, maxScrollTop);
    const nextLeft = clamp(baseLeft + queuedX, 0, maxScrollLeft);
    const didScroll = nextTop !== baseTop || nextLeft !== baseLeft;
    if (!didScroll) return;

    e.preventDefault();
    enqueueDelta(queuedX, queuedY);
  };

  const handleTouchEndRef = useRef<(e: TouchEvent) => void>(() => {});
  handleTouchEndRef.current = () => {
    lastTouchRef.current = null;
  };

  const stableTouchStartRef = useRef<(e: TouchEvent) => void>();
  if (!stableTouchStartRef.current) {
    stableTouchStartRef.current = (e: TouchEvent) => {
      handleTouchStartRef.current(e);
    };
  }

  const stableTouchMoveRef = useRef<(e: TouchEvent) => void>();
  if (!stableTouchMoveRef.current) {
    stableTouchMoveRef.current = (e: TouchEvent) => {
      handleTouchMoveRef.current(e);
    };
  }

  const stableTouchEndRef = useRef<(e: TouchEvent) => void>();
  if (!stableTouchEndRef.current) {
    stableTouchEndRef.current = (e: TouchEvent) => {
      handleTouchEndRef.current(e);
    };
  }

  // Ref callback for the viewport element (used by TableViewport for DOM identity).
  const viewportRef = useCallback((el: HTMLElement | null) => {
    viewportElRef.current = el;
  }, []);

  // Attach wheel + touch listeners to the container element rather than
  // the viewport element — the container always has proper dimensions and
  // reliably receives input events.
  useEffect(() => {
    const el = containerRef.current;
    const wheelHandler = stableHandlerRef.current!;
    const touchStartHandler = stableTouchStartRef.current!;
    const touchMoveHandler = stableTouchMoveRef.current!;
    const touchEndHandler = stableTouchEndRef.current!;
    if (!el) return;
    el.addEventListener('wheel', wheelHandler, { passive: false });
    el.addEventListener('touchstart', touchStartHandler, { passive: true });
    el.addEventListener('touchmove', touchMoveHandler, { passive: false });
    el.addEventListener('touchend', touchEndHandler, { passive: true });
    el.addEventListener('touchcancel', touchEndHandler, { passive: true });
    return () => {
      el.removeEventListener('wheel', wheelHandler);
      el.removeEventListener('touchstart', touchStartHandler);
      el.removeEventListener('touchmove', touchMoveHandler);
      el.removeEventListener('touchend', touchEndHandler);
      el.removeEventListener('touchcancel', touchEndHandler);
    };
  }, [containerRef]);

  // Trigger initial fetch when data becomes available
  useEffect(() => {
    if (rowHeight > 0 && totalRows > 0) {
      scheduleFlush();
    }
  }, [rowHeight, totalRows, scheduleFlush]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = null;
      pendingDeltaXRef.current = 0;
      pendingDeltaYRef.current = 0;
    };
  }, []);

  const scrollToRow = useCallback(
    (index: number) => {
      scrollTopRef.current = Math.max(0, index * rowHeight);
      pendingDeltaXRef.current = 0;
      pendingDeltaYRef.current = 0;
      scheduleFlush();
    },
    [rowHeight, scheduleFlush],
  );

  const scrollToTop = useCallback(() => {
    scrollTopRef.current = 0;
    pendingDeltaXRef.current = 0;
    pendingDeltaYRef.current = 0;
    scheduleFlush();
  }, [scheduleFlush]);

  const scrollContainerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    willChange: 'transform',
  };

  return {
    scrollTop,
    scrollLeft,
    visibleRowRange,
    viewportRef,
    scrollContainerStyle,
    scrollToRow,
    scrollToTop,
  };
}
