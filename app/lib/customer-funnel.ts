export const CUSTOMER_FUNNEL_STAGE_LABELS: Record<number, string> = {
  1: "App opened",
  2: "Vehicle searched",
  3: "Search results viewed",
  4: "Vehicle details viewed",
  5: "Booking started",
  6: "KYC started",
  7: "KYC completed",
  8: "Payment started",
  9: "Payment successful",
  10: "Booking confirmed",
};

// Optional actions are branches, not prerequisites for the main journey.
const MAIN_STAGE_PARENTS: Record<number, number> = {
  4: 1, 5: 4, 8: 5, 9: 8, 10: 9,
};

type StageCount = { stage_index: number; current_customers: number };

export function getFunnelStageMetrics(row: StageCount, rows: StageCount[]) {
  const optional = [2, 3, 6, 7].includes(row.stage_index);
  const parent = MAIN_STAGE_PARENTS[row.stage_index];
  const base = rows.find((stage) => stage.stage_index === parent)?.current_customers ?? 0;
  const first = rows.find((stage) => stage.stage_index === 1)?.current_customers ?? 0;
  return {
    optional,
    stageConversion: parent ? (base > 0 ? row.current_customers / base * 100 : 0) : null,
    dropped: parent ? Math.max(0, base - row.current_customers) : null,
    funnelShare: first > 0 ? row.current_customers / first * 100 : 0,
  };
}
