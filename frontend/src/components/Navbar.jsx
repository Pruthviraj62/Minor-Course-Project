import React from 'react';

const Navbar = ({ activeView, setActiveView, theme, toggleTheme, onBack }) => {
  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid px-4">
        <div className="d-flex align-items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="btn btn-ghost mono"
              style={{ fontSize: '1.2rem', padding: '8px' }}
              title="Return to Landing Page"
            >
              ⬅️
            </button>
          )}
          <a className="navbar-brand mono" href="#" style={{ 
            fontWeight: 900, 
            fontSize: '1.25rem',
            letterSpacing: '1px',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: 0
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span> EV_SYNC_CORE
          </a>
        </div>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          style={{ 
            borderColor: 'var(--border-medium)',
            background: 'var(--bg-accent)'
          }}
        >
          <span className="navbar-toggler-icon" style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}></span>
        </button>
        
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav gap-3 align-items-center">
            <li className="nav-item">
              <button 
                onClick={toggleTheme}
                className="btn btn-ghost mono"
                style={{ fontSize: '1.2rem', padding: '8px' }}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </li>
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
