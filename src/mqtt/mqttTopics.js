// All MQTT topic constants for KrishiSarth AI

export const TOPICS = {
  // Subscribe — Zone 1
  Z1_MOISTURE:   'krishisarth/z1/moisture',
  Z1_TEMP:       'krishisarth/z1/temp',
  Z1_HUMIDITY:   'krishisarth/z1/humidity',
  Z1_PH:         'krishisarth/z1/ph',
  Z1_EC:         'krishisarth/z1/ec',
  Z1_NPK:        'krishisarth/z1/npk',
  Z1_FLOW:       'krishisarth/z1/flow',

  // Subscribe — Zone 2
  Z2_MOISTURE:   'krishisarth/z2/moisture',
  Z2_TEMP:       'krishisarth/z2/temp',
  Z2_HUMIDITY:   'krishisarth/z2/humidity',
  Z2_PH:         'krishisarth/z2/ph',
  Z2_EC:         'krishisarth/z2/ec',
  Z2_NPK:        'krishisarth/z2/npk',
  Z2_FLOW:       'krishisarth/z2/flow',

  // Subscribe — Weather
  WEATHER_RAIN:  'krishisarth/weather/rain_prob',
  WEATHER_TEMP:  'krishisarth/weather/temp',

  // Publish — Zone 1 commands
  Z1_CMD_PUMP:        'krishisarth/z1/cmd/pump',
  Z1_CMD_VALVE:       'krishisarth/z1/cmd/valve',
  Z1_CMD_FERTIGATION: 'krishisarth/z1/cmd/fertigation',

  // Publish — Zone 2 commands
  Z2_CMD_PUMP:        'krishisarth/z2/cmd/pump',
  Z2_CMD_VALVE:       'krishisarth/z2/cmd/valve',
  Z2_CMD_FERTIGATION: 'krishisarth/z2/cmd/fertigation',

  // Publish — NPK tanks
  NPK_CMD_TANK_A: 'krishisarth/npk/cmd/tank_a',
  NPK_CMD_TANK_B: 'krishisarth/npk/cmd/tank_b',
  NPK_CMD_TANK_C: 'krishisarth/npk/cmd/tank_c',
  FERTIGATION_CMD_DOSE: 'krishisarth/fertigation/cmd/dose',
  FERTIGATION_STATUS: 'krishisarth/fertigation/status',
  FERTIGATION_FLOW: 'krishisarth/fertigation/flow',
  FERTIGATION_TANKS: 'krishisarth/fertigation/tanks',
  FERTIGATION_ERROR: 'krishisarth/fertigation/error',
};

// All subscribe topics as array
export const SUBSCRIBE_TOPICS = [
  TOPICS.Z1_MOISTURE, TOPICS.Z1_TEMP, TOPICS.Z1_HUMIDITY,
  TOPICS.Z1_PH, TOPICS.Z1_EC, TOPICS.Z1_NPK, TOPICS.Z1_FLOW,
  TOPICS.Z2_MOISTURE, TOPICS.Z2_TEMP, TOPICS.Z2_HUMIDITY,
  TOPICS.Z2_PH, TOPICS.Z2_EC, TOPICS.Z2_NPK, TOPICS.Z2_FLOW,
  TOPICS.WEATHER_RAIN, TOPICS.WEATHER_TEMP,
];

// Map topic to zone and sensor field
export const TOPIC_MAP = {
  [TOPICS.Z1_MOISTURE]: { zone: 'z1', field: 'moisture' },
  [TOPICS.Z1_TEMP]:     { zone: 'z1', field: 'temperature' },
  [TOPICS.Z1_HUMIDITY]: { zone: 'z1', field: 'humidity' },
  [TOPICS.Z1_PH]:       { zone: 'z1', field: 'ph' },
  [TOPICS.Z1_EC]:       { zone: 'z1', field: 'ec' },
  [TOPICS.Z1_NPK]:      { zone: 'z1', field: 'npk' },
  [TOPICS.Z1_FLOW]:     { zone: 'z1', field: 'flow' },
  [TOPICS.Z2_MOISTURE]: { zone: 'z2', field: 'moisture' },
  [TOPICS.Z2_TEMP]:     { zone: 'z2', field: 'temperature' },
  [TOPICS.Z2_HUMIDITY]: { zone: 'z2', field: 'humidity' },
  [TOPICS.Z2_PH]:       { zone: 'z2', field: 'ph' },
  [TOPICS.Z2_EC]:       { zone: 'z2', field: 'ec' },
  [TOPICS.Z2_NPK]:      { zone: 'z2', field: 'npk' },
  [TOPICS.Z2_FLOW]:     { zone: 'z2', field: 'flow' },
};

// Payload values for commands
export const CMD = {
  PUMP_ON: 'ON', PUMP_OFF: 'OFF',
  VALVE_OPEN: 'OPEN', VALVE_CLOSE: 'CLOSE',
  FERT_START: 'START', FERT_STOP: 'STOP',
};

// Dynamic topics for any zone id (preferred)
export { getPumpTopic, getValveTopic, getFertTopic, buildSubscribeTopics, buildTopicMap } from '../utils/zoneSync.js';

// Legacy z1/z2 aliases
export const getPumpTopicLegacy = (zoneId) =>
  zoneId === 'z1' ? TOPICS.Z1_CMD_PUMP : zoneId === 'z2' ? TOPICS.Z2_CMD_PUMP : `krishisarth/${zoneId}/cmd/pump`;
export const getValveTopicLegacy = (zoneId) =>
  zoneId === 'z1' ? TOPICS.Z1_CMD_VALVE : zoneId === 'z2' ? TOPICS.Z2_CMD_VALVE : `krishisarth/${zoneId}/cmd/valve`;
export const getFertTopicLegacy = (zoneId) =>
  zoneId === 'z1' ? TOPICS.Z1_CMD_FERTIGATION : zoneId === 'z2' ? TOPICS.Z2_CMD_FERTIGATION : `krishisarth/${zoneId}/cmd/fertigation`;
