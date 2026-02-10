import type { ColumnDef, Coordinator, UseTableReturn } from "@any_table/react";
import { MosaicProvider, Table, useTable, JsonCell, TextCell, NumberCell } from "@any_table/react";
import React, { useEffect, useRef, useState } from "react";
import { setupMosaic } from "./setup-mosaic";

// ── Live stats components ─────────────────────────────────────

function useFps() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    let id: number;
    const tick = () => {
      frames.current++;
      const now = performance.now();
      if (now - last.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        last.current = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return fps;
}

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 4,
  background: "var(--surface-2)",
  fontSize: "0.7rem",
  fontFamily: "SF Mono, Menlo, monospace",
  color: "var(--muted-fg)",
  whiteSpace: "nowrap",
};

const label: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--muted-fg)",
  textTransform: "uppercase",
  fontSize: "0.6rem",
  letterSpacing: "0.03em",
};

function StatsBar({ table }: { table: UseTableReturn }) {
  const fps = useFps();
  const { data, layout, scroll, selection } = table;
  const range = scroll?.visibleRowRange;
  const selectedCount = selection?.selected.size ?? 0;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
      <span style={pill}>
        <span style={label}>rows</span> {data.totalRows.toLocaleString()}
      </span>
      <span style={pill}>
        <span style={label}>Row height</span> {layout.rowHeight}px
      </span>
      <span style={pill}>
        <span style={label}>scroll</span> {Math.round(scroll?.scrollTop ?? 0)}px
      </span>
      <span style={pill}>
        <span style={label}>visible</span>{" "}
        {range ? `${range.start}\u2013${range.end}` : "\u2014"}
      </span>
      <span style={pill}>
        <span style={label}>loaded</span> {data.isLoading ? "..." : "yes"}
      </span>
      {selection && (
        <span
          style={{
            ...pill,
            background: selectedCount > 0 ? "var(--selected-bg)" : "var(--surface-2)",
            color: selectedCount > 0 ? "var(--selected-border)" : "var(--muted-fg)",
          }}
        >
          <span style={{ ...label, color: "inherit", opacity: 0.6 }}>selected</span>{" "}
          {selectedCount}
        </span>
      )}
      <span
        style={{
          ...pill,
          background:
            fps >= 55
              ? "var(--good-bg)"
              : fps >= 30
                ? "var(--warn-bg)"
                : "var(--bad-bg)",
          color:
            fps >= 55
              ? "var(--good-fg)"
              : fps >= 30
                ? "var(--warn-fg)"
                : "var(--bad-fg)",
        }}
      >
        <span style={{ ...label, color: "inherit", opacity: 0.6 }}>fps</span>{" "}
        {fps}
      </span>
    </div>
  );
}

// ── Rubrics Table ─────────────────────────────────────────────

const rubricColumns: ColumnDef[] = [
  { key: "source", width: "8rem" },
  { key: "winner", width: "4rem" },
  { key: "instruction", flex: 3, minWidth: "12rem" },
  { key: "response_a", flex: 2, minWidth: "10rem" },
  { key: "response_b", flex: 2, minWidth: "10rem" },
  { key: "rubric", flex: 2, minWidth: "10rem" },
];

function RubricsTable() {
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    table: "open_rubrics",
    columns: rubricColumns,
    rowKey: "instruction",
    containerRef,
    expansion: true,
    selection: true,
  });

  return (
    <>
      <StatsBar table={table} />
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "calc(100dvh - 200px)",
          position: "relative",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--surface)",
        }}
      >
        <Table.Root {...table.rootProps}>
          <Table.Header
            style={{
              padding: "8px",
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {({ columns: cols }) =>
              cols.map((col) => (
                <Table.HeaderCell
                  key={col.key}
                  column={col.key}
                  style={{
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--muted-fg)",
                  }}
                >
                  <Table.SortTrigger column={col.key}>
                    {col.key.replace(/_/g, " ")}
                  </Table.SortTrigger>
                </Table.HeaderCell>
              ))
            }
          </Table.Header>
          <Table.Viewport>
            {({ rows }) =>
              rows.map((row) => (
                <Table.Row
                  key={row.key}
                  row={row}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background:
                      row.index % 2 === 0
                        ? "var(--surface)"
                        : "var(--surface-2)",
                  }}
                >
                  {({ cells }) =>
                    cells.map((cell) => (
                      <Table.Cell
                        key={cell.column}
                        column={cell.column}
                        width={cell.width}
                        offset={cell.offset}
                        style={{
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          lineHeight: "1.5",
                          color: "var(--fg)",
                        }}
                      >
                        {renderRubricCell(cell.value, cell.column, cell.isExpanded, cell.onToggleExpand)}
                      </Table.Cell>
                    ))
                  }
                </Table.Row>
              ))
            }
          </Table.Viewport>
        </Table.Root>
      </div>
    </>
  );
}

function renderRubricCell(
  value: unknown,
  column: string,
  isExpanded: boolean,
  onToggleExpand?: () => void,
): React.ReactNode {
  if (value == null) return "";
  const str = String(value);

  if (column === "winner") {
    const color =
      str === "A"
        ? "var(--accent)"
        : str === "B"
          ? "var(--bad-fg)"
          : "var(--muted-fg)";
    return <span style={{ fontWeight: 600, color }}>{str}</span>;
  }

  // Long text columns get expansion support
  if (["instruction", "response_a", "response_b", "rubric"].includes(column)) {
    return (
      <TextCell
        value={value}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  return str;
}

// ── Traces Table ──────────────────────────────────────────────

const tracesColumns: ColumnDef[] = [
  { key: "id", width: "3rem" },
  { key: "trace_id", width: "8rem" },
  { key: "task", flex: 2, minWidth: "10rem" },
  { key: "duration", width: "6rem" },
  { key: "status", width: "4rem" },
  { key: "score", width: "4rem" },
  { key: "reliability_notes", flex: 2, minWidth: "10rem" },
  { key: "trace_json", flex: 3, minWidth: "14rem" },
  { key: "labels_json", flex: 3, minWidth: "14rem" },
];

function TracesTable() {
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    table: "swe_bench",
    columns: tracesColumns,
    rowKey: "id",
    containerRef,
    expansion: { expandedRowHeight: 300 },
    selection: true,
  });

  return (
    <>
      <StatsBar table={table} />
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "calc(100dvh - 200px)",
          position: "relative",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--surface)",
        }}
      >
        <Table.Root {...table.rootProps}>
          <Table.Header
            style={{
              padding: "8px",
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {({ columns: cols }) =>
              cols.map((col) => (
                <Table.HeaderCell
                  key={col.key}
                  column={col.key}
                  style={{
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--muted-fg)",
                  }}
                >
                  <Table.SortTrigger column={col.key}>
                    {col.key.replace(/_/g, " ")}
                  </Table.SortTrigger>
                </Table.HeaderCell>
              ))
            }
          </Table.Header>
          <Table.Viewport>
            {({ rows }) =>
              rows.map((row) => (
                <Table.Row
                  key={row.key}
                  row={row}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background:
                      row.index % 2 === 0
                        ? "var(--surface)"
                        : "var(--surface-2)",
                  }}
                >
                  {({ cells }) =>
                    cells.map((cell) => (
                      <Table.Cell
                        key={cell.column}
                        column={cell.column}
                        width={cell.width}
                        offset={cell.offset}
                        style={{
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          lineHeight: "1.5",
                          color: "var(--fg)",
                        }}
                      >
                        {renderTraceCell(cell.value, cell.column, cell.isExpanded, cell.onToggleExpand)}
                      </Table.Cell>
                    ))
                  }
                </Table.Row>
              ))
            }
          </Table.Viewport>
        </Table.Root>
      </div>
    </>
  );
}

function renderTraceCell(
  value: unknown,
  column: string,
  isExpanded: boolean,
  onToggleExpand?: () => void,
): React.ReactNode {
  if (value == null) return "";

  // JSON columns
  if (column === "trace_json" || column === "labels_json") {
    return (
      <JsonCell
        value={value}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Numeric columns
  if (column === "score" || column === "id") {
    return <NumberCell value={value} />;
  }

  // Long text columns
  if (column === "reliability_notes" || column === "task") {
    return (
      <TextCell
        value={value}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Short text
  return (
    <TextCell value={value} />
  );
}

// ── Tab Bar ───────────────────────────────────────────────────

type Tab = "rubrics" | "traces";

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 16px",
  borderRadius: 4,
  border: "none",
  background: active ? "var(--accent)" : "transparent",
  color: active ? "#fff" : "var(--muted-fg)",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
});

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const [setup, setSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coordinatorRef = useRef<Coordinator | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("traces");

  useEffect(() => {
    if (setup) return;
    setSetup(true);
    setupMosaic()
      .then(async (coord) => {
        coordinatorRef.current = coord;
        setReady(true);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h1>Error</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>
          AnyTable demo
        </h1>
        <p>Loading datasets into DuckDB-WASM...</p>
      </div>
    );
  }

  return (
    <MosaicProvider coordinator={coordinatorRef.current}>
      <div style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>AnyTable</h1>
          <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 6, padding: 2 }}>
            <button style={tabStyle(activeTab === "rubrics")} onClick={() => setActiveTab("rubrics")}>
              Rubrics
            </button>
            <button style={tabStyle(activeTab === "traces")} onClick={() => setActiveTab("traces")}>
              Traces
            </button>
          </div>
        </div>
        {activeTab === "rubrics" ? <RubricsTable /> : <TracesTable />}
      </div>
    </MosaicProvider>
  );
}
