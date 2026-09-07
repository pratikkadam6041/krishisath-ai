# Raspberry Pi 4 Fertigation Controller

This controller connects the KrishiSarth app to the NPK dosing hardware.

It listens to MQTT dose commands from the app, runs Tank A/B/C relays, reads a water flow sensor, updates a 16x2 I2C LCD, and publishes live status back to MQTT.

## MQTT Topics

Subscribed:

- `krishisarth/fertigation/cmd/dose`
- `krishisarth/npk/cmd/tank_a`
- `krishisarth/npk/cmd/tank_b`
- `krishisarth/npk/cmd/tank_c`

Published:

- `krishisarth/fertigation/status`
- `krishisarth/fertigation/flow`
- `krishisarth/fertigation/tanks`
- `krishisarth/fertigation/error`

The Pi also publishes `START` / `STOP` to `krishisarth/<zoneId>/cmd/fertigation` so your existing NodeMCU + Arduino pump/valve chain opens the correct zone while dosing.

## Suggested Wiring (BCM GPIO)

| Device | Raspberry Pi GPIO |
| --- | --- |
| Tank A relay - Nitrogen | GPIO5 |
| Tank B relay - Phosphorus | GPIO6 |
| Tank C relay - Potassium | GPIO13 |
| Water/flush relay | GPIO19 |
| Flow sensor signal | GPIO17 |
| LCD SDA | GPIO2 / physical pin 3 |
| LCD SCL | GPIO3 / physical pin 5 |

Important:

- Use a separate relay/pump power supply. Do not power dosing pumps from the Pi.
- Tie Pi GND and relay module GND together.
- If the flow sensor signal is 5V, use a level shifter or divider before GPIO17.
- Many relay modules are active-low. `relay_active_low` is `true` in the sample config.

## Install On Raspberry Pi

```bash
cd ~/krishisarth-ai/hardware/raspberry_pi_fertigation_controller
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp config.example.json config.json
python fertigation_controller.py
```

Enable I2C for the LCD:

```bash
sudo raspi-config
```

Then choose `Interface Options` -> `I2C` -> enable.

## Run As A Service

Copy `krishisarth-fertigation.service` to systemd:

```bash
sudo cp krishisarth-fertigation.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable krishisarth-fertigation
sudo systemctl start krishisarth-fertigation
sudo journalctl -u krishisarth-fertigation -f
```

Edit the service file path if your repo is not at `/home/pi/krishisarth-ai`.

## Flow Calibration

Default config uses `450` pulses per liter, common for YF-S201-style sensors. Calibrate your sensor by running exactly 1 liter through it, reading pulse count from the MQTT flow payload, then updating:

```json
"flow_sensor": {
  "pulses_per_liter": 450
}
```
