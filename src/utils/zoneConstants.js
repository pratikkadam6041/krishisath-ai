/** Default physical params per zone for twin / ML simulation (fallback by id or generic). */
const DEFAULT_ZONE_PHYSICS = {
  areaM2: 5000,
  soilDepthM: 0.3,
  fieldCapacity: 85,
  wiltingPoint: 15,
  pumpFlowLpm: 25,
};

const OVERRIDES = {
  z1: { areaM2: 6000, pumpFlowLpm: 25 },
  z2: { areaM2: 4000, pumpFlowLpm: 25 },
};

export function getZonePhysics(zoneId) {
  return { ...DEFAULT_ZONE_PHYSICS, ...OVERRIDES[zoneId] };
}
