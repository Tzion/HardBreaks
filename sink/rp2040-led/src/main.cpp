#include "config.h"
#include <stdint.h>
#include <Arduino.h>

#undef LED_BUILTIN
#define LED_BUILTIN 17
#define ONBOARD_LED LED_BUILTIN


uint8_t frameBuffer[FRAME_SIZE];
uint32_t frameCount = 0;

void diagnoseFrame(uint8_t* frame);

void setup() {
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 3000);
  
  pinMode(ONBOARD_LED, OUTPUT);
  
  // Fast startup blinks
  for (int i = 0; i < 5; i++) {
    digitalWrite(ONBOARD_LED, HIGH);
    delay(100);
    digitalWrite(ONBOARD_LED, LOW);
    delay(100);
  }
  Serial.println("RP2040 ready");
}

void loop(){
  // find the onboard pin led by iterating each io for 1 second
   for (int pin = 0; pin <= 29; pin++) {
    pinMode(pin, OUTPUT);
    Serial.printf("pin %d is on\n", pin);
    digitalWrite(pin, HIGH);
    delay(1000);
    digitalWrite(pin, LOW);
    Serial.printf("onbaord led at: %d,  buildin led: %d\n", ONBOARD_LED, LED_BUILTIN);
  }
  
}

void old_loop() {
  Serial.println("RP2040 loop2");
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
