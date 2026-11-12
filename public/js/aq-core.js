// Air Quality core maths - shared by web UI, tests, and Python package.
// Notation: AQI calculated via EPA method from PM2.5 and PM10 concentrations.

export const LIMITS = {
  maxValue: 1e6,
  maxCoord: 90,
  minHistory: 1,
  minHours: 1,
  maxHours: 168,
  maxStations: 10
};

export const PARAM_LABELS = {
  pm25: "PM2.5",
  pm10: "PM10",
  co2: "CO₂",
  tvoc: "TVOC",
  temperature: "Temperature",
  humidity: "Humidity",
  aqi: "AQI"
};

export const PARAM_UNITS = {
  pm25: "µg/m³",
  pm10: "µg/m³",
  co2: "ppm",
  tvoc: "mg/m³",
  temperature: "°C",
  humidity: "%",
  aqi: ""
};

export const PARAM_ICONS = {
  pm25: "🌫️",
  pm10: "🌪️",
  co2: "💨",
  tvoc: "🧪",
  temperature: "🌡️",
  humidity: "💧",
  aqi: "📊"
};

// Indian lecture halls with coordinates
export const LECTURE_HALLS = [
  { id: "lh-001", name: "Lecture Hall A", building: "Engineering Block", floor: "Ground Floor", capacity: 120, lat: 28.6139, lon: 77.2090 },
  { id: "lh-002", name: "Lecture Hall B", building: "Engineering Block", floor: "First Floor", capacity: 100, lat: 28.6145, lon: 77.2095 },
  { id: "lh-003", name: "Lecture Hall C", building: "Science Block", floor: "Second Floor", capacity: 80, lat: 28.6150, lon: 77.2100 },
  { id: "lh-004", name: "Auditorium", building: "Main Building", floor: "Ground Floor", capacity: 300, lat: 28.6125, lon: 77.2080 },
  { id: "lh-005", name: "Seminar Hall 1", building: "Management Block", floor: "Third Floor", capacity: 60, lat: 28.6160, lon: 77.2110 }
];

// AQI breakpoints (EPA method) - PM2.5 and PM10
const AQI_BREAKPOINTS = {
  pm25: [
    { cLow: 0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 }
  ],
  pm10: [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 }
  ]
};

// AQI category info
export const AQI_CATEGORIES = [
  { max: 50, label: "Good", color: "var(--green)", bg: "color-mix(in srgb, var(--green) 15%, transparent)", desc: "Air quality is satisfactory" },
  { max: 100, label: "Moderate", color: "var(--amber)", bg: "color-mix(in srgb, var(--amber) 15%, transparent)", desc: "Acceptable, but sensitive individuals may experience effects" },
  { max: 150, label: "Unhealthy for Sensitive Groups", color: "var(--amber)", bg: "color-mix(in srgb, var(--amber) 20%, transparent)", desc: "Sensitive groups may experience health effects" },
  { max: 200, label: "Unhealthy", color: "var(--red)", bg: "color-mix(in srgb, var(--red) 15%, transparent)", desc: "Everyone may experience health effects" },
  { max: 300, label: "Very Unhealthy", color: "var(--purple)", bg: "color-mix(in srgb, var(--purple) 15%, transparent)", desc: "Health alert: everyone may experience serious effects" },
  { max: 500, label: "Hazardous", color: "var(--red)", bg: "color-mix(in srgb, var(--red) 20%, transparent)", desc: "Health emergency: entire population affected" }
];

/** Calculate AQI sub-index for a pollutant using EPA linear interpolation */
function calcSubIndex(concentration, breakpoints) {
  if (concentration === null || concentration === undefined) return 0;
  if (concentration > 500) return 500;
  const bp = breakpoints.find(b => concentration >= b.cLow && concentration <= b.cHigh);
  if (!bp) return concentration > 500 ? 500 : 0;
  return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow);
}

/** Calculate overall AQI from PM2.5 and PM10 */
export function calculateAQI(pm25, pm10) {
  const aqi25 = calcSubIndex(pm25, AQI_BREAKPOINTS.pm25);
  const aqi10 = calcSubIndex(pm10, AQI_BREAKPOINTS.pm10);
  return Math.max(aqi25, aqi10);
}

/** Get AQI category from AQI value */
export function getAQICategory(aqi) {
  if (aqi === null || aqi === undefined) return AQI_CATEGORIES[0];
  return AQI_CATEGORIES.find(cat => aqi <= cat.max) || AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

/** Parameter-specific status thresholds */
const PARAM_THRESHOLDS = {
  pm25: { good: 12, moderate: 35.4, unhealthy: 55.4 },
  pm10: { good: 54, moderate: 154, unhealthy: 254 },
  co2: { good: 800, moderate: 1000, unhealthy: 1500 },
  tvoc: { good: 0.3, moderate: 0.5, unhealthy: 1 },
  temperature: { good: 24, moderate: 26, unhealthy: 30 }, // good=22-24, moderate=18-26, bad=else
  humidity: { goodLow: 30, goodHigh: 60, moderateLow: 20, moderateHigh: 70 }
};

/** Get parameter status (Good/Moderate/Unhealthy) */
export function getParameterStatus(param, value) {
  if (value === null || value === undefined) return { label: "No Data", class: "", desc: "No data available" };
  const t = PARAM_THRESHOLDS[param];
  if (!t) return { label: "Unknown", class: "", desc: "" };

  if (param === "temperature") {
    if (value >= 20 && value <= 24) return { label: "Optimal", class: "good", desc: "Comfortable range" };
    if (value >= 18 && value <= 26) return { label: "Acceptable", class: "warn", desc: "Slightly outside comfort range" };
    return { label: "Poor", class: "bad", desc: "Outside comfort range" };
  }
  if (param === "humidity") {
    if (value >= t.goodLow && value <= t.goodHigh) return { label: "Optimal", class: "good", desc: "Comfortable range" };
    if (value >= t.moderateLow && value <= t.moderateHigh) return { label: "Acceptable", class: "warn", desc: "Slightly dry/humid" };
    return { label: "Poor", class: "bad", desc: "Too dry or too humid" };
  }
  if (value <= t.good) return { label: "Good", class: "good", desc: "Within healthy limits" };
  if (value <= t.moderate) return { label: "Moderate", class: "warn", desc: "Approaching limits" };
  return { label: "Unhealthy", class: "bad", desc: "Exceeds healthy limits" };
}

/** Ventilation recommendation based on CO₂, PM2.5, AQI */
export function getVentilationStatus(data) {
  const co2 = data.co2;
  const pm25 = data.pm25;
  const aqi = data.aqi;

  const critical = (co2 && co2 > 1500) || (pm25 && pm25 > 55) || (aqi && aqi > 150);
  const needed = (co2 && co2 > 1000) || (pm25 && pm25 > 35) || (aqi && aqi > 100);

  if (critical) {
    return {
      level: "critical",
      label: "Critical - Ventilate Immediately",
      desc: "CO₂, PM2.5, or AQI exceeds unhealthy thresholds",
      class: "status-bad",
      fanSpeed: 100
    };
  }
  if (needed) {
    return {
      level: "needed",
      label: "Ventilation Recommended",
      desc: "Consider increasing fresh air intake",
      class: "status-warn",
      fanSpeed: 70
    };
  }
  return {
    level: "good",
    label: "Air Quality Good",
    desc: "Current ventilation is adequate",
    class: "status-good",
    fanSpeed: 30
  };
}

/** Haversine distance between two lat/lon points in km */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(deg) { return deg * Math.PI / 180; }

/** Find nearest lecture hall to coordinates */
export function findNearestHall(lat, lon) {
  return LECTURE_HALLS.reduce((nearest, hall) => {
    const d = haversineDistance(lat, lon, hall.lat, hall.lon);
    return d < nearest.distance ? { ...hall, distance: d } : nearest;
  }, { ...LECTURE_HALLS[0], distance: Infinity });
}

/** Format time ago from ISO string or Date */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return "Never";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid date";
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Format number with locale */
export function fmt(num, decimals = 1) {
  if (num === null || num === undefined) return "—";
  const n = Number(num);
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Generate mock historical data for demo */
export function generateMockHistory(hours = 24) {
  const data = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    // Base values with daily variation + noise
    const hour = time.getHours();
    const dayFactor = 1 + 0.3 * Math.sin((hour - 6) * Math.PI / 12); // Peak at noon
    data.push({
      time: time.toISOString(),
      pm25: Math.max(5, 25 * dayFactor + (Math.random() - 0.5) * 10),
      pm10: Math.max(10, 45 * dayFactor + (Math.random() - 0.5) * 15),
      co2: Math.max(400, 600 + (Math.random() - 0.5) * 200),
      tvoc: Math.max(0.1, 0.3 + (Math.random() - 0.5) * 0.2),
      temperature: 22 + 3 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 2,
      humidity: 50 + 15 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 10
    });
  }
  return data;
}

/** Simple number validation (plain decimals only) */
const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;
export function parseNumber(text) {
  const s = String(text === undefined || text === null ? "" : text).trim();
  if (s === "") return { status: "empty" };
  if (!NUMBER_RE.test(s)) return { status: "invalid" };
  const value = Number(s);
  return Number.isFinite(value) ? { status: "ok", value } : { status: "invalid" };
}

/** Validate coordinates */
export function validateCoords(lat, lon) {
  const latR = parseNumber(lat);
  const lonR = parseNumber(lon);
  if (latR.status !== "ok" || lonR.status !== "ok") return { ok: false, message: "Enter valid latitude and longitude" };
  if (latR.value < -90 || latR.value > 90) return { ok: false, message: "Latitude must be -90 to 90" };
  if (lonR.value < -180 || lonR.value > 180) return { ok: false, message: "Longitude must be -180 to 180" };
  return { ok: true, lat: latR.value, lon: lonR.value };
}

/** Validate hours for trend */
export function validateHours(text) {
  const parsed = parseNumber(text);
  if (parsed.status !== "ok" || !Number.isInteger(parsed.value) || parsed.value < LIMITS.minHours || parsed.value > LIMITS.maxHours) {
    return { ok: false, message: `Hours must be a whole number from ${LIMITS.minHours} to ${LIMITS.maxHours}.` };
  }
  return { ok: true, value: parsed.value };
}