import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const StationRecommender = ({ 
  stations, 
  userLocation, 
  vehicleData,
  rangePrediction,
  selectedStation,
  onStationSelect 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gridData, setGridData] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateETA = (distanceKm, speedKmh) => {
    if (speedKmh <= 0) return 0;
    return Math.round((distanceKm / speedKmh) * 60);
  };

  const calculateArrivalBattery = (distanceKm, efficiencyKmPerKwh, currentBattery, batteryCapacity) => {
    if (!efficiencyKmPerKwh || efficiencyKmPerKwh <= 0) return currentBattery;
    const energyNeeded = distanceKm / efficiencyKmPerKwh;
    const batteryPercentageUsed = (energyNeeded / batteryCapacity) * 100;
    return Math.max(0, currentBattery - batteryPercentageUsed);
  };

  const calculateCO2Saved = (distanceKm) => {
    // Average petrol car emits ~192g CO2 per km. EV is ~0 tailpipe.
    return (distanceKm * 0.192).toFixed(1);
  };

  const calculateStationScore = (station, distance, eta, arrivalBattery) => {
    let score = 0;
    let breakdown = {};

    const maxDistance = 20;
    const distanceScore = Math.max(0, (1 - distance / maxDistance) * 100);
    breakdown.distance = Math.round(distanceScore);

    const availabilityRatio = station.available_chargers / station.total_chargers;
    const availabilityScore = availabilityRatio * 100;
    breakdown.availability = Math.round(availabilityScore);

    const demandScore = station.predicted_demand_percentage 
      ? 100 - station.predicted_demand_percentage 
      : 50;
    breakdown.demand = Math.round(demandScore);

    const gridScore = gridData 
      ? 100 - gridData.current_load_percentage 
      : 50;
    breakdown.grid = Math.round(gridScore);

    const currentPrice = station.dynamic_price_per_kwh || station.price_per_kwh;
    const maxPrice = 20;
    const priceScore = (1 - currentPrice / maxPrice) * 100;
    breakdown.price = Math.round(priceScore);

    const maxSpeed = 250;
    const speedScore = (Array.isArray(station.power_kw) 
      ? Math.max(...station.power_kw) 
      : station.power_kw) / maxSpeed * 100;
    breakdown.speed = Math.round(speedScore);

    score = (
      distanceScore * 0.25 +
      availabilityScore * 0.20 +
      demandScore * 0.20 +
      gridScore * 0.15 +
      priceScore * 0.10 +
      speedScore * 0.10
    );

    return { total: Math.round(score), breakdown };
  };

  const fetchGridData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/grid/load`);
      setGridData(response.data);
    } catch (error) {
      console.error('Error fetching grid data:', error);
    }
  };

  const fetchDemandPredictions = async () => {
    if (!userLocation) return null;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/predict/demand`, {
        location: userLocation,
        radius_km: 20
      });
      return response.data.predictions;
    } catch (error) {
      console.error('Error fetching demand:', error);
      return null;
    }
  };

  const generateRecommendations = async () => {
    if (!userLocation || !rangePrediction || stations.length === 0) return;
    
    setLoading(true);
    await fetchGridData();
    const demandPredictions = await fetchDemandPredictions();
    
    const processedStations = stations.map(station => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        station.latitude,
        station.longitude
      );
      
      const eta = calculateETA(distance, vehicleData.speed || 40);
      
      const arrivalBattery = calculateArrivalBattery(
        distance,
        rangePrediction.efficiency_km_per_kwh,
        vehicleData.battery_level,
        vehicleData.battery_capacity
      );
      
      if (demandPredictions) {
        const demandPred = demandPredictions.find(p => p.station_id === station.id);
        if (demandPred) {
          station.predicted_demand_percentage = demandPred.predicted_demand_percentage;
          station.predicted_wait_time_minutes = demandPred.predicted_wait_time_minutes;
        }
      }
      
      const scoreData = calculateStationScore(station, distance, eta, arrivalBattery);
      const co2Saved = calculateCO2Saved(distance);
      
      return {
        ...station,
        distance_km: distance,
        eta_minutes: eta,
        arrival_battery: arrivalBattery,
        co2_saved_kg: co2Saved,
        score: scoreData.total,
        score_breakdown: scoreData.breakdown,
        reachable: arrivalBattery > 10
      };
    });
    
    const reachable = processedStations
      .filter(s => s.reachable)
      .sort((a, b) => b.score - a.score);
    
    const unreachable = processedStations
      .filter(s => !s.reachable)
      .sort((a, b) => b.score - a.score);
    
    setRecommendations([...reachable, ...unreachable]);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userLocation && rangePrediction && stations.length > 0) {
        generateRecommendations();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [userLocation, rangePrediction, stations]);

  const getScoreColor = (score) => {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#2563EB';
    if (score >= 40) return '#D97706';
    return '#DC2626';
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="station-recommender">
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 600, 
        marginBottom: '24px',
        color: 'var(--text-primary)'
      }}>
        🏆 ML Recommendations
      </h3>

      {loading && (
        <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
          <div className="spinner mb-3"></div>
          <div>Calculating best stations...</div>
        </div>
      )}

      {!loading && recommendations.length === 0 && (
        <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
          {stations.length === 0 
            ? 'No stations available' 
            : 'Select location and predict range to see recommendations'}
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <>
          <div className="mb-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Found {recommendations.filter(r => r.reachable).length} reachable stations
          </div>

          <div className="stations-list">
            {recommendations.map((station, index) => (
              <div
                key={station.id}
                className="station-list-item"
                style={{
                  background: selectedStation?.id === station.id 
                    ? 'rgba(255, 179, 128, 0.05)' 
                    : 'var(--bg-secondary)',
                  border: selectedStation?.id === station.id
                    ? '1.5px solid var(--accent-primary)'
                    : '1.5px solid var(--border-light)',
                  opacity: station.reachable ? 1 : 0.7
                }}
                onClick={() => onStationSelect(station)}
              >
                {/* Header with score */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      #{index + 1} {station.reachable ? '✓ Reachable' : '⚠ Low Battery'}
                    </div>
                    <h5 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                      {station.name}
                    </h5>
                  </div>
                  <div className={`score-badge ${getScoreClass(station.score)}`}>
                    {station.score}
                  </div>
                </div>

                {/* Key metrics */}
                <div className="row g-2 mb-3" style={{ fontSize: '13px' }}>
                  <div className="col-4">
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Distance</div>
                    <div style={{ color: '#2563EB', fontWeight: 600 }}>
                      📍 {station.distance_km.toFixed(1)} km
                    </div>
                  </div>
                  <div className="col-4">
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>ETA</div>
                    <div style={{ color: '#059669', fontWeight: 600 }}>
                      ⏱️ {station.eta_minutes} min
                    </div>
                  </div>
                  <div className="col-4">
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>Arrival</div>
                    <div style={{ 
                      color: station.arrival_battery > 20 ? '#059669' : '#DC2626', 
                      fontWeight: 600 
                    }}>
                      🔋 {station.arrival_battery.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Station details */}
                <div className="row g-2 mb-3" style={{ fontSize: '12px' }}>
                  <div className="col-6">
                    <div style={{ color: 'var(--text-secondary)' }}>🔌 {station.available_chargers}/{station.total_chargers} free</div>
                    <div style={{ color: 'var(--text-secondary)' }}>⚡ {Array.isArray(station.power_kw) ? Math.max(...station.power_kw) : station.power_kw} kW</div>
                    <div style={{ color: '#059669', marginTop: '4px', fontWeight: 600 }}>🌱 {station.co2_saved_kg} kg CO₂ saved</div>
                  </div>
                  <div className="col-6">
                    <div style={{ color: 'var(--text-secondary)' }}>
                      💰 {station.dynamic_price_per_kwh ? (
                        <>
                          <span style={{ fontWeight: station.is_peak_pricing ? 700 : 500, color: station.is_peak_pricing ? '#DC2626' : 'inherit' }}>
                            ₹{station.dynamic_price_per_kwh.toFixed(2)}/kWh
                          </span>
                          {station.is_peak_pricing && <span style={{ fontSize: '10px', marginLeft: '4px', color: '#DC2626' }}>(Peak)</span>}
                        </>
                      ) : (
                        `₹${station.price_per_kwh}/kWh`
                      )}
                    </div>
                    {station.predicted_wait_time_minutes && (
                      <div style={{ color: '#D97706' }}>
                        ⏳ Wait: ~{station.predicted_wait_time_minutes} min
                      </div>
                    )}
                  </div>
                </div>

                {/* ML Insights */}
                <div className="ml-insights">
                  <strong>🤖 ML Insights</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    <span>Distance: {station.score_breakdown.distance}/100</span>
                    <span>Availability: {station.score_breakdown.availability}/100</span>
                    <span>Demand: {station.score_breakdown.demand}/100</span>
                    {gridData && (
                      <span>Grid: {station.score_breakdown.grid}/100</span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="d-flex gap-2 mt-3">
                  <button
                    className="btn btn-primary flex-fill"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStationSelect(station);
                    }}
                    style={{
                      background: 'var(--accent-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none'
                    }}
                  >
                    Select
                  </button>
                  <button
                    className="btn flex-fill"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const response = await axios.post(`${API_BASE_URL}/stations/${station.id}/book`, {
                          station_id: station.id,
                          time_slot: new Date().toISOString(),
                          duration_minutes: 30
                        });
                        alert(response.data.message);
                        // Ideally we'd refresh the stations list here
                        station.available_chargers = response.data.remaining_chargers;
                      } catch (error) {
                        alert('Failed to book slot: ' + (error.response?.data?.detail || error.message));
                      }
                    }}
                    style={{
                      background: '#10B981',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none'
                    }}
                  >
                    Reserve Slot
                  </button>
                  <button
                    className="btn btn-outline flex-fill"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`, '_blank');
                    }}
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      padding: '8px 12px',
                      borderRadius: '8px'
                    }}
                  >
                    Navigate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ML Models Status */}
      <div style={{ 
        marginTop: '20px', 
        padding: '14px', 
        background: 'rgba(136, 216, 183, 0.08)',
        borderRadius: '10px',
        border: '1.5px solid rgba(136, 216, 183, 0.2)'
      }}>
        <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginBottom: '8px' }}>
          ✅ ML Models Active
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div>• Range Predictor: Active</div>
          <div>• Demand Predictor: Active</div>
          <div>• Grid Forecaster: Active</div>
        </div>
      </div>
    </div>
  );
};

export default StationRecommender;
