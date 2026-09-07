// KrishiSarth Central Actuator
// Arduino Uno
//
// ─── HARDWARE LAYOUT ────────────────────────────────────────────
//   2-Channel Relay Module (Songle SRD-05VDC-SL-C)
//     IN1  ──► Arduino D8   → PUMP
//     IN2  ──► Arduino D9   → ZONE 1 VALVE
//     VCC  ──► Arduino 5V
//     GND  ──► Arduino GND
//
//   1-Channel Relay Module (Songle SRD-05VDC-SL-C)
//     IN1  ──► Arduino D10  → ZONE 2 VALVE
//     VCC  ──► Arduino 5V
//     GND  ──► Arduino GND
//
//   NodeMCU Z1 D1  ──► Arduino D7   (Zone 1 irrigation signal)
//   NodeMCU Z2 D1  ──► Arduino D5   (Zone 2 irrigation signal)
//
// ─── SAFETY ─────────────────────────────────────────────────────
//   We now use active-LOW signaling from the ESP8266s.
//   The Arduino uses its internal INPUT_PULLUP resistors.
//   If a wire is unplugged or the ESP is booting, the pin is 
//   pulled HIGH internally, which safely means "OFF".
//   NO EXTERNAL RESISTORS ARE NEEDED!
// ────────────────────────────────────────────────────────────────

const uint8_t SIGNAL_ZONE1_PIN  = 7;
const uint8_t SIGNAL_ZONE2_PIN  = 5;

const uint8_t PUMP_RELAY_PIN    = 8;   // 2-ch relay IN1
const uint8_t VALVE1_RELAY_PIN  = 9;   // 2-ch relay IN2
const uint8_t VALVE2_RELAY_PIN  = 10;  // 1-ch relay IN1

// 2-channel relay module (pump + valve1) — active-LOW:
//   LOW  = relay energised (circuit CLOSED / device ON)
//   HIGH = relay de-energised (circuit OPEN / device OFF)
const uint8_t RELAY_ON  = LOW;
const uint8_t RELAY_OFF = HIGH;

// 1-channel relay module (valve2) — logic is INVERTED vs 2-channel module.
// This happens when the module is active-HIGH, OR when it is wired to the
// NC (Normally Closed) terminal instead of NO (Normally Open).
// Set true  → software inverts the signal so ON=ON, OFF=OFF.
// Set false → if you rewire to NO terminal or get a matching module.
const bool VALVE2_INVERT = true;

// How many consecutive identical reads before accepting a signal change.
// At 50 ms loop delay, DEBOUNCE_COUNT = 3 means 150 ms debounce time.
const uint8_t  DEBOUNCE_COUNT          = 3;
const unsigned long LOOP_DELAY_MS      = 50UL;
const unsigned long STATUS_PRINT_INTERVAL_MS = 2000UL;
const unsigned long STARTUP_SETTLE_MS  = 500UL;   // wait for ESPs to stabilise

// ── State ────────────────────────────────────────────────────────
bool confirmedZone1 = false;
bool confirmedZone2 = false;
bool lastPumpState  = false;

uint8_t zone1Ticks = 0;   // debounce counters
uint8_t zone2Ticks = 0;

unsigned long lastStatusPrintAt = 0;

// ── Relay helper ─────────────────────────────────────────────────
void setRelay(uint8_t pin, bool enable) {
  digitalWrite(pin, enable ? RELAY_ON : RELAY_OFF);
}

// ── Serial status print ──────────────────────────────────────────
void printState(bool z1, bool z2, bool pump) {
  Serial.print("[ACT] Z1=");
  Serial.print(z1 ? "ON " : "OFF");
  Serial.print(" | Z2=");
  Serial.print(z2 ? "ON " : "OFF");
  Serial.print(" | Valve1=");
  Serial.print(z1 ? "OPEN  " : "CLOSED");
  Serial.print(" | Valve2=");
  Serial.print(z2 ? "OPEN  " : "CLOSED");
  Serial.print(" | Pump=");
  Serial.println(pump ? "ON" : "OFF");
}

// ── Debounce a single signal pin ─────────────────────────────────
// Returns true if the pin is actively pulled LOW (requested).
bool readSignal(uint8_t pin, bool currentConfirmed, uint8_t &ticks) {
  // Active-LOW: LOW means the ESP is requesting irrigation
  bool isRequested = (digitalRead(pin) == LOW);

  if (isRequested == currentConfirmed) {
    ticks = 0;
    return currentConfirmed;
  }

  ticks++;
  if (ticks >= DEBOUNCE_COUNT) {
    ticks = 0;
    return isRequested;   // accept the change
  }

  return currentConfirmed;  // not yet stable, hold old value
}

// ── Apply relays & print on change ───────────────────────────────
void applyOutputs(bool z1, bool z2) {
  const bool pump = z1 || z2;

  setRelay(VALVE1_RELAY_PIN, z1);
  setRelay(VALVE2_RELAY_PIN, VALVE2_INVERT ? !z2 : z2);  // invert if 1-ch relay logic is flipped
  setRelay(PUMP_RELAY_PIN,   pump);

  const bool changed =
    z1   != confirmedZone1 ||
    z2   != confirmedZone2 ||
    pump != lastPumpState;

  if (changed || millis() - lastStatusPrintAt >= STATUS_PRINT_INTERVAL_MS) {
    printState(z1, z2, pump);
    lastStatusPrintAt = millis();
  }

  confirmedZone1 = z1;
  confirmedZone2 = z2;
  lastPumpState  = pump;
}

// ── Setup ────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  Serial.println();
  Serial.println("KrishiSarth Central Actuator - Booting");

  // Use internal pull-ups.
  // HIGH = idle/disconnected, LOW = active/irrigating.
  pinMode(SIGNAL_ZONE1_PIN, INPUT_PULLUP);
  pinMode(SIGNAL_ZONE2_PIN, INPUT_PULLUP);

  // Relay outputs — drive HIGH first (de-energise) before setting OUTPUT
  // to prevent a brief relay click on power-up.
  digitalWrite(PUMP_RELAY_PIN,   RELAY_OFF);
  digitalWrite(VALVE1_RELAY_PIN, RELAY_OFF);
  digitalWrite(VALVE2_RELAY_PIN, RELAY_OFF);
  pinMode(PUMP_RELAY_PIN,   OUTPUT);
  pinMode(VALVE1_RELAY_PIN, OUTPUT);
  pinMode(VALVE2_RELAY_PIN, OUTPUT);

  // Give ESPs time to boot and pull signals LOW (idle) before we start reading.
  delay(STARTUP_SETTLE_MS);

  Serial.println("Ready. Listening for zone signals...");
}

// ── Loop ─────────────────────────────────────────────────────────
void loop() {
  bool z1 = readSignal(SIGNAL_ZONE1_PIN, confirmedZone1, zone1Ticks);
  bool z2 = readSignal(SIGNAL_ZONE2_PIN, confirmedZone2, zone2Ticks);

  applyOutputs(z1, z2);
  delay(LOOP_DELAY_MS);
}
