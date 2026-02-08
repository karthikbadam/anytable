import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useScrollContext } from '../context/ScrollContext';
import { useDataContext } from '../context/DataContext';
import { useLayoutContext } from '../context/LayoutContext';
import { getTotalHeight } from '@any_table/core';

export interface VerticalScrollbarProps {
  className?: string;
  style?: React.CSSProperties;
  fadeTimeout?: number;
}

export function VerticalScrollbar({
  className,
  style,
  fadeTimeout = 1500,
}: VerticalScrollbarProps) {
  const scroll = useScrollContext();
  const data = useDataContext();
  const layout = useLayoutContext();
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalHeight = getTotalHeight(data.totalRows, layout.rowHeight);
  const viewportHeight = trackRef.current?.parentElement?.clientHeight ?? 0;

  // Thumb size proportional to viewport/content ratio
  const thumbRatio = viewportHeight > 0 && totalHeight > 0
    ? Math.max(0.05, viewportHeight / totalHeight)
    : 1;
  const thumbHeight = Math.max(20, thumbRatio * viewportHeight);

  // Thumb position
  const scrollFraction = totalHeight > viewportHeight
    ? (scroll?.scrollTop ?? 0) / (totalHeight - viewportHeight)
    : 0;
  const thumbTop = scrollFraction * (viewportHeight - thumbHeight);

  // Show scrollbar on scroll
  useEffect(() => {
    setVisible(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (!dragging) {
      fadeTimerRef.current = setTimeout(() => setVisible(false), fadeTimeout);
    }
  }, [scroll?.scrollTop, dragging, fadeTimeout]);

  // Pointer drag
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const track = trackRef.current;
      if (!track || !scroll) return;

      const trackRect = track.getBoundingClientRect();

      const handleMove = (moveE: PointerEvent) => {
        const relativeY = moveE.clientY - trackRect.top;
        const fraction = Math.max(0, Math.min(1, relativeY / trackRect.height));
        const targetRow = Math.floor(fraction * data.totalRows);
        scroll.scrollToRow(targetRow);
      };

      const handleUp = () => {
        setDragging(false);
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [scroll, data.totalRows],
  );

  if (totalHeight <= viewportHeight) return null;

  return (
    <div
      ref={trackRef}
      className={className}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 8,
        opacity: visible || dragging ? 1 : 0,
        transition: 'opacity 0.2s',
        zIndex: 10,
        ...style,
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        style={{
          position: 'absolute',
          top: thumbTop,
          right: 0,
          width: 8,
          height: thumbHeight,
          borderRadius: 4,
          backgroundColor: dragging ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: dragging ? 'none' : 'background-color 0.15s',
        }}
      />
    </div>
  );
}
