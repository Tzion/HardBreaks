#include <Arduino.h>
#include <FastLED.h>
#include "debug.h"
#include "helper.h"

// LED Configuration
#define STRIP_1 8
#define NUM_LEDS (7 * 39) // 273 LEDs
#define LED_TYPE WS2815
#define COLOR_ORDER GRB

// Frame Configuration
#define PIXEL_SIZE 3

CRGB leds[NUM_LEDS];
uint8_t frameBuffer[PIXEL_SIZE];
uint32_t frameCount = 0;
CRGB leds[NUM_LEDS];





void showSinglePixel();


void setup()
{
  startSerial();

  printf("Strip: Pin %d, %d LEDs\n", STRIP_1, NUM_LEDS);

  FastLED.addLeds<LED_TYPE, STRIP_1, COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.setBrightness(50);
  FastLED.clear();
  FastLED.show();
}

void loop()
{
  showSinglePixel();
}




uint32_t currentPosition = 0;
void showSinglePixel()
{
  if (Serial.available() >= PIXEL_SIZE)
  {
    size_t n = Serial.readBytes(frameBuffer, PIXEL_SIZE);

    if (n == PIXEL_SIZE)
    {
      frameCount++;

      // Extract RGB values
      uint8_t r = frameBuffer[0];
      uint8_t g = frameBuffer[1];
      uint8_t b = frameBuffer[2];

      // Set LED at current position
      leds[currentPosition] = CRGB(r, g, b);
      FastLED.show();

      printf("Frame %lu: Position %lu = RGB(%u, %u, %u)\n",
             frameCount, currentPosition, r, g, b);

      // Move to next position, wrap around
      currentPosition = (currentPosition + 1) % NUM_LEDS;
    }
  }
}