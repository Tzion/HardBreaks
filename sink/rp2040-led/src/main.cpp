#include "config.h"
#include <stdint.h>
#include <Arduino.h>
#include "helper.h"
#include "debug.h"
#include <FastLED.h>

#define FRAME_SIZE 1
#define HEARTBEAT_MS 6000
#define LED_PIN 2
// Define per-strip and total counts correctly
#define LEDS_PER_STRIP 39
#define NUM_STRIPS 3
#define NUM_LEDS (LEDS_PER_STRIP * NUM_STRIPS)
#define LED_TYPE WS2815
#define COLOR_ORDER GRB
#define STRIP_5 10
#define STRIP_6 14
#define STRIP_7 15

CRGB leds[NUM_LEDS];
uint8_t hue = 0;

uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;

void diagnoseFrame(uint8_t *frame);
void blinkGpioOneByOne();
void setPinsToOutput();

void setup()
{
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(5, OUTPUT);
  pinMode(4, OUTPUT);
  pinMode(6, OUTPUT);
  digitalWrite(4, HIGH);
  digitalWrite(5, HIGH);
  digitalWrite(6, HIGH);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize FastLED
  // Give each strip its own slice of the LED buffer
  FastLED.addLeds<LED_TYPE, STRIP_5, COLOR_ORDER>(leds + (LEDS_PER_STRIP * 0), LEDS_PER_STRIP);
  FastLED.addLeds<LED_TYPE, STRIP_6, COLOR_ORDER>(leds + (LEDS_PER_STRIP * 1), LEDS_PER_STRIP);
  FastLED.addLeds<LED_TYPE, STRIP_7, COLOR_ORDER>(leds + (LEDS_PER_STRIP * 2), LEDS_PER_STRIP);
  FastLED.setBrightness(50);

  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 5600)
    ;
  if (Serial)
    blink(3000, 17);
  Serial.println("controller ready");
  printf("frame size: %d\n", FRAME_SIZE);
}

void loop()
{
  // Moving rainbow: advance base hue, offset each strip slightly
  static uint8_t baseHue = 0;
  for (int s = 0; s < NUM_STRIPS; ++s) {
    int offset = s * LEDS_PER_STRIP;
    fill_rainbow(leds + offset, LEDS_PER_STRIP, baseHue + s * 16, 255 / LEDS_PER_STRIP);
  }
  FastLED.show();
  baseHue++; // speed of motion

  if (Serial.available() >= FRAME_SIZE)
  {
    size_t n = Serial.readBytes(frameBuffer, FRAME_SIZE);
    if (n != FRAME_SIZE)
      return;

    frameCount++;

    if (frameCount % 10 == 0)
    {
      digitalWrite(ONBOARD_LED, HIGH);
    }
    if (frameCount % 15 == 0)
    {
      digitalWrite(ONBOARD_LED, LOW);
    }
    printf("%lu frames received at %lu \n", frameCount, millis());
  }

  if (millis() % HEARTBEAT_MS < HEARTBEAT_MS / 10)
  {
    digitalWrite(ONBOARD_LED, HIGH);
  }
  else {
    digitalWrite(ONBOARD_LED, LOW);
  }

  // Important: don't reconfigure/drive all GPIOs while using FastLED timing
  // blinkGpioOneByOne();
}

void diagnoseFrame(uint8_t *frame)
{
  // Print first, middle, last pixel RGB
  int mid = (NUM_LEDS / 2) * 3;
  int last = (NUM_LEDS - 1) * 3;

  printf("Frame %lu | First(%u,%u,%u) Mid(%u,%u,%u) Last(%u,%u,%u)\n",
         frameCount,
         frame[0], frame[1], frame[2],
         frame[mid], frame[mid + 1], frame[mid + 2],
         frame[last], frame[last + 1], frame[last + 2]);
}

void blinkGpioOneByOne(){
  for (int pin = 0; pin <= 30; ++pin) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, HIGH);
    printf("pin %d is on\n", pin);
    delay(420);
    digitalWrite(pin, LOW);
  }
  printf("\n");
}

void setPinsToOutput() {
  for (int pin=0; pin <= 29; ++pin){
    pinMode(pin, OUTPUT);
  }
}

