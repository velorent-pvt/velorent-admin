import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/auth/login.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("api/customer-funnel-dropoffs", "routes/api/customer-funnel-dropoffs.ts"),
  route("api/payment-analytics-customers", "routes/api/payment-analytics-customers.ts"),
  route("api/search-location-detail", "routes/api/search-location-detail.ts"),

  layout("routes/index.tsx", [
    index("routes/home.tsx"),

    route("brands", "routes/brands/index.tsx"),
    route("brands/new", "routes/brands/add.tsx"),
    route("brands/delete", "routes/brands/delete.tsx"),
    route("brands/edit", "routes/brands/edit.tsx"),

    route("models", "routes/brand-models/index.tsx"),
    route("models/new", "routes/brand-models/add.tsx"),

    route("models/delete", "routes/brand-models/delete.tsx"),
    route("models/edit", "routes/brand-models/edit.tsx"),

    route("cars", "routes/cars/index.tsx"),
    route("cars/:id", "routes/cars/review.tsx"),
    route("pending", "routes/pending/index.tsx"),
    route("pending/:id", "routes/pending/review.tsx"),
    route("pending/verifications", "routes/pending/verifications.tsx"),

    route("customers", "routes/customers/index.tsx"),
    route("customers/funnel-dropoffs", "routes/customers/funnel-dropoffs.tsx"),
    route("customers/payment-analytics", "routes/customers/payment-analytics.tsx"),
    route("hosts", "routes/hosts/index.tsx"),

    route("bookings", "routes/bookings/index.tsx"),
    route("bookings/:id", "routes/bookings/detail.tsx"),
    route("disputes", "routes/disputes/index.tsx"),
    route("disputes/:id", "routes/disputes/detail.tsx"),
    route("payments", "routes/payments/index.tsx"),
    route("payments/customer-refund", "routes/payments/customer-refund.tsx"),
    route("payments/customer-deposit", "routes/payments/customer-deposit.tsx"),
    route("payments/host-payout", "routes/payments/host-payout.tsx"),

    route("coupons", "routes/coupons/index.tsx"),
    route("coupons/new", "routes/coupons/add.tsx"),
    route("coupons/edit", "routes/coupons/edit.tsx"),
    route("coupons/delete", "routes/coupons/delete.tsx"),

    route("notifications", "routes/notifications/index.tsx"),
    route("notifications/tasks", "routes/notifications/tasks.tsx"),
    route("settings/booking", "routes/settings/booking.tsx"),

    route("reports/cars-overview", "routes/reports/cars-overview.tsx"),
    route("reports/customer-funnel", "routes/reports/customer-funnel.tsx"),
    route("reports/payment-analytics", "routes/reports/payment-analytics.tsx"),
    route("reports/search-demand", "routes/reports/search-demand.tsx"),
    route("reports/search-demand/location", "routes/reports/search-demand-location.tsx"),
    route("reports/user-location", "routes/reports/user-location.tsx"),
  ]),
] satisfies RouteConfig;
