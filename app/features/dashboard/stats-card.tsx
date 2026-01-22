import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change: string;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  change,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-none">{value}</h3>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>

        <div className="flex items-center gap-1 text-sm text-success">
          <ArrowUpRight className="h-4 w-4" />
          {change}
        </div>
      </CardContent>
    </Card>
  );
}
