#include "PubSubClient.h"
#include <WiFi.h>

/*
 * EDGE PROCESSING NODE - DRAINAGE MONITORING SYSTEM
 * Hardware: ESP32 + YF-S201 (Flow) + HC-SR04 (Ultrasonic)
 * Protocol: MQTT (ThingsBoard JSON Format)
 *
 * Logic Improvements:
 * - Multi-level state detection (Normal -> Critical) as per requirements.
 * - Time-to-Overflow (ETA) estimation based on rise rate.
 * - Alert persistence to prevent flickering states.
 * - Modular design for sensor reading and logic.
 */

// ------------------- CONFIGURATION ------------------- //
const char *ssid = "YOUR_WIFI_SSID";       // <-- Replace with your WiFi SSID
const char *password = "YOUR_WIFI_PASSWORD"; // <-- Replace with your WiFi password

// MQTT Broker Settings
// Option A: Public Test Broker (No Auth)
// const char *mqtt_server = "test.mosquitto.org";
// const char *mqtt_username = "";
// const char *mqtt_password = "";

// Option B: ThingsBoard (Demo or Local)
const char *mqtt_server =
    "mqtt.eu.thingsboard.cloud"; // Updated to specific host
const char *mqtt_username = "YOUR_THINGSBOARD_ACCESS_TOKEN"; // <-- Replace with your device access token
const char *mqtt_password = "";                                // Leave blank for ThingsBoard

const int mqtt_port = 1883;
const char *mqtt_topic =
    "v1/devices/me/telemetry"; // ThingsBoard Default Telemetry Topic

// Pin Definitions (PRESERVED)
#define TRIGGER_PIN 5 // Ultrasonic Trigger
#define ECHO_PIN 18   // Ultrasonic Echo
#define FLOW_PIN 27   // Flow Sensor (YF-S201)

// Pipe & Threshold Constants
const float PIPE_DEPTH_CM = 50.0; // Total depth of manhole/pipe
const float THRESHOLD_WARNING =
    20.0; // Water level cm for Warning (Early Sedimentation)
const float THRESHOLD_ALERT = 35.0;    // Water level cm for Partial Block
const float THRESHOLD_CRITICAL = 45.0; // Water level cm for Overflow Risk

// Safe Limits
const float MAX_VALID_DISTANCE = 400.0; // HC-SR04 Max range
const float MIN_VALID_DISTANCE = 2.0;

// ----------------------------------------------------- //

WiFiClient espClient;
PubSubClient client(espClient);

// Flow Sensor Globals
volatile int flow_pulse_count = 0;
float flow_rate_lpm = 0.0;
unsigned long last_time = 0;

// State Persistence Globals
String current_state = "NORMAL";
String current_alert = "NORMAL";
float prev_water_level = 0.0;
unsigned long persistence_timer = 0;
const int PERSISTENCE_MS = 2000; // State must be stable for 2s to change

// Interrupt Service Routine
void IRAM_ATTR pulseCounter() { flow_pulse_count++; }

void setup() {
  Serial.begin(115200);

  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);

  // Initial reading to stabilize prev_water_level
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
    String clientId = "ESP32-DrainageNode-" + String(random(0xffff), HEX);

    // THINGSBOARD AUTHENTICATION: Use Token as Username
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// Modular Sensor Functions
float readWaterLevel() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0)
    return -1.0; // Error or out of range

  float distance_cm = duration * 0.034 / 2;

  // Sanity Checks
  if (distance_cm > MAX_VALID_DISTANCE || distance_cm < MIN_VALID_DISTANCE)
    return -1.0;

  // Convert distance from top (air gap) to water level (fill)
  float level = PIPE_DEPTH_CM - distance_cm;
  return (level < 0) ? 0.0 : level;
}

void calculateFlow(unsigned long elapsed_ms) {
  detachInterrupt(digitalPinToInterrupt(FLOW_PIN));
  // YF-S201 Formula: F(Hz) = 7.5 * Q(L/min)
  // Q = Hz / 7.5
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

  if (elapsed >= 1000) { // Update every 1 second
    calculateFlow(elapsed);

    // 1. Get Sensor Data
    float water_level = readWaterLevel();
    if (water_level < 0)
      water_level = prev_water_level; // Hold last valid if error

    // 2. Calculate Rise Rate (cm/min)
    // dL/dt = (Current - Prior) / (elapsed_seconds / 60)
    float delta_level = water_level - prev_water_level;
    float elapsed_min = elapsed / 60000.0;
    float rise_rate = (delta_level / elapsed_min); // cm per minute

    // Smoothing for Display (Simple Low Pass)
    if (abs(rise_rate) > 100)
      rise_rate = 0; // Filter noise spikes

    // 3. Estimate Time to Overflow (minutes)
    // Logic: Remaining Height / Rise Rate
    float remaining_height = PIPE_DEPTH_CM - water_level;
    float eta_min = -1.0; // -1 indicates "Stable/No Risk"

    if (rise_rate > 0.5 &&
        remaining_height > 0) { // Only calculate if rising > 0.5cm/min
      eta_min = remaining_height / rise_rate;
    }

    // 4. Edge Logic & State Management
    String new_state = "NORMAL";
    String new_alert_level = "NORMAL";

    if (water_level >= THRESHOLD_CRITICAL) {
      new_state = "OVERFLOW_RISK";
      new_alert_level = "CRITICAL";
    } else if (water_level >= THRESHOLD_ALERT) {
      new_state = "PARTIAL_BLOCK";
      new_alert_level = "ALERT";
    } else if (water_level >= THRESHOLD_WARNING) {
      if (flow_rate_lpm < 2.0 && rise_rate > 0) {
        new_state = "EARLY_SEDIMENTATION"; // Rising slowly, low flow
        new_alert_level = "WARNING";
      } else {
        new_state = "NORMAL"; // Just high water, but flowing okay
        new_alert_level = "NORMAL";
      }
    }

    // 5. Alert Persistence (Debounce)
    if (new_state != current_state) {
      if ((millis() - persistence_timer) > PERSISTENCE_MS) {
        current_state = new_state;
        current_alert = new_alert_level;
        persistence_timer = millis();
      }
    } else {
      persistence_timer = millis(); // Reset timer if stable
    }

    // 6. JSON Payload for ThingsBoard
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
    payload += current_state;
    payload += "\",";
    payload += "\"alert_level\":\"";
    payload += current_alert;
    payload += "\"";
    payload += "}";

    // Debug & Publish
    Serial.println(payload);
    client.publish(mqtt_topic, payload.c_str());

    // Update history for next cycle
    prev_water_level = water_level;
    last_time = current_time;
  }
}
