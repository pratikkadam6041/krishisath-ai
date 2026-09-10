# KrishiSarth Hardware Code

This folder contains the hardware firmware/scripts that match the current app MQTT topics.

## Folders

- `zone1_scout/zone1_scout.ino` - NodeMCU / ESP8266 for Zone 1 sensors and zone command signal.
- `zone2_scout/zone2_scout.ino` - NodeMCU / ESP8266 for Zone 2 sensors and zone command signal.
- `central_actuator/central_actuator.ino` - Arduino Uno relay controller for main pump and zone valves.
- `raspberry_pi_fertigation_controller/` - Raspberry Pi 4 NPK dosing controller with flow sensor and I2C LCD.

## Current Hardware Flow

1. App sends water commands to:
   - `krishisarth/z1/cmd/pump`
   - `krishisarth/z1/cmd/valve`
   - `krishisarth/z2/cmd/pump`
   - `krishisarth/z2/cmd/valve`

2. Zone NodeMCU receives command and sends HIGH/LOW signal to Arduino.

3. Arduino opens the correct valve and turns main pump ON if either zone asks for water.

4. App sends fertigation dose JSON to:
   - `krishisarth/fertigation/cmd/dose`

5. Raspberry Pi 4 doses Tank A/B/C, monitors flow, updates LCD, and publishes status.

6. Raspberry Pi 4 also sends:
   - `krishisarth/z1/cmd/fertigation`
   - `krishisarth/z2/cmd/fertigation`

   This lets your existing NodeMCU + Arduino chain open the correct zone while fertigation runs.

## Changes Made From Your Existing Code

- Zone 1 calibration corrected to Air `750`, Water `340`.
- Zone 2 calibration kept as Air `850`, Water `320`.
- Zone scouts now retry Wi-Fi without hanging forever and print the exact Wi-Fi/MQTT failure reason in Serial Monitor.
- Moisture telemetry is published every `500 ms`; DHT temperature/humidity telemetry is published every `2500 ms`.
- Zone scouts now subscribe to `cmd/fertigation` in addition to pump and valve commands.
- Raspberry Pi 4 controller added for NPK relays, flow sensor, LCD, MQTT status, and zone fertigation start/stop.

## Wi-Fi / MQTT Troubleshooting

### Local broker (hackathon setup)

- From the project folder, run `npm run local`. This starts the laptop-only MQTT broker on TCP `1883` and the dashboard on HTTP port `8000`.
- Both scout sketches point to the laptop's current hotspot IPv4 address (`10.227.75.71`) on port `1883`. If the laptop reconnects to a different network and its IPv4 changes, update `MQTT_SERVER` in both sketches and flash them again.
- The dashboard uses the same laptop broker through `ws://localhost:8080`; it does not fall back to an online MQTT service.

- ESP8266 connects only to `2.4GHz` Wi-Fi. It will not connect to `5GHz`.
- Avoid public/captive-login Wi-Fi. If a phone or laptop must open a browser login page first, the ESP8266 cannot complete that login.
- If Serial Monitor shows `ssid_not_found`, check the SSID spelling and 2.4GHz network availability.
- If Serial Monitor shows `connect_failed`, check the Wi-Fi password/security mode.
- If Serial Monitor shows MQTT `rc=-2` or `rc=-4`, Wi-Fi is connected but TCP to the MQTT broker failed. Check internet access and whether port `1883` is blocked.

## Safety Notes

- Keep pump/relay supplies separate from Pi/NodeMCU power.
- Use common GND only where required by the relay/signal design.
- Use a level shifter for 5V flow sensor signal into Raspberry Pi GPIO.
- Test every relay with pumps disconnected first.
