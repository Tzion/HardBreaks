#include "config.h"
#include <stdint.h>
#include <Arduino.h>
#include "helper.h"
#include "debug.h"

#define FRAME_SIZE 1
#define HEARTBEAT_MS 6000

uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;

void diagnoseFrame(uint8_t *frame);

void setup()
{
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 7800)
    ;
  if (Serial)
    blink(3000, 10);
  blink(2000, 1);
  Serial.println("RP2040 ready");
  printf("frame size: %d\n", FRAME_SIZE);
}

void loop()
{
  if (Serial.available() >= FRAME_SIZE)
  {
    size_t n = Serial.readBytes(frameBuffer, FRAME_SIZE);
    if (n != FRAME_SIZE)
      return;

    frameCount++;

    // Blink logic to indicate continous communication
    if (frameCount % 10 == 0)
    {
      digitalWrite(ONBOARD_LED, HIGH);
    }
    if (frameCount % 15 == 0)
    {
      digitalWrite(ONBOARD_LED, LOW);
    }
    printf("%d frames received at %d \n", frameCount, millis());
    // diagnoseFrame(frameBuffer);
  }
  if (millis() % HEARTBEAT_MS < HEARTBEAT_MS / 10)
    digitalWrite(ONBOARD_LED, HIGH);
  else
    digitalWrite(ONBOARD_LED, LOW);
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
