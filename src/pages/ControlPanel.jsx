import React, { useState } from 'react';
import { Power, Timer, Droplets, Beaker } from 'lucide-react';
import './ControlPanel.css';

const ControlPanel = ({ t }) => {
  const [selectedTime, setSelectedTime] = useState(20);
  const [fertigationLevel, setFertigationLevel] = useState(50);
  const [isPumpActive, setIsPumpActive] = useState(false);

  const timeOptions = [10, 20, 30, 60];

  return (
    <div className="control-container">
      <h2 className="section-title">{t.manualControl}</h2>
      
      {/* Zone Selector */}
      <div className="control-card">
        <h3>{t.targetZone}</h3>
        <div className="zone-selector">
          <button className="zone-btn active">{t.zone1}</button>
          <button className="zone-btn">{t.zone2}</button>
          <button className="zone-btn">{t.allZones}</button>
        </div>
      </div>

      {/* Timer Control */}
      <div className="control-card">
        <div className="card-header-flex">
          <h3>{t.duration}</h3>
          <Timer size={20} className="text-secondary" />
        </div>
        
        <div className="time-selector">
          {timeOptions.map(time => (
            <button 
              key={time}
              className={`time-btn ${selectedTime === time ? 'active' : ''}`}
              onClick={() => setSelectedTime(time)}
            >
              {time} <span className="mins">{t.min}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fertigation Control */}
      <div className="control-card">
        <div className="card-header-flex">
          <h3>{t.fertigationInjection}</h3>
          <Beaker size={20} className="text-secondary" />
        </div>
        
        <div className="slider-container">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={fertigationLevel}
            onChange={(e) => setFertigationLevel(e.target.value)}
            className="styled-slider"
          />
          <div className="slider-labels">
            <span>{t.waterOnly}</span>
            <span className="slider-value">{fertigationLevel}% {t.mix}</span>
            <span>{t.max}</span>
          </div>
        </div>
        
        <button className="btn-inject">
          <Droplets size={16} /> {t.injectNow}
        </button>
      </div>

      {/* Master Action */}
      <div className={`master-control ${isPumpActive ? 'active-bg' : ''}`}>
        <button 
          className={`btn-master ${isPumpActive ? 'stop' : 'start'}`}
          onClick={() => setIsPumpActive(!isPumpActive)}
        >
          <Power size={28} />
          <span>{isPumpActive ? t.stopPump : t.startPump}</span>
        </button>
        <p className="master-status">
          {isPumpActive 
            ? `${t.pumpRunning} • ${selectedTime} ${t.min} ${t.remaining}`
            : t.systemIdle
          }
        </p>
      </div>

    </div>
  );
};

export default ControlPanel;
