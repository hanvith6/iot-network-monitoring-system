/*
 * EDGE PROCESSING NODE - BLYNK.IO VERSION
 * Updated with User Credentials and Advanced Dashboard Telemetry
 */

#define BLYNK_TEMPLATE_ID "YOUR_BLYNK_TEMPLATE_ID"
#define BLYNK_TEMPLATE_NAME "YOUR_BLYNK_TEMPLATE_NAME"
#define BLYNK_AUTH_TOKEN "YOUR_BLYNK_AUTH_TOKEN"

#define BLYNK_PRINT Serial

#include <BlynkSimpleEsp32.h>
#include <WiFi.h>
#include <WiFiClient.h>

// ------------------- CONFIGURATION ------------------- //
char ssid[] = "YOUR_WIFI_SSID";       // <-- Replace with your WiFi SSID
char pass[] = "YOUR_WIFI_PASSWORD";    // <-- Replace with your WiFi password

// Pin Definitions
#define TRIGGER_PIN 5
#define ECHO_PIN 18
#define FLOW_PIN 19 // Updated to Pin 19
// #define BATTERY_PIN 34 // Not used for ADC anymore, assuming Power Bank

// Constants
const float PIPE_DEPTH_CM = 50.0;
const float THRESHOLD_WARNING = 20.0;
const float THRESHOLD_ALERT = 35.0;
const float THRESHOLD_CRITICAL = 45.0;

BlynkTimer timer;

// Globals
volatile int flow_pulse_count = 0;
float flow_rate_lpm = 0.0;
unsigned long last_time = 0;
float prev_water_level = 0.0;

void IRAM_ATTR pulseCounter() { flow_pulse_count++; }

// ------------------- HELPER FUNCTIONS ------------------- //
float readWaterLevel() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(5); // Adjusted to 5us/20us as per user snippet preference
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(20);
  digitalWrite(TRIGGER_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0)
    return -1.0;
  float distance_cm = duration * 0.034 / 2;
  float level = PIPE_DEPTH_CM - distance_cm;
  return (level < 0) ? 0.0 : level;
}

int readBattery() {
  // Device is powered by 5V Power Bank (USB)
  // Always return 100% to indicate stable external power.
  return 100;
}

void calculateFlow(unsigned long elapsed_ms) {
  detachInterrupt(digitalPinToInterrupt(FLOW_PIN));
  float hz = (flow_pulse_count * 1000.0) / elapsed_ms;
  flow_rate_lpm = hz / 7.5;
  flow_pulse_count = 0;
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);
}

// ------------------- MAIN LOGIC LOOP ------------------- //
void sendSensorData() {
  unsigned long current_time = millis();
  unsigned long elapsed = current_time - last_time;

  if (elapsed < 1000 && last_time != 0)
    return;

  calculateFlow(elapsed);
  float water_level = readWaterLevel();
  if (water_level < 0)
    water_level = prev_water_level;

  int battery_level = readBattery();

  // Advanced Logic (Rise Rate & ETA)
  float delta_level = water_level - prev_water_level;
  float elapsed_min = elapsed / 60000.0;

  if (elapsed_min == 0)
    elapsed_min = 0.001;

  float rise_rate = (delta_level / elapsed_min);
  if (abs(rise_rate) > 100)
    rise_rate = 0;

  float remaining_height = PIPE_DEPTH_CM - water_level;
  float eta_min = -1.0;
  if (rise_rate > 0.5 && remaining_height > 0) {
    eta_min = remaining_height / rise_rate;
  }

  // State Logic
  String state = "NORMAL";
  if (water_level >= THRESHOLD_CRITICAL)
    state = "OVERFLOW_RISK";
  else if (water_level >= THRESHOLD_ALERT)
    state = "PARTIAL_BLOCK";
  else if (water_level >= THRESHOLD_WARNING && flow_rate_lpm < 2.0)
    state = "EARLY_SEDIMENTATION"; // Matches dashboard logic

  // Note: User snippet used "EARLY_SEDIMENT", but Dashboard expects
  // "EARLY_SEDIMENTATION" for colors to work. I kept "EARLY_SEDIMENTATION" to
  // ensure Dashboard compatibility.

  String alert_level = (state == "NORMAL" ? "NORMAL" : "ALERT");

  // Debug Print
  Serial.print("Flow: ");
  Serial.print(flow_rate_lpm);
  Serial.print(" L/min, Level: ");
  Serial.print(water_level);
  Serial.println(" cm");

  // ------------------- BLYNK PUSH ------------------- //
  Blynk.virtualWrite(V0, flow_rate_lpm); // Flow
  Blynk.virtualWrite(V1, water_level);   // Level
  Blynk.virtualWrite(V2, rise_rate);     // Rise Rate (Advanced)

  if (eta_min >= 0) {
    Blynk.virtualWrite(V3, eta_min); // ETA Value (Advanced)
  } else {
    Blynk.virtualWrite(V3, "N/A");
  }

  Blynk.virtualWrite(V4, state);         // State
  Blynk.virtualWrite(V5, alert_level);   // Alert Level (Advanced)
  Blynk.virtualWrite(V6, battery_level); // Battery (100%)

  prev_water_level = water_level;
  last_time = current_time;
}

void setup() {
  Serial.begin(115200);

  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  // pinMode(BATTERY_PIN, INPUT); // Not needed for Power Bank

  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  timer.setInterval(1000L, sendSensorData);

  prev_water_level = readWaterLevel();
  last_time = millis();
}

void loop() {
  Blynk.run();
  timer.run();
}
