import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import type { ManualVerification } from "~/api/verifications";
import { Badge } from "~/components/ui/badge";
import { Clock } from "lucide-react";

export const getVerificationColumns = (
  onReview: (v: ManualVerification) => void
): ColumnDef<ManualVerification>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const profile = row.original.profile;
      return (
        <div className="text-sm">
          <div className="font-medium">{profile?.full_name ?? "Unknown"}</div>
          <div className="text-muted-foreground text-xs">
            {profile?.phone ?? profile?.email ?? "—"}
          </div>
        </div>
      );
    },
  },
  {
    id: "document_type",
    header: "Document Type",
    cell: ({ row }) => {
      const isAadhaar = row.original.document_type === "aadhaar";
      return (
        <span className="font-medium capitalize text-sm">
          {isAadhaar ? "Aadhaar Card" : "Driving License"}
        </span>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: () => (
      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    ),
  },
  {
    id: "created_at",
    header: "Submitted On",
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
  {
    id: "review",
    header: "",
    cell: ({ row }) => (
      <Button variant="link" onClick={() => onReview(row.original)}>
        Review →
      </Button>
    ),
  },
];
