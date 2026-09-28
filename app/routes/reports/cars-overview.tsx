import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "~/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Car,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

interface CarAddress {
  latitude: number;
  longitude: number;
  address_line1: string;
  address_line2: string | null;
  city: string;
  pincode: string;
  cars: {
    id: string;
    is_active: boolean | null;
    is_verified: boolean | null;
    registration_number: string;
    manufacturing_year: number | null;
    fuel_type: string;
    vehicle_seat_capacity: number;
    hourly_price: number;
    brand: { name: string } | null;
    model: { name: string } | null;
    images: { image_url: string; is_primary: boolean }[];
    bookings: { start_time: string; end_time: string; status: string }[];
    availability: { start_time: string; end_time: string; status: string }[];
  } | null;
}

type VehicleStatus = "Available" | "Booked" | "Maintenance" | "Offline";

const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  Available: "#16a34a",
  Booked: "#3b82f6",
  Maintenance: "#f97316",
  Offline: "#94a3b8",
};

function getVehicleStatus(
  car: CarAddress["cars"],
  now = Date.now(),
): VehicleStatus {
  if (!car || !car.is_active || !car.is_verified) return "Offline";
  const hasTimeOverlap = (start: string, end: string) =>
    new Date(start).getTime() <= now && new Date(end).getTime() > now;
  if (
    car.bookings?.some(
      (booking) =>
        ["confirmed", "ongoing"].includes(booking.status) &&
        hasTimeOverlap(booking.start_time, booking.end_time),
    )
  )
    return "Booked";
  if (
    car.availability?.some(
      (period) =>
        period.status === "blocked" &&
        hasTimeOverlap(period.start_time, period.end_time),
    )
  )
    return "Maintenance";
  return "Available";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );
}

interface AreaStats {
  area: string;
  total: number;
  active: number;
  verified: number;
  available: number;
  inactive: number;
  unverified: number;
  utilization: number;
  supplyLevel: "Very High" | "High" | "Medium" | "Low";
}

const SUPPLY_COLORS = {
  "Very High": "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

const STATUS_COLORS = {
  Active: "#22c55e",
  Inactive: "#94a3b8",
  Verified: "#3b82f6",
  Unverified: "#f59e0b",
};

function normalizeCity(value: string | null | undefined) {
  if (!value) return "Unknown";

  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  const cityAliases: Record<string, string> = {
    ahmedabad: "Ahmedabad",
    ahemdabad: "Ahmedabad",
    ahmedbad: "Ahmedabad",
    ahmedabd: "Ahmedabad",
    amdavad: "Ahmedabad",
  };

  if (cityAliases[normalized]) {
    return cityAliases[normalized];
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSupplyLevel(
  count: number,
  maxCount: number,
): AreaStats["supplyLevel"] {
  if (maxCount <= 0) return "Low";

  const percentage = count / maxCount;

  if (percentage >= 0.75) return "Very High";
  if (percentage >= 0.5) return "High";
  if (percentage >= 0.25) return "Medium";

  return "Low";
}

function SupplyBadge({ level }: { level: AreaStats["supplyLevel"] }) {
  const styles = {
    "Very High": "bg-red-50 text-red-600 border-red-200",
    High: "bg-orange-50 text-orange-600 border-orange-200",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Low: "bg-green-50 text-green-600 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${styles[level]}`}
    >
      <span
        className="mr-1.5 h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: SUPPLY_COLORS[level],
        }}
      />
      {level}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconClassName: string;
}) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight">{value}</p>

            <p className="mt-1 text-[11px] text-muted-foreground">{title}</p>
          </div>

          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CarsOverview() {
  const mapRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<CarAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [locationSearch, setLocationSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);

      const { data: rows, error } = await supabase
        .from("car_pickup_addresses")
        .select(
          `
            latitude,
            longitude,
            address_line1,
            address_line2,
            city,
            pincode,
            cars!inner(
              id,
              is_active,
              is_verified,
              registration_number,
              manufacturing_year,
              fuel_type,
              vehicle_seat_capacity,
              hourly_price,
              brand:car_brands!brand_id(name),
              model:car_models!model_id(name),
              images:car_images!car_id(image_url,is_primary),
              bookings:bookings!car_id(start_time,end_time,status),
              availability:car_availability!car_id(start_time,end_time,status)
            )
          `,
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (!mounted) return;

      if (error) {
        console.error("Failed to fetch car locations:", error);
        setData([]);
      } else {
        setData((rows ?? []) as unknown as CarAddress[]);
      }

      setLoading(false);
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const statistics = useMemo(() => {
    const total = data.length;

    const active = data.filter((item) => item.cars?.is_active === true).length;

    const verified = data.filter(
      (item) => item.cars?.is_verified === true,
    ).length;

    const activeVerified = data.filter(
      (item) =>
        item.cars?.is_active === true && item.cars?.is_verified === true,
    ).length;

    const inactive = total - active;
    const unverified = total - verified;

    const cities = new Set(data.map((item) => normalizeCity(item.city)));

    const verificationRate =
      total > 0 ? Math.round((verified / total) * 100) : 0;

    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      verified,
      activeVerified,
      inactive,
      unverified,
      cityCount: cities.size,
      verificationRate,
      activeRate,
    };
  }, [data]);

  const areaStats = useMemo(() => {
    const grouped: Record<
      string,
      {
        total: number;
        active: number;
        verified: number;
        inactive: number;
        unverified: number;
      }
    > = {};

    data.forEach((item) => {
      const area = normalizeCity(item.city);

      if (!grouped[area]) {
        grouped[area] = {
          total: 0,
          active: 0,
          verified: 0,
          inactive: 0,
          unverified: 0,
        };
      }

      grouped[area].total += 1;

      if (item.cars?.is_active === true) {
        grouped[area].active += 1;
      } else {
        grouped[area].inactive += 1;
      }

      if (item.cars?.is_verified === true) {
        grouped[area].verified += 1;
      } else {
        grouped[area].unverified += 1;
      }
    });

    const maxCount = Math.max(
      ...Object.values(grouped).map((item) => item.total),
      0,
    );

    return Object.entries(grouped)
      .map(([area, stats]) => {
        const available = Math.min(stats.active, stats.verified);

        const utilization =
          stats.total > 0
            ? Math.round(((stats.total - available) / stats.total) * 100)
            : 0;

        return {
          area,
          total: stats.total,
          active: stats.active,
          verified: stats.verified,
          available,
          inactive: stats.inactive,
          unverified: stats.unverified,
          utilization,
          supplyLevel: getSupplyLevel(stats.total, maxCount),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const cityChartData = useMemo(() => {
    return areaStats.slice(0, 8).map((item) => ({
      name:
        item.area.length > 15 ? `${item.area.substring(0, 15)}…` : item.area,
      cars: item.total,
    }));
  }, [areaStats]);

  const mapData = useMemo(() => {
    const query = locationSearch.trim().toLocaleLowerCase();
    if (!query) return data;

    return data.filter((item) =>
      [item.address_line1, item.address_line2, item.city, item.pincode]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [data, locationSearch]);

  const statusChartData = useMemo(
    () => [
      {
        name: "Active",
        value: statistics.active,
      },
      {
        name: "Inactive",
        value: statistics.inactive,
      },
      {
        name: "Verified",
        value: statistics.verified,
      },
      {
        name: "Unverified",
        value: statistics.unverified,
      },
    ],
    [statistics],
  );

  const vehicleStatusCounts = useMemo(() => {
    const counts: Record<VehicleStatus, number> = {
      Available: 0,
      Booked: 0,
      Maintenance: 0,
      Offline: 0,
    };
    mapData.forEach((item) => {
      counts[getVehicleStatus(item.cars)] += 1;
    });
    return counts;
  }, [mapData]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapData.length === 0) {
      setMapLoading(false);
      return;
    }

    let mapInstance: any = null;
    let cancelled = false;

    async function initMap() {
      try {
        setMapLoading(true);

        const L = (await import("leaflet")).default;

        (window as any).L = L;

        if (cancelled || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: true,
        }).setView([23.0225, 72.5714], 12);

        mapInstance = map;
        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer(
          `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`,
          {
            maxZoom: 20,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
            className: "google-like-map-tiles",
          },
        ).addTo(map);

        mapData.forEach((item) => {
          const latitude = Number(item.latitude);
          const longitude = Number(item.longitude);

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
          }

          const car = item.cars;
          if (!car) return;
          const status = getVehicleStatus(car);
          const color = VEHICLE_STATUS_COLORS[status];
          const modelName =
            [car.brand?.name, car.model?.name].filter(Boolean).join(" ") ||
            "VeloRent vehicle";
          const candidateImage =
            car.images?.find((image) => image.is_primary)?.image_url ??
            car.images?.[0]?.image_url;
          const imageUrl = candidateImage?.startsWith("https://")
            ? candidateImage
            : undefined;
          const icon = L.divIcon({
            className: "vehicle-map-marker",
            html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 7px #0005;display:flex;align-items:center;justify-content:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 11 1.5-5h11L19 11l2 2v5h-2"/><path d="M5 18H3v-5l2-2"/><path d="M5 11h14"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg></div>`,
            iconSize: [30, 30],
            iconAnchor: [16, 16],
          });
          const popup = `
            <div style="width:220px;font-family:Arial,sans-serif">
              ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(modelName)}" style="width:100%;height:86px;object-fit:cover;border-radius:8px;background:#f1f5f9" />` : ""}
              <div style="font-weight:700;margin-top:8px">${escapeHtml(modelName)}</div>
              <div style="font-size:12px;color:#64748b">${escapeHtml(car.registration_number)}${car.manufacturing_year ? ` · ${car.manufacturing_year}` : ""}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${status}</div>
              <div style="font-size:12px;color:#475569;margin-top:6px">${escapeHtml(item.address_line1)}, ${escapeHtml(normalizeCity(item.city))}</div>
              <div style="font-size:12px;color:#475569;margin-top:4px">${escapeHtml(car.fuel_type)} · ${car.vehicle_seat_capacity} Seater</div>
              <div style="font-weight:700;margin-top:8px">₹ ${Number(car.hourly_price).toLocaleString("en-IN")} / hour</div>
              <a href="/cars/${encodeURIComponent(car.id)}" style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;border-radius:6px;padding:7px;margin-top:9px;font-size:12px;font-weight:600">View Car Details</a>
            </div>`;
          L.marker([latitude, longitude], { icon }).bindPopup(popup).addTo(map);
        });

        setMapLoading(false);
      } catch (error) {
        console.error("Failed to initialize map:", error);

        setMapLoading(false);
      }
    }

    initMap();

    return () => {
      cancelled = true;

      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
    };
  }, [mapData]);

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6 p-6">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="shadow-none">
              <CardContent>
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Cars Overview</h1>

        <p className="text-sm text-muted-foreground">
          Car supply distribution and availability analytics across Ahmedabad.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard
          title="Total Cars"
          value={statistics.total}
          subtitle="All registered cars"
          icon={Car}
          iconClassName="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Active Cars"
          value={statistics.active}
          subtitle={`${statistics.activeRate}% of total`}
          icon={TrendingUp}
          iconClassName="bg-green-50 text-green-600"
        />

        <StatCard
          title="Verified Cars"
          value={statistics.verified}
          subtitle={`${statistics.verificationRate}% verified`}
          icon={ShieldCheck}
          iconClassName="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Pending Verification"
          value={statistics.unverified}
          subtitle="Awaiting admin review"
          icon={CheckCircle2}
          iconClassName="bg-yellow-50 text-yellow-600"
        />

        <StatCard
          title="Inactive Cars"
          value={statistics.inactive}
          subtitle="Currently deactivated"
          icon={MapPin}
          iconClassName="bg-red-50 text-red-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Car Supply by Area
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Top areas by registered car supply
            </p>
          </CardHeader>

          <CardContent className="p-5">
            <div className="h-[280px] w-full">
              {cityChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cityChartData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />

                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />

                    <Bar
                      dataKey="cars"
                      radius={[0, 4, 4, 0]}
                      fill="#3b82f6"
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Fleet Status
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Active, inactive and verification status
            </p>
          </CardHeader>

          <CardContent className="p-5">
            <div className="flex h-[280px] items-center">
              <div className="h-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            STATUS_COLORS[
                              entry.name as keyof typeof STATUS_COLORS
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-40 space-y-4">
                {statusChartData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            STATUS_COLORS[
                              item.name as keyof typeof STATUS_COLORS
                            ],
                        }}
                      />

                      <span className="text-xs text-muted-foreground">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(600px,0.85fr)]">
        <Card className="overflow-hidden shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">
                Vehicle Availability Map
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Fleet vehicles by current status across pickup locations
              </p>
            </div>
            <div className="w-full max-w-xs shrink-0">
              <Input
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder="Search pickup address or area (e.g. Vatva)"
                aria-label="Filter map by pickup address or area"
                className="h-9 text-xs"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="relative h-[520px] w-full">
              <div ref={mapRef} className="absolute inset-0" />

              <div className="absolute left-3 top-3 z-[500] rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur">
                <div className="mb-2 text-[11px] font-semibold">
                  Vehicle status
                </div>
                <div className="space-y-1.5">
                  {(
                    [
                      "Available",
                      "Booked",
                      "Maintenance",
                      "Offline",
                    ] as VehicleStatus[]
                  ).map((status) => (
                    <div
                      key={status}
                      className="flex items-center justify-between gap-5 text-[11px] text-muted-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: VEHICLE_STATUS_COLORS[status],
                          }}
                        />
                        {status}
                      </span>
                      <span className="font-medium text-foreground">
                        {vehicleStatusCounts[status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {mapLoading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                  <div className="rounded-md border bg-background px-4 py-2 text-xs shadow-sm">
                    Loading map…
                  </div>
                </div>
              )}

              {mapData.length === 0 && !mapLoading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center">
                  <div className="rounded-md border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                    {locationSearch.trim()
                      ? "No vehicles found for this location."
                      : "No pickup location data available."}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t bg-muted/20 px-4 py-3">
              {(
                [
                  "Available",
                  "Booked",
                  "Maintenance",
                  "Offline",
                ] as VehicleStatus[]
              ).map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: VEHICLE_STATUS_COLORS[status] }}
                  />
                  {status}{" "}
                  <span className="font-semibold text-foreground">
                    {vehicleStatusCounts[status]}
                  </span>
                </span>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {mapData.length} vehicles mapped
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Area-wise Supply Analytics
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Supply distribution by pickup area
                </p>
              </div>

              <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                {areaStats.length} areas
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {areaStats.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                No car data available.
              </div>
            ) : (
              <div className="max-h-[565px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow className="hover:bg-background">
                      <TableHead className="w-10 text-[10px]">#</TableHead>

                      <TableHead className="text-[10px]">Area</TableHead>

                      <TableHead className="text-right text-[10px]">
                        Cars
                      </TableHead>

                      <TableHead className="text-right text-[10px]">
                        Active
                      </TableHead>

                      <TableHead className="text-right text-[10px]">
                        Verified
                      </TableHead>

                      <TableHead className="text-center text-[10px]">
                        Supply
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {areaStats.map((item, index) => (
                      <TableRow key={item.area} className="hover:bg-muted/30">
                        <TableCell className="text-[10px] text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                              <MapPin className="h-3.5 w-3.5" />
                            </div>

                            <div>
                              <p className="text-xs font-medium">{item.area}</p>

                              <p className="text-[10px] text-muted-foreground">
                                {item.available} ready
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <span className="text-xs font-semibold">
                            {item.total}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <span
                            className={
                              item.active > 0
                                ? "text-xs font-medium text-green-600"
                                : "text-xs text-muted-foreground"
                            }
                          >
                            {item.active}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <span
                            className={
                              item.verified > 0
                                ? "text-xs font-medium text-blue-600"
                                : "text-xs text-muted-foreground"
                            }
                          >
                            {item.verified}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <SupplyBadge level={item.supplyLevel} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
