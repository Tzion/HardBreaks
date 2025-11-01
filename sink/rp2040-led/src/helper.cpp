#include <Arduino.h>
#include "helper.h"

void blink(unsigned int duration_ms, unsigned int freq_hz)
{
  unsigned int start = millis();
  pinMode(ONBOARD_LED, OUTPUT);
  digitalWrite(ONBOARD_LED, LOW);
  if (freq_hz == 0)
  {
    digitalWrite(ONBOARD_LED, HIGH);
    delay(duration_ms);
    return;
  }

  unsigned int half_period = 500 / freq_hz; // half period in ms
  unsigned int elapsed = 0;
  bool state = false;

  while (elapsed < duration_ms)
  {
    state = !state;
    digitalWrite(ONBOARD_LED, state);
    delay(half_period);
    elapsed += half_period;
  }
  digitalWrite(ONBOARD_LED, LOW); // ensure LED is off at end
  Serial.printf("blink took %d, should have taked %d\n", millis()-start, duration_ms);
}