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
function SmartRouting({ start, end, showItinerary }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    // Clean up previous routing control
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    try {
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(start.lat, start.lng),
          L.latLng(end.lat, end.lng)
        ],
        lineOptions: {
          styles: [
            { color: '#00FF9D', opacity: 0.8, weight: 6 }, // Cyber Green
            { color: '#00D9FF', opacity: 0.6, weight: 4, dashArray: '5, 10' } // Cyan Alt
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 100
        },
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: true,
        altLineOptions: {
          styles: [{ color: '#00D9FF', opacity: 0.6, weight: 4, dashArray: '5, 10' }]
        },
        // Container for itinerary
        itineraryClassName: `routing-itinerary-container ${showItinerary ? '' : 'hidden'}`,
        summaryTemplate: '<div class="mono" style="color: var(--accent-primary); font-weight: bold; font-size: 1.1rem;">{name}</div><div class="mono" style="color: var(--text-primary);">{distance}, {time}</div><p style="font-size: 0.7rem; color: var(--text-muted);">Engine: OSRM/A*</p>'
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
  }, [map, start, end, showItinerary]);

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
  const [showItinerary, setShowItinerary] = useState(false);
  
  // Default center towards Maharashtra hub
  const defaultCenter = { lat: 17.5, lng: 74.5 }; 
  const zoom = 8;

  // Find nearest station logic
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

  // Toggle itinerary visibility via effect
  useEffect(() => {
    const container = document.querySelector('.leaflet-routing-container');
    if (container) {
      container.style.display = showItinerary ? 'block' : 'none';
    }
  }, [showItinerary, targetStation, startPoint]);

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <LocationPicker onLocationSelect={handleMapClick} />
        
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup><strong className="mono">Origin</strong></Popup>
          </Marker>
        )}
        
        {clickedLocation && (
          <Marker position={[clickedLocation.lat, clickedLocation.lng]} icon={new L.Icon.Default()}>
            <Popup><strong className="mono">Custom Point</strong></Popup>
          </Marker>
        )}
        
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={chargingStationIcon}
            eventHandlers={{ click: () => handleStationClick(station) }}
          >
            <Popup>
              <div style={{ minWidth: '240px', padding: '5px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)' }}>{station.name}</h4>
                <div className="mono" style={{ fontSize: '0.8rem', marginBottom: '12px' }}>
                  ⚡ {station.available_chargers}/{station.total_chargers} Free<br />
                  💰 ₹{station.dynamic_price_per_kwh || station.price_per_kwh}/kWh
                </div>
                <button 
                  onClick={() => onStationSelect(station)}
                  className="btn btn-primary w-100 btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Select Station
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {startPoint && targetStation && (
          <SmartRouting 
            start={startPoint} 
            end={{ lat: targetStation.latitude, lng: targetStation.longitude }}
            showItinerary={showItinerary}
          />
        )}
      </MapContainer>
      
      {/* Dynamic Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1000
      }}>
        {/* Navigation Legend */}
        <div className="glass-panel" style={{
          padding: '18px',
          borderRadius: '16px',
          fontSize: '0.8rem',
          width: '240px',
          border: '1px solid var(--border-accent)'
        }}>
          <div className="mono" style={{ fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            // Navigation Engine
          </div>
          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '14px', height: '14px', background: 'var(--accent-primary)', marginRight: '10px', borderRadius: '3px', boxShadow: '0 0 10px var(--accent-primary)' }}></div>
            <span className="mono">Shortest Path</span>
          </div>
          <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '14px', height: '14px', background: 'var(--accent-secondary)', marginRight: '10px', borderRadius: '3px', border: '1px dashed white' }}></div>
            <span className="mono">Alternative</span>
          </div>
          
          <button 
            onClick={() => setShowItinerary(!showItinerary)}
            className="btn btn-outline w-100 btn-sm"
            style={{ fontSize: '0.7rem', padding: '8px' }}
          >
            {showItinerary ? 'Hide Directions' : 'Show Directions'}
          </button>
        </div>

        {targetStation && (
          <div className="glass-panel slide-up" style={{
            padding: '14px 18px',
            borderRadius: '16px',
            borderLeft: '4px solid var(--accent-primary)'
          }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }} className="mono">Active Target</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '4px' }}>{targetStation.name}</div>
          </div>
        )}
      </div>

      <div className="mono" style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        color: 'var(--accent-primary)',
        padding: '8px 12px',
        borderRadius: '6px',
        zIndex: 1000,
        fontSize: '0.7rem',
        border: '1px solid var(--border-light)'
      }}>
        📡 SYSTEM LIVE // {stations.length} STATIONS LOADED
      </div>
    </div>
  );
};

export default SmartMap;

