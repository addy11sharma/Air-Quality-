"""Python tests for aqi.core - mirrors JS tests."""
import pytest
from aqi.core import (
    calculate_aqi, get_aqi_category, get_parameter_status,
    get_ventilation_status, haversine_distance, find_nearest_hall,
    LECTURE_HALLS, PARAM_LABELS, PARAM_UNITS, AQI_CATEGORIES
)


class TestCalculateAQI:
    def test_zero_concentration(self):
        assert calculate_aqi(0, 0) == 0

    def test_good_range(self):
        aqi = calculate_aqi(10, 20)
        assert aqi <= 50

    def test_moderate_range(self):
        aqi = calculate_aqi(25, 50)
        assert 51 <= aqi <= 100

    def test_unhealthy_sensitive(self):
        aqi = calculate_aqi(40, 80)
        assert 101 <= aqi <= 150

    def test_unhealthy(self):
        aqi = calculate_aqi(60, 120)
        assert 151 <= aqi <= 200

    def test_max_of_pm25_pm10(self):
        aqi1 = calculate_aqi(30, 200)
        aqi2 = calculate_aqi(200, 30)
        assert aqi1 > 0 and aqi2 > 0
        assert aqi2 > aqi1

    def test_none_handling(self):
        aqi1 = calculate_aqi(None, 50)
        aqi2 = calculate_aqi(50, None)
        assert aqi1 > 0
        assert aqi2 > 0
        assert aqi1 != aqi2


class TestAQICategory:
    def test_good(self):
        cat = get_aqi_category(25)
        assert cat["label"] == "Good"
        assert cat["color"] == "green"

    def test_moderate(self):
        cat = get_aqi_category(75)
        assert cat["label"] == "Moderate"
        assert cat["color"] == "amber"

    def test_unhealthy_sensitive(self):
        cat = get_aqi_category(125)
        assert cat["label"] == "Unhealthy for Sensitive Groups"

    def test_unhealthy(self):
        cat = get_aqi_category(175)
        assert cat["label"] == "Unhealthy"
        assert cat["color"] == "red"

    def test_very_unhealthy(self):
        cat = get_aqi_category(250)
        assert cat["label"] == "Very Unhealthy"
        assert cat["color"] == "purple"

    def test_hazardous(self):
        cat = get_aqi_category(400)
        assert cat["label"] == "Hazardous"


class TestParameterStatus:
    def test_pm25_good(self):
        s = get_parameter_status("pm25", 10)
        assert s["label"] == "Good"
        assert s["class"] == "good"

    def test_pm25_moderate(self):
        s = get_parameter_status("pm25", 25)
        assert s["label"] == "Moderate"
        assert s["class"] == "warn"

    def test_pm25_unhealthy(self):
        s = get_parameter_status("pm25", 50)
        assert s["label"] == "Unhealthy"
        assert s["class"] == "bad"

    def test_co2_good(self):
        s = get_parameter_status("co2", 700)
        assert s["label"] == "Good"

    def test_co2_moderate(self):
        s = get_parameter_status("co2", 900)
        assert s["label"] == "Moderate"

    def test_co2_unhealthy(self):
        s = get_parameter_status("co2", 1500)
        assert s["label"] == "Unhealthy"

    def test_temperature_optimal(self):
        s = get_parameter_status("temperature", 22)
        assert s["label"] == "Optimal"

    def test_temperature_acceptable(self):
        s = get_parameter_status("temperature", 25)
        assert s["label"] == "Acceptable"

    def test_humidity_optimal(self):
        s = get_parameter_status("humidity", 50)
        assert s["label"] == "Optimal"

    def test_none_returns_no_data(self):
        s = get_parameter_status("pm25", None)
        assert s["label"] == "No Data"


class TestVentilationStatus:
    def test_critical_co2(self):
        v = get_ventilation_status({"co2": 1600, "pm25": 20, "aqi": 50})
        assert v.level == "critical"
        assert v.fan_speed == 100

    def test_critical_pm25(self):
        v = get_ventilation_status({"co2": 600, "pm25": 60, "aqi": 50})
        assert v.level == "critical"

    def test_critical_aqi(self):
        v = get_ventilation_status({"co2": 600, "pm25": 20, "aqi": 160})
        assert v.level == "critical"

    def test_needed_co2(self):
        v = get_ventilation_status({"co2": 1200, "pm25": 20, "aqi": 50})
        assert v.level == "needed"
        assert v.fan_speed == 70

    def test_good_all_normal(self):
        v = get_ventilation_status({"co2": 600, "pm25": 20, "aqi": 50})
        assert v.level == "good"
        assert v.fan_speed == 30


class TestHaversineDistance:
    def test_delhi_to_mumbai(self):
        d = haversine_distance(28.6139, 77.2090, 19.0760, 72.8777)
        assert 1100 < d < 1200

    def test_zero_same_point(self):
        assert haversine_distance(28.6139, 77.2090, 28.6139, 77.2090) == 0


class TestFindNearestHall:
    def test_returns_hall_with_distance(self):
        hall = find_nearest_hall(28.6139, 77.2090)
        assert "distance" in hall
        assert hall["distance"] >= 0

    def test_delhi_returns_lh001(self):
        hall = find_nearest_hall(28.6139, 77.2090)
        assert hall["id"] == "lh-001"


class TestConstants:
    def test_five_halls(self):
        assert len(LECTURE_HALLS) == 5

    def test_each_hall_has_fields(self):
        for h in LECTURE_HALLS:
            assert "id" in h
            assert "name" in h
            assert "lat" in h
            assert "lon" in h

    def test_param_labels(self):
        assert PARAM_LABELS["pm25"] == "PM2.5"
        assert PARAM_LABELS["co2"] == "CO₂"
        assert PARAM_LABELS["aqi"] == "AQI"

    def test_aqi_categories(self):
        assert len(AQI_CATEGORIES) == 6
        assert AQI_CATEGORIES[0]["label"] == "Good"
        assert AQI_CATEGORIES[-1]["label"] == "Hazardous"