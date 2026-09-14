import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default leaflet markers
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function FarmLocationSetup({ initialBoundary, onSave, onCancel }) {
    const { t } = useTranslation();
    const [boundary, setBoundary] = useState(initialBoundary || []);
    const [center, setCenter] = useState([20.5937, 78.9629]); // Default to India center
    const [zoom, setZoom] = useState(5);

    useEffect(() => {
        if (initialBoundary && initialBoundary.length > 0) {
            // Find center of boundery
            let latSum = 0;
            let lngSum = 0;
            initialBoundary.forEach(pt => {
                latSum += pt[0];
                lngSum += pt[1];
            });
            setCenter([latSum / initialBoundary.length, lngSum / initialBoundary.length]);
            setZoom(15);
        } else {
            // Try to get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    setCenter([position.coords.latitude, position.coords.longitude]);
                    setZoom(16);
                });
            }
        }
    }, [initialBoundary]);

    const handleSave = () => {
        onSave(boundary);
    };

    const clearBoundary = () => {
        setBoundary([]);
    };

    function MapClickHandler() {
        useMapEvents({
            click(e) {
                setBoundary(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
            }
        });
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-2 dark:text-white">{t('geoFarm.setupLocation')}</h3>
            <p className="text-sm text-gray-500 mb-4">Tap on the map to draw your farm boundaries.</p>
            
            <div className="h-64 rounded-xl overflow-hidden mb-4 border border-gray-200 dark:border-gray-600 relative z-0">
                <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler />
                    {boundary.length > 0 && (
                        <Polygon positions={boundary} color="green" fillColor="green" fillOpacity={0.3} />
                    )}
                    {boundary.map((pos, idx) => (
                        <Marker key={idx} position={pos} />
                    ))}
                </MapContainer>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={clearBoundary}
                    className="flex-1 py-3 font-semibold text-gray-600 bg-gray-100 rounded-xl"
                >
                    Clear All
                </button>
                <button 
                    onClick={handleSave}
                    disabled={boundary.length < 3}
                    className={`flex-1 py-3 font-semibold text-white rounded-xl ${
                        boundary.length < 3 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    Save Boundary
                </button>
                <button 
                    onClick={onCancel}
                    className="py-3 px-4 font-semibold text-red-600 bg-red-50 rounded-xl"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
