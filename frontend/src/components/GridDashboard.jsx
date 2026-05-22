import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { gridAPI } from '../api/apiService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const GridDashboard = () => {
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchGridData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchGridData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchGridData = async () => {
    try {
      const response = await gridAPI.getLoad();
      setGridData(response.data);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to fetch grid data. Make sure backend is running.');
      setLoading(false);
      console.error('Grid data fetch error:', err);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="spinner me-3" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--accent-primary)' }}></div>
          <span className="mono" style={{ color: 'var(--accent-primary)' }}>SYNCING_WITH_GRID_VECTORS...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger mono" role="alert">
          ⚠️ ERROR: {error}
        </div>
        <button className="btn btn-primary mono" onClick={fetchGridData}>
          [ RE-INIT_PROTOCOL ]
        </button>
      </div>
    );
  }

  // Chart data with ML forecast
  const chartData = {
    labels: gridData.forecast_next_6h.map(h => h.hour),
    datasets: [
      {
        label: 'GRID_LOAD_VECTORS (%)',
        data: gridData.forecast_next_6h.map(h => h.load),
        borderColor: '#00FF9D',
        backgroundColor: 'rgba(0, 255, 157, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00FF9D',
        pointBorderColor: '#050505',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { 
          color: '#F0F4F8',
          font: { family: 'Space Mono', size: 10 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 17, 21, 0.95)',
        titleColor: '#00FF9D',
        bodyColor: '#F0F4F8',
        borderColor: 'var(--accent-primary)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        titleFont: { family: 'Space Mono' },
        bodyFont: { family: 'Space Mono' }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { 
          color: '#64748B',
          font: { family: 'Space Mono', size: 10 },
          callback: (v) => v + '%'
        },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      x: {
        ticks: { 
          color: '#64748B',
          font: { family: 'Space Mono', size: 10 }
        },
        grid: { display: false }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'high': return '#FF4D4D';
      case 'medium': return '#FACC15';
      case 'low': return '#00FF9D';
      default: return '#64748B';
    }
  };

  return (
    <div className="grid-dashboard px-4 py-5" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-end mb-5 border-bottom pb-4" style={{ borderColor: 'var(--border-medium)' }}>
        <div>
          <h2 className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '3px' }}>
            // GRID_SYNAPSE_CENTER
          </h2>
          <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            LOCATION_NODE: MAHARASHTRA_CORE // STATUS: ACTIVE
          </div>
        </div>
        <button 
          className="btn btn-outline mono"
          onClick={fetchGridData}
          style={{ fontSize: '0.7rem', padding: '10px 20px' }}
        >
          [ RE-SYNC_DATA ]
        </button>
      </div>
      
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="glass-card p-4" style={{ borderRadius: '20px', borderLeft: `4px solid ${getStatusColor(gridData.status)}` }}>
            <h6 className="mono mb-4" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              CURRENT_LOAD_INTENSITY
            </h6>
            <div className="d-flex align-items-center justify-content-between">
              <span className="mono" style={{ fontSize: '2.8rem', fontWeight: 900, color: getStatusColor(gridData.status) }}>
                {gridData.current_load_percentage.toFixed(1)}%
              </span>
              <span className="mono" style={{ 
                background: 'rgba(255,255,255,0.05)',
                color: getStatusColor(gridData.status),
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 800,
                border: `1px solid ${getStatusColor(gridData.status)}`
              }}>
                {gridData.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="glass-card p-4" style={{ borderRadius: '20px', borderLeft: '4px solid var(--accent-secondary)' }}>
            <h6 className="mono mb-4" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              DYNAMIC_PRICE_INDEX
            </h6>
            <div className="d-flex align-items-center justify-content-between">
              <span className="mono" style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                {gridData.price_multiplier}x
              </span>
              <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 0 10px var(--accent-secondary))' }}>⚡</span>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="glass-card p-4" style={{ borderRadius: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
            <h6 className="mono mb-4" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              RENEWABLE_SYNC_RATIO
            </h6>
            <div className="d-flex align-items-center justify-content-between">
              <span className="mono" style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                {gridData.renewable_percentage.toFixed(1)}%
              </span>
              <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 0 10px var(--accent-primary))' }}>🌱</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="glass-panel p-4" style={{ height: '450px', borderRadius: '24px' }}>
            <h5 className="mono mb-4" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              &gt; NEURAL_LOAD_FORECAST_HEX_06
            </h5>
            <div style={{ height: '350px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="glass-panel p-4 h-100" style={{ borderRadius: '24px', border: '1px solid var(--border-accent)' }}>
            <h5 className="mono mb-4" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              &gt; AI_STRATEGY_OUTPUT
            </h5>
            <div className="text-center py-4">
              {gridData.recommended_charging ? (
                <div>
                  <div style={{ fontSize: '4.5rem', marginBottom: '24px', filter: 'drop-shadow(0 0 20px var(--accent-primary))' }}>⚡</div>
                  <h4 className="mono mb-3" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 900 }}>
                    OPTIMAL_CHARGE_WINDOW
                  </h4>
                  <p className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.8 }}>
                    GRID_LOAD: {gridData.current_load_percentage.toFixed(1)}% [NOMINAL]<br />
                    STRATEGY: DEPLOY_NOW<br />
                    EFFICIENCY: HIGH
                  </p>
                  <div className="mt-4 p-3 mono" style={{ background: 'rgba(0, 255, 157, 0.05)', borderRadius: '12px', border: '1px dashed var(--accent-primary)' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--accent-primary)' }}>EST_COST_ADVANTAGE</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '4px' }}>
                      {(1.5 - gridData.price_multiplier).toFixed(1)}X_SAVING
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '4.5rem', marginBottom: '24px', filter: 'drop-shadow(0 0 20px var(--error))' }}>⚠</div>
                  <h4 className="mono mb-3" style={{ color: 'var(--error)', fontSize: '1.2rem', fontWeight: 900 }}>
                    PEAK_LOAD_DETECTED
                  </h4>
                  <p className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.8 }}>
                    GRID_LOAD: {gridData.current_load_percentage.toFixed(1)}% [CRITICAL]<br />
                    STRATEGY: DEFER_CHARGE<br />
                    NEXT_WINDOW: +4H_EST
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridDashboard;