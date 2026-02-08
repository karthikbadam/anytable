import type { RowRecord } from '../types/mosaic';

export class SparseDataModel {
  private rows = new Map<number, RowRecord>();
  private _totalRows = 0;

  get totalRows(): number {
    return this._totalRows;
  }

  setTotalRows(count: number): void {
    this._totalRows = count;
  }

  getTotalRows(): number {
    return this._totalRows;
  }

  mergeRows(startIndex: number, rows: RowRecord[]): void {
    for (let i = 0; i < rows.length; i++) {
      this.rows.set(startIndex + i, rows[i]);
    }
  }

  getRow(index: number): RowRecord | null {
    return this.rows.get(index) ?? null;
  }

  hasRow(index: number): boolean {
    return this.rows.has(index);
  }

  evict(retentionStart: number, retentionEnd: number): void {
    for (const key of this.rows.keys()) {
      if (key < retentionStart || key > retentionEnd) {
        this.rows.delete(key);
      }
    }
  }

  clear(): void {
    this.rows.clear();
  }

  get size(): number {
    return this.rows.size;
  }
}
