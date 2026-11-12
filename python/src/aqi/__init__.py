"""Lecture Hall Air Quality - Python package for CLI and analysis."""
from .core import (
    calculate_aqi,
    get_aqi_category,
    get_parameter_status,
    get_ventilation_status,
    haversine_distance,
    find_nearest_hall,
    LECTURE_HALLS,
    PARAM_LABELS,
    PARAM_UNITS,
    AQI_BREAKPOINTS,
    AQI_CATEGORIES,
    PARAM_THRESHOLDS,
)
from .cli import main

__version__ = "1.0.0"
__all__ = [
    "calculate_aqi", "get_aqi_category", "get_parameter_status",
    "get_ventilation_status", "haversine_distance", "find_nearest_hall",
    "LECTURE_HALLS", "PARAM_LABELS", "PARAM_UNITS",
    "AQI_BREAKPOINTS", "AQI_CATEGORIES", "PARAM_THRESHOLDS",
    "main",
]