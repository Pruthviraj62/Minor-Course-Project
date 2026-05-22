import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon for charging stations - Pastel Orange
const chargingStationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/32/739/739321.png',
  iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/32/739/739321.png',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
  className: 'custom-marker'
});

// Custom icon for user location - Pastel Blue
const userLocationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/32/684/684560.png',
  iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/32/684/684560.png',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Helper function to calculate distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Component to handle map clicks
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    },
  });
  return null;
}

// Enhanced Route Component using Leaflet Routing Machine
function SmartRouting({ start, end }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    // Clean up previous routing control
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    try {
      // Create routing control with A*/Dijkstra based OSRM engine
      // showAlternatives: true will show 2 paths as requested
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(start.lat, start.lng),
          L.latLng(end.lat, end.lng)
        ],
        lineOptions: {
          styles: [
            { color: '#00d9ff', opacity: 0.8, weight: 6 }, // Primary path
            { color: '#ff6b6b', opacity: 0.6, weight: 4, dashArray: '5, 10' } // Alternative path
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 100
        },
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: true,
        altLineOptions: {
          styles: [{ color: '#ff6b6b', opacity: 0.6, weight: 4, dashArray: '5, 10' }]
        },
        // Custom formatter to show algorithm info
        summaryTemplate: '<h2>{name}</h2><h3>{distance}, {time}</h3><p style="font-size: 0.7rem; color: #888;">Algorithm: Dijkstra/A* Optimized</p>'
      }).addTo(map);

      routingControlRef.current = routingControl;
    } catch (error) {
      console.error("Routing Error:", error);
    }

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, start, end]);

  return null;
}

const SmartMap = ({ 
  stations, 
  userLocation, 
  onLocationSelect,
  selectedStation,
  onStationSelect 
}) => {
  const [clickedLocation, setClickedLocation] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  
  // Default to Mumbai center if no location provided
  const defaultCenter = { lat: 18.5204, lng: 73.8567 }; // Moved center towards Pune/Sangli/Kolhapur
  const zoom = 8;

  // Find nearest station when user location or clicked location changes
  useEffect(() => {
    const loc = clickedLocation || userLocation;
    if (loc && stations.length > 0) {
      let minDistance = Infinity;
      let nearest = null;
      
      stations.forEach(station => {
        const dist = calculateDistance(loc.lat, loc.lng, station.latitude, station.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = station;
        }
      });
      
      setNearestStation(nearest);
    }
  }, [clickedLocation, userLocation, stations]);

  const handleMapClick = (location) => {
    setClickedLocation(location);
    onLocationSelect(location);
  };

  const handleStationClick = (station) => {
    onStationSelect(station);
  };

  // Determine which station to route to
  const targetStation = selectedStation || nearestStation;
  const startPoint = clickedLocation || userLocation;

  return (
    <div className="smart-map-container" style={{ width: '100%', height: '100%', minHeight: '600px', position: 'relative' }}>
      <MapContainer 
        center={[defaultCenter.lat, defaultCenter.lng]} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationPicker onLocationSelect={handleMapClick} />
        
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={userLocationIcon}
          >
            <Popup>
              <strong>Your Location</strong>
            </Popup>
          </Marker>
        )}
        
        {clickedLocation && (
          <Marker 
            position={[clickedLocation.lat, clickedLocation.lng]}
            icon={new L.Icon.Default()}
          >
            <Popup>
              <strong>Selected Point</strong><br />
              Lat: {clickedLocation.lat.toFixed(4)}<br />
              Lng: {clickedLocation.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}
        
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={chargingStationIcon}
            eventHandlers={{
              click: () => handleStationClick(station)
            }}
          >
            <Popup>
              <div style={{ minWidth: '240px', padding: '10px' }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{station.name}</h4>
                <p style={{ fontSize: '0.8rem', margin: '5px 0' }}>{station.address}</p>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>⚡ {station.available_chargers}/{station.total_chargers} available</strong><br />
                  💰 ₹{station.price_per_kwh}/kWh
                </div>
                <button 
                  onClick={() => onStationSelect(station)}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '8px',
                    background: '#00d9ff',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Select Station
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Actual road routing with two paths */}
        {startPoint && targetStation && (
          <SmartRouting 
            start={startPoint} 
            end={{ lat: targetStation.latitude, lng: targetStation.longitude }} 
          />
        )}
      </MapContainer>
      
      {/* Legend and Info Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(10, 10, 15, 0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        zIndex: 1000,
        fontSize: '0.85rem',
        maxWidth: '220px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ fontWeight: 'bold', color: '#00d9ff', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
          Navigation Engine
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#00d9ff', marginRight: '8px', borderRadius: '2px' }}></div>
          Shortest Path (Primary)
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#ff6b6b', marginRight: '8px', borderRadius: '2px', border: '1px dashed white' }}></div>
          Alternative Path
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.75rem', opacity: 0.8, fontStyle: 'italic' }}>
          * Paths calculated using OSRM engine with Dijkstra/A* optimization for real road networks.
        </div>
        {targetStation && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #333' }}>
            <span style={{ color: '#aaa' }}>Target:</span><br />
            <span style={{ fontWeight: 600 }}>{targetStation.name}</span>
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(10, 10, 15, 0.8)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        zIndex: 1000,
        fontSize: '0.8rem'
      }}>
        📍 Click map to find nearest station
      </div>
    </div>
  );
};

export default SmartMap;

