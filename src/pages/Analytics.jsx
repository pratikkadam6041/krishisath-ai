import React from 'react';
import { BarChart2, TrendingUp, Droplet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Analytics.css';

const Analytics = ({ t }) => {
  const moistureData = [
    { name: 'Mon', value: 40 },
    { name: 'Tue', value: 30 },
    { name: 'Wed', value: 60 },
    { name: 'Thu', value: 80 },
    { name: 'Fri', value: 50 },
    { name: 'Sat', value: 30 },
    { name: 'Sun', value: 20 },
  ];

  const waterUsageData = [
    { day: 'M', usage: 150 },
    { day: 'T', usage: 120 },
    { day: 'W', usage: 180 },
    { day: 'T', usage: 220 },
    { day: 'F', usage: 160 },
    { day: 'S', usage: 100 },
    { day: 'S', usage: 80 },
  ];

  return (
    <div className="analytics-container">
      <h2 className="section-title">{t.waterUsage}</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Droplet size={24} className="text-blue" />
          </div>
          <span className="stat-value">1,250 L</span>
          <span className="stat-label">{t.usedThisWeek}</span>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <TrendingUp size={24} className="text-green" />
          </div>
          <span className="stat-value">25%</span>
          <span className="stat-label">{t.savedLastWeek}</span>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>Weekly Water Usage</h3>
        </div>
        <div className="chart-wrapper">
           <ResponsiveContainer width="100%" height={160}>
             <BarChart data={waterUsageData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
               <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
               <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
               <Bar dataKey="usage" fill="#2196F3" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      <h2 className="section-title">{t.moistureTrends}</h2>
      <div className="chart-card">
        <div className="chart-header">
          <h3>{t.zone1Moisture}</h3>
          <span className="chart-timeframe">{t.last7Days}</span>
        </div>
        
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={moistureData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
              <Area type="monotone" dataKey="value" stroke="#2E7D32" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2 className="section-title">{t.detailedReports}</h2>
      <div className="reports-list">
        <button className="report-item">
          <BarChart2 size={20} className="text-secondary" />
          <span>{t.monthlyYield}</span>
        </button>
        <button className="report-item">
          <BarChart2 size={20} className="text-secondary" />
          <span>{t.nutrientLog}</span>
        </button>
      </div>

    </div>
  );
};

export default Analytics;
