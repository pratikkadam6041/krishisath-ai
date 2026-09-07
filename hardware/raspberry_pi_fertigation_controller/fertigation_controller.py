#!/usr/bin/env python3
"""
KrishiSarth Raspberry Pi 4 fertigation controller.

Listens to:
  krishisarth/fertigation/cmd/dose
  krishisarth/npk/cmd/tank_a
  krishisarth/npk/cmd/tank_b
  krishisarth/npk/cmd/tank_c

Publishes:
  krishisarth/fertigation/status
  krishisarth/fertigation/flow
  krishisarth/fertigation/tanks
  krishisarth/fertigation/error

The app sends dose JSON like:
{
  "zoneId": "z1",
  "tankA": 120,
  "tankB": 80,
  "tankC": 0,
  "waterDilutionMl": 1000,
  "runSeconds": {"tankA": 67, "tankB": 50, "tankC": 0}
}
"""

from __future__ import annotations

import json
import os
import signal
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import paho.mqtt.client as mqtt
from gpiozero import Button, OutputDevice

try:
    from RPLCD.i2c import CharLCD
except Exception:  # pragma: no cover - optional hardware library
    CharLCD = None


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = BASE_DIR / "config.json"
FALLBACK_CONFIG = BASE_DIR / "config.example.json"

TOPIC_DOSE = "krishisarth/fertigation/cmd/dose"
TOPIC_TANK_A = "krishisarth/npk/cmd/tank_a"
TOPIC_TANK_B = "krishisarth/npk/cmd/tank_b"
TOPIC_TANK_C = "krishisarth/npk/cmd/tank_c"
TOPIC_STATUS = "krishisarth/fertigation/status"
TOPIC_FLOW = "krishisarth/fertigation/flow"
TOPIC_TANKS = "krishisarth/fertigation/tanks"
TOPIC_ERROR = "krishisarth/fertigation/error"

TANK_TOPIC_TO_ID = {
    TOPIC_TANK_A: "tankA",
    TOPIC_TANK_B: "tankB",
    TOPIC_TANK_C: "tankC",
}

TANK_LABELS = {
    "tankA": "Tank A N",
    "tankB": "Tank B P",
    "tankC": "Tank C K",
}


def load_config() -> dict[str, Any]:
    config_path = Path(os.environ.get("KS_FERTIGATION_CONFIG", DEFAULT_CONFIG))
    if not config_path.exists():
        config_path = FALLBACK_CONFIG
    with config_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@dataclass
class FlowSnapshot:
    pulses: int
    total_ml: float
    liters_per_minute: float


class LcdDisplay:
    def __init__(self, config: dict[str, Any]) -> None:
        self.enabled = bool(config.get("enabled", True)) and CharLCD is not None
        self.lcd = None
        if not self.enabled:
            return
        address = int(str(config.get("i2c_address", "0x27")), 16)
        cols = int(config.get("cols", 16))
        rows = int(config.get("rows", 2))
        try:
            self.lcd = CharLCD("PCF8574", address, cols=cols, rows=rows)
            self.lcd.clear()
        except Exception as exc:
            print(f"[LCD] Disabled: {exc}")
            self.enabled = False

    def show(self, line1: str, line2: str = "") -> None:
        print(f"[LCD] {line1} | {line2}")
        if not self.enabled or not self.lcd:
            return
        self.lcd.clear()
        self.lcd.write_string(line1[:16])
        if line2:
            self.lcd.cursor_pos = (1, 0)
            self.lcd.write_string(line2[:16])

    def close(self) -> None:
        if self.enabled and self.lcd:
            self.lcd.clear()
            self.lcd.close(clear=True)


class FertigationController:
    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=config["mqtt"].get("client_id", "KrishiSarth-Pi4-Fertigation"),
        )
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

        pins = config["pins_bcm"]
        active_low = bool(config.get("relay_active_low", True))
        self.relays = {
            "tankA": OutputDevice(pins["tank_a_relay"], active_high=not active_low, initial_value=False),
            "tankB": OutputDevice(pins["tank_b_relay"], active_high=not active_low, initial_value=False),
            "tankC": OutputDevice(pins["tank_c_relay"], active_high=not active_low, initial_value=False),
            "water": OutputDevice(pins["water_relay"], active_high=not active_low, initial_value=False),
        }

        self.flow_sensor = Button(pins["flow_sensor"], pull_up=True, bounce_time=0.001)
        self.flow_sensor.when_pressed = self.on_flow_pulse
        self.flow_lock = threading.Lock()
        self.flow_pulses = 0
        self.last_flow_pulses = 0
        self.last_flow_time = time.monotonic()

        self.lcd = LcdDisplay(config.get("lcd", {}))
        self.busy = False
        self.stop_requested = threading.Event()
        self.worker: threading.Thread | None = None

    def connect(self) -> None:
        mqtt_config = self.config["mqtt"]
        host = mqtt_config.get("host", "broker.hivemq.com")
        port = int(mqtt_config.get("port", 1883))
        keepalive = int(mqtt_config.get("keepalive", 30))
        self.lcd.show("KrishiSarth", "MQTT connecting")
        self.client.connect(host, port, keepalive)
        self.client.loop_start()

    def on_connect(self, client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any = None) -> None:
        print(f"[MQTT] Connected: {reason_code}")
        for topic in [TOPIC_DOSE, TOPIC_TANK_A, TOPIC_TANK_B, TOPIC_TANK_C]:
            client.subscribe(topic)
        self.publish_status("idle", "Ready")
        self.lcd.show("Fertigation", "Ready")

    def on_disconnect(self, client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any = None) -> None:
        print(f"[MQTT] Disconnected: {reason_code}")
        self.all_relays_off()
        self.lcd.show("MQTT offline", "Relays OFF")

    def on_message(self, client: mqtt.Client, userdata: Any, message: mqtt.MQTTMessage) -> None:
        payload = message.payload.decode("utf-8", errors="replace").strip()
        print(f"[MQTT] {message.topic} -> {payload}")
        try:
            if message.topic == TOPIC_DOSE:
                command = json.loads(payload)
                self.start_command(command)
                return

            if message.topic in TANK_TOPIC_TO_ID:
                tank_id = TANK_TOPIC_TO_ID[message.topic]
                ml = float(payload)
                self.start_command({"zoneId": "manual", tank_id: ml, "waterDilutionMl": 0, "mode": "manual_override"})
        except Exception as exc:
            self.publish_error(f"Invalid command: {exc}")

    def on_flow_pulse(self) -> None:
        with self.flow_lock:
            self.flow_pulses += 1

    def reset_flow(self) -> None:
        with self.flow_lock:
            self.flow_pulses = 0
            self.last_flow_pulses = 0
            self.last_flow_time = time.monotonic()

    def read_flow(self) -> FlowSnapshot:
        pulses_per_liter = float(self.config["flow_sensor"].get("pulses_per_liter", 450))
        with self.flow_lock:
            pulses = self.flow_pulses
        now = time.monotonic()
        elapsed = max(0.001, now - self.last_flow_time)
        delta_pulses = pulses - self.last_flow_pulses
        liters_per_minute = (delta_pulses / pulses_per_liter) / elapsed * 60.0
        self.last_flow_pulses = pulses
        self.last_flow_time = now
        total_ml = pulses / pulses_per_liter * 1000.0
        return FlowSnapshot(pulses=pulses, total_ml=total_ml, liters_per_minute=liters_per_minute)

    def publish_json(self, topic: str, payload: dict[str, Any], retain: bool = False) -> None:
        self.client.publish(topic, json.dumps(payload, separators=(",", ":")), retain=retain)

    def publish_status(self, state: str, detail: str = "", command: dict[str, Any] | None = None) -> None:
        payload = {
            "state": state,
            "detail": detail,
            "busy": self.busy,
            "ts": int(time.time()),
        }
        if command:
            payload.update({
                "zoneId": command.get("zoneId"),
                "reportId": command.get("reportId"),
                "targetMl": command.get("targetMl"),
            })
        self.publish_json(TOPIC_STATUS, payload, retain=True)

    def publish_error(self, detail: str) -> None:
        print(f"[ERROR] {detail}")
        self.publish_json(TOPIC_ERROR, {"detail": detail, "ts": int(time.time())}, retain=False)
        self.lcd.show("Fert error", detail[:16])

    def publish_flow(self) -> FlowSnapshot:
        snapshot = self.read_flow()
        payload = {
            "flowLpm": round(snapshot.liters_per_minute, 3),
            "totalMl": round(snapshot.total_ml, 1),
            "pulses": snapshot.pulses,
            "ts": int(time.time()),
        }
        self.publish_json(TOPIC_FLOW, payload, retain=True)
        return snapshot

    def publish_tank_status(self, active_tank: str | None = None) -> None:
        self.publish_json(
            TOPIC_TANKS,
            {
                "activeTank": active_tank,
                "relays": {name: relay.value for name, relay in self.relays.items()},
                "ts": int(time.time()),
            },
            retain=True,
        )

    def zone_fertigation_topic(self, zone_id: str, action: str) -> str:
        return f"krishisarth/{zone_id}/cmd/fertigation"

    def set_zone_fertigation(self, zone_id: str | None, start: bool) -> None:
        if not zone_id or zone_id == "manual":
            return
        payload = "START" if start else "STOP"
        topic = self.zone_fertigation_topic(zone_id, payload)
        self.client.publish(topic, payload)

    def start_command(self, command: dict[str, Any]) -> None:
        if self.busy:
            self.publish_error("Controller busy. Wait for current dose to finish.")
            return
        self.stop_requested.clear()
        self.worker = threading.Thread(target=self.run_command, args=(command,), daemon=True)
        self.worker.start()

    def tank_run_seconds(self, command: dict[str, Any], tank_id: str) -> float:
        configured = command.get("runSeconds", {}).get(tank_id)
        if configured is not None:
            return float(configured)
        dose_ml = float(command.get(tank_id, 0) or 0)
        ml_per_second = float(self.config["tank_calibration_ml_per_second"].get(tank_id, 1.5))
        return dose_ml / max(0.1, ml_per_second)

    def run_tank(self, tank_id: str, seconds: float) -> None:
        if seconds <= 0:
            return
        max_seconds = float(self.config["safety"].get("max_tank_run_seconds", 180))
        seconds = min(seconds, max_seconds)
        label = TANK_LABELS[tank_id]
        self.publish_tank_status(active_tank=tank_id)
        self.lcd.show(label, f"{seconds:.0f}s dosing")
        print(f"[DOSE] {label} for {seconds:.1f}s")
        relay = self.relays[tank_id]
        relay.on()
        started = time.monotonic()
        try:
            while time.monotonic() - started < seconds:
                if self.stop_requested.is_set():
                    break
                time.sleep(0.1)
        finally:
            relay.off()
            self.publish_tank_status(active_tank=None)

    def run_water_flush(self, target_ml: float) -> None:
        if target_ml <= 0 or not self.config["water_flush"].get("enabled", True):
            return
        max_seconds = float(self.config["water_flush"].get("max_seconds", 180))
        min_flow_lpm = float(self.config["flow_sensor"].get("min_flow_lpm_alarm", 0.2))
        self.lcd.show("Water flush", f"Target {target_ml:.0f}ml")
        self.relays["water"].on()
        started = time.monotonic()
        last_publish = 0.0
        try:
            while time.monotonic() - started < max_seconds:
                if self.stop_requested.is_set():
                    break
                snapshot = self.publish_flow()
                if time.monotonic() - started > 8 and snapshot.liters_per_minute < min_flow_lpm:
                    self.publish_error("Low or no water flow detected.")
                if snapshot.total_ml >= target_ml:
                    break
                if time.monotonic() - last_publish > 2:
                    self.lcd.show("Flow", f"{snapshot.total_ml:.0f}/{target_ml:.0f}ml")
                    last_publish = time.monotonic()
                time.sleep(float(self.config["flow_sensor"].get("publish_interval_seconds", 1)))
        finally:
            self.relays["water"].off()
            self.publish_flow()

    def run_command(self, command: dict[str, Any]) -> None:
        self.busy = True
        self.reset_flow()
        zone_id = command.get("zoneId")
        self.publish_status("running", "Dose started", command)
        self.lcd.show("Dose started", str(zone_id or "manual")[:16])
        self.set_zone_fertigation(zone_id, True)

        total_limit = float(self.config["safety"].get("max_total_run_seconds", 600))
        started = time.monotonic()

        try:
            for tank_id in ["tankA", "tankB", "tankC"]:
                if time.monotonic() - started > total_limit:
                    raise RuntimeError("Total run time limit reached.")
                self.run_tank(tank_id, self.tank_run_seconds(command, tank_id))

            settle_seconds = float(self.config["water_flush"].get("settle_seconds_after_tanks", 3))
            if settle_seconds > 0:
                time.sleep(settle_seconds)

            self.run_water_flush(float(command.get("waterDilutionMl", 0) or 0))
            self.publish_status("complete", "Dose complete", command)
            self.lcd.show("Dose complete", str(zone_id or "manual")[:16])
        except Exception as exc:
            self.publish_error(str(exc))
            self.publish_status("error", str(exc), command)
        finally:
            self.all_relays_off()
            self.set_zone_fertigation(zone_id, False)
            self.busy = False
            self.publish_tank_status(active_tank=None)

    def all_relays_off(self) -> None:
        for relay in self.relays.values():
            relay.off()

    def stop(self) -> None:
        self.stop_requested.set()
        self.all_relays_off()
        self.publish_status("stopped", "Controller stopped")
        self.lcd.show("Stopped", "Relays OFF")
        self.client.loop_stop()
        self.client.disconnect()
        self.lcd.close()


def main() -> int:
    config = load_config()
    controller = FertigationController(config)

    def handle_signal(signum: int, frame: Any) -> None:
        print(f"[SYSTEM] Signal {signum}; shutting down")
        controller.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    controller.connect()
    try:
        while True:
            time.sleep(1)
    finally:
        controller.stop()


if __name__ == "__main__":
    raise SystemExit(main())
