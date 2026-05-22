"""
Enhanced API Routes for EV Charging Scheduler
Includes ML-powered station recommendations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import random
import math
import json
from datetime import datetime, timedelta
import joblib
import os
import numpy as np

router = APIRouter()

# Load ML models
MODELS_LOADED = False
demand_model = None
range_model = None
grid_model = None

try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(current_dir, '..', 'ml_models')
    
    print(f"Loading models from: {os.path.abspath(MODELS_DIR)}")
    
    demand_model = joblib.load(os.path.join(MODELS_DIR, 'demand_predictor.pkl'))
    print("  ✓ Demand predictor loaded")
    
    range_model = joblib.load(os.path.join(MODELS_DIR, 'range_predictor.pkl'))
    print("  ✓ Range predictor loaded")
    
    grid_model = joblib.load(os.path.join(MODELS_DIR, 'grid_load_forecaster.pkl'))
    print("  ✓ Grid forecaster loaded")
    
    MODELS_LOADED = True
    print("✓ All ML models loaded successfully")
except Exception as e:
    print(f"⚠ ML models not loaded: {e}")
    print(f"  Will use fallback calculations")
    MODELS_LOADED = False

# ============== Pydantic Models ==============

class Location(BaseModel):
    latitude: float
    longitude: float

class RangePredictionRequest(BaseModel):
    battery_level: float
    battery_capacity: float
    vehicle_model: str
    driving_conditions: Optional[str] = "normal"
    weather_condition: Optional[str] = "clear"

class StationRequest(BaseModel):
    location: Location
    radius_km: Optional[float] = 10.0

class ScheduleRequest(BaseModel):
    location: Location
    required_charge: float
    preferred_time: Optional[str] = None

class RecommendationRequest(BaseModel):
    current_location: Location
    battery_level: float
    battery_capacity: float
    vehicle_model: str
    speed: Optional[float] = 60.0
    driving_conditions: Optional[str] = "normal"
    weather_condition: Optional[str] = "clear"

class BookingRequest(BaseModel):
    station_id: int
    time_slot: str
    duration_minutes: int

# ============== Load Real Data ==============

# Load real charging stations from JSON
REAL_STATIONS = []
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(current_dir, '..', 'data', 'real_charging_stations.json')
    with open(data_file, 'r', encoding='utf-8') as f:
        REAL_STATIONS = json.load(f)
    print(f"✓ Loaded {len(REAL_STATIONS)} real charging stations")
except Exception as e:
    print(f"⚠ Could not load real stations: {e}")
    # Fallback to mock data
    REAL_STATIONS = MOCK_STATIONS

# Use real stations as the primary data source
MOCK_STATIONS = REAL_STATIONS if REAL_STATIONS else MOCK_STATIONS

def get_grid_load_data():
    """Generate grid load data using ML model or fallback"""
    hour = datetime.now().hour
    day = datetime.now().weekday()
    month = datetime.now().month

    if MODELS_LOADED and grid_model is not None:
        try:
            features = np.array([[hour, day, month, 30]])
            load_percentage = float(grid_model.predict(features)[0])
        except:
            load_percentage = random.uniform(40, 80)
    else:
        if 9 <= hour <= 12 or 18 <= hour <= 22:
            load_percentage = random.uniform(75, 95)
        else:
            load_percentage = random.uniform(30, 60)

    load_percentage = float(np.clip(load_percentage, 20, 95))
    price_multiplier = 1.5 if load_percentage > 80 else 1.0 if load_percentage > 50 else 0.8

    return {
        "current_load_percentage": round(load_percentage, 2),
        "status": "high" if load_percentage > 80 else "medium" if load_percentage > 50 else "low",
        "price_multiplier": float(price_multiplier),
        "recommended_charging": bool(load_percentage < 70),
        "timestamp": datetime.now().isoformat()
    }

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance using Haversine formula"""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# ============== API Endpoints ==============

@router.get("/stations/nearby")
async def get_nearby_stations(
    latitude: float,
    longitude: float,
    radius_km: float = 10.0
):
    """Find nearest charging stations based on location"""
    stations_with_distance = []
    for station in MOCK_STATIONS:
        distance = calculate_distance(latitude, longitude, station["latitude"], station["longitude"])
        if distance <= radius_km:
            station_data = station.copy()
            station_data["distance_km"] = round(distance, 2)
            stations_with_distance.append(station_data)
    
    stations_with_distance.sort(key=lambda x: x["distance_km"])
    
    return {
        "count": len(stations_with_distance),
        "search_radius_km": radius_km,
        "location": {"latitude": latitude, "longitude": longitude},
        "stations": stations_with_distance
    }

@router.post("/predict/range")
async def predict_range(request: RangePredictionRequest):
    """Predict how far the EV can travel with current charge using ML model, factoring in weather"""
    weather_multiplier = {
        "clear": 1.0,
        "rain": 0.88,
        "cold": 0.80,
        "hot": 0.95
    }.get(request.weather_condition.lower(), 1.0)

    if MODELS_LOADED and range_model is not None:
        try:
            driving_conditions = request.driving_conditions.lower()
            features = np.array([[
                request.battery_level,
                request.battery_capacity,
                1 if driving_conditions == 'normal' else 0,
                1 if driving_conditions == 'highway' else 0,
                1 if driving_conditions == 'city' else 0
            ]])
            
            predicted_range = float(range_model.predict(features)[0])
            usable_energy = (request.battery_level / 100) * request.battery_capacity
            efficiency = predicted_range / usable_energy if usable_energy > 0 else 0
            
        except Exception as e:
            base_efficiency = {"normal": 6.5, "highway": 5.5, "city": 7.0}
            efficiency = base_efficiency.get(request.driving_conditions, 6.5)
            predicted_range = (request.battery_level / 100) * request.battery_capacity * efficiency
    else:
        base_efficiency = {"normal": 6.5, "highway": 5.5, "city": 7.0}
        efficiency = base_efficiency.get(request.driving_conditions, 6.5)
        predicted_range = (request.battery_level / 100) * request.battery_capacity * efficiency
    
    # Apply weather penalty
    efficiency *= weather_multiplier
    predicted_range *= weather_multiplier
    
    return {
        "vehicle_model": request.vehicle_model,
        "battery_level": request.battery_level,
        "battery_capacity": request.battery_capacity,
        "driving_conditions": request.driving_conditions,
        "weather_condition": request.weather_condition,
        "predicted_range_km": round(predicted_range, 2),
        "efficiency_km_per_kwh": round(efficiency, 2),
        "weather_impact_percent": round((1.0 - weather_multiplier) * 100, 1),
        "model_used": MODELS_LOADED,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/predict/demand")
async def predict_demand(request: StationRequest):
    """Predict charging station demand using ML model"""
    hour = datetime.now().hour
    day = datetime.now().weekday()
    is_weekend = 1 if day >= 5 else 0
    is_peak = 1 if 9 <= hour <= 12 or 18 <= hour <= 22 else 0
    
    predictions = []
    for station in MOCK_STATIONS:
        if MODELS_LOADED and demand_model is not None:
            try:
                features = np.array([[day, hour, is_weekend, is_peak]])
                demand_kwh = float(demand_model.predict(features)[0])
                demand_percentage = min(100, max(0, demand_kwh))
            except:
                demand_percentage = random.uniform(30, 80)
        else:
            if 8 <= hour <= 10 or 17 <= hour <= 20:
                demand_percentage = random.uniform(70, 90)
            elif 12 <= hour <= 14:
                demand_percentage = random.uniform(40, 60)
            else:
                demand_percentage = random.uniform(20, 40)
        
        wait_time = int((demand_percentage / 100) * 45)
        
        predictions.append({
            "station_id": station["id"],
            "station_name": station["name"],
            "predicted_demand_percentage": round(float(demand_percentage), 2),
            "predicted_wait_time_minutes": wait_time,
            "recommended": bool(demand_percentage < 50),
            "time_slot": "next_2_hours"
        })
    
    return {
        "location": request.location.dict(),
        "predictions": predictions,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/stations/recommend")
async def recommend_stations(request: RecommendationRequest):
    """
    ML-powered station recommendations
    Uses all 3 ML models for smart scoring
    """
    if not MODELS_LOADED:
        raise HTTPException(status_code=503, detail="ML models not loaded")
    
    try:
        # Get ML predictions
        # 1. Range prediction
        driving = request.driving_conditions.lower()
        range_features = np.array([[
            request.battery_level,
            request.battery_capacity,
            1 if driving == 'normal' else 0,
            1 if driving == 'highway' else 0,
            1 if driving == 'city' else 0
        ]])
        range_pred = float(range_model.predict(range_features)[0])
        efficiency = range_pred / ((request.battery_level / 100) * request.battery_capacity)
        
        # 2. Grid load forecast
        hour = datetime.now().hour
        day = datetime.now().weekday()
        month = datetime.now().month
        grid_features = np.array([[hour, day, month, 30]])
        grid_load = float(grid_model.predict(grid_features)[0])
        grid_load = float(np.clip(grid_load, 20, 95))
        
        # 3. Demand predictions for each station
        is_weekend = 1 if day >= 5 else 0
        is_peak = 1 if 9 <= hour <= 12 or 18 <= hour <= 22 else 0
        demand_features = np.array([[day, hour, is_weekend, is_peak]])
        base_demand = float(demand_model.predict(demand_features)[0])
        
        # Process stations
        recommendations = []
        for station in MOCK_STATIONS:
            distance = calculate_distance(
                request.current_location.latitude,
                request.current_location.longitude,
                station["latitude"],
                station["longitude"]
            )
            
            # Calculate metrics
            eta_minutes = int((distance / request.speed) * 60) if request.speed > 0 else 0
            energy_needed = distance / efficiency
            arrival_battery = request.battery_level - (energy_needed / request.battery_capacity) * 100
            
            # Station-specific demand
            station_demand = min(100, base_demand + random.uniform(-10, 10))
            wait_time = int((station_demand / 100) * 45)
            
            # Calculate score
            distance_score = max(0, (1 - distance / 20) * 100)
            availability_score = (station["available_chargers"] / station["total_chargers"]) * 100
            demand_score = 100 - station_demand
            grid_score = 100 - grid_load
            price_score = (1 - station["price_per_kwh"] / 20) * 100
            speed_score = (max(station["power_kw"]) if isinstance(station["power_kw"], list) else station["power_kw"]) / 250 * 100
            
            total_score = (
                distance_score * 0.25 +
                availability_score * 0.20 +
                demand_score * 0.20 +
                grid_score * 0.15 +
                price_score * 0.10 +
                speed_score * 0.10
            )
            
            recommendations.append({
                "station": station,
                "score": round(total_score, 1),
                "score_breakdown": {
                    "distance": round(distance_score, 1),
                    "availability": round(availability_score, 1),
                    "demand": round(demand_score, 1),
                    "grid": round(grid_score, 1),
                    "price": round(price_score, 1),
                    "speed": round(speed_score, 1)
                },
                "distance_km": round(distance, 2),
                "eta_minutes": eta_minutes,
                "arrival_battery_percent": round(max(0, arrival_battery), 1),
                "reachable": arrival_battery > 10,
                "predicted_wait_time_minutes": wait_time,
                "ml_insights": {
                    "range_prediction_km": round(range_pred, 1),
                    "grid_load_percent": round(grid_load, 1),
                    "demand_percent": round(station_demand, 1),
                    "efficiency_km_per_kwh": round(efficiency, 2)
                }
            })
        
        # Sort by score
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "request": request.dict(),
            "ml_models_used": True,
            "recommendations": recommendations,
            "grid_status": {
                "current_load": round(grid_load, 1),
                "status": "high" if grid_load > 80 else "medium" if grid_load > 50 else "low"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction error: {str(e)}")

@router.post("/schedule/optimal")
async def get_optimal_schedule(request: ScheduleRequest):
    """Get optimal charging schedule based on grid load and pricing"""
    current_hour = datetime.now().hour
    grid_data = get_grid_load_data()
    
    optimal_slots = []
    for hour_offset in range(24):
        check_hour = (current_hour + hour_offset) % 24
        
        if MODELS_LOADED and grid_model is not None:
            try:
                day = datetime.now().weekday()
                month = datetime.now().month
                features = np.array([[check_hour, day, month, 30]])
                load = float(grid_model.predict(features)[0])
            except:
                load = random.uniform(40, 80)
        else:
            if 9 <= check_hour <= 12 or 18 <= check_hour <= 22:
                load = random.uniform(75, 95)
            else:
                load = random.uniform(30, 60)
        
        load = float(np.clip(load, 20, 95))
        price_mult = float(1.5 if load > 80 else 1.0 if load > 50 else 0.8)
        
        if load < 70:
            optimal_slots.append({
                "time": f"{check_hour:02d}:00 - {(check_hour + 1) % 24:02d}:00",
                "grid_load": round(load, 2),
                "price_multiplier": price_mult,
                "estimated_cost_savings": round((1.5 - price_mult) * request.required_charge * 0.1, 2)
            })
    
    optimal_slots.sort(key=lambda x: x["grid_load"])
    
    return {
        "current_grid_status": grid_data,
        "required_charge_percentage": float(request.required_charge),
        "optimal_slots": optimal_slots[:5],
        "best_time": optimal_slots[0] if optimal_slots else None,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/grid/load")
async def get_grid_load():
    """Get current grid load status"""
    grid_data = get_grid_load_data()
    
    return {
        **grid_data,
        "region": "Mumbai",
        "renewable_percentage": round(random.uniform(15, 30), 2),
        "forecast_next_6h": [
            {
                "hour": f"{(datetime.now().hour + i) % 24:02d}:00",
                "load": round(grid_data["current_load_percentage"] + random.uniform(-10, 10), 2)
            }
            for i in range(6)
        ]
    }

@router.get("/stations")
async def get_all_stations():
    """Get all charging stations for map visualization, including dynamic pricing"""
    grid_data = get_grid_load_data()
    price_multiplier = grid_data["price_multiplier"]
    
    stations_with_dynamic_price = []
    for station in MOCK_STATIONS:
        st_copy = station.copy()
        st_copy["dynamic_price_per_kwh"] = round(station["price_per_kwh"] * price_multiplier, 2)
        st_copy["is_peak_pricing"] = price_multiplier > 1.0
        stations_with_dynamic_price.append(st_copy)
        
    return {
        "count": len(stations_with_dynamic_price),
        "stations": stations_with_dynamic_price
    }

@router.post("/stations/{station_id}/book")
async def book_station_slot(station_id: int, request: BookingRequest):
    """Mock booking endpoint to reserve a slot and reduce available chargers"""
    for station in MOCK_STATIONS:
        if station["id"] == station_id:
            if station["available_chargers"] > 0:
                station["available_chargers"] -= 1
                return {
                    "status": "success",
                    "message": "Slot booked successfully",
                    "station_name": station["name"],
                    "remaining_chargers": station["available_chargers"],
                    "booking_details": request.dict()
                }
            else:
                raise HTTPException(status_code=400, detail="No chargers currently available at this station")
    
    raise HTTPException(status_code=404, detail="Station not found")
