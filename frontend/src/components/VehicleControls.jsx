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
    <div className="vehicle-controls" style={{ background: 'var(--bg-secondary)', padding: '24px' }}>
      <h3 className="mono" style={{ 
        fontSize: '1rem', 
        fontWeight: 800, 
        marginBottom: '32px',
        color: 'var(--accent-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '1.4rem' }}>🚗</span> VEHICLE_TELEMETRY
      </h3>
      
      {/* Vehicle Model */}
      <div className="mb-4">
        <label className="form-label mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>UNIT_MODEL</label>
        <select
          name="vehicle_model"
          className="form-control mono"
          value={vehicleData.vehicle_model}
          onChange={handleChange}
          style={{ fontSize: '0.8rem' }}
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
        <label className="form-label mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
          SOC_LEVEL: <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{vehicleData.battery_level}%</span>
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
      </div>

      {/* Current Speed */}
      <div className="mb-4">
        <label className="form-label mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
          VELOCITY_KPH: <span style={{ color: 'var(--accent-secondary)', fontWeight: 800 }}>{vehicleData.speed}</span>
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
          style={{ accentColor: 'var(--accent-secondary)' }}
        />
      </div>

      <div className="row g-2 mb-4">
        <div className="col-6">
          <label className="form-label mono" style={{ fontSize: '0.65rem' }}>CAPACITY_KWH</label>
          <input
            type="number"
            className="form-control mono"
            name="battery_capacity"
            value={vehicleData.battery_capacity}
            onChange={handleChange}
            style={{ fontSize: '0.8rem' }}
          />
        </div>
        <div className="col-6">
          <label className="form-label mono" style={{ fontSize: '0.65rem' }}>WEATHER_MOD</label>
          <select
            name="weather_condition"
            className="form-control mono"
            value={vehicleData.weather_condition}
            onChange={handleChange}
            style={{ fontSize: '0.8rem' }}
          >
            <option value="clear">CLEAR</option>
            <option value="rain">RAIN</option>
            <option value="cold">COLD</option>
            <option value="hot">HOT</option>
          </select>
        </div>
      </div>

      {/* Driving Conditions */}
      <div className="mb-5">
        <label className="form-label mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>ENV_MODE</label>
        <div className="btn-group w-100" role="group">
          {['city', 'normal', 'highway'].map(mode => (
            <button
              key={mode}
              type="button"
              className="btn btn-sm mono"
              onClick={() => setVehicleData(prev => ({ ...prev, driving_conditions: mode }))}
              style={{
                background: vehicleData.driving_conditions === mode ? 'var(--bg-accent)' : 'transparent',
                border: `1px solid ${vehicleData.driving_conditions === mode ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
                color: vehicleData.driving_conditions === mode ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: '0.65rem',
                flex: 1
              }}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex flex-column gap-3">
        <button
          className="btn btn-primary w-100"
          onClick={handlePredictRange}
          disabled={loading}
          style={{ fontSize: '0.8rem' }}
        >
          {loading ? 'PROCESSING...' : 'RUN_PREDICTION'}
        </button>

        <button
          className="btn btn-outline w-100"
          onClick={onFindStations}
          style={{ fontSize: '0.8rem' }}
        >
          SYNC_STATIONS
        </button>
      </div>

      {/* Prediction Results */}
      {prediction && (
        <div className="prediction-result glass-panel mt-5" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
          <h6 className="mono" style={{ 
            fontSize: '0.65rem', 
            fontWeight: 800, 
            marginBottom: '16px',
            color: 'var(--accent-primary)',
            textTransform: 'uppercase'
          }}>
            [ SIMULATION_RESULT ]
          </h6>
          
          <div className="row g-3">
            <div className="col-12 mb-2">
              <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>EST_MAX_RANGE</div>
              <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {prediction.predicted_range_km.toFixed(1)}<span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>KM</span>
              </div>
            </div>
            <div className="col-6">
              <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>EFFICIENCY</div>
              <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                {prediction.efficiency_km_per_kwh.toFixed(2)}
              </div>
            </div>
            {timeToEmpty && (
              <div className="col-6">
                <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>TTE_CLOCK</div>
                <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning)' }}>
                  {Math.floor(timeToEmpty / 60)}H {timeToEmpty % 60}M
                </div>
              </div>
            )}
          </div>

          {prediction.weather_impact_percent > 0 && (
            <div className="mt-3 mono" style={{ fontSize: '0.6rem', color: 'var(--error)' }}>
              ⚠ WEATHER_PENALTY: -{prediction.weather_impact_percent}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleControls;
