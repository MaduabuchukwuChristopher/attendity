import clsx from 'clsx';
import type { ReactNode } from 'react';
import { semanticValueClasses, type SemanticTone } from './semantic-value.js';

export type DataTableRowTone = 'neutral' | 'green' | 'blue' | 'gold' | 'rose' | 'violet';
export type DataTableCellTone = SemanticTone | 'muted';

const cellToneClasses: Record<DataTableCellTone, string> = {
  ...semanticValueClasses,
  muted: 'text-slate-600 dark:text-slate-300',
};

const rowToneClasses: Record<
  DataTableRowTone,
  { readonly border: string; readonly surface: string }
> = {
  neutral: {
    border: 'border-l-slate-300 dark:border-l-slate-600',
    surface: '',
  },
  green: {
    border: 'border-l-emerald-600 dark:border-l-emerald-400',
    surface: 'bg-emerald-50/80 dark:bg-emerald-950/30',
  },
  blue: {
    border: 'border-l-blue-600 dark:border-l-blue-400',
    surface: 'bg-blue-50/80 dark:bg-blue-950/30',
  },
  gold: {
    border: 'border-l-amber-500 dark:border-l-amber-400',
    surface: 'bg-amber-50/80 dark:bg-amber-950/30',
  },
  rose: {
    border: 'border-l-rose-600 dark:border-l-rose-400',
    surface: 'bg-rose-50/80 dark:bg-rose-950/30',
  },
  violet: {
    border: 'border-l-violet-600 dark:border-l-violet-400',
    surface: 'bg-violet-50/80 dark:bg-violet-950/30',
  },
};
export interface DataTableColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: T) => ReactNode;
  readonly tone?: DataTableCellTone | ((row: T, index: number) => DataTableCellTone);
}
export function DataTable<T>({
  columns,
  rows,
  caption,
  rowKey,
  rowTone,
}: {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly caption: string;
  readonly rowKey?: (row: T, index: number) => string;
  readonly rowTone?: (row: T, index: number) => DataTableRowTone;
}) {
  const keyFor = (row: T, index: number): string => {
    if (rowKey) return rowKey(row, index);
    if (typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'string')
      return row.id;
    return `row-${index}`;
  };
  return (
    <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-emerald-50 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <table className="w-max min-w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-university-navy bg-university-navy text-xs uppercase tracking-wide text-white dark:border-emerald-800 dark:bg-slate-900">
          <tr>
            {columns.map((column) => (
              <th
                className="whitespace-nowrap bg-university-navy px-4 py-3 font-semibold text-white dark:bg-slate-900 sm:px-5"
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-emerald-50/70 dark:bg-slate-950">
          {rows.map((row, index) => {
            const tone = rowTone?.(row, index) ?? 'neutral';
            const treatment = rowToneClasses[tone];
            return (
              <tr
                className={clsx(
                  'border-b border-l-4 border-border text-slate-800 transition-colors last:border-b-0 hover:brightness-[0.98] dark:border-slate-700 dark:text-slate-100 dark:hover:brightness-110',
                  treatment.border,
                  treatment.surface,
                  tone === 'neutral' &&
                    (index % 2 === 0
                      ? 'bg-emerald-50/80 dark:bg-slate-900'
                      : 'bg-cyan-50/80 dark:bg-slate-800/90'),
                )}
                key={keyFor(row, index)}
              >
                {columns.map((column) => {
                  const cellTone =
                    typeof column.tone === 'function' ? column.tone(row, index) : column.tone;
                  return (
                    <td
                      className={clsx(
                        'whitespace-nowrap px-4 py-4 align-top first:font-semibold sm:px-5',
                        cellTone
                          ? cellToneClasses[cellTone]
                          : 'text-slate-800 first:text-university-navy dark:text-slate-100 dark:first:text-blue-100',
                      )}
                      key={column.id}
                    >
                      {column.cell(row)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
