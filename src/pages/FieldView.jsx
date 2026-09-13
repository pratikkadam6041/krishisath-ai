import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import './FieldView.css';

const ZoneMarker = ({ position, label, status, value, isSelected, onClick }) => {
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Zone Area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 2.5]} />
        <meshStandardMaterial color={status === 'dry' ? '#EF5350' : '#81C784'} opacity={0.5} transparent />
      </mesh>
      
      {/* Sensor Pole */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>
      
      {/* Sensor Node - pulses if selected */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[isSelected ? 0.25 : 0.15]} />
        <meshStandardMaterial color={status === 'dry' ? '#FF1744' : '#1DE9B6'} emissive={isSelected ? (status === 'dry' ? '#FF1744' : '#1DE9B6') : '#000000'} emissiveIntensity={0.5} />
      </mesh>

      <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
        <div className={`zone-tooltip ${status} ${isSelected ? 'selected' : ''}`}>
          <strong>{label}</strong>
          <span>{value}</span>
          {isSelected && <div className="tooltip-action">View details</div>}
        </div>
      </Html>
    </group>
  );
};

const PumpSystem = ({ position, isActive, onClick }) => {
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Main Tank */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.2]} />
        <meshStandardMaterial color="#2196F3" metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Motor */}
      <mesh position={[0.6, 0.2, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.5]} />
        <meshStandardMaterial color={isActive ? "#4CAF50" : "#757575"} />
      </mesh>
      <Html position={[0, 1.6, 0]} center zIndexRange={[100, 0]}>
        <div className={`system-tooltip pump ${isActive ? 'active' : ''}`}>
          <strong>Water Pump</strong>
          <span>{isActive ? 'Running' : 'Idle'}</span>
          <div className="tooltip-action">Tap to toggle</div>
        </div>
      </Html>
    </group>
  );
};

const FertigationSystem = ({ position, level, onClick, isSelected }) => {
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Fertilizer Tank */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 1]} />
        <meshStandardMaterial color="#AB47BC" transparent opacity={0.9} />
      </mesh>
      <Html position={[0, 1.4, 0]} center zIndexRange={[100, 0]}>
        <div className={`system-tooltip fert ${isSelected ? 'selected' : ''}`}>
          <strong>Fertigation</strong>
          <span>{level}% Mix Ready</span>
          {isSelected && <div className="tooltip-action">Configured</div>}
        </div>
      </Html>
    </group>
  );
};

const OperationsHub = ({ position }) => {
  // A small building/shed to anchor the view aesthetically
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[2, 1.5, 1.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.6, 1, 4]} />
        <meshStandardMaterial color="#FF7043" />
      </mesh>
    </group>
  );
};

const FieldView = ({ t }) => {
  const [pumpActive, setPumpActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  return (
    <div className="field-view-container">
      <h2 className="section-title">{t.fieldView || "3D Field Map"}</h2>
      <p className="field-subtitle">{t.dragRotate || "Tap systems to interact. Drag to rotate viewport."}</p>
      
      <div className="canvas-wrapper">
        <Canvas camera={{ position: [5, 8, 12], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 10]} intensity={1.2} />
          
          {/* Base Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} onClick={() => setSelectedElement(null)}>
            <planeGeometry args={[18, 14]} />
            <meshStandardMaterial color="#E8F5E9" />
          </mesh>

          {/* Hub & Infrastructure */}
          <OperationsHub position={[0, 0, -4]} />
          
          <PumpSystem 
            position={[-2, 0, -4]} 
            isActive={pumpActive} 
            onClick={() => {
              setPumpActive(!pumpActive);
              setSelectedElement('pump');
            }} 
          />
          
          <FertigationSystem 
            position={[2, 0, -4]} 
            level={50} 
            isSelected={selectedElement === 'fert'}
            onClick={() => setSelectedElement('fert')}
          />

          {/* Zones */}
          <ZoneMarker 
            position={[-4, 0, 0]} 
            label={t.zone1 || "Zone 1"} 
            status="dry" 
            value={`25% ${t.moistureTrend?.split(' ')[0] || 'Moisture'}`}
            isSelected={selectedElement === 'z1'}
            onClick={() => setSelectedElement('z1')}
          />
          <ZoneMarker 
            position={[4, 0, 0]} 
            label={t.zone2 || "Zone 2"} 
            status="optimal" 
            value={`65% ${t.moistureTrend?.split(' ')[0] || 'Moisture'}`}
            isSelected={selectedElement === 'z2'}
            onClick={() => setSelectedElement('z2')}
          />
          <ZoneMarker 
            position={[-4, 0, 4]} 
            label={t.zone3 || "Zone 3"} 
            status="optimal" 
            value={`58% ${t.moistureTrend?.split(' ')[0] || 'Moisture'}`}
            isSelected={selectedElement === 'z3'}
            onClick={() => setSelectedElement('z3')}
          />
          <ZoneMarker 
            position={[4, 0, 4]} 
            label={t.zone4 || "Zone 4"} 
            status="optimal" 
            value={`70% ${t.moistureTrend?.split(' ')[0] || 'Moisture'}`}
            isSelected={selectedElement === 'z4'}
            onClick={() => setSelectedElement('z4')}
          />
          
          <OrbitControls 
            enablePan={false} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.2} 
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
          />
        </Canvas>
      </div>

      <div className="field-legend">
        <div className="legend-item"><span className="legend-color optimal"></span> {t.optimal || "Optimal"}</div>
        <div className="legend-item"><span className="legend-color dry"></span> {t.needsWater || "Needs Water"}</div>
      </div>
    </div>
  );
};

export default FieldView;
