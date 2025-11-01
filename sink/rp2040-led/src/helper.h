#ifndef HELPER_H
#define HELPER_H

// Override LED_BUILTIN to match our board's actual LED pin
#undef LED_BUILTIN
#define LED_BUILTIN 17
#define ONBOARD_LED LED_BUILTIN


// Blink the onboard LED for duration_ms at freq_hz.
// - duration_ms: total time to blink in milliseconds
// - freq_hz: blink frequency (toggles per second). If 0 led is on for all duration.
// Behavior: LED starts LOW, then toggles every half-period. Ends with LED LOW.
void blink(unsigned int duration_ms, unsigned int freq_hz = 0);

#endif // HELPER_H
