#ifndef DEBUG_H
#define DEBUG_H

#include <Arduino.h>

#if DEBUG
  // Debug mode - printf works normally
  #define printf(...) Serial.printf(__VA_ARGS__)
#else
  // Release mode - printf becomes no-op
  #define printf(...) do {} while(0)
#endif

#endif