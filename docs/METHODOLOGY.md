# Air Quality Index Methodology

## Overview

The Air Quality Index (AQI) is calculated using the **EPA (US Environmental Protection Agency) method** based on PM2.5 and PM10 concentrations. This is the same methodology used by the Indian CPCB (Central Pollution Control Board) for their National Air Quality Index (NAQI).

## Calculation Method

### 1. Sub-index Calculation

For each pollutant (PM2.5, PM10), a sub-index is calculated using linear interpolation between breakpoint concentrations:

```
I = ((I_high - I_low) / (C_high - C_low)) × (C - C_low) + I_low
```

Where:
- `I` = Sub-index for the pollutant
- `C` = Measured concentration
- `C_low`, `C_high` = Breakpoint concentrations bracketing `C`
- `I_low`, `I_high` = Corresponding AQI values for the breakpoints

### 2. Breakpoint Tables

**PM2.5 (µg/m³)**

| C_low | C_high | I_low | I_high | Category |
|-------|--------|-------|--------|----------|
| 0     | 12.0   | 0     | 50     | Good |
| 12.1  | 35.4   | 51    | 100    | Moderate |
| 35.5  | 55.4   | 101   | 150    | Unhealthy for Sensitive Groups |
| 55.5  | 150.4  | 151   | 200    | Unhealthy |
| 150.5 | 250.4  | 201   | 300    | Very Unhealthy |
| 250.5 | 500.4  | 301   | 500    | Hazardous |

**PM10 (µg/m³)**

| C_low | C_high | I_low | I_high | Category |
|-------|--------|-------|--------|----------|
| 0     | 54     | 0     | 50     | Good |
| 55    | 154    | 51    | 100    | Moderate |
| 155   | 254    | 101   | 150    | Unhealthy for Sensitive Groups |
| 255   | 354    | 151   | 200    | Unhealthy |
| 355   | 424    | 201   | 300    | Very Unhealthy |
| 425   | 604    | 301   | 500    | Hazardous |

### 3. Overall AQI

The overall AQI is the **maximum** of all pollutant sub-indices:

```
AQI = max(PM2.5_subindex, PM10_subindex)
```

This ensures the worst pollutant determines the overall air quality rating.

## AQI Categories

| AQI Range | Category | Color | Health Implications |
|-----------|----------|-------|---------------------|
| 0-50 | Good | Green | Air quality is satisfactory |
| 51-100 | Moderate | Yellow | Acceptable; sensitive individuals may experience effects |
| 101-150 | Unhealthy for Sensitive Groups | Orange | Sensitive groups may experience health effects |
| 151-200 | Unhealthy | Red | Everyone may experience health effects |
| 201-300 | Very Unhealthy | Purple | Health alert: serious effects for everyone |
| 301-500 | Hazardous | Maroon | Health emergency: entire population affected |

## Parameter-Specific Thresholds

### CO₂ (ppm)
- **Good**: ≤ 800 ppm
- **Moderate**: 801-1000 ppm
- **Unhealthy**: > 1000 ppm
- **Critical**: > 1500 ppm

*Based on ASHRAE 62.1 and indoor air quality guidelines. Above 1000 ppm indicates inadequate ventilation.*

### TVOC (mg/m³)
- **Good**: ≤ 0.3 mg/m³
- **Moderate**: 0.31-0.5 mg/m³
- **Unhealthy**: > 0.5 mg/m³

### Temperature (°C)
- **Optimal**: 20-24°C
- **Acceptable**: 18-26°C
- **Poor**: Outside 18-26°C

### Humidity (%)
- **Optimal**: 30-60%
- **Acceptable**: 20-70%
- **Poor**: Outside 20-70%

## Ventilation Logic

| Condition | Level | Fan Speed | Action |
|-----------|-------|-----------|--------|
| CO₂ > 1500 OR PM2.5 > 55 OR AQI > 150 | Critical | 100% | Immediate ventilation required |
| CO₂ > 1000 OR PM2.5 > 35 OR AQI > 100 | Needed | 70% | Increase fresh air intake |
| All parameters normal | Good | 30% | Maintain current ventilation |

## Data Sources

### Primary: OpenAQ API
- Aggregates data from **CPCB** (Central Pollution Control Board) continuous monitoring stations
- Includes **SAFAR** (System of Air Quality and Weather Forecasting And Research) stations
- 100+ stations across major Indian cities
- Parameters: PM2.5, PM10, CO₂, NO₂, SO₂, O₃, CO, Temperature, Humidity
- Free tier: 1000 requests/day (API key recommended for higher limits)

### Fallback: Simulated Data
When API is unavailable, realistic simulated data is generated with:
- Diurnal patterns (peak at noon, lower at night)
- Realistic ranges for each parameter
- Gaussian noise for authenticity

## Validation

Both JavaScript (`tests/aq-core.test.js`) and Python (`python/tests/test_core.py`) test suites verify:

1. AQI calculation matches EPA reference values
2. Category boundaries are correct
3. Parameter status thresholds work as expected
4. Ventilation logic triggers at correct levels
5. Haversine distance calculations are accurate
6. Historical data generation produces valid ranges

## References

- EPA: "Technical Assistance Document for the Reporting of Daily Air Quality - the Air Quality Index (AQI)" (2018)
- CPCB: "National Air Quality Index" (NAQI) methodology
- ASHRAE Standard 62.1: "Ventilation for Acceptable Indoor Air Quality"
- WHO: "Air quality guidelines for particulate matter, ozone, nitrogen dioxide and sulfur dioxide" (2021)