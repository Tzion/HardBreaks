#include "config.h"
#include <stdint.h>
#include <Arduino.h>
#include "helper.h"

uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;

void diagnoseFrame(uint8_t* frame);

void setup() {
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 2000);
  if (Serial) blink(3000, 10);
  blink(2000, 1);
  Serial.println("RP2040 ready");
}

void loop() {
  if (Serial.available() >= FRAME_SIZE) {
    size_t n = Serial.readBytes(frameBuffer, FRAME_SIZE);
    if (n != FRAME_SIZE) return;
    
    frameCount++;
    
    // Blink every 30 frames
    if (frameCount % 30 == 0) {
      digitalWrite(ONBOARD_LED, HIGH);
    } else {
        digitalWrite(ONBOARD_LED, LOW);
    }
    
    diagnoseFrame(frameBuffer);
  }
}

void diagnoseFrame(uint8_t* frame){
    // Print first, middle, last pixel RGB
    int mid = (NUM_LEDS / 2) * 3;
    int last = (NUM_LEDS - 1) * 3;
    
    Serial.print("Frame ");
    Serial.print(frameCount);
    Serial.print(" | First(");
    Serial.print(frame[0]); Serial.print(",");
    Serial.print(frame[1]); Serial.print(",");
    Serial.print(frame[2]); Serial.print(") Mid(");
    Serial.print(frame[mid]); Serial.print(",");
    Serial.print(frame[mid+1]); Serial.print(",");
    Serial.print(frame[mid+2]); Serial.print(") Last(");
    Serial.print(frame[last]); Serial.print(",");
    Serial.print(frame[last+1]); Serial.print(",");
    Serial.print(frame[last+2]); Serial.println(")");
}
