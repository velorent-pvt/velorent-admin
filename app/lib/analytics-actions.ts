export function actionDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getActionDateRange(params: URLSearchParams, now = new Date()) {
  const today = actionDateInput(now);
  return { start: params.get("start") ?? today, end: params.get("end") ?? today };
}

export function updateActionDateRange(params: URLSearchParams, field: "start" | "end", value: string) {
  const next = new URLSearchParams(params);
  const range = getActionDateRange(params);
  range[field] = actionDateInput(new Date(value));
  if (range.start > range.end) {
    range[field === "start" ? "end" : "start"] = range[field];
  }
  next.set("start", range.start);
  next.set("end", range.end);
  next.delete("table.Customers.page");
  return next;
}

export async function loadAllAnalyticsActions<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string; code?: string } | null;
  }>,
) {
  const data: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (page.error) return { data: null, error: page.error };
    data.push(...(page.data ?? []));
    if (!page.data || page.data.length < pageSize) return { data, error: null };
  }
}
