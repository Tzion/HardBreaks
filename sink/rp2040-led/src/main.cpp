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
#define LEDS_PER_STRIP (39 * 7)
#define NUM_STRIPS 4
#define NUM_LEDS (LEDS_PER_STRIP * NUM_STRIPS)
#define LED_TYPE WS2815
#define COLOR_ORDER GRB
#define STRIP_4 26
#define STRIP_5 20
#define STRIP_6 21
#define STRIP_7 9

CRGB leds[NUM_LEDS];
uint8_t hue = 0;

uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;

void diagnoseFrame(uint8_t *frame);
void setAllPinsToOutput();
void runMovingRainbow();
void receiveFrames();

void setup()
{
  pinMode(ONBOARD_LED, OUTPUT);
  digitalWrite(ONBOARD_LED, HIGH);
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 3100)
    ;
  if (Serial)
    blink(2400, 17);
  Serial.println("controller ready");
  printf("frame size: %d\n", FRAME_SIZE);

  setAllPinsToOutput();

  // Add strips in order: STRIP_4, STRIP_5, STRIP_6, STRIP_7
  FastLED.addLeds<LED_TYPE, STRIP_4, COLOR_ORDER>(leds, 0, LEDS_PER_STRIP);
  FastLED.addLeds<LED_TYPE, STRIP_5, COLOR_ORDER>(leds, LEDS_PER_STRIP, LEDS_PER_STRIP);
  FastLED.addLeds<LED_TYPE, STRIP_6, COLOR_ORDER>(leds, LEDS_PER_STRIP * 2, LEDS_PER_STRIP);
  FastLED.addLeds<LED_TYPE, STRIP_7, COLOR_ORDER>(leds, LEDS_PER_STRIP * 3, LEDS_PER_STRIP);
  FastLED.setBrightness(50); // Set initial brightness (0-255)
}

void loop()
{
  activateLedByKeyboard(); // blocking
  receiveFrames();
  runMovingRainbow();
}

void receiveFrames()
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
  else
  {
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

void setAllPinsToOutput()
{
  for (int pin = 0; pin <= 29; ++pin)
  {
    pinMode(pin, OUTPUT);
  }
}

void runMovingRainbow()
{
  // Increment hue for animation effect
  hue++;

  // Update each strip separately
  for (int strip = 0; strip < NUM_STRIPS; strip++)
  {
    int startIndex = strip * LEDS_PER_STRIP;

    // Fill each LED in the strip with rainbow colors
    for (int i = 0; i < LEDS_PER_STRIP; i++)
    {
      leds[startIndex + i] = CHSV(hue + (i * 256 / LEDS_PER_STRIP), 255, 255);
    }
  }

  // Show the LEDs on each strip (controllers 0..3)
  FastLED[0].showLeds(50);  // STRIP_4
  FastLED[1].showLeds(25);  // STRIP_5
  FastLED[2].showLeds(75);  // STRIP_6
  FastLED[3].showLeds(100); // STRIP_7

  delay(20); // Control animation speed
}