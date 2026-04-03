#include "PubSubClient.h"
#include <WiFi.h>

/*
 * EDGE PROCESSING NODE - REACT DASHBOARD VERSION
 * Broker: test.mosquitto.org (No Auth)
 * Topic: drainage/data
 */

// ------------------- CONFIGURATION ------------------- //
const char *ssid = "YOUR_WIFI_SSID";       // <-- Replace with your WiFi SSID
const char *password = "YOUR_WIFI_PASSWORD"; // <-- Replace with your WiFi password

// Mosquitto Broker (Public)
const char *mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;
const char *mqtt_topic = "drainage/data";

// Pin Definitions
#define TRIGGER_PIN 5
#define ECHO_PIN 18
#define FLOW_PIN 19
#define BATTERY_PIN 34

// Constants
const float PIPE_DEPTH_CM = 50.0;
const float THRESHOLD_WARNING = 20.0;
const float THRESHOLD_ALERT = 35.0;
const float THRESHOLD_CRITICAL = 45.0;

WiFiClient espClient;
PubSubClient client(espClient);

// Globals
volatile int flow_pulse_count = 0;
float flow_rate_lpm = 0.0;
unsigned long last_time = 0;
float prev_water_level = 0.0;

void IRAM_ATTR pulseCounter() { flow_pulse_count++; }

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(BATTERY_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  prev_water_level = readWaterLevel();
}

void setup_wifi() {
  delay(10);
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32Client-UniqueId")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

float readWaterLevel() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0)
    return -1.0;
  float distance_cm = duration * 0.034 / 2;
  float level = PIPE_DEPTH_CM - distance_cm;
  return (level < 0) ? 0.0 : level;
}

int readBattery() {
  int raw = analogRead(BATTERY_PIN);
  // Assuming 2x voltage divider (100k/100k) and 3.3V reference
  // 3.3V = 4095
  // Voltage = (raw / 4095.0) * 3.3 * 2;
  // Map 3.3V (0%) to 4.2V (100%) roughly for LiPo
  // This is a rough estimation.
  float voltage =
      (raw / 4095.0) * 3.3 * 2; // Adjust multiplier based on actual divider
  int percentage = map((long)(voltage * 100), 300, 420, 0, 100);
  if (percentage < 0)
    percentage = 0;
  if (percentage > 100)
    percentage = 100;
  return percentage;
}

void calculateFlow(unsigned long elapsed_ms) {
  detachInterrupt(digitalPinToInterrupt(FLOW_PIN));
  float hz = (flow_pulse_count * 1000.0) / elapsed_ms;
  flow_rate_lpm = hz / 7.5;
  flow_pulse_count = 0;
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);
}

void loop() {
  if (!client.connected())
    reconnect();
  client.loop();

  unsigned long current_time = millis();
  unsigned long elapsed = current_time - last_time;

  if (elapsed >= 1000) {
    calculateFlow(elapsed);
    float water_level = readWaterLevel();
    if (water_level < 0)
      water_level = prev_water_level;

    int battery_level = readBattery();

    // Advanced Logic (Same as ThingsBoard version)
    float delta_level = water_level - prev_water_level;
    float elapsed_min = elapsed / 60000.0;
    if (elapsed_min == 0) elapsed_min = 0.001;
    float rise_rate = (delta_level / elapsed_min);
    if (abs(rise_rate) > 100)
      rise_rate = 0;

    float remaining_height = PIPE_DEPTH_CM - water_level;
    float eta_min = -1.0;
    if (rise_rate > 0.5 && remaining_height > 0) {
      eta_min = remaining_height / rise_rate;
    }

    String state = "NORMAL";
    if (water_level >= THRESHOLD_CRITICAL)
      state = "OVERFLOW_RISK";
    else if (water_level >= THRESHOLD_ALERT)
      state = "PARTIAL_BLOCK";
    else if (water_level >= THRESHOLD_WARNING && flow_rate_lpm < 2.0 && rise_rate > 0)
      state = "EARLY_SEDIMENTATION";

    // JSON Payload
    String payload = "{";
    payload += "\"flow_lpm\":";
    payload += String(flow_rate_lpm, 2);
    payload += ",";
    payload += "\"water_level_cm\":";
    payload += String(water_level, 2);
    payload += ",";
    payload += "\"rise_rate_cm_per_min\":";
    payload += String(rise_rate, 2);
    payload += ",";
    payload += "\"overflow_eta_min\":";
    payload += (eta_min < 0) ? "null" : String(eta_min, 1);
    payload += ",";
    payload += "\"state\":\"";
    payload += state;
    payload += "\",";
    String alert_level = "NORMAL";
    if (state == "OVERFLOW_RISK") alert_level = "CRITICAL";
    else if (state == "PARTIAL_BLOCK") alert_level = "ALERT";
    else if (state == "EARLY_SEDIMENTATION") alert_level = "WARNING";

    payload += "\"alert_level\":\"";
    payload += alert_level;
    payload += "\",";
    payload += "\"battery_level\":";
    payload += String(battery_level);
    payload += "}";

    Serial.println(payload);
    client.publish(mqtt_topic, payload.c_str());

    prev_water_level = water_level;
    last_time = current_time;
  }
}
