import React from 'react';

const Navbar = ({ activeView, setActiveView }) => {
  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid px-4">
        <a className="navbar-brand mono" href="#" style={{ 
          fontWeight: 900, 
          fontSize: '1.25rem',
          letterSpacing: '1px',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span> EV_SYNC_CORE
        </a>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          style={{ 
            borderColor: 'var(--border-medium)',
            background: 'rgba(255,255,255,0.05)'
          }}
        >
          <span className="navbar-toggler-icon" style={{ filter: 'invert(1)' }}></span>
        </button>
        
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav gap-3">
            <li className="nav-item">
              <button
                className={`nav-link mono ${activeView === 'map' || activeView === 'recommendations' ? 'active' : ''}`}
                onClick={() => setActiveView('map')}
                style={{ 
                  background: 'transparent',
                  color: (activeView === 'map' || activeView === 'recommendations') 
                    ? 'var(--accent-primary)' 
                    : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                [ SYNC_MAP ]
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link mono ${activeView === 'grid' ? 'active' : ''}`}
                onClick={() => setActiveView('grid')}
                style={{ 
                  background: 'transparent',
                  color: activeView === 'grid' 
                    ? 'var(--accent-primary)' 
                    : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                [ GRID_STATUS ]
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
