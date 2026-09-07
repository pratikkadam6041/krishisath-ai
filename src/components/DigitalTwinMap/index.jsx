import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react';

export default function DigitalTwinMap({ state, onNodeClick }) {
  const { t } = useTranslation();
  const { z1, z2, tanks, mqttConnected } = state;

  const handleNodeClick = (device, zoneId) => {
    if (onNodeClick) onNodeClick(device, zoneId);
  };

  return (
    <div className="relative w-full aspect-[4/5] bg-[#E8F5E9] rounded-2xl overflow-hidden border border-[#C8E6C9] shadow-inner select-none" id="digital-twin-map">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(#81C784 1px, transparent 1px), linear-gradient(90deg, #81C784 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Zone 1 Area */}
      <div className="absolute top-[5%] left-[5%] w-[42%] h-[40%] border-2 border-dashed border-[#81C784] rounded-xl bg-white bg-opacity-40" />
      <div className="absolute top-[6%] left-[6%]">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{t('twin.zone1Section')}</span>
      </div>

      {/* Zone 2 Area */}
      <div className="absolute top-[5%] right-[5%] w-[42%] h-[40%] border-2 border-dashed border-[#81C784] rounded-xl bg-white bg-opacity-40" />
      <div className="absolute top-[6%] right-[6%]">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{t('twin.zone2Section')}</span>
      </div>

      {/* Central Area */}
      <div className="absolute bottom-[5%] left-[10%] right-[10%] h-[35%] border-2 border-[#81C784] rounded-xl bg-white bg-opacity-60" />
      <div className="absolute bottom-[36%] left-[12%]">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{t('twin.centralSection')}</span>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Pipes Z1 */}
        <path d="M 50% 65% L 25% 65% L 25% 45%" fill="none" stroke="#B3E5FC" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {z1?.flowAnimating && (
          <path d="M 50% 65% L 25% 65% L 25% 45%" className="water-path pointer-events-none" />
        )}

        {/* Pipes Z2 */}
        <path d="M 50% 65% L 75% 65% L 75% 45%" fill="none" stroke="#B3E5FC" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {z2?.flowAnimating && (
          <path d="M 50% 65% L 75% 65% L 75% 45%" className="water-path pointer-events-none" />
        )}
      </svg>

      {/* MQTT Brain (Raspberry Pi) */}
      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className={`w-14 h-14 bg-white rounded-2xl shadow-card flex items-center justify-center border-2 ${mqttConnected ? 'border-primary animate-brain' : 'border-danger'}`}>
          <Leaf size={28} className={mqttConnected ? 'text-primary' : 'text-danger'} />
        </div>
        <div className="mt-1 flex items-center gap-1 bg-white px-2 py-0.5 rounded shadow-sm">
          <span className={`w-2 h-2 rounded-full ${mqttConnected ? 'bg-primary animate-pulse' : 'bg-danger'}`} />
          <span className="text-[10px] font-semibold">Raspberry Pi</span>
        </div>
      </div>

      {/* --- ZONE 1 NODES --- */}
      {/* NodeMCU Z1 */}
      <div className="absolute top-[15%] left-[25%] -translate-x-1/2 flex flex-col items-center">
        <div className="w-8 h-8 bg-[#424242] rounded-lg shadow-sm flex items-center justify-center border-b-2 border-[#212121]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#81C784] animate-pulse" />
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">ESP8266</span>
      </div>

      {/* Soil Sensor Z1 */}
      <div className="absolute top-[30%] left-[15%] -translate-x-1/2 flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full shadow-card flex items-center justify-center relative ${z1?.healthStatus === 'critical' ? 'bg-[#FFEBEE] border-2 border-danger' : 'bg-white border-2 border-primary'}`}>
          {z1?.healthStatus === 'critical' && <span className="absolute -inset-1 rounded-full border-2 border-danger animate-ping opacity-20" />}
          <span className={`text-[11px] font-bold ${z1?.healthStatus === 'critical' ? 'text-danger' : 'text-primary'}`}>{z1?.moisture ?? '--'}%</span>
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">{t('sensor.moisture')}</span>
      </div>

      {/* Valve Z1 */}
      <div
        className={`absolute top-[45%] left-[25%] -translate-x-1/2 flex flex-col items-center pointer-events-auto ${onNodeClick ? 'twin-node' : 'twin-node-view'}`}
        onClick={() => handleNodeClick('valve', 'z1')}
      >
        <div className={`w-10 h-10 rounded-xl shadow-card flex items-center justify-center transition-colors ${z1?.valveOpen ? 'bg-water text-white' : 'bg-white text-[#9E9E9E]'}`}>
          <div className="text-[10px] font-bold leading-none select-none">
            {z1?.valveOpen ? 'OPEN' : 'CLOSE'}
          </div>
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">{t('hardware.valve')}</span>
      </div>

      {/* Pump Z1 */}
      <div
        className={`absolute top-[28%] left-[35%] -translate-x-1/2 flex flex-col items-center pointer-events-auto ${onNodeClick ? 'twin-node' : 'twin-node-view'}`}
        onClick={() => handleNodeClick('pump', 'z1')}
      >
        <div className={`w-12 h-12 rounded-full shadow-card flex items-center justify-center border-4 ${z1?.pumpOn ? 'border-primary bg-white' : 'border-[#E0E0E0] bg-[#FAFAFA]'}`}>
          <div className={`w-6 h-6 border-[3px] rounded-sm ${z1?.pumpOn ? 'border-primary animate-pump-spin' : 'border-[#9E9E9E]'}`} />
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">{t('hardware.pump')}</span>
      </div>


      {/* --- ZONE 2 NODES --- */}
      {/* NodeMCU Z2 */}
      <div className="absolute top-[15%] right-[25%] translate-x-1/2 flex flex-col items-center">
        <div className="w-8 h-8 bg-[#424242] rounded-lg shadow-sm flex items-center justify-center border-b-2 border-[#212121]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#81C784] animate-pulse" />
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">ESP8266</span>
      </div>

      {/* Soil Sensor Z2 */}
      <div className="absolute top-[30%] right-[15%] translate-x-1/2 flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full shadow-card flex items-center justify-center relative ${z2?.healthStatus === 'critical' ? 'bg-[#FFEBEE] border-2 border-danger' : 'bg-white border-2 border-primary'}`}>
          {z2?.healthStatus === 'critical' && <span className="absolute -inset-1 rounded-full border-2 border-danger animate-ping opacity-20" />}
          <span className={`text-[11px] font-bold ${z2?.healthStatus === 'critical' ? 'text-danger' : 'text-primary'}`}>{z2?.moisture ?? '--'}%</span>
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">{t('sensor.moisture')}</span>
      </div>

      {/* Valve Z2 */}
      <div
        className={`absolute top-[45%] right-[25%] translate-x-1/2 flex flex-col items-center pointer-events-auto ${onNodeClick ? 'twin-node' : 'twin-node-view'}`}
        onClick={() => handleNodeClick('valve', 'z2')}
      >
        <div className={`w-10 h-10 rounded-xl shadow-card flex items-center justify-center transition-colors ${z2?.valveOpen ? 'bg-water text-white' : 'bg-white text-[#9E9E9E]'}`}>
          <div className="text-[10px] font-bold leading-none select-none">
            {z2?.valveOpen ? 'OPEN' : 'CLOSE'}
          </div>
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">{t('hardware.valve')}</span>
      </div>

      {/* Pump Z2 */}
      <div
        className={`absolute top-[28%] right-[35%] translate-x-1/2 flex flex-col items-center pointer-events-auto ${onNodeClick ? 'twin-node' : 'twin-node-view'}`}
        onClick={() => handleNodeClick('pump', 'z2')}
      >
        <div className={`w-12 h-12 rounded-full shadow-card flex items-center justify-center border-4 ${z2?.pumpOn ? 'border-primary bg-white' : 'border-[#E0E0E0] bg-[#FAFAFA]'}`}>
          <div className={`w-6 h-6 border-[3px] rounded-sm ${z2?.pumpOn ? 'border-primary animate-pump-spin' : 'border-[#9E9E9E]'}`} />
        </div>
        <span className="text-[9px] font-semibold mt-1 bg-white px-1 rounded shadow-sm opacity-80">{t('hardware.pump')}</span>
      </div>


      {/* --- NPK TANKS --- */}
      <div className="absolute bottom-[8%] left-[15%] right-[15%] flex justify-between px-4 pointer-events-auto">
        {[
          { id: 'tankA', color: '#2E7D32', label: 'N' },
          { id: 'tankB', color: '#0277BD', label: 'P' },
          { id: 'tankC', color: '#F9A825', label: 'K' }
        ].map((tank) => (
          <div
            key={tank.id}
            className={`flex flex-col items-center ${onNodeClick ? 'twin-node' : 'twin-node-view'}`}
            onClick={() => handleNodeClick(tank.id, 'z1')}
          >
            <div className="w-10 h-14 bg-white rounded-t-lg rounded-b-md shadow-card border border-[#E0E0E0] overflow-hidden relative flex flex-col justify-end">
              <div
                className="w-full opacity-80 transition-all duration-1000"
                style={{ height: `${tanks[tank.id] ?? 0}%`, backgroundColor: tank.color }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-800 mix-blend-overlay pointer-events-none">
                {tank.label}
              </span>
            </div>
            <span className="text-[8px] font-semibold mt-1 opacity-80 bg-white px-1 rounded">{t(`hardware.${tank.id}`)}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
