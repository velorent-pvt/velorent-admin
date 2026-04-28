import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { DashboardSummary } from "~/api/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const chartConfig = {
  amount: {
    label: "Payments",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatAmount(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export function PaymentsSummary({
  chartData,
}: {
  chartData: DashboardSummary["payment_chart"];
}) {
  const [days, setDays] = React.useState("30");

  const filtered = React.useMemo(() => {
    const n = Number(days);
    if (n >= chartData.length) return chartData;
    return chartData.slice(-n);
  }, [chartData, days]);

  return (
    <Card className="shadow-none col-span-2 border border-border/50 rounded-none">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Payments Trend</CardTitle>
          <CardDescription>Successful payment volume</CardDescription>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[160px] sm:ml-auto bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                `₹${Number(value).toLocaleString("en-IN", { notation: "compact" })}`
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(String(value)).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  }
                  formatter={(value) => (
                    <span className="font-medium">{formatAmount(Number(value))}</span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="var(--color-amount)"
              fill="url(#fillAmount)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
