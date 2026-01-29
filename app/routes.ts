import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/auth/login.tsx"),
  route("logout", "routes/auth/logout.tsx"),

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

    route("customers", "routes/customers/index.tsx"),
    route("hosts", "routes/hosts/index.tsx"),

    route("bookings", "routes/bookings/index.tsx"),
    route("payments", "routes/payments/index.tsx"),

    route("coupons", "routes/coupons/index.tsx"),
    route("coupons/new", "routes/coupons/add.tsx"),
    route("coupons/edit", "routes/coupons/edit.tsx"),
    route("coupons/delete", "routes/coupons/delete.tsx"),

    route("notifications", "routes/notifications/index.tsx"),
  ]),
] satisfies RouteConfig;
