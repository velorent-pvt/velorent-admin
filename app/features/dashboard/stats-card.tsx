import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
}

export function StatsCard({ icon: Icon, label, value, change }: StatsCardProps) {
  return (
    <Card className="shadow-none border border-border/50 rounded-none">
      <CardContent className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-none">{value}</h3>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>

        {change ? (
          <div className="flex items-center gap-1 text-sm text-success">
            <ArrowUpRight className="h-4 w-4" />
            {change}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
