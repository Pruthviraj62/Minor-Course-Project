import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const VehicleControls = ({ 
  vehicleData, 
  setVehicleData, 
  onPredictRange,
  onFindStations 
}) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData(prev => ({
      ...prev,
      [name]: name === 'battery_level' || name === 'speed' || name === 'battery_capacity' 
        ? parseFloat(value) 
        : value
    }));
  };

  const handlePredictRange = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/predict/range`, {
        battery_level: vehicleData.battery_level,
        battery_capacity: vehicleData.battery_capacity,
        vehicle_model: vehicleData.vehicle_model,
        driving_conditions: vehicleData.driving_conditions,
        weather_condition: vehicleData.weather_condition
      });
      
      setPrediction(response.data);
      onPredictRange(response.data);
    } catch (error) {
      console.error('Error predicting range:', error);
      alert('Failed to predict range. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (vehicleData.battery_level > 0 && vehicleData.battery_capacity > 0) {
        handlePredictRange();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [vehicleData.battery_level, vehicleData.speed, vehicleData.driving_conditions, vehicleData.weather_condition]);

  const calculateTimeToEmpty = () => {
    if (!prediction) return null;
    
    const efficiency = prediction.efficiency_km_per_kwh;
    const speed = vehicleData.speed;
    const remainingRange = prediction.predicted_range_km;
    
    if (speed > 0) {
      const hours = remainingRange / speed;
      const minutes = Math.round(hours * 60);
      return minutes;
    }
    return null;
  };

  const timeToEmpty = calculateTimeToEmpty();

  return (
    <div className="vehicle-controls">
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 600, 
        marginBottom: '24px',
        color: 'var(--text-primary)'
      }}>
        🚗 Vehicle Controls
      </h3>
      
      {/* Vehicle Model */}
      <div className="mb-4">
        <label className="form-label">Vehicle Model</label>
        <select
          name="vehicle_model"
          className="form-control"
          value={vehicleData.vehicle_model}
          onChange={handleChange}
        >
          <option value="Tesla Model 3">Tesla Model 3</option>
          <option value="Tesla Model Y">Tesla Model Y</option>
          <option value="Nissan Leaf">Nissan Leaf</option>
          <option value="Chevrolet Bolt">Chevrolet Bolt</option>
          <option value="Hyundai Kona Electric">Hyundai Kona Electric</option>
          <option value="Tata Nexon EV">Tata Nexon EV</option>
          <option value="MG ZS EV">MG ZS EV</option>
          <option value="BYD Atto 3">BYD Atto 3</option>
        </select>
      </div>

      {/* Battery Level */}
      <div className="mb-4">
        <label className="form-label">
          Battery Level: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{vehicleData.battery_level}%</span>
        </label>
        <input
          type="range"
          className="form-range"
          name="battery_level"
          min="0"
          max="100"
          step="1"
          value={vehicleData.battery_level}
          onChange={handleChange}
        />
        <div className="d-flex justify-content-between" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Battery Capacity */}
      <div className="mb-4">
        <label className="form-label">Battery Capacity (kWh)</label>
        <input
          type="number"
          className="form-control"
          name="battery_capacity"
          value={vehicleData.battery_capacity}
          onChange={handleChange}
          step="0.1"
          min="10"
          max="200"
        />
      </div>

      {/* Current Speed */}
      <div className="mb-4">
        <label className="form-label">
          Current Speed: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{vehicleData.speed} km/h</span>
        </label>
        <input
          type="range"
          className="form-range"
          name="speed"
          min="0"
          max="120"
          step="5"
          value={vehicleData.speed}
          onChange={handleChange}
        />
        <div className="d-flex justify-content-between" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>0</span>
          <span>60</span>
          <span>120</span>
        </div>
      </div>

      {/* Driving Conditions */}
      <div className="mb-4">
        <label className="form-label">Driving Conditions</label>
        <div className="btn-group w-100" role="group">
          <button
            type="button"
            className={`btn btn-sm ${vehicleData.driving_conditions === 'city' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setVehicleData(prev => ({ ...prev, driving_conditions: 'city' }))}
            style={{
              background: vehicleData.driving_conditions === 'city' ? 'var(--accent-primary)' : 'transparent',
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              padding: '8px 12px'
            }}
          >
            🏙️ City
          </button>
          <button
            type="button"
            className={`btn btn-sm ${vehicleData.driving_conditions === 'normal' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setVehicleData(prev => ({ ...prev, driving_conditions: 'normal' }))}
            style={{
              background: vehicleData.driving_conditions === 'normal' ? 'var(--accent-primary)' : 'transparent',
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              padding: '8px 12px'
            }}
          >
            🛣️ Normal
          </button>
          <button
            type="button"
            className={`btn btn-sm ${vehicleData.driving_conditions === 'highway' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setVehicleData(prev => ({ ...prev, driving_conditions: 'highway' }))}
            style={{
              background: vehicleData.driving_conditions === 'highway' ? 'var(--accent-primary)' : 'transparent',
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              padding: '8px 12px'
            }}
          >
            ⚡ Highway
          </button>
        </div>
      </div>

      {/* Weather Conditions */}
      <div className="mb-4">
        <label className="form-label">Weather Condition</label>
        <select
          name="weather_condition"
          className="form-control"
          value={vehicleData.weather_condition}
          onChange={handleChange}
        >
          <option value="clear">☀️ Clear (Optimal)</option>
          <option value="rain">🌧️ Rain (-12% Range)</option>
          <option value="cold">❄️ Cold (-20% Range)</option>
          <option value="hot">🥵 Hot (-5% Range)</option>
        </select>
      </div>

      {/* Action Buttons */}
      <button
        className="btn btn-primary w-100 mb-3"
        onClick={handlePredictRange}
        disabled={loading}
        style={{
          background: 'var(--accent-primary)',
          color: 'var(--text-primary)',
          fontWeight: 600,
          padding: '12px 20px',
          border: 'none',
          borderRadius: '10px',
          fontSize: '0.9375rem',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s ease'
        }}
      >
        {loading ? 'Calculating...' : '🔋 Predict Range'}
      </button>

      <button
        className="btn btn-outline w-100"
        onClick={onFindStations}
        style={{
          background: 'transparent',
          borderColor: 'var(--border-medium)',
          color: 'var(--text-primary)',
          fontWeight: 600,
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '0.9375rem'
        }}
      >
        🎯 Find Charging Stations
      </button>

      {/* Prediction Results */}
      {prediction && (
        <div className="prediction-result">
          <h6 style={{ 
            fontSize: '0.8125rem', 
            fontWeight: 600, 
            marginBottom: '12px',
            color: '#059669',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📊 ML Prediction
          </h6>
          
          <div className="row g-3 mb-3">
            <div className="col-6">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Predicted Range</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>
                {prediction.predicted_range_km.toFixed(1)} km
              </div>
            </div>
            <div className="col-6">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Efficiency</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#2563EB' }}>
                {prediction.efficiency_km_per_kwh.toFixed(2)} km/kWh
              </div>
            </div>
          </div>

          {timeToEmpty && (
            <div style={{ 
              padding: '10px', 
              background: 'rgba(255, 204, 128, 0.1)',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid rgba(255, 204, 128, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>⏱️ Time to Empty</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#D97706' }}>
                {Math.floor(timeToEmpty / 60)}h {timeToEmpty % 60}m
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                at {vehicleData.speed} km/h
              </div>
            </div>
          )}

          <div style={{ 
            fontSize: '10px', 
            color: 'var(--text-muted)', 
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-light)'
          }}>
            Based on {vehicleData.battery_level}% battery ({vehicleData.battery_capacity} kWh) 
            in {vehicleData.driving_conditions} driving
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleControls;
