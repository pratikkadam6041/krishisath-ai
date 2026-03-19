import { useState } from 'react';
import './App.css';
import { Sprout, LayoutDashboard, BrainCog, SlidersHorizontal, BarChart3, Globe, MapPin } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import AIRecommendation from './pages/AIRecommendation';
import ControlPanel from './pages/ControlPanel';
import Analytics from './pages/Analytics';
import FieldView from './pages/FieldView';
import { translations } from './translations';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState('English');

  const languages = ['English', 'हिंदी', 'मराठी', 'தமிழ்', 'ਪੰਜਾਬੀ'];
  const t = translations[language] || translations['English'];

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={24} />, label: t.dashboard },
    { id: 'ai', icon: <BrainCog size={24} />, label: t.smartAI },
    { id: 'field', icon: <MapPin size={24} />, label: t.fieldView || "3D Field" },
    { id: 'control', icon: <SlidersHorizontal size={24} />, label: t.control },
    { id: 'analytics', icon: <BarChart3 size={24} />, label: t.analytics },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard t={t} />;
      case 'ai': return <AIRecommendation t={t} />;
      case 'field': return <FieldView t={t} />;
      case 'control': return <ControlPanel t={t} />;
      case 'analytics': return <Analytics t={t} />;
      default: return <Dashboard t={t} />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <Sprout size={28} color="white" />
          </div>
          <div>
            <h1>KrishiSarth AI</h1>
            <span className="subtitle">{t.subtitle}</span>
          </div>
        </div>
        
        <div className="language-selector">
          <Globe size={20} className="lang-icon" />
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="main-content">
        {renderContent()}
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button 
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
