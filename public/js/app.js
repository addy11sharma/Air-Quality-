// Lecture Hall Air Quality Monitor - UI Logic
import {
  LECTURE_HALLS, calculateAQI, getAQICategory, getParameterStatus,
  getVentilationStatus, haversineDistance, findNearestHall,
  formatTimeAgo, fmt, generateMockHistory, validateCoords, validateHours,
  PARAM_LABELS, PARAM_UNITS, PARAM_ICONS
} from "./aq-core.js";

const $ = (id) => document.getElementById(id);

// State
let currentHall = null;
let currentData = null;
let currentStation = null;
let isFallback = false;

// ---------- Safe DOM helpers ----------
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function kpiCard(cls, icon, label, value, unit, status) {
  const box = el("div", `k ${cls}`);
  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="font-size:1.2rem">${icon}</span>
      <span style="color:var(--mute);font-size:.85rem">${label}</span>
    </div>
    <b style="font-size:1.4rem">${value}</b>
    <span style="font-size:.75rem;color:var(--mute)">${unit}</span>
    ${status ? `<span class="${status.class}" style="font-size:.7rem;margin-top:4px;display:inline-block">${status.label}</span>` : ""}
  `;
  return box;
}

function ventCard(label, value, unit, status) {
  const card = el("div", "vent-card");
  card.innerHTML = `
    <h3>${label}</h3>
    <div class="value">${value} <span style="font-size:.9rem;font-weight:400;color:var(--mute)">${unit}</span></div>
    <span class="status ${status.class}">${status.label}</span>
  `;
  return card;
}

// ---------- Initialize hall dropdown ----------
function initHallSelect() {
  const select = $("hall");
  LECTURE_HALLS.forEach(h => {
    const opt = el("option", "", `${h.name} (${h.building}, ${h.floor})`);
    opt.value = h.id;
    select.appendChild(opt);
  });
  // Default to first hall
  select.value = LECTURE_HALLS[0].id;
  onHallChange();
}

// ---------- Hall selection ----------
function onHallChange() {
  const select = $("hall");
  const hallId = select.value;
  currentHall = LECTURE_HALLS.find(h => h.id === hallId);
  clearErrors();
  fetchData();
}

// ---------- Custom coordinates ----------
$("lat").addEventListener("input", debounce(() => {
  if ($("lat").value && $("lon").value) {
    currentHall = { id: "custom", name: "Custom Location", lat: parseFloat($("lat").value), lon: parseFloat($("lon").value) };
    clearErrors();
    fetchData();
  }
}, 500));

$("lon").addEventListener("input", debounce(() => {
  if ($("lat").value && $("lon").value) {
    currentHall = { id: "custom", name: "Custom Location", lat: parseFloat($("lat").value), lon: parseFloat($("lon").value) };
    clearErrors();
    fetchData();
  }
}, 500));

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Error handling ----------
function showError(id, message) {
  const box = $(id);
  box.replaceChildren();
  box.appendChild(el("div", "", message));
  box.hidden = false;
}

function clearErrors() {
  ["locErr", "fetchErr", "trendErr"].forEach(id => {
    const box = $(id);
    box.replaceChildren();
    box.hidden = true;
  });
  ["lat", "lon", "trendParam", "trendRange"].forEach(id => {
    const el = $(id);
    if (el) el.setAttribute("aria-invalid", "false");
  });
}

// ---------- Fetch air quality data ----------
async function fetchData() {
  if (!currentHall) return;
  clearErrors();

  try {
    const params = new URLSearchParams();
    if (currentHall.id.startsWith("lh-")) {
      params.set("hallId", currentHall.id);
    } else {
      params.set("lat", currentHall.lat);
      params.set("lon", currentHall.lon);
    }

    const res = await fetch(`/api/air-quality?${params}`);
    const result = await res.json();

    if (!result.success) throw new Error(result.error || "Failed to fetch");

    currentData = result.data;
    currentStation = result.station;
    isFallback = result.fallback || false;

    renderCurrent();
    renderStation();
    fetchTrend();

  } catch (err) {
    console.error(err);
    showError("fetchErr", "Failed to load air quality data. Using simulated data.");
    // Use mock data
    currentData = generateMockData(currentHall);
    currentStation = { name: "Simulated Data", city: "Demo", distance: 0 };
    isFallback = true;
    renderCurrent();
    renderStation();
    fetchTrend();
  }
}

function generateMockData(hall) {
  const basePm25 = 35 + Math.random() * 30;
  const basePm10 = 65 + Math.random() * 40;
  return {
    co2: Math.round(550 + Math.random() * 300),
    pm25: Math.round(basePm25 * 10) / 10,
    pm10: Math.round(basePm10 * 10) / 10,
    tvoc: Math.round((0.2 + Math.random() * 0.4) * 100) / 100,
    temperature: Math.round((20 + Math.random() * 6) * 10) / 10,
    humidity: Math.round(35 + Math.random() * 30),
    aqi: calculateAQI(basePm25, basePm10),
    lastUpdated: new Date().toISOString(),
    location: hall.name
  };
}

// ---------- Render current readings ----------
function renderCurrent() {
  if (!currentData) return;

  const params = ["pm25", "pm10", "co2", "tvoc", "temperature", "humidity", "aqi"];
  const container = $("kpis");
  container.replaceChildren();

  params.forEach(param => {
    const value = currentData[param];
    const status = param === "aqi" ? getAQICategory(value) : getParameterStatus(param, value);
    container.appendChild(kpiCard(
      status.class.replace("good", "").replace("warn", "w").replace("bad", "r") || "",
      PARAM_ICONS[param],
      PARAM_LABELS[param],
      fmt(value),
      PARAM_UNITS[param],
      status
    ));
  });

  // AQI Gauge
  renderGauge();

  // Last updated
  $("lastUpdated").textContent = `Last updated: ${formatTimeAgo(currentData.lastUpdated)}${isFallback ? " (simulated data)" : ""}`;

  // Ventilation
  renderVentilation();
}

function renderGauge() {
  const aqi = currentData.aqi;
  const cat = getAQICategory(aqi);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(aqi / 500, 1);
  const offset = circumference * (1 - progress);

  // Determine gradient color
  let gradColor;
  if (aqi <= 50) gradColor = "var(--green)";
  else if (aqi <= 100) gradColor = "var(--amber)";
  else if (aqi <= 150) gradColor = "var(--amber)";
  else if (aqi <= 200) gradColor = "var(--red)";
  else if (aqi <= 300) gradColor = "var(--purple)";
  else gradColor = "var(--red)";

  const container = $("aqiGauge");
  container.innerHTML = `
    <svg class="gauge-svg" viewBox="0 0 200 200" role="img" aria-label="AQI Gauge: ${aqi} ${cat.label}">
      <defs>
        <linearGradient id="aqiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="var(--green)"/>
          <stop offset="20%" stop-color="var(--amber)"/>
          <stop offset="40%" stop-color="var(--amber)"/>
          <stop offset="60%" stop-color="var(--red)"/>
          <stop offset="80%" stop-color="var(--purple)"/>
          <stop offset="100%" stop-color="var(--red)"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="${radius}" fill="none" stroke="var(--line)" stroke-width="16"/>
      <circle cx="100" cy="100" r="${radius}" fill="none" stroke="url(#aqiGrad)" stroke-width="16"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 100 100)" style="transition: stroke-dashoffset 1s ease"/>
      <text x="100" y="90" text-anchor="middle" font-size="36" font-weight="800" fill="var(--ink)">${aqi}</text>
      <text x="100" y="115" text-anchor="middle" font-size="14" font-weight="600" fill="${cat.color}">${cat.label}</text>
      <text x="100" y="135" text-anchor="middle" font-size="10" fill="var(--mute)">AQI</text>
    </svg>
    <p class="note" style="margin-top:8px">${cat.desc}</p>
  `;
}

// ---------- Render station info ----------
function renderStation() {
  if (!currentStation) return;
  const box = $("stationInfo");
  box.hidden = false;
  box.innerHTML = `
    <div class="icon" style="background:${isFallback ? "color-mix(in srgb, var(--amber) 20%, transparent)" : "color-mix(in srgb, var(--green) 20%, transparent)"};color:${isFallback ? "var(--amber)" : "var(--green)"}">
      ${isFallback ? "⚠" : "✓"}
    </div>
    <div class="text">
      <div style="font-weight:600">${currentStation.name}</div>
      <div class="meta">${currentStation.city} • ${currentStation.distance.toFixed(1)} km away</div>
    </div>
    ${isFallback ? `<span style="font-size:.75rem;padding:2px 8px;background:color-mix(in srgb, var(--amber) 20%, transparent);color:var(--amber);border-radius:999px">Simulated Data</span>` : ""}
  `;
}

// ---------- Render ventilation ----------
function renderVentilation() {
  const vent = getVentilationStatus(currentData);
  const container = $("ventStatus");
  container.replaceChildren();

  // CO2 card
  const co2Status = getParameterStatus("co2", currentData.co2);
  container.appendChild(ventCard("CO₂", fmt(currentData.co2), "ppm", co2Status));

  // PM2.5 card
  const pm25Status = getParameterStatus("pm25", currentData.pm25);
  container.appendChild(ventCard("PM2.5", fmt(currentData.pm25), "µg/m³", pm25Status));

  // AQI card
  const aqiCat = getAQICategory(currentData.aqi);
  container.appendChild(ventCard("AQI", fmt(currentData.aqi), "", { label: aqiCat.label, class: aqiCat.color.replace("var(--", "status-").replace(")", "") }));

  // Overall ventilation status
  const overall = el("div", "vent-card");
  overall.style.gridColumn = "1 / -1";
  overall.innerHTML = `
    <h3>Ventilation Status</h3>
    <div class="value" style="font-size:1.2rem">${vent.label}</div>
    <span class="status ${vent.class}">${vent.desc}</span>
    <div style="margin-top:12px;display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <label style="font-size:.75rem;color:var(--mute)">Recommended Fan Speed</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="range" id="fanSpeed" min="0" max="100" value="${vent.fanSpeed}" style="flex:1" disabled>
          <span id="fanSpeedVal" style="min-width:40px;text-align:right">${vent.fanSpeed}%</span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(overall);

  // Explanation
  const params = [];
  if (currentData.co2 > 1000) params.push(`CO₂ ${fmt(currentData.co2)} ppm (${currentData.co2 > 1500 ? "critical" : "elevated"})`);
  if (currentData.pm25 > 35) params.push(`PM2.5 ${fmt(currentData.pm25)} µg/m³ (${currentData.pm25 > 55 ? "critical" : "elevated"})`);
  if (currentData.aqi > 100) params.push(`AQI ${fmt(currentData.aqi)} (${currentData.aqi > 150 ? "critical" : "elevated"})`);
  if (params.length === 0) params.push("All parameters within healthy ranges");
  $("ventExplanation").textContent = params.join("; ");
}

// ---------- Fetch and render trend ----------
async function fetchTrend() {
  const param = $("trendParam").value;
  const hours = parseInt($("trendRange").value);
  const hallId = currentHall.id.startsWith("lh-") ? currentHall.id : null;

  try {
    const params = new URLSearchParams();
    if (hallId) params.set("hallId", hallId);
    else { params.set("lat", currentHall.lat); params.set("lon", currentHall.lon); }
    params.set("parameter", param);
    params.set("hours", hours);

    const res = await fetch(`/api/air-quality/history?${params}`);
    const result = await res.json();

    if (result.success) {
      renderTrendChart(result.data, param, hours);
    } else {
      // Use mock data
      const mockData = generateMockHistory(hours);
      renderTrendChart(mockData, param, hours);
    }
  } catch (err) {
    console.error(err);
    const mockData = generateMockHistory(hours);
    renderTrendChart(mockData, param, hours);
  }
}

function renderTrendChart(data, param, hours) {
  if (!data || data.length === 0) {
    $("trendChart").innerHTML = '<text x="320" y="130" text-anchor="middle" fill="var(--mute)">No data available</text>';
    return;
  }

  const values = data.map(d => d[param] || 0).filter(v => v !== undefined && v !== null);
  if (values.length === 0) return;

  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  const W = 640, H = 260, L = 48, R = 16, T = 16, B = 36;
  const plotW = W - L - R;
  const plotH = H - T - B;

  const X = (i) => L + (i / (data.length - 1)) * plotW;
  const Y = (v) => H - B - ((v - minVal) / range) * plotH;

  // Color for this parameter
  const colors = {
    pm25: "var(--red)", pm10: "var(--amber)", co2: "var(--blue)",
    tvoc: "var(--purple)", temperature: "var(--amber)", humidity: "var(--teal)"
  };
  const color = colors[param] || "var(--blue)";

  // Build SVG path
  const pathData = data.map((d, i) => {
    const v = d[param];
    if (v === undefined || v === null) return "";
    return `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
  }).filter(Boolean).join(" ");

  // Threshold lines
  const thresholds = {
    pm25: [12, 35.4, 55.4],
    pm10: [54, 154, 254],
    co2: [800, 1000, 1500],
    tvoc: [0.3, 0.5, 1]
  };
  const tLines = thresholds[param] || [];

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 640 260");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${PARAM_LABELS[param]} trend over ${hours} hours`);

  // Axes
  svg.appendChild(createSVG("line", { x1: L, y1: H-B, x2: W-R, y2: H-B, stroke: "var(--line)" }));
  svg.appendChild(createSVG("line", { x1: L, y1: T, x2: L, y2: H-B, stroke: "var(--line)" }));

  // Threshold lines
  tLines.forEach((t, i) => {
    const y = Y(t);
    const line = createSVG("line", {
      x1: L, y1: y, x2: W-R, y2: y,
      stroke: i === 0 ? "var(--green)" : i === 1 ? "var(--amber)" : "var(--red)",
      "stroke-width": 1, "stroke-dasharray": "5 4", opacity: 0.5
    });
    svg.appendChild(line);
    const label = createSVG("text", { x: L - 4, y: y - 4, "text-anchor": "end", "font-size": 10, fill: "var(--mute)" });
    label.textContent = t;
    svg.appendChild(label);
  });

  // Data line
  const path = createSVG("path", {
    d: pathData, fill: "none", stroke: color, "stroke-width": 2.5
  });
  svg.appendChild(path);

  // Area under curve
  const areaPath = pathData.replace("M", "M") + ` L ${W-R} ${H-B} L ${L} ${H-B} Z`;
  const area = createSVG("path", {
    d: areaPath, fill: color, opacity: 0.1
  });
  svg.insertBefore(area, path);

  // Data points
  data.forEach((d, i) => {
    const v = d[param];
    if (v === undefined || v === null) return;
    const circle = createSVG("circle", {
      cx: X(i), cy: Y(v), r: 3, fill: color
    });
    svg.appendChild(circle);
  });

  // Labels
  svg.appendChild(createSVG("text", { x: W/2, y: H-8, "text-anchor": "middle", "font-size": 12, fill: "var(--mute)" }, `Time (${hours}h)`));
  const yLabel = createSVG("text", { x: 14, y: H/2, "font-size": 12, fill: "var(--mute)", "text-anchor": "middle", transform: `rotate(-90 14 ${H/2})` });
  yLabel.textContent = `${PARAM_LABELS[param]} (${PARAM_UNITS[param]})`;
  svg.appendChild(yLabel);

  $("trendChart").replaceChildren(svg);
}

function createSVG(tag, attrs, text) {
  const svgNS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (text !== undefined) el.textContent = text;
  return el;
}

// ---------- Event listeners ----------
$("hall").addEventListener("change", onHallChange);
$("trendParam").addEventListener("change", fetchTrend);
$("trendRange").addEventListener("change", fetchTrend);
$("refreshTrend").addEventListener("click", fetchTrend);

// ---------- Init ----------
initHallSelect();
fetchData();

// Auto-refresh every 5 minutes
setInterval(fetchData, 5 * 60 * 1000);