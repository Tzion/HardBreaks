#ifndef HELPER_H
#define HELPER_H

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



// Override LED_BUILTIN to match our board's actual LED pin
#undef LED_BUILTIN
#define LED_BUILTIN 17
#define ONBOARD_LED LED_BUILTIN


// Blink the onboard LED for duration_ms at freq_hz.
// - duration_ms: total time to blink in milliseconds
// - freq_hz: blink frequency (toggles per second). If 0 led is on for all duration.
// Behavior: LED starts LOW, then toggles every half-period. Ends with LED LOW.
void blink(unsigned int duration_ms, unsigned int freq_hz = 0);
void startSerial();

#endif // HELPER_H