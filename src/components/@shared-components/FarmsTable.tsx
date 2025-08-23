import * as React from "react"
import {
  IconCircleCheckFilled,
  IconDotsVertical,
  IconSearch,
} from "@tabler/icons-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define the Farm type
export interface Farm {
  id: string;
  name: string;
  farmOwner: string;
  bondsOwned: string;
  annualInterest: string;
  status: string;
  type?: string;
}

interface FarmsTableProps {
  data: Farm[];
  onBuyMore: (farmId: string, farmName: string) => void;
  isLoading?: boolean;
  showCheckbox?: boolean;
  showActions?: boolean;
  showBuyMoreLink?: boolean;
  showTabs?: boolean;
  showFilter?: boolean;
  tabs?: { value: string; label: string; count?: number }[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

const getColumns = (
  onBuyMore: (farmId: string, farmName: string) => void,
  showCheckbox: boolean,
  showActions: boolean,
  showBuyMoreLink: boolean
): ColumnDef<Farm>[] => {
  const columns: ColumnDef<Farm>[] = [];

  // Add checkbox column if enabled
  if (showCheckbox) {
    columns.push({
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    });
  }

  // Add farm info column
  columns.push({
    accessorKey: "name",
    header: "Farm",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">
            Owner: {row.original.farmOwner}
          </span>
        </div>
      )
    },
    enableHiding: false,
  });

  // Add bonds owned column
  columns.push({
    accessorKey: "bondsOwned",
    header: () => <div className="w-full text-right">Bonds Owned</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.original.bondsOwned}</div>
    ),
  });

  // Add annual interest column
  columns.push({
    accessorKey: "annualInterest",
    header: () => <div className="w-full text-right">Annual Interest</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.original.annualInterest}</div>
    ),
  });

  // Add status column with color coding
  columns.push({
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge 
        variant="outline"
        className={
          row.original.status === "Active" 
            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800" 
            : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800"
        }
      >
        {row.original.status === "Active" ? (
          <IconCircleCheckFilled className="mr-1 h-3 w-3" />
        ) : null}
        {row.original.status}
      </Badge>
    ),
  });

  // Add Buy More link column if enabled
  if (showBuyMoreLink) {
    columns.push({
      id: "buyMore",
      header: () => <div className="w-full text-right">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="link"
            className="text-primary p-0 h-auto font-medium"
            onClick={() => onBuyMore(row.original.id, row.original.name)}
          >
            Buy More
          </Button>
        </div>
      ),
    });
  }

  // Add actions column if enabled
  if (showActions) {
    columns.push({
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                size="icon"
              >
                <IconDotsVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBuyMore(row.original.id, row.original.name)}>
                Buy More
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Reports</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    });
  }

  return columns;
}

export function FarmsTable({ 
  data, 
  onBuyMore, 
  isLoading = false, 
  showCheckbox = false, 
  showActions = true,
  showBuyMoreLink = false,
  showTabs = false,
  showFilter = false,
  tabs = [],
  activeTab = "all",
  onTabChange = () => {}
}: FarmsTableProps) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns: getColumns(onBuyMore, showCheckbox, showActions, showBuyMoreLink),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      rowSelection,
      columnFilters,
      globalFilter,
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={6} className="h-24 text-center">
                Loading farms...
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Tabs and Filter */}
      {(showTabs || showFilter) && (
        <div className="flex items-center justify-between">
          {showTabs && (
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  onClick={() => onTabChange(tab.value)}
                  data-state={activeTab === tab.value ? "active" : "inactive"}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <Badge variant="secondary" className="ml-2">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          
          {showFilter && (
            <div className="relative w-64">
              <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farms..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-8"
              />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  No farms found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}