import { Button, buttonVariants } from "~/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { type VariantProps } from "class-variance-authority";

type MutationStatus = "idle" | "pending" | "success" | "error";

export interface StatefulButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  status: MutationStatus;
}

export function StatefulButton({
  children,
  status,
  disabled,
  ...props
}: StatefulButtonProps) {
  const renderIcon = () => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 " />;
      case "error":
        return <XCircle className="h-4 w-4 " />;
      default:
        return null;
    }
  };

  return (
    <Button disabled={status === "pending" || disabled} {...props}>
      {renderIcon()}
      {children}
    </Button>
  );
}
