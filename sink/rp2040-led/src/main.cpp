#include "config.h"
#include <stdint.h>
#include <Arduino.h>
#include "helper.h"
#include "debug.h"
#include <FastLED.h>
#include "test_board_functionality.h"

#define FRAME_SIZE 1
#define HEARTBEAT_MS 6000
#define LED_PIN 2
// Define per-strip and total counts correctly
#define LEDS_PER_STRIP 39
#define NUM_STRIPS 3
#define NUM_LEDS (LEDS_PER_STRIP * NUM_STRIPS)
#define LED_TYPE WS2815
#define COLOR_ORDER GRB
#define STRIP_5 5
#define STRIP_6 7
#define STRIP_7 9

CRGB leds[NUM_LEDS];
uint8_t hue = 0;

uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;

void diagnoseFrame(uint8_t *frame);
void setAllPinsToOutput();

void setup()
{
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 5600);
  if (Serial)
    blink(3000, 17);
  Serial.println("controller ready");
  printf("frame size: %d\n", FRAME_SIZE);

  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(STRIP_5, OUTPUT);
  pinMode(STRIP_6, OUTPUT);
  pinMode(STRIP_7, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
}

void loop()
{
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

void setAllPinsToOutput() {
  for (int pin=0; pin <= 29; ++pin){
    pinMode(pin, OUTPUT);
  }
}

