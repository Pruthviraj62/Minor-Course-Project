import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SmartMap from './components/SmartMap';
import VehicleControls from './components/VehicleControls';
import StationRecommender from './components/StationRecommender';
import GridDashboard from './components/GridDashboard';
import './App.css';

// API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

function App() {
  const [activeView, setActiveView] = useState('map');
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // User location state
  const [userLocation, setUserLocation] = useState(null);
  
  // Vehicle data state
  const [vehicleData, setVehicleData] = useState({
    battery_level: 80,
    battery_capacity: 60,
    vehicle_model: 'Tesla Model 3',
    driving_conditions: 'normal',
    speed: 60,
    weather_condition: 'clear'
  });
  
  // Range prediction state
  const [rangePrediction, setRangePrediction] = useState(null);
  
  // Selected station state
  const [selectedStation, setSelectedStation] = useState(null);

  useEffect(() => {
    // Fetch stations on mount
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stations`);
      const data = await response.json();
      setStations(data.stations);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Error fetching stations:', error);
      setLoading(false);
      setError('Failed to connect to backend. Make sure the server is running on port 8001.');
    }
  };

  const handleLocationSelect = (location) => {
    setUserLocation(location);
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
  };

  const handlePredictRange = (prediction) => {
    setRangePrediction(prediction);
  };

  const handleFindStations = () => {
    setActiveView('recommendations');
  };

  return (
    <div className="app-container">
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="main-content">
        {error && (
          <div className="alert alert-danger m-3" role="alert" style={{ maxWidth: '600px' }}>
            ⚠️ {error}
            <br />
            <small>To start the backend: <code>cd backend && python run_server.py</code></small>
          </div>
        )}

        {activeView === 'map' && (
          <div className="map-view" style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>
            {/* Left Panel - Vehicle Controls */}
            <div style={{ 
              width: '380px', 
              padding: '20px', 
              background: 'rgba(10, 10, 15, 0.5)',
              overflowY: 'auto'
            }}>
              <VehicleControls 
                vehicleData={vehicleData}
                setVehicleData={setVehicleData}
                onPredictRange={handlePredictRange}
                onFindStations={handleFindStations}
              />
            </div>

            {/* Center - 2D Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <SmartMap 
                stations={stations}
                userLocation={userLocation}
                onLocationSelect={handleLocationSelect}
                selectedStation={selectedStation}
                onStationSelect={handleStationSelect}
              />
            </div>

            {/* Right Panel - Station Recommendations */}
            <div style={{ 
              width: '420px', 
              padding: '20px', 
              background: 'rgba(10, 10, 15, 0.5)',
              overflowY: 'auto'
            }}>
              <StationRecommender 
                stations={stations}
                userLocation={userLocation}
                vehicleData={vehicleData}
                rangePrediction={rangePrediction}
                selectedStation={selectedStation}
                onStationSelect={handleStationSelect}
              />
            </div>
          </div>
        )}

        {activeView === 'recommendations' && (
          <div className="map-view" style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>
            {/* Full width recommendations */}
            <div style={{ 
              width: '500px', 
              padding: '20px', 
              background: 'rgba(10, 10, 15, 0.5)',
              overflowY: 'auto'
            }}>
              <StationRecommender 
                stations={stations}
                userLocation={userLocation}
                vehicleData={vehicleData}
                rangePrediction={rangePrediction}
                selectedStation={selectedStation}
                onStationSelect={handleStationSelect}
              />
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <SmartMap 
                stations={stations}
                userLocation={userLocation}
                onLocationSelect={handleLocationSelect}
                selectedStation={selectedStation}
                onStationSelect={handleStationSelect}
              />
            </div>
          </div>
        )}

        {activeView === 'range' && <GridDashboard />}
        {activeView === 'grid' && <GridDashboard />}
      </main>
    </div>
  );
}

export default App;
