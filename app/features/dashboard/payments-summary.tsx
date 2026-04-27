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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments Trend</CardTitle>
        <CardDescription>Successful payments in the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.1} />
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
              tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
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
