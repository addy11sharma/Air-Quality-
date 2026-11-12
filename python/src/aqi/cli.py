"""CLI for Lecture Hall Air Quality Monitor."""
import argparse
import json
import sys
from typing import Optional

from .core import (
    calculate_aqi, get_aqi_category, get_parameter_status,
    get_ventilation_status, haversine_distance, find_nearest_hall,
    LECTURE_HALLS, PARAM_LABELS, PARAM_UNITS
)


def cmd_optimize(args):
    """Calculate AQI from PM2.5 and PM10."""
    aqi = calculate_aqi(args.pm25, args.pm10)
    if aqi is None:
        print("Error: Provide at least one of --pm25 or --pm10", file=sys.stderr)
        sys.exit(1)
    cat = get_aqi_category(aqi)
    print(f"AQI: {aqi} ({cat['label']})")
    print(f"Description: {cat['desc']}")


def cmd_status(args):
    """Get parameter status for a value."""
    status = get_parameter_status(args.param, args.value)
    unit = PARAM_UNITS.get(args.param, "")
    print(f"{PARAM_LABELS.get(args.param, args.param)}: {args.value} {unit}")
    print(f"Status: {status['label']} ({status['desc']})")


def cmd_ventilation(args):
    """Get ventilation recommendation."""
    data = {"co2": args.co2, "pm25": args.pm25, "aqi": args.aqi}
    vent = get_ventilation_status(data)
    print(f"Level: {vent.level.upper()}")
    print(f"Recommendation: {vent.label}")
    print(f"Details: {vent.desc}")
    print(f"Suggested fan speed: {vent.fan_speed}%")


def cmd_nearest(args):
    """Find nearest lecture hall."""
    hall = find_nearest_hall(args.lat, args.lon)
    print(f"Nearest: {hall['name']} ({hall['building']}, {hall['floor']})")
    print(f"Distance: {hall['distance']:.1f} km")
    print(f"Coordinates: {hall['lat']}, {hall['lon']}")


def cmd_list_halls(args):
    """List all lecture halls."""
    for h in LECTURE_HALLS:
        print(f"{h['id']}: {h['name']} ({h['building']}, {h['floor']}) - {h['capacity']} capacity")


def cmd_mock_data(args):
    """Generate mock air quality data for a hall."""
    from .core import generate_mock_data  # We'll add this
    hall = next((h for h in LECTURE_HALLS if h["id"] == args.hall_id), LECTURE_HALLS[0])
    # Simple mock
    import random
    pm25 = 35 + random.random() * 30
    pm10 = 65 + random.random() * 40
    data = {
        "co2": round(550 + random.random() * 300),
        "pm25": round(pm25 * 10) / 10,
        "pm10": round(pm10 * 10) / 10,
        "tvoc": round((0.2 + random.random() * 0.4) * 100) / 100,
        "temperature": round((20 + random.random() * 6) * 10) / 10,
        "humidity": round(35 + random.random() * 30),
        "aqi": calculate_aqi(pm25, pm10),
    }
    if args.json:
        print(json.dumps(data, indent=2))
    else:
        for k, v in data.items():
            unit = PARAM_UNITS.get(k, "")
            label = PARAM_LABELS.get(k, k)
            status = get_parameter_status(k, v)
            print(f"{label}: {v} {unit} [{status['label']}]")


def main():
    parser = argparse.ArgumentParser(
        prog="aq-monitor",
        description="Lecture Hall Air Quality Monitor - CLI for CPCB/SAFAR data analysis"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # aqi
    p = sub.add_parser("aqi", help="Calculate AQI from PM2.5/PM10")
    p.add_argument("--pm25", type=float, help="PM2.5 concentration (µg/m³)")
    p.add_argument("--pm10", type=float, help="PM10 concentration (µg/m³)")
    p.set_defaults(func=cmd_optimize)

    # status
    p = sub.add_parser("status", help="Get parameter status")
    p.add_argument("param", choices=list(PARAM_LABELS.keys()), help="Parameter name")
    p.add_argument("value", type=float, help="Parameter value")
    p.set_defaults(func=cmd_status)

    # ventilation
    p = sub.add_parser("ventilation", help="Get ventilation recommendation")
    p.add_argument("--co2", type=float, help="CO₂ ppm")
    p.add_argument("--pm25", type=float, help="PM2.5 µg/m³")
    p.add_argument("--aqi", type=int, help="AQI value")
    p.set_defaults(func=cmd_ventilation)

    # nearest
    p = sub.add_parser("nearest", help="Find nearest lecture hall")
    p.add_argument("lat", type=float, help="Latitude")
    p.add_argument("lon", type=float, help="Longitude")
    p.set_defaults(func=cmd_nearest)

    # list-halls
    p = sub.add_parser("list-halls", help="List all lecture halls")
    p.set_defaults(func=cmd_list_halls)

    # mock-data
    p = sub.add_parser("mock-data", help="Generate mock data for a hall")
    p.add_argument("--hall-id", default="lh-001", help="Hall ID")
    p.add_argument("--json", action="store_true", help="Output as JSON")
    p.set_defaults(func=cmd_mock_data)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()