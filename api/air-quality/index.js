// Vercel Serverless Function - Current Air Quality
import { LECTURE_HALLS, calculateAQI, haversineDistance, findNearestHall, generateMockData } from '../../public/js/aq-core.js';

const OPENAQ_BASE = 'https://api.openaq.org/v2';
const OPENAQ_KEY = process.env.OPENAQ_API_KEY;

async function fetchOpenAQ(lat, lon, radius = 20000) {
  const params = new URLSearchParams({
    coordinates: `${lat},${lon}`,
    radius: radius.toString(),
    limit: '10',
    order_by: 'distance',
    sort: 'asc',
    parameter: ['pm25', 'pm10', 'co2', 'tvoc', 'temperature', 'humidity', 'no2', 'so2', 'o3', 'co'].join(',')
  });

  const headers = { 'Accept': 'application/json' };
  if (OPENAQ_KEY) headers['X-API-Key'] = OPENAQ_KEY;

  const res = await fetch(`${OPENAQ_BASE}/locations?${params}`, { headers });
  if (!res.ok) throw new Error(`OpenAQ error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function fetchLatest(locationId) {
  const params = new URLSearchParams({ location_id: locationId.toString(), limit: '100', order_by: 'lastUpdated', sort: 'desc' });
  const headers = { 'Accept': 'application/json' };
  if (OPENAQ_KEY) headers['X-API-Key'] = OPENAQ_KEY;

  const res = await fetch(`${OPENAQ_BASE}/latest?${params}`, { headers });
  if (!res.ok) throw new Error(`OpenAQ latest error: ${res.status}`);
  const data = await res.json();
  return data.results?.[0] || null;
}

function transformMeasurements(measurements, hallName) {
  const byParam = {};
  measurements.forEach(m => { byParam[m.parameter] = { value: m.value, unit: m.unit, updated: m.lastUpdated }; });

  const pm25 = byParam.pm25?.value ?? null;
  const pm10 = byParam.pm10?.value ?? null;
  const aqi = pm25 !== null ? calculateAQI(pm25, pm10) : null;

  const latestUpdate = measurements.reduce((latest, m) => {
    const d = new Date(m.lastUpdated);
    return d > latest ? d : latest;
  }, new Date(0));

  return {
    co2: byParam.co2?.value ?? null,
    pm25, pm10,
    tvoc: byParam.tvoc?.value ?? null,
    temperature: byParam.temperature?.value ?? null,
    humidity: byParam.humidity?.value ?? null,
    aqi,
    lastUpdated: latestUpdate > new Date(0) ? latestUpdate.toISOString() : null,
    location: hallName
  };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { hallId, lat, lon } = req.query;

    let targetHall = LECTURE_HALLS[0];
    let targetLat = 28.6139, targetLon = 77.2090;

    if (hallId && typeof hallId === 'string') {
      const hall = LECTURE_HALLS.find(h => h.id === hallId);
      if (hall) { targetHall = hall; targetLat = hall.lat; targetLon = hall.lon; }
    } else if (lat && lon) {
      targetLat = parseFloat(lat);
      targetLon = parseFloat(lon);
      targetHall = { ...targetHall, lat: targetLat, lon: targetLon, name: 'Custom Location' };
    }

    const locations = await fetchOpenAQ(targetLat, targetLon, 20000);

    if (locations.length === 0) {
      // No stations found - return mock data
      const mockData = generateMockData(targetHall);
      return res.status(200).json({
        success: true,
        data: mockData,
        station: { name: 'No nearby station', city: 'N/A', distance: 0 },
        hall: targetHall,
        fallback: true
      });
    }

    const nearest = locations[0];
    const detailed = await fetchLatest(nearest.id);
    const sensorData = detailed
      ? transformMeasurements(detailed.measurements, targetHall.name)
      : transformMeasurements(nearest.measurements, targetHall.name);

    const distance = haversineDistance(targetLat, targetLon, nearest.coordinates.latitude, nearest.coordinates.longitude);

    return res.status(200).json({
      success: true,
      data: sensorData,
      station: {
        id: nearest.id,
        name: nearest.name,
        city: nearest.city,
        country: nearest.country,
        distance: Math.round(distance * 10) / 10
      },
      hall: targetHall,
      fallback: false
    });

  } catch (err) {
    console.error('Air quality API error:', err);
    // Return mock data on error
    const hallId = req.query.hallId;
    const fallbackHall = hallId
      ? LECTURE_HALLS.find(h => h.id === hallId) || LECTURE_HALLS[0]
      : LECTURE_HALLS[0];
    return res.status(200).json({
      success: true,
      data: generateMockData(fallbackHall),
      station: { name: 'Simulated (API error)', city: 'Demo', distance: 0 },
      hall: fallbackHall,
      fallback: true
    });
  }
}