"""Core air quality maths - shared by CLI, web UI (via JS port), and tests."""

from math import pi, sin, cos, sqrt, atan2, log
from dataclasses import dataclass
from typing import Optional

# Indian lecture halls with coordinates
LECTURE_HALLS = [
    {"id": "lh-001", "name": "Lecture Hall A", "building": "Engineering Block", "floor": "Ground Floor", "capacity": 120, "lat": 28.6139, "lon": 77.2090},
    {"id": "lh-002", "name": "Lecture Hall B", "building": "Engineering Block", "floor": "First Floor", "capacity": 100, "lat": 28.6145, "lon": 77.2095},
    {"id": "lh-003", "name": "Lecture Hall C", "building": "Science Block", "floor": "Second Floor", "capacity": 80, "lat": 28.6150, "lon": 77.2100},
    {"id": "lh-004", "name": "Auditorium", "building": "Main Building", "floor": "Ground Floor", "capacity": 300, "lat": 28.6125, "lon": 77.2080},
    {"id": "lh-005", "name": "Seminar Hall 1", "building": "Management Block", "floor": "Third Floor", "capacity": 60, "lat": 28.6160, "lon": 77.2110},
]

PARAM_LABELS = {
    "pm25": "PM2.5", "pm10": "PM10", "co2": "CO₂",
    "tvoc": "TVOC", "temperature": "Temperature", "humidity": "Humidity", "aqi": "AQI"
}

PARAM_UNITS = {
    "pm25": "µg/m³", "pm10": "µg/m³", "co2": "ppm",
    "tvoc": "mg/m³", "temperature": "°C", "humidity": "%", "aqi": ""
}

# AQI breakpoints (EPA method)
AQI_BREAKPOINTS = {
    "pm25": [
        {"cLow": 0, "cHigh": 12.0, "iLow": 0, "iHigh": 50},
        {"cLow": 12.1, "cHigh": 35.4, "iLow": 51, "iHigh": 100},
        {"cLow": 35.5, "cHigh": 55.4, "iLow": 101, "iHigh": 150},
        {"cLow": 55.5, "cHigh": 150.4, "iLow": 151, "iHigh": 200},
        {"cLow": 150.5, "cHigh": 250.4, "iLow": 201, "iHigh": 300},
        {"cLow": 250.5, "cHigh": 500.4, "iLow": 301, "iHigh": 500},
    ],
    "pm10": [
        {"cLow": 0, "cHigh": 54, "iLow": 0, "iHigh": 50},
        {"cLow": 55, "cHigh": 154, "iLow": 51, "iHigh": 100},
        {"cLow": 155, "cHigh": 254, "iLow": 101, "iHigh": 150},
        {"cLow": 255, "cHigh": 354, "iLow": 151, "iHigh": 200},
        {"cLow": 355, "cHigh": 424, "iLow": 201, "iHigh": 300},
        {"cLow": 425, "cHigh": 604, "iLow": 301, "iHigh": 500},
    ],
}

AQI_CATEGORIES = [
    {"max": 50, "label": "Good", "color": "green", "desc": "Air quality is satisfactory"},
    {"max": 100, "label": "Moderate", "color": "amber", "desc": "Acceptable, but sensitive individuals may experience effects"},
    {"max": 150, "label": "Unhealthy for Sensitive Groups", "color": "amber", "desc": "Sensitive groups may experience health effects"},
    {"max": 200, "label": "Unhealthy", "color": "red", "desc": "Everyone may experience health effects"},
    {"max": 300, "label": "Very Unhealthy", "color": "purple", "desc": "Health alert: everyone may experience serious effects"},
    {"max": 500, "label": "Hazardous", "color": "red", "desc": "Health emergency: entire population affected"},
]

PARAM_THRESHOLDS = {
    "pm25": {"good": 12, "moderate": 35.4, "unhealthy": 55.4},
    "pm10": {"good": 54, "moderate": 154, "unhealthy": 254},
    "co2": {"good": 800, "moderate": 1000, "unhealthy": 1500},
    "tvoc": {"good": 0.3, "moderate": 0.5, "unhealthy": 1},
}


def _calc_sub_index(concentration: float, breakpoints: list) -> int:
    """Calculate AQI sub-index using EPA linear interpolation."""
    if concentration is None or concentration > 500:
        return 500 if concentration and concentration > 500 else 0
    bp = next((b for b in breakpoints if b["cLow"] <= concentration <= b["cHigh"]), None)
    if not bp:
        return 500 if concentration > 500 else 0
    return round(
        ((bp["iHigh"] - bp["iLow"]) / (bp["cHigh"] - bp["cLow"]))
        * (concentration - bp["cLow"]) + bp["iLow"]
    )


def calculate_aqi(pm25: Optional[float], pm10: Optional[float]) -> Optional[int]:
    """Calculate overall AQI from PM2.5 and PM10 using EPA method."""
    if pm25 is None and pm10 is None:
        return None
    aqi25 = _calc_sub_index(pm25, AQI_BREAKPOINTS["pm25"]) if pm25 is not None else 0
    aqi10 = _calc_sub_index(pm10, AQI_BREAKPOINTS["pm10"]) if pm10 is not None else 0
    return max(aqi25, aqi10)


def get_aqi_category(aqi: Optional[int]) -> dict:
    """Get AQI category info from AQI value."""
    if aqi is None:
        return AQI_CATEGORIES[0]
    return next((c for c in AQI_CATEGORIES if aqi <= c["max"]), AQI_CATEGORIES[-1])


def get_parameter_status(param: str, value: Optional[float]) -> dict:
    """Get parameter status (Good/Moderate/Unhealthy/Optimal/Acceptable/Poor)."""
    if value is None:
        return {"label": "No Data", "class": "", "desc": "No data available"}

    if param == "temperature":
        if 20 <= value <= 24:
            return {"label": "Optimal", "class": "good", "desc": "Comfortable range"}
        if 18 <= value <= 26:
            return {"label": "Acceptable", "class": "warn", "desc": "Slightly outside comfort range"}
        return {"label": "Poor", "class": "bad", "desc": "Outside comfort range"}

    if param == "humidity":
        if 30 <= value <= 60:
            return {"label": "Optimal", "class": "good", "desc": "Comfortable range"}
        if 20 <= value <= 70:
            return {"label": "Acceptable", "class": "warn", "desc": "Slightly dry/humid"}
        return {"label": "Poor", "class": "bad", "desc": "Too dry or too humid"}

    t = PARAM_THRESHOLDS.get(param)
    if not t:
        return {"label": "Unknown", "class": "", "desc": ""}

    if value <= t["good"]:
        return {"label": "Good", "class": "good", "desc": "Within healthy limits"}
    if value <= t["moderate"]:
        return {"label": "Moderate", "class": "warn", "desc": "Approaching limits"}
    return {"label": "Unhealthy", "class": "bad", "desc": "Exceeds healthy limits"}


@dataclass
class VentilationStatus:
    level: str          # "critical", "needed", "good"
    label: str
    desc: str
    class_: str
    fan_speed: int


def get_ventilation_status(data: dict) -> VentilationStatus:
    """Determine ventilation recommendation from air quality data."""
    co2 = data.get("co2")
    pm25 = data.get("pm25")
    aqi = data.get("aqi")

    critical = (co2 and co2 > 1500) or (pm25 and pm25 > 55) or (aqi and aqi > 150)
    needed = (co2 and co2 > 1000) or (pm25 and pm25 > 35) or (aqi and aqi > 100)

    if critical:
        return VentilationStatus(
            level="critical", label="Critical - Ventilate Immediately",
            desc="CO₂, PM2.5, or AQI exceeds unhealthy thresholds",
            class_="bad", fan_speed=100
        )
    if needed:
        return VentilationStatus(
            level="needed", label="Ventilation Recommended",
            desc="Consider increasing fresh air intake",
            class_="warn", fan_speed=70
        )
    return VentilationStatus(
        level="good", label="Air Quality Good",
        desc="Current ventilation is adequate",
        class_="good", fan_speed=30
    )


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two lat/lon points in km."""
    R = 6371
    dlat = (lat2 - lat1) * pi / 180
    dlon = (lon2 - lon1) * pi / 180
    a = sin(dlat/2)**2 + cos(lat1 * pi/180) * cos(lat2 * pi/180) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))


def find_nearest_hall(lat: float, lon: float) -> dict:
    """Find nearest lecture hall to given coordinates."""
    nearest = min(LECTURE_HALLS, key=lambda h: haversine_distance(lat, lon, h["lat"], h["lon"]))
    return {**nearest, "distance": haversine_distance(lat, lon, nearest["lat"], nearest["lon"])}