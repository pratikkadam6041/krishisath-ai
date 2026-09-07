#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

#define ZONE_NUMBER 1

const char* WIFI_SSID = "Public Wifi";
const char* WIFI_PASSWORD = "Pk18@2004";
const char* MQTT_SERVER = "10.52.208.71";
const uint16_t MQTT_PORT = 1883;

#define DHTPIN D2
#define DHTTYPE DHT11

const uint8_t SOIL_PIN = A0;
const uint8_t SIGNAL_TO_ARDUINO_PIN = D1;

#if ZONE_NUMBER == 1
const int AIR_VALUE = 770;
const int WATER_VALUE = 313;
const char* ZONE_ID = "z1";
const char* CLIENT_ID_PREFIX = "KrishiSarth-Z1-";
const char* TOPIC_MOISTURE = "krishisarth/z1/moisture";
const char* TOPIC_TEMP = "krishisarth/z1/temp";
const char* TOPIC_HUMIDITY = "krishisarth/z1/humidity";
const char* TOPIC_CMD_PUMP = "krishisarth/z1/cmd/pump";
const char* TOPIC_CMD_VALVE = "krishisarth/z1/cmd/valve";
const char* TOPIC_CMD_FERTIGATION = "krishisarth/z1/cmd/fertigation";
const char* TOPIC_CMD_MODE = "krishisarth/z1/cmd/mode";
const char* TOPIC_CMD_THRESHOLD = "krishisarth/z1/cmd/threshold";
const char* TOPIC_STATUS_PUMP = "krishisarth/z1/status/pump";
const char* TOPIC_STATUS_MODE = "krishisarth/z1/status/mode";
const char* TOPIC_STATUS_THRESHOLD = "krishisarth/z1/status/threshold";
const char* TOPIC_STATUS_REASON = "krishisarth/z1/status/reason";
const char* TOPIC_STATUS_ONLINE = "krishisarth/z1/status/online";
#else
const int AIR_VALUE = 850;
const int WATER_VALUE = 320;
const char* ZONE_ID = "z2";
const char* CLIENT_ID_PREFIX = "KrishiSarth-Z2-";
const char* TOPIC_MOISTURE = "krishisarth/z2/moisture";
const char* TOPIC_TEMP = "krishisarth/z2/temp";
const char* TOPIC_HUMIDITY = "krishisarth/z2/humidity";
const char* TOPIC_CMD_PUMP = "krishisarth/z2/cmd/pump";
const char* TOPIC_CMD_VALVE = "krishisarth/z2/cmd/valve";
const char* TOPIC_CMD_FERTIGATION = "krishisarth/z2/cmd/fertigation";
const char* TOPIC_CMD_MODE = "krishisarth/z2/cmd/mode";
const char* TOPIC_CMD_THRESHOLD = "krishisarth/z2/cmd/threshold";
const char* TOPIC_STATUS_PUMP = "krishisarth/z2/status/pump";
const char* TOPIC_STATUS_MODE = "krishisarth/z2/status/mode";
const char* TOPIC_STATUS_THRESHOLD = "krishisarth/z2/status/threshold";
const char* TOPIC_STATUS_REASON = "krishisarth/z2/status/reason";
const char* TOPIC_STATUS_ONLINE = "krishisarth/z2/status/online";
#endif

const char* TOPIC_SYSTEM_MODE = "krishisarth/system/mode";

const unsigned long MOISTURE_INTERVAL_MS = 3000UL; // 3 seconds (avoids spam-banning on public broker)
const unsigned long ENV_INTERVAL_MS = 10000UL;   // 10 seconds
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000UL;
const unsigned long WIFI_RETRY_DELAY_MS = 3000UL;
const unsigned long WIFI_SCAN_INTERVAL_MS = 30000UL;
const unsigned long MQTT_RETRY_DELAY_MS = 10000UL;  // 10 s between attempts — reduces log spam
const unsigned long MAX_IRRIGATION_RUNTIME_MS = 30UL * 60UL * 1000UL;

const uint8_t DEFAULT_STOP_THRESHOLD = 50;
const uint8_t MIN_THRESHOLD = 20;
const uint8_t MAX_THRESHOLD = 90;

enum FarmMode {
  MODE_VIEW,
  MODE_ACT
};

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

FarmMode currentMode = MODE_ACT;
bool irrigationRequested = false;
uint8_t stopThreshold = DEFAULT_STOP_THRESHOLD;
int lastMoisture = -1;

unsigned long lastMoistureReadAt = 0;
unsigned long lastEnvReadAt = 0;
unsigned long lastWifiReconnectAttemptAt = 0;
unsigned long lastWifiScanAt = 0;
unsigned long lastMqttReconnectAttemptAt = 0;
unsigned long irrigationStartedAt = 0;

const char* wifiStatusLabel(int status) {
  switch (status) {
    case WL_IDLE_STATUS: return "idle";
    case WL_NO_SSID_AVAIL: return "ssid_not_found";
    case WL_SCAN_COMPLETED: return "scan_completed";
    case WL_CONNECTED: return "connected";
    case WL_CONNECT_FAILED: return "connect_failed";
    case WL_CONNECTION_LOST: return "connection_lost";
    case WL_DISCONNECTED: return "disconnected";
    default: return "unknown";
  }
}

void printConfiguredWifiScan() {
  unsigned long now = millis();

  if (lastWifiScanAt != 0 && now - lastWifiScanAt < WIFI_SCAN_INTERVAL_MS) {
    return;
  }

  lastWifiScanAt = now;
  Serial.println("[Wi-Fi] Scanning for configured SSID...");

  int networkCount = WiFi.scanNetworks();
  bool found = false;

  Serial.print("[Wi-Fi] Networks found: ");
  Serial.println(networkCount);

  for (int i = 0; i < networkCount; i++) {
    Serial.print("  ");
    Serial.print(i + 1);
    Serial.print(". ");
    Serial.print(WiFi.SSID(i));
    Serial.print(" | RSSI=");
    Serial.print(WiFi.RSSI(i));
    Serial.print(" dBm | Channel=");
    Serial.print(WiFi.channel(i));
    Serial.print(" | Encryption=");
    Serial.println(WiFi.encryptionType(i));

    if (WiFi.SSID(i) == WIFI_SSID) {
      found = true;
    }
  }

  if (!found) {
    Serial.println("[Wi-Fi] Configured SSID not found. Copy exact 2.4GHz SSID.");
  }

  WiFi.scanDelete();
}

bool connectWiFi(bool force = false) {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  unsigned long now = millis();

  if (!force && lastWifiReconnectAttemptAt != 0 && now - lastWifiReconnectAttemptAt < WIFI_RETRY_DELAY_MS) {
    return false;
  }

  lastWifiReconnectAttemptAt = now;

  Serial.println();
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
  WiFi.setOutputPower(20.5);

  if (force) {
    WiFi.disconnect();
    delay(100);
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
    yield();
  }

  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.print("[Wi-Fi] Failed. Status=");
    Serial.print(WiFi.status());
    Serial.print(" (");
    Serial.print(wifiStatusLabel(WiFi.status()));
    Serial.println(")");
    Serial.println("[Wi-Fi] Check SSID/password, 2.4GHz, no captive login.");
    printConfiguredWifiScan();
    return false;
  }

  lastWifiReconnectAttemptAt = 0;
  lastMqttReconnectAttemptAt = 0;

  Serial.print("[Wi-Fi] Connected. IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[Wi-Fi] RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  return true;
}

void publishRetained(const char* topic, const char* payload) {
  if (client.connected()) {
    client.publish(topic, payload, true);
  }
}

void publishThresholdStatus() {
  char buffer[8];
  snprintf(buffer, sizeof(buffer), "%u", stopThreshold);
  publishRetained(TOPIC_STATUS_THRESHOLD, buffer);
}

void publishModeStatus() {
  publishRetained(TOPIC_STATUS_MODE, currentMode == MODE_ACT ? "ACT" : "VIEW");
}

void publishPumpStatus(const char* reason) {
  publishRetained(TOPIC_STATUS_PUMP, irrigationRequested && currentMode == MODE_ACT ? "ON" : "OFF");

  if (reason && reason[0] != '\0') {
    publishRetained(TOPIC_STATUS_REASON, reason);
  }
}

void applyZoneOutput(const char* reason) {
  bool shouldRun = irrigationRequested; // Runs whenever requested, regardless of mode (allows Auto AI in VIEW mode)
  // Active-LOW signaling to Arduino
  digitalWrite(SIGNAL_TO_ARDUINO_PIN, shouldRun ? LOW : HIGH);

  if (shouldRun && irrigationStartedAt == 0) {
    irrigationStartedAt = millis();
  }

  if (!shouldRun) {
    irrigationStartedAt = 0;
  }

  publishModeStatus();
  publishThresholdStatus();
  publishPumpStatus(reason);

  Serial.print("[");
  Serial.print(ZONE_ID);
  Serial.print("] Mode=");
  Serial.print(currentMode == MODE_ACT ? "ACT (Manual)" : "VIEW (AI Auto)");
  Serial.print(" | Pump=");
  Serial.print(shouldRun ? "ON" : "OFF");
  Serial.print(" | Threshold=");
  Serial.print(stopThreshold);
  Serial.print("%");

  if (reason && reason[0] != '\0') {
    Serial.print(" | Reason=");
    Serial.print(reason);
  }

  Serial.println();
}

void stopIrrigation(const char* reason) {
  irrigationRequested = false;
  applyZoneOutput(reason);
}

void startIrrigation(const char* reason) {
  // Allow manual start in ACT mode, OR automatic start in VIEW mode
  if (currentMode != MODE_ACT && strcmp(reason, "AUTO_START") != 0) {
    publishPumpStatus("IGNORED_VIEW_MODE");
    return;
  }

  if (lastMoisture >= 0 && lastMoisture >= stopThreshold) {
    irrigationRequested = false;
    applyZoneOutput("BLOCKED_THRESHOLD_ALREADY_MET");
    return;
  }

  irrigationRequested = true;
  applyZoneOutput(reason);
}

void setMode(FarmMode nextMode, const char* reason) {
  currentMode = nextMode;

  if (currentMode == MODE_VIEW) {
    irrigationRequested = false;
  }

  applyZoneOutput(reason);
}

void updateThreshold(uint8_t nextThreshold) {
  stopThreshold = constrain(nextThreshold, MIN_THRESHOLD, MAX_THRESHOLD);
  publishThresholdStatus();

  if (irrigationRequested && lastMoisture >= stopThreshold) {
    stopIrrigation("AUTO_STOP_THRESHOLD_UPDATED");
  }
}

void subscribeTopics() {
  client.subscribe(TOPIC_CMD_PUMP);
  client.subscribe(TOPIC_CMD_VALVE);
  client.subscribe(TOPIC_CMD_FERTIGATION);
  client.subscribe(TOPIC_CMD_MODE);
  client.subscribe(TOPIC_CMD_THRESHOLD);
  client.subscribe(TOPIC_SYSTEM_MODE);
}

const char* mqttStateLabel(int state) {
  switch (state) {
    case -4: return "connection_timeout";
    case -3: return "connection_lost";
    case -2: return "tcp_connect_failed";
    case -1: return "disconnected";
    case 0: return "connected";
    case 1: return "bad_protocol";
    case 2: return "bad_client_id";
    case 3: return "server_unavailable";
    case 4: return "bad_credentials";
    case 5: return "not_authorized";
    default: return "unknown";
  }
}

void reconnectMqtt() {
  if (client.connected()) return;

  unsigned long now = millis();

  if (now - lastMqttReconnectAttemptAt < MQTT_RETRY_DELAY_MS) {
    return;
  }

  lastMqttReconnectAttemptAt = now;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] Waiting for Wi-Fi before MQTT connect.");
    return;
  }

  Serial.print("[MQTT] Connecting to ");
  Serial.print(MQTT_SERVER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print(" ... ");

  // Stable client ID — broker recognises the same device on reconnect
  String clientId = String(CLIENT_ID_PREFIX) + String(ESP.getChipId(), HEX);

  if (client.connect(
        clientId.c_str(),
        nullptr,              // username
        nullptr,              // password
        TOPIC_STATUS_ONLINE,  // LWT topic
        1,                    // LWT QoS
        true,                 // LWT retain
        "offline"             // LWT payload — sent by broker on unexpected disconnect
      )) {
    Serial.println("connected!");
    client.publish(TOPIC_STATUS_ONLINE, "online", true);
    subscribeTopics();
    applyZoneOutput("MQTT_CONNECTED");
    return;
  }

  int state = client.state();
  Serial.print("failed rc=");
  Serial.print(state);
  Serial.print(" (");
  Serial.print(mqttStateLabel(state));
  Serial.println(")");

  if (state == -2 || state == -4) {
    Serial.println("[MQTT] TCP connection failed. Will retry...");
  }
}

void handleModePayload(const char* payload) {
  if (strcmp(payload, "ACT") == 0) {
    setMode(MODE_ACT, "MODE_ACTIVATED");
  }

  if (strcmp(payload, "VIEW") == 0) {
    setMode(MODE_VIEW, "MODE_VIEW_ACTIVATED");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[64];
  unsigned int copyLen = min(length, sizeof(message) - 1);
  memcpy(message, payload, copyLen);
  message[copyLen] = '\0';

  Serial.print("[MQTT] ");
  Serial.print(topic);
  Serial.print(" -> ");
  Serial.println(message);

  if (
    strcmp(topic, TOPIC_CMD_PUMP) == 0 ||
    strcmp(topic, TOPIC_CMD_VALVE) == 0 ||
    strcmp(topic, TOPIC_CMD_FERTIGATION) == 0
  ) {
    if (strcmp(message, "ON") == 0 || strcmp(message, "OPEN") == 0 || strcmp(message, "START") == 0) {
      startIrrigation(strcmp(topic, TOPIC_CMD_FERTIGATION) == 0 ? "REMOTE_FERTIGATION_START" : "REMOTE_START");
      return;
    }

    if (strcmp(message, "OFF") == 0 || strcmp(message, "CLOSE") == 0 || strcmp(message, "STOP") == 0) {
      stopIrrigation(strcmp(topic, TOPIC_CMD_FERTIGATION) == 0 ? "REMOTE_FERTIGATION_STOP" : "REMOTE_STOP");
      return;
    }
  }

  if (strcmp(topic, TOPIC_CMD_MODE) == 0 || strcmp(topic, TOPIC_SYSTEM_MODE) == 0) {
    handleModePayload(message);
    return;
  }

  if (strcmp(topic, TOPIC_CMD_THRESHOLD) == 0) {
    int nextThreshold = atoi(message);
    if (nextThreshold > 0) {
      updateThreshold((uint8_t)nextThreshold);
    }
  }
}

int readMoisturePercent() {
  int raw = analogRead(SOIL_PIN);
  int moisture = map(raw, AIR_VALUE, WATER_VALUE, 0, 100);
  moisture = constrain(moisture, 0, 100);

  Serial.print("[");
  Serial.print(ZONE_ID);
  Serial.print("] Soil raw=");
  Serial.print(raw);
  Serial.print(" -> ");
  Serial.print(moisture);
  Serial.println("%");

  return moisture;
}

void publishFloat(const char* topic, float value) {
  if (!client.connected()) return;

  char buffer[16];
  dtostrf(value, 0, 1, buffer);
  client.publish(topic, buffer, true);
}

void checkAutoStop() {
  if (!irrigationRequested) {
    return;
  }

  if (lastMoisture >= stopThreshold) {
    stopIrrigation("AUTO_STOP_MOISTURE_REACHED");
    return;
  }

  if (irrigationStartedAt > 0 && millis() - irrigationStartedAt >= MAX_IRRIGATION_RUNTIME_MS) {
    stopIrrigation("AUTO_STOP_MAX_RUNTIME");
  }
}

void checkAutoStart() {
  // Only auto-start if in VIEW mode (which acts as AI Auto mode), and not already irrigating
  if (currentMode != MODE_VIEW || irrigationRequested || lastMoisture < 0) {
    return;
  }

  // Start when moisture drops 15% below the stop threshold to prevent rapid ON/OFF cycling
  int startThreshold = stopThreshold > 15 ? stopThreshold - 15 : 0;
  
  if (lastMoisture <= startThreshold) {
    startIrrigation("AUTO_START");
  }
}

void publishMoistureTelemetry() {
  lastMoisture = readMoisturePercent();

  if (client.connected()) {
    char moistureBuffer[8];
    snprintf(moistureBuffer, sizeof(moistureBuffer), "%d", lastMoisture);
    client.publish(TOPIC_MOISTURE, moistureBuffer, true);
  }

  checkAutoStop();
}

void publishEnvironmentTelemetry() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (!isnan(temperature)) {
    publishFloat(TOPIC_TEMP, temperature);
  } else {
    Serial.print("[");
    Serial.print(ZONE_ID);
    Serial.println("] DHT temperature read failed.");
  }

  if (!isnan(humidity)) {
    publishFloat(TOPIC_HUMIDITY, humidity);
  } else {
    Serial.print("[");
    Serial.print(ZONE_ID);
    Serial.println("] DHT humidity read failed.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println();
  Serial.print("--- KrishiSarth ");
  Serial.print(ZONE_ID);
  Serial.println(" Scout Booting ---");

  pinMode(SIGNAL_TO_ARDUINO_PIN, OUTPUT);
  digitalWrite(SIGNAL_TO_ARDUINO_PIN, HIGH); // Default OFF (active-LOW)

  dht.begin();
  connectWiFi(true);

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  client.setKeepAlive(60);
  client.setSocketTimeout(5);
  client.setBufferSize(256);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    if (client.connected()) {
      client.disconnect();
    }
    connectWiFi();
    return;
  }

  reconnectMqtt();

  if (client.connected()) {
    client.loop();
  }

  unsigned long now = millis();
  if (now - lastMoistureReadAt >= MOISTURE_INTERVAL_MS) {
    publishMoistureTelemetry();
    checkAutoStart();
    checkAutoStop();
    lastMoistureReadAt = now;
  }

  if (millis() - lastEnvReadAt >= ENV_INTERVAL_MS) {
    lastEnvReadAt = millis();
    publishEnvironmentTelemetry();
  }
}