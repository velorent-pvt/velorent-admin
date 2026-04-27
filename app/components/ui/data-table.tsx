import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DataTableSortOption = {
  label: string;
  column: string;
};

type DataTableFilterOption = {
  label: string;
  value: string;
};

type DataTableFilter = {
  label: string;
  column: string;
  options: DataTableFilterOption[];
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  searchColumn?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  showPagination?: boolean;
  title: string;
  showHeader?: boolean;
  sortOptions?: DataTableSortOption[];
  defaultSort?: {
    column: string;
    direction: "asc" | "desc";
  };
  filters?: DataTableFilter[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Search...",
  pageSize = 10,
  showPagination = true,
  title,
  showHeader = true,
  sortOptions = [],
  defaultSort,
  filters = [],
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (defaultSort) {
      return [
        {
          id: defaultSort.column,
          desc: defaultSort.direction === "desc",
        },
      ];
    }

    if (sortOptions.length > 0) {
      return [{ id: sortOptions[0].column, desc: false }];
    }

    return [];
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(filters.map((filter) => [filter.column, "all"]))
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      rowSelection,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  const currentSortColumn = sorting[0]?.id ?? "";
  const currentSortDirection = sorting[0]?.desc ? "desc" : "asc";

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{title}</h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {filters.map((filter) => (
              <Select
                key={filter.column}
                value={activeFilters[filter.column] ?? "all"}
                onValueChange={(value) => {
                  setActiveFilters((prev) => ({
                    ...prev,
                    [filter.column]: value,
                  }));
                  table
                    .getColumn(filter.column)
                    ?.setFilterValue(value === "all" ? undefined : value);
                }}
              >
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filter.label}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}

            {sortOptions.length > 0 && (
              <>
                <Select
                  value={currentSortColumn}
                  onValueChange={(column) => {
                    setSorting((prev) => {
                      const desc = prev[0]?.desc ?? false;
                      return [{ id: column, desc }];
                    });
                  }}
                >
                  <SelectTrigger className="w-[190px] bg-card">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.column} value={option.column}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={currentSortDirection}
                  onValueChange={(direction) => {
                    setSorting((prev) => {
                      const column = prev[0]?.id ?? sortOptions[0].column;
                      return [{ id: column, desc: direction === "desc" }];
                    });
                  }}
                >
                  <SelectTrigger className="w-[170px] bg-card">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest / Z to A</SelectItem>
                    <SelectItem value="asc">Oldest / A to Z</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {searchColumn && (
              <Input
                placeholder={searchPlaceholder}
                value={
                  (table.getColumn(searchColumn)?.getFilterValue() as string) ??
                  ""
                }
                onChange={(e) =>
                  table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                }
                className="max-w-sm bg-card"
              />
            )}
          </div>
        </div>
      )}

      <Table className="my-6">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="py-4 bg-card hover:bg-card font-bold"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-2 bg-card hover:bg-card"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="bg-card hover:bg-card">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showPagination && table.getCanNextPage() && (
        <div className="flex items-center justify-end gap-2 p-4">
          <Button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
            Prev
          </Button>

          <Button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
