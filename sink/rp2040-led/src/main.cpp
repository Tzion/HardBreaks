#include <Arduino.h>
#include <FastLED.h>
#include "helper.h"

#define HEARTBEAT_MS 1000

// LED Configuration
#define STRIP_1 28
#define STRIP_2 7
#define STRIP_3 9
#define STRIP_4 8
#define NUM_LEDS_PER_GROUP (7 * 39)
#define NUM_LEDS_IN_MIDDLE_GROUP (6 * 39)
#define NUM_NORMAL_GROUPS 4
#define NUM_LEDS (NUM_NORMAL_GROUPS * NUM_LEDS_PER_GROUP + NUM_LEDS_IN_MIDDLE_GROUP)
#define LED_TYPE WS2815
#define COLOR_ORDER RGB
#define OFFSET_PIXELS 0 // requires to handle the physical world

// Frame Configuration
#define PIXEL_SIZE 3
#define FRAME_SIZE ((NUM_LEDS + OFFSET_PIXELS) * PIXEL_SIZE)
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
  printf("Testing %d groups, %d LEDs total\n", NUM_NORMAL_GROUPS, NUM_LEDS);
  printf("STRIP_1 pin: %d, STRIP_2 pin: %d, STRIP_3 pin: %d, STRIP_4 pin: %d\n", STRIP_1, STRIP_2, STRIP_3, STRIP_4);

  pinMode(STRIP_1, OUTPUT);
  pinMode(STRIP_2, OUTPUT);
  pinMode(STRIP_3, OUTPUT);
  pinMode(STRIP_4, OUTPUT);
  FastLED.addLeds<LED_TYPE, STRIP_1, COLOR_ORDER>(leds, 0, NUM_LEDS_IN_MIDDLE_GROUP);
  FastLED.addLeds<LED_TYPE, STRIP_2, COLOR_ORDER>(leds, NUM_LEDS_IN_MIDDLE_GROUP, NUM_LEDS_PER_GROUP);
  FastLED.addLeds<LED_TYPE, STRIP_3, COLOR_ORDER>(leds, NUM_LEDS_IN_MIDDLE_GROUP + NUM_LEDS_PER_GROUP, NUM_LEDS_PER_GROUP);
  FastLED.addLeds<LED_TYPE, STRIP_4, COLOR_ORDER>(leds, NUM_LEDS_IN_MIDDLE_GROUP + NUM_LEDS_PER_GROUP * 2, NUM_LEDS_PER_GROUP);

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
      printf("Expecting %u bytes\n", expectedLength);
      break;

    case WAIT_DATA:
      if (receivedBytes < expectedLength && receivedBytes < FRAME_SIZE)
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
        printf("Buffer overflow!\n");
        parseState = WAIT_MAGIC_1;
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
