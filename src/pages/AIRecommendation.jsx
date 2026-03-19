import React from 'react';
import { Sparkles, Droplets, CloudRain, Sprout, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './AIRecommendation.css';

const AIRecommendation = ({ t }) => {
  return (
    <div className="ai-container">
      <div className="ai-header">
        <Sparkles className="ai-sparkle" size={24} />
        <h2>{t.aiSuggestions}</h2>
      </div>
      
      <div className="ai-cards-list">
        
        {/* Card 1 - Main Action */}
        <div className="ai-card highlight-card">
          <div className="ai-card-header">
            <div className="ai-title">
              <AlertTriangle className="text-orange" size={24} />
              <h3>{t.irrigationNeeded}</h3>
            </div>
            <span className="confidence-badge">94% {t.confidence}</span>
          </div>
          
          <div className="ai-body">
            <p className="primary-action">{t.runPump}</p>
            
            <div className="ai-benefit">
              <Droplets size={16} className="text-blue" />
              <span>{t.optimalRecovery}</span>
            </div>
          </div>
          
          <div className="ai-actions">
            <button className="btn-ai-primary">{t.startNow}</button>
            <button className="btn-ai-secondary">{t.skip}</button>
          </div>
        </div>

        {/* Card 2 - Skip Action */}
        <div className="ai-card secondary-card">
          <div className="ai-card-header">
            <div className="ai-title">
              <CloudRain className="text-blue" size={24} />
              <h3>{t.skipIrrigation}</h3>
            </div>
            <span className="confidence-badge">88% {t.confidence}</span>
          </div>
          
          <div className="ai-body">
            <p className="primary-action">{t.heavyRain}</p>
            
            <div className="ai-benefit">
              <CheckCircle2 size={16} className="text-green" />
              <span>{t.rainDetails}</span>
            </div>
          </div>
          
          <div className="ai-actions single-action">
            <button className="btn-ai-primary outline">{t.acknowledge}</button>
          </div>
        </div>

        {/* Card 3 - Fertilizer */}
        <div className="ai-card secondary-card">
          <div className="ai-card-header">
            <div className="ai-title">
              <Sprout className="text-green" size={24} />
              <h3>{t.addFertilizer}</h3>
            </div>
            <span className="confidence-badge">76% {t.confidence}</span>
          </div>
          
          <div className="ai-body">
            <p className="primary-action">{t.injectUrea}</p>
            
            <div className="ai-benefit">
              <Sparkles size={16} className="text-purple" />
              <span>{t.fertilizerDetails}</span>
            </div>
          </div>
          
          <div className="ai-actions">
            <button className="btn-ai-primary">{t.schedule}</button>
            <button className="btn-ai-secondary">{t.ignore}</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIRecommendation;
