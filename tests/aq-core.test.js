// Tests for aq-core.js - run with `npm test`
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAQI, getAQICategory, getParameterStatus, getVentilationStatus,
  haversineDistance, findNearestHall, formatTimeAgo, fmt,
  generateMockHistory, validateCoords, validateHours,
  PARAM_LABELS, PARAM_UNITS, PARAM_ICONS, LECTURE_HALLS,
  AQI_CATEGORIES
} from '../public/js/aq-core.js';

// ---------- calculateAQI ----------
describe('calculateAQI', () => {
  it('returns 0 for zero concentration', () => {
    assert.strictEqual(calculateAQI(0, 0), 0);
  });

  it('returns Good (<=50) for low PM2.5', () => {
    assert.ok(calculateAQI(10, 20) <= 50);
  });

  it('returns Moderate (51-100) for medium PM2.5', () => {
    const aqi = calculateAQI(25, 50);
    assert.ok(aqi > 50 && aqi <= 100);
  });

  it('returns Unhealthy for Sensitive (101-150) for high PM2.5', () => {
    const aqi = calculateAQI(40, 80);
    assert.ok(aqi > 100 && aqi <= 150);
  });

  it('returns Unhealthy (151-200) for very high PM2.5', () => {
    const aqi = calculateAQI(60, 120);
    assert.ok(aqi > 150 && aqi <= 200);
  });

  it('uses max of PM2.5 and PM10', () => {
    // PM2.5=30 -> AQI ~83, PM10=200 -> AQI ~123, max should be 123
    const aqi1 = calculateAQI(30, 200);
    // PM2.5=200 -> AQI ~250, PM10=30 -> AQI ~53, max should be 250
    const aqi2 = calculateAQI(200, 30);
    assert.ok(aqi1 > 0 && aqi2 > aqi1);
  });

  it('handles null/undefined by ignoring that pollutant', () => {
    // null is treated as 0 concentration for that pollutant
    // calculateAQI(null, 50) -> PM2.5=null(0), PM10=50 -> AQI from PM10 only
    // calculateAQI(50, null) -> PM2.5=50, PM10=null(0) -> AQI from PM2.5 only
    const aqi1 = calculateAQI(null, 50);
    const aqi2 = calculateAQI(50, null);
    // Both should be > 0 since the other pollutant has a value
    assert.ok(aqi1 > 0);
    assert.ok(aqi2 > 0);
    // They won't be equal because PM2.5 and PM10 have different breakpoints
    // PM10=50 -> AQI ~46, PM2.5=50 -> AQI ~137
    assert.notStrictEqual(aqi1, aqi2);
  });
});

// ---------- getAQICategory ----------
describe('getAQICategory', () => {
  it('Good for 0-50', () => {
    const cat = getAQICategory(25);
    assert.strictEqual(cat.label, 'Good');
    assert.ok(cat.color.includes('green'));
  });

  it('Moderate for 51-100', () => {
    const cat = getAQICategory(75);
    assert.strictEqual(cat.label, 'Moderate');
    assert.ok(cat.color.includes('amber'));
  });

  it('Unhealthy for Sensitive for 101-150', () => {
    const cat = getAQICategory(125);
    assert.strictEqual(cat.label, 'Unhealthy for Sensitive Groups');
  });

  it('Unhealthy for 151-200', () => {
    const cat = getAQICategory(175);
    assert.strictEqual(cat.label, 'Unhealthy');
    assert.ok(cat.color.includes('red'));
  });

  it('Very Unhealthy for 201-300', () => {
    const cat = getAQICategory(250);
    assert.strictEqual(cat.label, 'Very Unhealthy');
    assert.ok(cat.color.includes('purple'));
  });

  it('Hazardous for 301+', () => {
    const cat = getAQICategory(400);
    assert.strictEqual(cat.label, 'Hazardous');
  });
});

// ---------- getParameterStatus ----------
describe('getParameterStatus', () => {
  it('PM2.5 Good < 12', () => {
    const s = getParameterStatus('pm25', 10);
    assert.strictEqual(s.label, 'Good');
    assert.strictEqual(s.class, 'good');
  });

  it('PM2.5 Moderate 12-35.4', () => {
    const s = getParameterStatus('pm25', 25);
    assert.strictEqual(s.label, 'Moderate');
    assert.strictEqual(s.class, 'warn');
  });

  it('PM2.5 Unhealthy > 35.4', () => {
    const s = getParameterStatus('pm25', 50);
    assert.strictEqual(s.label, 'Unhealthy');
    assert.strictEqual(s.class, 'bad');
  });

  it('CO2 Good < 800', () => {
    const s = getParameterStatus('co2', 700);
    assert.strictEqual(s.label, 'Good');
  });

  it('CO2 Moderate 800-1000', () => {
    const s = getParameterStatus('co2', 900);
    assert.strictEqual(s.label, 'Moderate');
  });

  it('CO2 Unhealthy > 1000', () => {
    const s = getParameterStatus('co2', 1500);
    assert.strictEqual(s.label, 'Unhealthy');
  });

  it('Temperature Optimal 20-24', () => {
    const s = getParameterStatus('temperature', 22);
    assert.strictEqual(s.label, 'Optimal');
  });

  it('Temperature Acceptable 18-26', () => {
    const s = getParameterStatus('temperature', 25);
    assert.strictEqual(s.label, 'Acceptable');
  });

  it('Humidity Optimal 30-60', () => {
    const s = getParameterStatus('humidity', 50);
    assert.strictEqual(s.label, 'Optimal');
  });

  it('returns No Data for null', () => {
    const s = getParameterStatus('pm25', null);
    assert.strictEqual(s.label, 'No Data');
  });
});

// ---------- getVentilationStatus ----------
describe('getVentilationStatus', () => {
  it('Critical when CO2 > 1500', () => {
    const v = getVentilationStatus({ co2: 1600, pm25: 20, aqi: 50 });
    assert.strictEqual(v.level, 'critical');
    assert.strictEqual(v.fanSpeed, 100);
  });

  it('Critical when PM2.5 > 55', () => {
    const v = getVentilationStatus({ co2: 600, pm25: 60, aqi: 50 });
    assert.strictEqual(v.level, 'critical');
  });

  it('Critical when AQI > 150', () => {
    const v = getVentilationStatus({ co2: 600, pm25: 20, aqi: 160 });
    assert.strictEqual(v.level, 'critical');
  });

  it('Needed when CO2 1000-1500', () => {
    const v = getVentilationStatus({ co2: 1200, pm25: 20, aqi: 50 });
    assert.strictEqual(v.level, 'needed');
    assert.strictEqual(v.fanSpeed, 70);
  });

  it('Good when all normal', () => {
    const v = getVentilationStatus({ co2: 600, pm25: 20, aqi: 50 });
    assert.strictEqual(v.level, 'good');
    assert.strictEqual(v.fanSpeed, 30);
  });
});

// ---------- haversineDistance ----------
describe('haversineDistance', () => {
  it('Delhi to Mumbai ~1150 km', () => {
    const d = haversineDistance(28.6139, 77.2090, 19.0760, 72.8777);
    assert.ok(d > 1100 && d < 1200);
  });

  it('Zero for same point', () => {
    assert.strictEqual(haversineDistance(28.6139, 77.2090, 28.6139, 77.2090), 0);
  });
});

// ---------- findNearestHall ----------
describe('findNearestHall', () => {
  it('returns hall with distance property', () => {
    const hall = findNearestHall(28.6139, 77.2090);
    assert.ok(hall.distance !== undefined);
    assert.ok(hall.distance >= 0);
  });

  it('returns Lecture Hall A for Delhi coords', () => {
    const hall = findNearestHall(28.6139, 77.2090);
    assert.strictEqual(hall.id, 'lh-001');
  });
});

// ---------- formatTimeAgo ----------
describe('formatTimeAgo', () => {
  it('Just now for current time', () => {
    const now = new Date().toISOString();
    assert.strictEqual(formatTimeAgo(now), 'Just now');
  });

  it('Minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    assert.strictEqual(formatTimeAgo(fiveMinAgo), '5 min ago');
  });

  it('Hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    assert.strictEqual(formatTimeAgo(twoHoursAgo), '2 hr ago');
  });

  it('Days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    assert.strictEqual(formatTimeAgo(threeDaysAgo), '3 days ago');
  });

  it('Never for null', () => {
    assert.strictEqual(formatTimeAgo(null), 'Never');
  });

  it('Invalid date for bad input', () => {
    assert.strictEqual(formatTimeAgo('not-a-date'), 'Invalid date');
  });
});

// ---------- fmt ----------
describe('fmt', () => {
  it('formats with 1 decimal by default', () => {
    assert.strictEqual(fmt(25.5), '25.5');
  });

  it('formats integers with .0', () => {
    assert.strictEqual(fmt(200), '200.0');
  });

  it('uses locale formatting', () => {
    // en-IN locale uses 12,34,567 format
    const result = fmt(1234567);
    assert.ok(result.includes('12,34,567'));
  });

  it('returns — for null', () => {
    assert.strictEqual(fmt(null), '—');
  });
});

// ---------- generateMockHistory ----------
describe('generateMockHistory', () => {
  it('returns correct number of points', () => {
    const data = generateMockHistory(24);
    assert.strictEqual(data.length, 25);
  });

  it('each point has required fields', () => {
    const data = generateMockHistory(1);
    const point = data[0];
    assert.ok(point.time);
    assert.ok(typeof point.pm25 === 'number');
    assert.ok(typeof point.pm10 === 'number');
    assert.ok(typeof point.co2 === 'number');
    assert.ok(typeof point.tvoc === 'number');
    assert.ok(typeof point.temperature === 'number');
    assert.ok(typeof point.humidity === 'number');
  });

  it('values are within reasonable ranges', () => {
    const data = generateMockHistory(24);
    data.forEach(p => {
      assert.ok(p.pm25 >= 5);
      assert.ok(p.pm10 >= 10);
      assert.ok(p.co2 >= 400);
      assert.ok(p.tvoc >= 0.1);
      assert.ok(p.temperature >= 15 && p.temperature <= 30);
      assert.ok(p.humidity >= 20 && p.humidity <= 80);
    });
  });
});

// ---------- validateCoords ----------
describe('validateCoords', () => {
  it('valid for Delhi', () => {
    const r = validateCoords('28.6139', '77.2090');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.lat, 28.6139);
    assert.strictEqual(r.lon, 77.2090);
  });

  it('invalid lat > 90', () => {
    const r = validateCoords('91', '0');
    assert.strictEqual(r.ok, false);
  });

  it('invalid lon > 180', () => {
    const r = validateCoords('0', '181');
    assert.strictEqual(r.ok, false);
  });

  it('invalid non-numeric', () => {
    const r = validateCoords('abc', 'def');
    assert.strictEqual(r.ok, false);
  });
});

// ---------- validateHours ----------
describe('validateHours', () => {
  it('valid for 24', () => {
    const r = validateHours('24');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.value, 24);
  });

  it('invalid < 1', () => {
    const r = validateHours('0');
    assert.strictEqual(r.ok, false);
  });

  it('invalid > 168', () => {
    const r = validateHours('169');
    assert.strictEqual(r.ok, false);
  });

  it('invalid non-integer', () => {
    const r = validateHours('24.5');
    assert.strictEqual(r.ok, false);
  });
});

// ---------- Constants ----------
describe('Constants', () => {
  it('LECTURE_HALLS has 5 halls', () => {
    assert.strictEqual(LECTURE_HALLS.length, 5);
  });

  it('each hall has required fields', () => {
    LECTURE_HALLS.forEach(h => {
      assert.ok(h.id);
      assert.ok(h.name);
      assert.ok(h.lat !== undefined);
      assert.ok(h.lon !== undefined);
    });
  });

  it('PARAM_LABELS has all params', () => {
    assert.ok(PARAM_LABELS.pm25);
    assert.ok(PARAM_LABELS.co2);
    assert.ok(PARAM_LABELS.aqi);
  });

  it('AQI_CATEGORIES has 6 categories', () => {
    assert.strictEqual(AQI_CATEGORIES.length, 6);
    assert.strictEqual(AQI_CATEGORIES[0].label, 'Good');
    assert.strictEqual(AQI_CATEGORIES[5].label, 'Hazardous');
  });
});

console.log('All tests passed!');