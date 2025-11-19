#include <Arduino.h>
#include <FastLED.h>
#include "helper.h"

#define HEARTBEAT_MS 1000

// LED Configuration
// Pin assignments (matching pi/frame.js LED_CONFIG)
#define STRIP_1 22 // Group 0: 8 strips (big group)
#define STRIP_2 23 // Group 1: 7 strips
#define STRIP_3 27 // Group 2: 7 strips
#define STRIP_4 28 // Group 3: 6 strips (small group)
#define STRIP_5 7  // Group 4: 7 strips
#define STRIP_6 9  // Group 5: 7 strips
#define STRIP_7 8  // Group 6: 7 strips

#define LEDS_IN_STRIP 39
#define LED_TYPE WS2815
#define COLOR_ORDER RGB

// Group configurations (matching pi/frame.js LED_CONFIG order)
#define NUM_LEDS_GROUP_0 (8 * LEDS_IN_STRIP) // 312 LEDs - big group (pin 22)
#define NUM_LEDS_GROUP_1 (7 * LEDS_IN_STRIP) // 273 LEDs (pin 23)
#define NUM_LEDS_GROUP_2 (7 * LEDS_IN_STRIP) // 273 LEDs (pin 27)
#define NUM_LEDS_GROUP_3 (6 * LEDS_IN_STRIP) // 234 LEDs - small group (pin 28)
#define NUM_LEDS_GROUP_4 (7 * LEDS_IN_STRIP) // 273 LEDs (pin 7)
#define NUM_LEDS_GROUP_5 (7 * LEDS_IN_STRIP) // 273 LEDs (pin 9)
#define NUM_LEDS_GROUP_6 (7 * LEDS_IN_STRIP) // 273 LEDs (pin 8)

// Total LEDs (8+7+7+6+7+7+7 = 49 strips × 39 LEDs = 1911 LEDs)
#define NUM_LEDS (NUM_LEDS_GROUP_0 + NUM_LEDS_GROUP_1 + NUM_LEDS_GROUP_2 + \
                  NUM_LEDS_GROUP_3 + NUM_LEDS_GROUP_4 + NUM_LEDS_GROUP_5 + \
                  NUM_LEDS_GROUP_6)

// Frame Configuration
#define PIXEL_SIZE 3
#define OFFSET_PIXELS 10                                     // Extra buffer for positive offsets from Pi (adjust as needed)
#define FRAME_SIZE ((NUM_LEDS + OFFSET_PIXELS) * PIXEL_SIZE) // 1911 * 3 = 5733 + offset buffer
#define MAGIC_BYTE_1 0xFF
#define MAGIC_BYTE_2 0xAA

// LED configuration
uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;
CRGB leds[NUM_LEDS];

void heartbeat();
void showSinglePixel();
void receiveFrame();

void setup()
{
  startSerial();
  printf("LED Matrix Configuration:\n");
  printf("  Total LEDs: %d (49 strips × 39 LEDs)\n", NUM_LEDS);
  printf("  Group 0 (pin %d): %d LEDs (8 strips)\n", STRIP_1, NUM_LEDS_GROUP_0);
  printf("  Group 1 (pin %d): %d LEDs (7 strips)\n", STRIP_2, NUM_LEDS_GROUP_1);
  printf("  Group 2 (pin %d): %d LEDs (7 strips)\n", STRIP_3, NUM_LEDS_GROUP_2);
  printf("  Group 3 (pin %d): %d LEDs (6 strips)\n", STRIP_4, NUM_LEDS_GROUP_3);
  printf("  Group 4 (pin %d): %d LEDs (7 strips)\n", STRIP_5, NUM_LEDS_GROUP_4);
  printf("  Group 5 (pin %d): %d LEDs (7 strips)\n", STRIP_6, NUM_LEDS_GROUP_5);
  printf("  Group 6 (pin %d): %d LEDs (7 strips)\n", STRIP_7, NUM_LEDS_GROUP_6);
  printf("  Frame size: %d bytes\n", FRAME_SIZE);

  pinMode(STRIP_1, OUTPUT);
  pinMode(STRIP_2, OUTPUT);
  pinMode(STRIP_3, OUTPUT);
  pinMode(STRIP_4, OUTPUT);
  pinMode(STRIP_5, OUTPUT);
  pinMode(STRIP_6, OUTPUT);
  pinMode(STRIP_7, OUTPUT);

  // Configure LED groups (order must match pi/frame.js LED_CONFIG)
  uint16_t offset = 0;

  // Group 0: 8 strips on pin 22
  FastLED.addLeds<LED_TYPE, STRIP_1, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_0);
  offset += NUM_LEDS_GROUP_0;

  // Group 1: 7 strips on pin 23
  FastLED.addLeds<LED_TYPE, STRIP_2, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_1);
  offset += NUM_LEDS_GROUP_1;

  // Group 2: 7 strips on pin 27
  FastLED.addLeds<LED_TYPE, STRIP_3, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_2);
  offset += NUM_LEDS_GROUP_2;

  // Group 3: 6 strips on pin 28
  FastLED.addLeds<LED_TYPE, STRIP_4, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_3);
  offset += NUM_LEDS_GROUP_3;

  // Group 4: 7 strips on pin 7
  FastLED.addLeds<LED_TYPE, STRIP_5, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_4);
  offset += NUM_LEDS_GROUP_4;

  // Group 5: 7 strips on pin 9
  FastLED.addLeds<LED_TYPE, STRIP_6, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_5);
  offset += NUM_LEDS_GROUP_5;

  // Group 6: 7 strips on pin 8
  FastLED.addLeds<LED_TYPE, STRIP_7, COLOR_ORDER>(leds, offset, NUM_LEDS_GROUP_6);

  FastLED.setBrightness(50);
  FastLED.clear();
  FastLED.show();
}

void loop()
{
  // showSinglePixel();
  receiveFrame();
}
enum ParseState
{
  WAIT_MAGIC_1,
  WAIT_MAGIC_2,
  WAIT_LENGTH_1,
  WAIT_LENGTH_2,
  WAIT_DATA,
  WAIT_CHECKSUM
};

ParseState parseState = WAIT_MAGIC_1;
uint16_t expectedLength = 0;
uint16_t receivedBytes = 0;
uint8_t calculatedChecksum = 0;

void receiveFrame()
{
  while (Serial.available() > 0)
  {
    uint8_t byte = Serial.read();

    switch (parseState)
    {
    case WAIT_MAGIC_1:
      if (byte == MAGIC_BYTE_1)
      {
        parseState = WAIT_MAGIC_2;
      }
      break;

    case WAIT_MAGIC_2:
      if (byte == MAGIC_BYTE_2)
      {
        parseState = WAIT_LENGTH_1;
      }
      else
      {
        parseState = WAIT_MAGIC_1;
      }
      break;

    case WAIT_LENGTH_1:
      expectedLength = byte;
      parseState = WAIT_LENGTH_2;
      break;

    case WAIT_LENGTH_2:
      expectedLength |= (byte << 8);
      receivedBytes = 0;
      calculatedChecksum = 0;
      parseState = WAIT_DATA;
      printf("Expecting %u bytes of data\n", expectedLength);
      break;

    case WAIT_DATA:
      if (receivedBytes < expectedLength)
      {
        if (receivedBytes < FRAME_SIZE)
        {
          frameBuffer[receivedBytes++] = byte;
          calculatedChecksum = (calculatedChecksum + byte) & 0xFF;

          if (receivedBytes >= expectedLength)
          {
            parseState = WAIT_CHECKSUM;
          }
        }
        else
        {
          printf("Buffer overflow! Expected %u bytes but FRAME_SIZE is only %u\n", expectedLength, FRAME_SIZE);
          parseState = WAIT_MAGIC_1;
        }
      }
      break;

    case WAIT_CHECKSUM:
      if (byte == calculatedChecksum)
      {
        frameCount++;
        printf("Frame %lu received OK (%u bytes) (checksum=0x%02X)\n", frameCount, expectedLength, byte);
      }
      else
      {
        printf("Checksum error! Expected %u, got %u\n", calculatedChecksum, byte);
      }
      memcpy(leds, frameBuffer, expectedLength);
      FastLED.show();
      parseState = WAIT_MAGIC_1;
      break;
    }
  }

  // Heartbeat
  heartbeat();
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

void heartbeat()
{
  if (millis() % HEARTBEAT_MS < HEARTBEAT_MS / 10)
  {
    digitalWrite(ONBOARD_LED, HIGH);
  }
  else
  {
    digitalWrite(ONBOARD_LED, LOW);
  }
}
