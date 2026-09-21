export const PAYMENT_ANALYTICS_LABELS: Record<string, string> = {
  total_attempts: "Total payment attempts",
  successful: "Successful payments",
  failed: "Failed payments",
  cancelled: "Cancelled / abandoned",
};

export const PAYMENT_ANALYTICS_METRICS = Object.keys(PAYMENT_ANALYTICS_LABELS);
