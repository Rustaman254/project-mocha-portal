"use client"
import * as React from "react";
import {
  ColumnDef,
} from "@tanstack/react-table";
import { CheckCircle, MoreHorizontal, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Event Log type
export interface EventLog {
  id: string;
  type: string;
  description: string;
  date: string;
  status: "Success" | "Failed";
}

// Dummy data
const dummyEvents: EventLog[] = [
  { id: "1", type: "FarmAdded", description: "Added GreenAcres", date: "2025-05-01", status: "Success" },
  { id: "2", type: "BondPurchased", description: "Investor 0x123 bought bond #101", date: "2025-06-03", status: "Success" },
  { id: "3", type: "YieldDistributed", description: "Distributed yield to farm #2", date: "2025-06-15", status: "Success" },
  { id: "4", type: "Error", description: "Failed update of collateral on RainTree", date: "2025-07-08", status: "Failed" },
];

// Event Log columns
export const getEventColumns = (): ColumnDef<EventLog>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => row.original.id,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge className="font-medium">{row.original.type}</Badge>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => row.original.date,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "Success" ? (
        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Success
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800">
          Failed
        </Badge>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: () => (
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    ),
  },
];
