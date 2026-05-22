import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content fade-in">
          <div className="mono" style={{ color: 'var(--accent-primary)', marginBottom: '16px', fontWeight: 800 }}>
            // NEXT_GEN EV_INFRASTRUCTURE
          </div>
          <h1>Empowering the <span style={{ color: 'var(--accent-primary)' }}>Electric Revolution</span></h1>
          <p>
            Experience the most advanced EV charging management platform. 
            Powered by neural navigation, real-time grid load forecasting, and ML-driven range analytics.
          </p>
          <div className="d-flex gap-3">
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Launch Dashboard 🚀
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
              Explore Technology
            </button>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <div className="stats-banner">
        <div className="stat-item">
          <h2>71+</h2>
          <p>Real Stations</p>
        </div>
        <div className="stat-item">
          <h2>90%</h2>
          <p>District Coverage</p>
        </div>
        <div className="stat-item">
          <h2>3+</h2>
          <p>ML Models Active</p>
        </div>
        <div className="stat-item">
          <h2>0.0</h2>
          <p>Tailpipe CO₂</p>
        </div>
      </div>

      {/* Why We Are Unique */}
      <section className="section-padding">
        <div className="text-center mb-5">
          <h2 className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>// THE_DIFFERENCE</h2>
          <h2 style={{ fontSize: '2.5rem' }}>What makes us unique?</h2>
        </div>

        <div className="uniqueness-grid">
          <div className="unique-card">
            <span className="icon">🗺️</span>
            <h3>Neural Road Routing</h3>
            <p>
              Unlike other platforms that use straight-line distance, we integrate a full **OSRM Navigation Engine**. 
              Our Dijkstra/A* optimized paths calculate real road geometry, providing 100% accurate time and distance estimates.
            </p>
          </div>

          <div className="unique-card">
            <span className="icon">🔋</span>
            <h3>Context-Aware Range</h3>
            <p>
              Our ML Range Predictor doesn't just look at battery %. It factor in **real-time weather** (Cold, Rain, Heat), 
              driving velocity, and vehicle specs to give you a "Projected Battery at Arrival" with high precision.
            </p>
          </div>

          <div className="unique-card">
            <span className="icon">⚡</span>
            <h3>Grid-Synced Pricing</h3>
            <p>
              We are the first academic project to implement **Dynamic Demand Pricing**. By forecasting grid load, 
              we shift charging demand to off-peak hours, ensuring a sustainable energy ecosystem and lower costs for users.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="section-padding timeline-section">
        <div className="mb-5">
          <h2 className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>// MISSION_ROADMAP</h2>
          <h2 style={{ fontSize: '2.5rem' }}>Growth in Maharashtra</h2>
        </div>

        <div className="timeline">
          <div className="timeline-card">
            <h4 className="mono" style={{ color: 'var(--accent-primary)' }}>Phase 1</h4>
            <p className="mt-3" style={{ fontSize: '0.9rem' }}>
              Deployment of 71 stations across Sangli and Kolhapur districts. Achieving 90% regional infrastructure coverage.
            </p>
          </div>
          <div className="timeline-card">
            <h4 className="mono" style={{ color: 'var(--accent-primary)' }}>Phase 2</h4>
            <p className="mt-3" style={{ fontSize: '0.9rem' }}>
              Integration of Gradient Boosting Regressors for grid load forecasting and real-time peak pricing triggers.
            </p>
          </div>
          <div className="timeline-card">
            <h4 className="mono" style={{ color: 'var(--accent-primary)' }}>Phase 3</h4>
            <p className="mt-3" style={{ fontSize: '0.9rem' }}>
              Launch of the "Reserve Slot" system, allowing users to pre-book chargers and eliminate wait times in high-traffic hubs.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding cta-section">
        <h2 style={{ fontSize: '3rem', fontWeight: 800 }}>Ready to experience <br/>the future?</h2>
        <p className="mt-4 mb-5" style={{ color: 'var(--text-secondary)' }}>
          Join the network and start optimizing your EV journey today.
        </p>
        <button className="btn btn-primary btn-lg px-5 py-3" onClick={onGetStarted}>
          Get Started Now ⚡
        </button>
      </section>

      {/* Footer */}
      <footer className="py-5 px-5 border-top" style={{ borderColor: 'var(--border-light)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div className="mono" style={{ fontWeight: 900, color: 'var(--accent-primary)' }}>
            ⚡ EV_SYNC_CORE
          </div>
          <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            © 2026 // MINOR_COURSE_PROJECT // UNIVERSITY_EDITION
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
