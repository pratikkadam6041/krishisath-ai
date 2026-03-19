import React from 'react';
import { Droplet, Leaf, Activity, ChevronRight, Droplets, ThermometerSun, FlaskConical, LineChart } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = ({ t }) => {
  const miniChartData = [
    { value: 40 }, { value: 30 }, { value: 60 }, { value: 80 }, { value: 50 }, { value: 65 }
  ];

  return (
    <div className="dashboard-container">
      {/* Top Summary Cards */}
      <section className="summary-grid">
        <div className="summary-card">
          <div className="icon-wrapper blue">
            <Droplet size={20} />
          </div>
          <div className="summary-info">
            <span className="value">450L</span>
            <span className="label">{t.waterSaved}</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="icon-wrapper green">
            <Leaf size={20} />
          </div>
          <div className="summary-info">
            <span className="value">{t.excellent}</span>
            <span className="label">{t.cropHealth}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="icon-wrapper primary">
            <Activity size={20} />
          </div>
          <div className="summary-info">
            <span className="value">{t.active}</span>
            <span className="label">{t.systemStatus}</span>
          </div>
        </div>
      </section>

      {/* Zone Cards */}
      <h2 className="section-title">{t.irrigationZones}</h2>
      <section className="zone-list">
        {/* Zone 1 - Needs Water */}
        <div className="zone-card status-warning">
          <div className="zone-header">
            <h3>{t.zone1}</h3>
            <span className="status-badge dry">{t.dry}</span>
          </div>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill dry" style={{ width: '25%' }}></div>
            </div>
            <span className="progress-text">25% {t.moistureTrend.split(' ')[0]}</span>
          </div>
          <div className="action-row">
            <span className="action-msg dry-text">{t.needsWater}</span>
            <button className="btn-primary">{t.startIrrigation}</button>
          </div>
        </div>

        {/* Zone 2 - Optimal */}
        <div className="zone-card status-optimal">
          <div className="zone-header">
            <h3>{t.zone2}</h3>
            <span className="status-badge optimal">{t.optimal}</span>
          </div>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill optimal" style={{ width: '65%' }}></div>
            </div>
            <span className="progress-text">65% {t.moistureTrend.split(' ')[0]}</span>
          </div>
          <div className="action-row">
            <span className="action-msg optimal-text">{t.allGood}</span>
            <button className="btn-secondary">{t.viewDetails}</button>
          </div>
        </div>
      </section>

      {/* Sensor Cards */}
      <h2 className="section-title">{t.fieldSensors}</h2>
      <section className="sensor-grid">
        <div className="sensor-card">
          <ThermometerSun size={24} className="sensor-icon text-orange" />
          <span className="sensor-value">28°C</span>
          <span className="sensor-label">{t.temperature}</span>
        </div>
        
        <div className="sensor-card">
          <FlaskConical size={24} className="sensor-icon text-purple" />
          <span className="sensor-value">{t.balanced}</span>
          <span className="sensor-label">{t.nutrients}</span>
        </div>

        <div className="sensor-card">
          <Droplets size={24} className="sensor-icon text-blue" />
          <span className="sensor-value">{t.optimal}</span>
          <span className="sensor-label">{t.soilMoisture}</span>
        </div>
      </section>

      {/* Graph Section */}
      <h2 className="section-title">{t.moistureTrend}</h2>
      <section className="graph-section" style={{ padding: '16px' }}>
        <div style={{ height: '80px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={miniChartData}>
              <defs>
                <linearGradient id="colorMini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#2E7D32" strokeWidth={2} fillOpacity={1} fill="url(#colorMini)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
