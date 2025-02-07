import { createRow } from '../core/row'
import { Row, RowModel, Table, RowData } from '../types'

export function filterRows<TData extends RowData>(
  rows: Row<TData>[],
  filterRowImpl: (row: Row<TData>) => any,
  table: Table<TData>
) {
  if (table.options.filterFromLeafRows) {
    return filterRowModelFromLeafs(rows, filterRowImpl, table)
  }

  return filterRowModelFromRoot(rows, filterRowImpl, table)
}

export function filterRowModelFromLeafs<TData extends RowData>(
  rowsToFilter: Row<TData>[],
  filterRow: (row: Row<TData>) => Row<TData>[],
  table: Table<TData>
): RowModel<TData> {
  const newFilteredFlatRows: Row<TData>[] = []
  const newFilteredRowsById: Record<string, Row<TData>> = {}
  const maxDepth = table.options.maxLeafRowFilterDepth ?? 100

  const recurseFilterRows = (rowsToFilter: Row<TData>[], depth = 0) => {
    const rows: Row<TData>[] = []

    // Filter from children up first
    for (let i = 0; i < rowsToFilter.length; i++) {
      let row = rowsToFilter[i]!

      const newRow = createRow(
        table,
        row.id,
        row.original,
        row.index,
        row.depth
      )
      newRow.columnFilters = row.columnFilters

      if (row.subRows?.length && depth < maxDepth) {
        newRow.subRows = recurseFilterRows(row.subRows, depth + 1)
        row = newRow

        if (filterRow(row) && !newRow.subRows.length) {
          rows.push(row)
          newFilteredRowsById[row.id] = row
          newFilteredRowsById[i] = row
          continue
        }

        if (filterRow(row) || newRow.subRows.length) {
          rows.push(row)
          newFilteredRowsById[row.id] = row
          newFilteredRowsById[i] = row
          continue
        }
      } else {
        row = newRow
        if (filterRow(row)) {
          rows.push(row)
          newFilteredRowsById[row.id] = row
          newFilteredRowsById[i] = row
        }
      }
    }

    return rows
  }

  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById,
  }
}

export function filterRowModelFromRoot<TData extends RowData>(
  rowsToFilter: Row<TData>[],
  filterRow: (row: Row<TData>) => any,
  table: Table<TData>
): RowModel<TData> {
  const newFilteredFlatRows: Row<TData>[] = []
  const newFilteredRowsById: Record<string, Row<TData>> = {}
  const maxDepth = table.options.maxLeafRowFilterDepth ?? 100

  // Filters top level and nested rows
  const recurseFilterRows = (rowsToFilter: Row<TData>[], depth = 0) => {
    // Filter from parents downward first

    const rows = []

    // Apply the filter to any subRows
    for (let i = 0; i < rowsToFilter.length; i++) {
      let row = rowsToFilter[i]!

      const pass = filterRow(row)

      if (pass) {
        if (row.subRows?.length && depth < maxDepth) {
          const newRow = createRow(
            table,
            row.id,
            row.original,
            row.index,
            row.depth
          )
          newRow.subRows = recurseFilterRows(row.subRows, depth + 1)
          row = newRow
        }

        rows.push(row)
        newFilteredFlatRows.push(row)
        newFilteredRowsById[row.id] = row
      }
    }

    return rows
  }

  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById,
  }
}
