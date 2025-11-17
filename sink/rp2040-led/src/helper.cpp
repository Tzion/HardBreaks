#include <Arduino.h>
#include "helper.h"
#include "config.h"



#if DEBUG
  // Check if Serial.printf() is available (RP2040, ESP32, etc.)
  #if defined(ARDUINO_ARCH_RP2040) || defined(ESP32) || defined(ESP8266)
    #define printf(...) Serial.printf(__VA_ARGS__)
  #else
    // AVR and other platforms: use sprintf to a buffer then print
    inline void debug_printf(const char* format, ...) {
      char buf[128];
      va_list args;
      va_start(args, format);
      vsnprintf(buf, sizeof(buf), format, args);
      va_end(args);
      Serial.print(buf);
    }
    #define printf(...) debug_printf(__VA_ARGS__)
  #endif
#else
  // Release mode - printf becomes no-op
  #define printf(...) do {} while(0)
#endif



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
  printf("blink took %d, should have taken %d\n", millis() - start, duration_ms);
}

void startSerial()
{
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.begin(SERIAL_BAUD);
  while (!Serial && millis() < 3100)
    ;
  if (Serial)
    blink(2400, 17);
}