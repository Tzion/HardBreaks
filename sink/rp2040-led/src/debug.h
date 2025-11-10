#ifndef DEBUG_H
#define DEBUG_H

#include <Arduino.h>

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

#endif