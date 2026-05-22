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

    // Proximity Score - Increased maxDistance to 100km for regional relevance
    const maxDistance = 100;
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
    const maxPrice = 25;
    const priceScore = Math.max(0, (1 - currentPrice / maxPrice) * 100);
    breakdown.price = Math.round(priceScore);

    const maxSpeed = 250;
    const speedScore = (Array.isArray(station.power_kw) 
      ? Math.max(...station.power_kw) 
      : station.power_kw) / maxSpeed * 100;
    breakdown.speed = Math.round(speedScore);

    // WEIGHTED SCORING - Proximity (Distance) is now 50% of the total score
    // This ensures Mumbai stations won't rank high if you are in Tasgaon
    score = (
      distanceScore * 0.50 +
      availabilityScore * 0.15 +
      demandScore * 0.10 +
      gridScore * 0.10 +
      priceScore * 0.10 +
      speedScore * 0.05
    );

    // Apply a massive penalty for stations over 150km away to keep them at the bottom
    if (distance > 150) score *= 0.1;

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
    try {
      await fetchGridData();
      const demandPredictions = await fetchDemandPredictions();
      
      const processedStations = stations.map(station => {
        // Create a copy to avoid mutating the original stations state
        const st = { ...station };
        
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          st.latitude,
          st.longitude
        );
        
        const eta = calculateETA(distance, vehicleData.speed || 40);
        
        const arrivalBattery = calculateArrivalBattery(
          distance,
          rangePrediction.efficiency_km_per_kwh,
          vehicleData.battery_level,
          vehicleData.battery_capacity
        );
        
        if (demandPredictions) {
          const demandPred = demandPredictions.find(p => p.station_id === st.id);
          if (demandPred) {
            st.predicted_demand_percentage = demandPred.predicted_demand_percentage;
            st.predicted_wait_time_minutes = demandPred.predicted_wait_time_minutes;
          }
        }
        
        const scoreData = calculateStationScore(st, distance, eta, arrivalBattery);
        const co2Saved = calculateCO2Saved(distance);
        
        return {
          ...st,
          distance_km: distance,
          eta_minutes: eta,
          arrival_battery: arrivalBattery,
          co2_saved_kg: co2Saved,
          score: scoreData.total,
          score_breakdown: scoreData.breakdown,
          reachable: arrivalBattery > 10
        };
      });
      
      // Strict Ranking Strategy
      // 1. Closest and Reachable (< 50km)
      const ultraLocal = processedStations
        .filter(s => s.reachable && s.distance_km <= 50)
        .sort((a, b) => b.score - a.score);
        
      // 2. Reachable within reasonable range (50km - 150km)
      const regional = processedStations
        .filter(s => s.reachable && s.distance_km > 50 && s.distance_km <= 150)
        .sort((a, b) => b.score - a.score);
        
      // 3. Everything else (Far reachable or Unreachable)
      const others = processedStations
        .filter(s => !ultraLocal.find(l => l.id === s.id) && !regional.find(r => r.id === s.id))
        .sort((a, b) => a.distance_km - b.distance_km); // Sort by distance for these
        
      setRecommendations([...ultraLocal, ...regional, ...others]);
    } catch (err) {
      console.error("Recommendation generation failed:", err);
    } finally {
      setLoading(false);
    }
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
    <div className="station-recommender" style={{ background: 'var(--bg-secondary)', padding: '24px', color: 'var(--text-primary)' }}>
      <h3 className="mono" style={{ 
        fontSize: '1rem', 
        fontWeight: 800, 
        marginBottom: '24px',
        color: 'var(--accent-primary)',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '1.4rem' }}>🏆</span> ML_STATION_ANALYSIS
      </h3>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner mb-3" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--accent-primary)' }}></div>
          <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>CALCULATING_OPTIMAL_VECTORS...</div>
        </div>
      )}

      {!loading && recommendations.length === 0 && (
        <div className="text-center py-4 mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {stations.length === 0 
            ? 'ERROR: NO_STATIONS_IN_MEMORY' 
            : 'WAITING_FOR_LOC_SYNC...'}
        </div>
      )}
{!loading && recommendations.length > 0 && (
  <>
    <div className="mb-4 mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
      <span>LOC_SYNC: OK</span>
      <span>{recommendations.filter(r => r.reachable).length} REACHABLE</span>
    </div>

    <div className="stations-list">
      {recommendations.map((station, index) => (
        <React.Fragment key={station.id}>
          {/* Category Header */}
          {index === 0 && station.distance_km <= 50 && (
            <div className="mono mb-3" style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
              &gt;&gt; PRIMARY_TARGETS_NEARBY
            </div>
          )}
          {index > 0 && recommendations[index-1].distance_km <= 50 && station.distance_km > 50 && (
            <div className="mono mt-5 mb-3" style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: 800 }}>
              &gt;&gt; EXTENDED_RANGE_REGIONAL
            </div>
          )}
          {index > 0 && recommendations[index-1].reachable && !station.reachable && (
            <div className="mono mt-5 mb-3" style={{ fontSize: '0.65rem', color: 'var(--error)', fontWeight: 800 }}>
              &gt;&gt; CRITICAL_OUT_OF_RANGE
            </div>
          )}

          <div
            className="station-list-item glass-card"
...
                style={{
                  padding: '20px',
                  marginBottom: '16px',
                  borderRadius: '16px',
                  border: selectedStation?.id === station.id
                    ? '1.5px solid var(--accent-primary)'
                    : '1px solid var(--border-light)',
                  opacity: station.reachable ? 1 : 0.5,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => onStationSelect(station)}
              >
                {/* Visual Accent */}
                {selectedStation?.id === station.id && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 10px var(--accent-primary)'
                  }}></div>
                )}

                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ID_{station.id.toString().padStart(3, '0')} // {station.reachable ? 'OPTIMAL' : 'OUT_OF_RANGE'}
                    </div>
                    <h5 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>
                      {station.name.toUpperCase()}
                    </h5>
                  </div>
                  <div className={`mono ${getScoreClass(station.score)}`} style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.3)'
                  }}>
                    {station.score}
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="row g-3 mb-4">
                  <div className="col-4">
                    <div className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Dist</div>
                    <div className="mono" style={{ color: 'var(--accent-secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      {station.distance_km.toFixed(1)}KM
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase' }}>ETA</div>
                    <div className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      {station.eta_minutes}M
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase' }}>SOC_ARR</div>
                    <div className="mono" style={{ 
                      color: station.arrival_battery > 20 ? 'var(--accent-primary)' : 'var(--error)', 
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}>
                      {station.arrival_battery.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Specs Section */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>LOAD_AVAIL</span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>{station.available_chargers}/{station.total_chargers} UNITS</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>GRID_PRICE</span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: station.is_peak_pricing ? 'var(--error)' : 'var(--accent-primary)' }}>
                      ₹{station.dynamic_price_per_kwh?.toFixed(2) || station.price_per_kwh}/kWh {station.is_peak_pricing && '!!'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ECO_SAVED</span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      +{station.co2_saved_kg}KG CO₂
                    </span>
                  </div>
                </div>

                {/* ML Diagnostics */}
                <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '4px' }}>[ ANALYSIS_COMPLETED ]</div>
                  <div style={{ display: 'flex', gap: '10px', opacity: 0.8 }}>
                    <span>AVAIL_{station.score_breakdown.availability}%</span>
                    <span>DEMAND_{station.score_breakdown.demand}%</span>
                    <span>GRID_{station.score_breakdown.grid}%</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-primary flex-fill"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStationSelect(station);
                    }}
                    style={{ fontSize: '0.7rem', padding: '10px' }}
                  >
                    DEPLOY
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
                        station.available_chargers = response.data.remaining_chargers;
                      } catch (error) {
                        alert('BOOKING_FAILED: ' + (error.response?.data?.detail || error.message));
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.7rem',
                      padding: '10px'
                    }}
                  >
                    RESERVE
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`, '_blank');
                    }}
                    style={{ padding: '10px' }}
                  >
                    ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ML System Status */}
      <div className="glass-panel" style={{ 
        marginTop: '32px', 
        padding: '20px', 
        borderRadius: '16px',
        border: '1px solid var(--border-accent)'
      }}>
        <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 800, marginBottom: '12px' }}>
          // NEURAL_ENGINE_STATUS
        </div>
        <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>RANGE_PREDICTOR</span>
            <span style={{ color: 'var(--accent-primary)' }}>[ ONLINE ]</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GRID_FORECASTER</span>
            <span style={{ color: 'var(--accent-primary)' }}>[ ONLINE ]</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>DEMAND_ANALYZER</span>
            <span style={{ color: 'var(--accent-primary)' }}>[ ONLINE ]</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationRecommender;
