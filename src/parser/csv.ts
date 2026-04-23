import Papa from 'papaparse';
import { DataRow } from '../types';

export interface ParseResult {
  headers: string[];
  rows: DataRow[];
  errors: string[];
}

export function parseCSV(rawText: string): ParseResult {
  // Strip BOM (Excel exports)
  const text = rawText.replace(/^\uFEFF/, '');

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const headers = result.meta.fields ?? [];
  const rows: DataRow[] = result.data.map((row: Record<string, string>) => {
    const typed: DataRow = {};
    for (const key of headers) {
      typed[key] = coerceValue(row[key] ?? '');
    }
    return typed;
  });

  const errors = result.errors.map((e: Papa.ParseError) => e.message);
  return { headers, rows, errors };
}

export function detectNumericColumns(rows: DataRow[], headers: string[]): string[] {
  const sample = rows.slice(0, 10);
  return headers.filter(h =>
    sample.length > 0 &&
    sample.every(row => {
      const v = row[h];
      return v !== '' && !isNaN(Number(v));
    })
  );
}

function coerceValue(raw: string): string | number {
  const trimmed = raw.trim().replace(/,/g, '');
  const num = Number(trimmed);
  return trimmed !== '' && !isNaN(num) ? num : raw.trim();
}
