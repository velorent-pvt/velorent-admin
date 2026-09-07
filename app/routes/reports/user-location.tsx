import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { supabase } from "~/lib/supabase";
import "leaflet/dist/leaflet.css";

type Movement = {
  name: string;
  bookingCode: string;
  locations: Array<{ latitude: number; longitude: number; recordedAt: string }>;
};

const DUMMY_MOVEMENT: Movement = {
  name: "Demo Customer",
  bookingCode: "DEMO1234",
  locations: [
    { latitude: 23.0225, longitude: 72.5714, recordedAt: "2026-08-30T09:00:00+05:30" },
    { latitude: 23.0268, longitude: 72.5792, recordedAt: "2026-08-30T09:30:00+05:30" },
    { latitude: 23.0332, longitude: 72.5886, recordedAt: "2026-08-30T10:00:00+05:30" },
    { latitude: 23.0414, longitude: 72.5981, recordedAt: "2026-08-30T10:30:00+05:30" },
  ],
};

export default function UserLocation() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [bookingCode, setBookingCode] = useState("");
  const [movement, setMovement] = useState<Movement | null>(DUMMY_MOVEMENT);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function findBooking() {
    const code = bookingCode.trim().replace(/^#/, "").toUpperCase();
    if (!code) {
      setMovement(DUMMY_MOVEMENT);
      setMessage("");
      return;
    }
    setLoading(true);
    setMovement(null);

    try {
      const { data: bookings, error: bookingError } = await supabase.rpc(
        "find_booking_by_code",
        { p_booking_code: code },
      );
      const booking = bookings?.[0] ?? null;
      if (bookingError) throw bookingError;
      if (!booking) {
        setMessage(`Booking #${code} was not found.`);
        return;
      }

      const [{ data: rows, error }, { data: profile }] = await Promise.all([
        supabase.from("booking_location_updates").select("latitude, longitude, recorded_at").eq("booking_id", booking.id).order("recorded_at"),
        supabase.from("profiles").select("full_name").eq("id", booking.customer_id).maybeSingle(),
      ]);
      if (error) throw error;
      if (!rows?.length) {
        setMessage(`No location updates have been recorded for #${code}.`);
        return;
      }

      setMovement({
        name: profile?.full_name || "Customer",
        bookingCode: booking.booking_code,
        locations: rows.map((row) => ({ latitude: Number(row.latitude), longitude: Number(row.longitude), recordedAt: row.recorded_at })),
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to load booking locations:", error);
      setMessage("Unable to load location history for this booking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mapRef.current || !movement?.locations.length) return;
    let cancelled = false;
    let mapInstance: import("leaflet").Map | null = null;

    async function initializeMap() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || !movement) return;
      const map = L.map(mapRef.current);
      mapInstance = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: "google-like-map-tiles",
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      const requestCoordinates = movement.locations.map(({ latitude, longitude }) => `${longitude},${latitude}`).join(";");
      let roadPath = movement.locations.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]);
      if (movement.locations.length > 1) {
        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${requestCoordinates}?overview=full&geometries=geojson`);
          const result = (await response.json()) as { routes?: Array<{ geometry: { coordinates: [number, number][] } }> };
          roadPath = result.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) ?? roadPath;
        } catch (error) {
          console.error("Failed to load driving route:", error);
        }
      }

      roadPath.forEach((point) => bounds.extend(point));
      if (roadPath.length > 1) L.polyline(roadPath, { color: "#2563eb", weight: 5, opacity: 0.9 }).addTo(map);

      movement.locations.forEach((location, index) => {
        const isStart = index === 0;
        const isLatest = index === movement.locations.length - 1;
        const size = isLatest ? 30 : 24;
        const color = isStart ? "#16a34a" : isLatest ? "#dc2626" : "#2563eb";
        const timestamp = new Date(location.recordedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
        const icon = L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
          html: `<div style="width:${size}px;height:${size}px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.3)"><span style="position:absolute;width:7px;height:7px;background:white;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%)"></span></div>`,
        });
        L.marker([location.latitude, location.longitude], { icon }).bindPopup(
          `<div style="min-width:220px"><strong>${movement.name}</strong><div style="color:#64748b;font-size:11px">#${movement.bookingCode}${isLatest ? " · Latest location" : ""}</div><div style="margin-top:9px"><strong>Time</strong><br>${timestamp}</div><div style="color:#64748b;font-size:11px">${location.latitude}, ${location.longitude}</div><a href="${mapsUrl}" target="_blank" rel="noreferrer" style="display:block;margin-top:12px;padding:8px;background:#2563eb;color:white;text-align:center;text-decoration:none;border-radius:6px">Open in Google Maps</a></div>`,
        ).addTo(map);
      });

      if (bounds.isValid()) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    }

    void initializeMap();
    return () => { cancelled = true; mapInstance?.remove(); };
  }, [movement]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">User Location</h1>
        <InputGroup className="max-w-md bg-card">
          <InputGroupInput value={bookingCode} onChange={(event) => setBookingCode(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void findBooking()} placeholder="Enter booking code, e.g. #A1B2C3D4" />
          <InputGroupAddon><button type="button" onClick={() => void findBooking()} disabled={loading} aria-label="Search booking"><Search /></button></InputGroupAddon>
        </InputGroup>
      </div>
      <Card className="overflow-hidden shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            User Movement Map
            {movement?.bookingCode === DUMMY_MOVEMENT.bookingCode ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                Demo data
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movement ? <div ref={mapRef} className="h-[600px] w-full" /> : <div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">{loading ? "Loading location history…" : message}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
