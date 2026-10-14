const BLUE = "#2563EB";
const NAVY = "#1E2A5A";

type BookingAgreementInput = {
  booking: {
    id: string;
    start_time: string;
    end_time: string;
    total_hours: number;
    base_amount: number;
    delivery_amount: number;
    deposit_amount: number;
    total_amount: number;
    pickup_type: string;
  };
  customer: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    drivingLicenseStatus?: string | null;
  };
  carName: string;
  registrationNumber?: string | null;
  hostName?: string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  handoverDetails?: {
    start_odometer_km?: number | string | null;
    created_at?: string | null;
    handover_proof_url?: string | null;
    odometer_proof_url?: string | null;
    customer_photo_url?: string | null;
  } | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatAmount(value: number) {
  return `Rs ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

function detailRow(label: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function proofLink(label: string, value?: string | null) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) return "";
  return `<div class="proof-link"><a href="${escapeHtml(value)}">${escapeHtml(label)}</a></div>`;
}

export function buildBookingAgreementFileName(bookingId: string) {
  return `velorent-trip-agreement-${String(bookingId ?? "").replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase() || "BOOKING"}.pdf`;
}

export function buildBookingAgreementHtml(input: BookingAgreementInput) {
  const { booking, customer, handoverDetails } = input;
  const startOdometer = Number(handoverDetails?.start_odometer_km);
  if (
    !handoverDetails?.created_at ||
    handoverDetails.start_odometer_km == null ||
    (typeof handoverDetails.start_odometer_km === "string" && !handoverDetails.start_odometer_km.trim()) ||
    !Number.isFinite(startOdometer) ||
    startOdometer < 0 ||
    !handoverDetails.handover_proof_url
  ) {
    throw new Error("A verified handover record is required before generating the agreement.");
  }

  const reference = `VR-${String(booking.id ?? "").replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const pickupLocation = booking.pickup_type === "home_delivery"
    ? input.deliveryAddress || input.pickupAddress
    : input.pickupAddress;
  const handoverTime = handoverDetails.created_at;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${buildBookingAgreementFileName(booking.id)}</title><style>
    @page { size: A4; margin: 20mm 16mm; } * { box-sizing: border-box; } body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display:table; table-layout:fixed; width:100%; padding-bottom:16px; border-bottom:3px solid ${BLUE}; } .logo,.brand-mark,.right { display:table-cell; vertical-align:middle; } .logo { width:35%; max-width:64px; height:64px; object-fit:contain; } .brand-mark { width:35%; color:${NAVY}; font-size:16px; font-weight:800; letter-spacing:1px; } .brand-mark span { color:${BLUE}; } h1 { margin:0; color:${NAVY}; font-size:23px; } .right { width:65%; text-align:right; color:#64748B; } .status { display:inline-block; margin-top:7px; padding:4px 8px; color:#047857; background:#ECFDF5; border:1px solid #A7F3D0; font-size:10px; font-weight:bold; }
    .section { margin-top:18px; } h2 { margin:0 0 8px; color:${NAVY}; font-size:11px; text-transform:uppercase; border-bottom:1px solid #DCE3F0; padding-bottom:6px; } .columns { display:table; table-layout:fixed; width:100%; } .column { display:table-cell; width:50%; padding-right:14px; vertical-align:top; } .detail-row { display:table; table-layout:fixed; width:100%; padding:4px 0; } .detail-row span { display:table-cell; width:42%; padding-right:12px; color:#64748B; vertical-align:top; } .detail-row strong { display:table-cell; width:58%; text-align:left; vertical-align:top; } .terms { margin:0; padding-left:17px; } .terms li { margin:5px 0; } .proof-link { margin-top:6px; } .proof-link a { color:${BLUE}; text-decoration:underline; } .footer { margin-top:25px; padding-top:10px; border-top:1px solid #DCE3F0; color:#64748B; text-align:center; font-size:9px; }
  </style></head><body>
    <header class="header"><div class="brand-mark">VELOR<span>ENT</span></div><div class="right"><h1>TRIP RENTAL AGREEMENT</h1><div>${escapeHtml(reference)}</div><div>Issued ${escapeHtml(formatDateTime(handoverTime))}</div><span class="status">TRIP STARTED / ONGOING</span></div></header>
    <section class="section"><h2>Customer details</h2><div class="columns"><div class="column">${detailRow("Name", customer.name)}${detailRow("Phone", customer.phone)}</div><div class="column">${detailRow("Email", customer.email)}${detailRow("Driving licence", customer.drivingLicenseStatus)}</div></div></section>
    <section class="section"><h2>Vehicle and trip</h2><div class="columns"><div class="column">${detailRow("Vehicle", input.carName)}${detailRow("Registration", input.registrationNumber)}${detailRow("Host", input.hostName)}${detailRow("Booking ID", booking.id)}</div><div class="column">${detailRow("Rental period", `${formatDateTime(booking.start_time)} to ${formatDateTime(booking.end_time)}`)}${detailRow("Duration", `${booking.total_hours} hours`)}${detailRow("Pickup location", pickupLocation)}</div></div></section>
    <section class="section"><h2>Payment and deposit</h2><div class="columns"><div class="column">${detailRow("Rental amount", formatAmount(booking.base_amount))}${detailRow("Security deposit", formatAmount(booking.deposit_amount))}</div><div class="column">${detailRow("Delivery charge", formatAmount(booking.delivery_amount))}${detailRow("Total paid", formatAmount(booking.total_amount))}</div></div></section>
    <section class="section"><h2>Verified handover record</h2>${detailRow("Handover time", formatDateTime(handoverTime))}${detailRow("Start odometer", `${startOdometer.toLocaleString("en-IN")} km`)}${proofLink("View handover photo", handoverDetails.handover_proof_url)}${proofLink("View odometer photo", handoverDetails.odometer_proof_url)}${proofLink("View customer photo", handoverDetails.customer_photo_url)}</section>
    <section class="section"><h2>Agreement terms</h2><ol class="terms"><li>The customer confirms receipt of the vehicle in the recorded handover condition.</li><li>The customer is responsible for lawful operation, traffic penalties, damage, and return conditions during the rental period.</li><li>Deposit, cancellation, extension, accident, insurance, and dispute terms follow VeloRent policy.</li><li>This agreement takes effect at the verified handover time shown above.</li></ol></section>
    <section class="section"><h2>Electronic acceptance</h2>${detailRow("Customer", customer.name)}${detailRow("Host", input.hostName)}${detailRow("System record", `OTP-verified handover at ${formatDateTime(handoverTime)}`)}</section>
    <footer class="footer">This is an electronically generated VeloRent trip rental agreement.</footer></body></html>`;
}

export function downloadBookingAgreement(html: string, fileName: string) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow popups to download the agreement.");
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.document.title = fileName;
  popup.focus();
  popup.setTimeout(() => popup.print(), 300);
}
