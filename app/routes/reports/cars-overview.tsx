import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "~/lib/supabase";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

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
  } | null;
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

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const cityAliases: Record<string, string> = {
    ahmedabad: "Ahmedabad",
    ahemdabad: "Ahmedabad",
    ahmedbad: "Ahmedabad",
    ahmedabd: "Ahmedabad",
    amdavad: "Ahmedabad",
    amdavad: "Ahmedabad",
  };

  if (cityAliases[normalized]) {
    return cityAliases[normalized];
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSupplyLevel(
  count: number,
  maxCount: number
): AreaStats["supplyLevel"] {
  if (maxCount <= 0) return "Low";

  const percentage = count / maxCount;

  if (percentage >= 0.75) return "Very High";
  if (percentage >= 0.5) return "High";
  if (percentage >= 0.25) return "Medium";

  return "Low";
}

function SupplyBadge({
  level,
}: {
  level: AreaStats["supplyLevel"];
}) {
  const styles = {
    "Very High":
      "bg-red-50 text-red-600 border-red-200",
    High:
      "bg-orange-50 text-orange-600 border-orange-200",
    Medium:
      "bg-yellow-50 text-yellow-700 border-yellow-200",
    Low:
      "bg-green-50 text-green-600 border-green-200",
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
            <p className="text-2xl font-bold tracking-tight">
              {value}
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              {title}
            </p>
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
              is_verified
            )
          `
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

    const active = data.filter(
      (item) => item.cars?.is_active === true
    ).length;

    const verified = data.filter(
      (item) => item.cars?.is_verified === true
    ).length;

    const activeVerified = data.filter(
      (item) =>
        item.cars?.is_active === true &&
        item.cars?.is_verified === true
    ).length;

    const inactive = total - active;
    const unverified = total - verified;

    const cities = new Set(
      data.map((item) => normalizeCity(item.city))
    );

    const verificationRate =
      total > 0
        ? Math.round((verified / total) * 100)
        : 0;

    const activeRate =
      total > 0
        ? Math.round((active / total) * 100)
        : 0;

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
      0
    );

    return Object.entries(grouped)
      .map(([area, stats]) => {
        const available = Math.min(
          stats.active,
          stats.verified
        );

        const utilization =
          stats.total > 0
            ? Math.round(
                ((stats.total - available) /
                  stats.total) *
                  100
              )
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
          supplyLevel: getSupplyLevel(
            stats.total,
            maxCount
          ),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const cityChartData = useMemo(() => {
    return areaStats.slice(0, 8).map((item) => ({
      name:
        item.area.length > 15
          ? `${item.area.substring(0, 15)}…`
          : item.area,
      cars: item.total,
    }));
  }, [areaStats]);

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
    [statistics]
  );

  useEffect(() => {
    if (!mapRef.current || data.length === 0) {
      return;
    }

    let mapInstance: any = null;
    let cancelled = false;

    async function initMap() {
      try {
        setMapLoading(true);

        const L = (await import("leaflet")).default;

        (window as any).L = L;

        await import("leaflet.heat");

        if (cancelled || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([23.0225, 72.5714], 12);

        mapInstance = map;

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          }
        ).addTo(map);

        const GRID_SIZE = 0.008;

        const grid = new Map<
          string,
          {
            latitude: number;
            longitude: number;
            count: number;
          }
        >();

        data.forEach((item) => {
          const latitude = Number(item.latitude);
          const longitude = Number(item.longitude);

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return;
          }

          const gridLat =
            Math.floor(latitude / GRID_SIZE) *
            GRID_SIZE;

          const gridLng =
            Math.floor(longitude / GRID_SIZE) *
            GRID_SIZE;

          const key = `${gridLat.toFixed(4)}_${gridLng.toFixed(4)}`;

          const existing = grid.get(key);

          if (existing) {
            existing.count += 1;
          } else {
            grid.set(key, {
              latitude:
                gridLat + GRID_SIZE / 2,
              longitude:
                gridLng + GRID_SIZE / 2,
              count: 1,
            });
          }
        });

        const gridPoints = Array.from(grid.values());

        const maxDensity = Math.max(
          ...gridPoints.map((point) => point.count),
          1
        );

        const heatData = gridPoints.map((point) => {
          const normalized =
            point.count / maxDensity;

          const weight =
            0.15 + normalized * 0.85;

          return [
            point.latitude,
            point.longitude,
            weight,
          ] as [number, number, number];
        });

        // @ts-ignore
        if (L.heatLayer) {
          // @ts-ignore
          L.heatLayer(heatData, {
            radius: 48,
            blur: 32,
            minOpacity: 0.45,
            maxZoom: 15,
            max: 1,

            gradient: {
              0.0: "#22c55e",
              0.25: "#84cc16",
              0.45: "#eab308",
              0.65: "#f97316",
              0.82: "#ef4444",
              1.0: "#b91c1c",
            },
          }).addTo(map);
        }

        data.forEach((item) => {
          const active =
            item.cars?.is_active === true;

          const verified =
            item.cars?.is_verified === true;

          if (!active || !verified) return;

          const latitude = Number(item.latitude);
          const longitude = Number(item.longitude);

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return;
          }

          L.circleMarker(
            [latitude, longitude],
            {
              radius: 3,
              weight: 1,
              fillOpacity: 0.7,
              color: "#ffffff",
              fillColor: "#2563eb",
            }
          )
            .bindPopup(
              `
                <div style="min-width:180px">
                  <strong>${item.address_line1}</strong>
                  <br />
                  ${normalizeCity(item.city)} - ${item.pincode}
                  <br />
                  <small>Active & Verified</small>
                </div>
              `
            )
            .addTo(map);
        });

        setMapLoading(false);
      } catch (error) {
        console.error(
          "Failed to initialize map:",
          error
        );

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
  }, [data]);

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6 p-6">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <Card
                key={index}
                className="shadow-none"
              >
                <CardContent>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Cars Overview
        </h1>

        <p className="text-sm text-muted-foreground">
          Car supply distribution and availability
          analytics across Ahmedabad.
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
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
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
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                    />

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
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
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
                      {statusChartData.map(
                        (entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              STATUS_COLORS[
                                entry.name as keyof typeof STATUS_COLORS
                              ]
                            }
                          />
                        )
                      )}
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
                {statusChartData.map(
                  (item) => (
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

                      <span className="text-sm font-semibold">
                        {item.value}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(600px,0.85fr)]">
        <Card className="overflow-hidden shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Car Supply Heat Map
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Pickup-location concentration across Ahmedabad
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Low

                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Medium

                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                High

                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Very High
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="relative h-[520px] w-full">
              <div
                ref={mapRef}
                className="absolute inset-0"
              />

              {mapLoading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                  <div className="rounded-md border bg-background px-4 py-2 text-xs shadow-sm">
                    Loading map…
                  </div>
                </div>
              )}

              {data.length === 0 &&
                !mapLoading && (
                  <div className="absolute inset-0 z-[1000] flex items-center justify-center">
                    <div className="rounded-md border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                      No pickup location data available.
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-[11px] text-muted-foreground">
                    Low Supply
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span className="text-[11px] text-muted-foreground">
                    Medium
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <span className="text-[11px] text-muted-foreground">
                    High
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-[11px] text-muted-foreground">
                    Very High
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-muted-foreground">
                {statistics.activeVerified} active & verified
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
                      <TableHead className="w-10 text-[10px]">
                        #
                      </TableHead>

                      <TableHead className="text-[10px]">
                        Area
                      </TableHead>

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
                    {areaStats.map(
                      (item, index) => (
                        <TableRow
                          key={item.area}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="text-[10px] text-muted-foreground">
                            {index + 1}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                <MapPin className="h-3.5 w-3.5" />
                              </div>

                              <div>
                                <p className="text-xs font-medium">
                                  {item.area}
                                </p>

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
                            <SupplyBadge
                              level={item.supplyLevel}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    )}
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