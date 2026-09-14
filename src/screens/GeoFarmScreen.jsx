import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Map as MapIcon, Layers, Crosshair } from 'lucide-react';
import { useZoneStore } from '../store/zoneStore.js';
import { useGeoFarmStore } from '../store/geoFarmStore.js';
import FarmLocationSetup from '../components/FarmLocationSetup.jsx';
import ZoneIntelligenceCard from '../components/ZoneIntelligenceCard.jsx';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';

export default function GeoFarmScreen() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { zones, weatherCache } = useZoneStore();
    const { farmBoundary, zoneLocations, updateFarmBoundary } = useGeoFarmStore();
    
    const [isEditingBoundary, setIsEditingBoundary] = useState(false);
    const [mapLayer, setMapLayer] = useState('satellite'); // 'street' or 'satellite'

    const handleSaveBoundary = (boundary) => {
        updateFarmBoundary(boundary);
        setIsEditingBoundary(false);
    };

    // Calculate map center based on boundary or default
    let center = [20.5937, 78.9629];
    let zoom = 5;
    
    if (farmBoundary && farmBoundary.length > 0) {
        let latSum = 0;
        let lngSum = 0;
        farmBoundary.forEach(pt => {
            latSum += pt[0];
            lngSum += pt[1];
        });
        center = [latSum / farmBoundary.length, lngSum / farmBoundary.length];
        zoom = 16;
    }

    const tileUrls = {
        street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        // Note: For a real app, use a proper satellite tile provider (requires API key usually, e.g., Mapbox)
        // Here we use a generic placeholder or just Esri World Imagery if it's open (Esri World Imagery is openly usable for many cases)
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="flex items-center p-4">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold dark:text-white flex-1">{t('geoFarm.title')}</h1>
                    <MapIcon className="text-green-600 dark:text-green-400" size={24} />
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-3xl mx-auto">
                {/* Map View */}
                {isEditingBoundary ? (
                    <FarmLocationSetup 
                        initialBoundary={farmBoundary} 
                        onSave={handleSaveBoundary} 
                        onCancel={() => setIsEditingBoundary(false)} 
                    />
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                        {/* Map Controls Overlay */}
                        <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
                             <button 
                                 onClick={() => setMapLayer(mapLayer === 'street' ? 'satellite' : 'street')}
                                 className="p-2 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
                             >
                                 <Layers size={20} />
                             </button>
                             <button 
                                 onClick={() => setIsEditingBoundary(true)}
                                 className="p-2 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
                             >
                                 <Crosshair size={20} />
                             </button>
                        </div>
                        
                        <div className="h-64 w-full rounded-xl overflow-hidden relative z-0">
                             {!farmBoundary || farmBoundary.length === 0 ? (
                                 <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center z-10 p-6 text-center">
                                     <MapIcon size={48} className="text-gray-400 mb-4" />
                                     <h3 className="font-bold text-gray-700 dark:text-gray-200">No Farm Boundary Set</h3>
                                     <p className="text-sm text-gray-500 mt-2 mb-4">Set up your farm location to enable GeoFarm intelligence.</p>
                                     <button 
                                         onClick={() => setIsEditingBoundary(true)}
                                         className="px-6 py-2 bg-green-600 text-white font-bold rounded-full shadow-md pb"
                                     >
                                         Set Location
                                     </button>
                                 </div>
                             ) : (
                                 <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        attribution={mapLayer === 'street' ? '&copy; OpenStreetMap' : '&copy; Esri'}
                                        url={tileUrls[mapLayer]}
                                    />
                                    <Polygon positions={farmBoundary} color="#16a34a" fillColor="#22c55e" fillOpacity={0.2} weight={3} />
                                    
                                    {/* Map markers for zones if available */}
                                    {Object.entries(zoneLocations).map(([id, loc]) => {
                                        if (loc.lat && loc.lng) {
                                            return (
                                                <Marker key={id} position={[loc.lat, loc.lng]}>
                                                    <Popup>
                                                        <strong>{zones[id]?.name || 'Zone'}</strong><br/>
                                                        Moisture: {zones[id]?.moisture}%
                                                    </Popup>
                                                </Marker>
                                            );
                                        }
                                        return null;
                                    })}
                                 </MapContainer>
                             )}
                        </div>
                    </div>
                )}

                {/* Zone Intelligence List */}
                <div>
                    <h2 className="text-lg font-bold mb-3 ml-1 dark:text-white">Digital Agronomy</h2>
                    <div className="space-y-4">
                        {Object.values(zones).map(zone => (
                            <ZoneIntelligenceCard 
                                key={zone.id}
                                zone={zone}
                                weather={weatherCache}
                                onClick={() => navigate(`/zone/${zone.id}`)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
