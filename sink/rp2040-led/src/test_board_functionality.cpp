#include <Arduino.h>
#include <FastLED.h>
#include "helper.h"
#include "test_board_functionality.h"

#define TEST_NUM_LEDS (39 * 7)
#define TEST_BRIGHTNESS 100

static CRGB testLeds[TEST_NUM_LEDS];
static CLEDController *testController = nullptr;
static int testCurrentPin = -1;

void flipGpios(int pinCount, int pins[])
{
    for (int i = 0; i < pinCount; ++i)
    {
        pinMode(pins[i], OUTPUT);
        digitalWrite(pins[i], HIGH);
    }
    delay(500);
    for (int i = 0; i < pinCount; ++i)
    {
        digitalWrite(pins[i], LOW);
    }

    printf("Signals flipped on %d pins\n", pinCount);
}

void blinkGpioOneByOne()
{
    for (int pin = 0; pin <= 30; ++pin)
    {
        pinMode(pin, OUTPUT);
        digitalWrite(pin, HIGH);
        printf("pin %d is on\n", pin);
        delay(420);
        digitalWrite(pin, LOW);
    }
    printf("\n");
}

static char pinDigits[2];
static uint8_t pinDigitCount = 0;

// Limitation: FastLED accumulates controllers - each addLeds() call adds a new controller to the same array.
// Once a pin is set, all subsequent animations will be sent to all previously added pins for this array.
static void setTestPin(int pin)
{
    if (pin < 0 || pin >= 30)
    {
        printf("Invalid pin: %02d\n", pin);
        return;
    }

    // Clear old controller if changing pins
    if (testController && testCurrentPin != pin)
    {
        FastLED.clear(true);
        testController = nullptr;
    }

    testCurrentPin = pin;

    // Add LED controller for the selected pin
    switch (pin)
    {
    case 0:
        testController = &FastLED.addLeds<WS2815, 0, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 1:
        testController = &FastLED.addLeds<WS2815, 1, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 2:
        testController = &FastLED.addLeds<WS2815, 2, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 3:
        testController = &FastLED.addLeds<WS2815, 3, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 4:
        testController = &FastLED.addLeds<WS2815, 4, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 5:
        testController = &FastLED.addLeds<WS2815, 5, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 6:
        testController = &FastLED.addLeds<WS2815, 6, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 7:
        testController = &FastLED.addLeds<WS2815, 7, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 8:
        testController = &FastLED.addLeds<WS2815, 8, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 9:
        testController = &FastLED.addLeds<WS2815, 9, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 10:
        testController = &FastLED.addLeds<WS2815, 10, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 11:
        testController = &FastLED.addLeds<WS2815, 11, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 12:
        testController = &FastLED.addLeds<WS2815, 12, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 13:
        testController = &FastLED.addLeds<WS2815, 13, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 14:
        testController = &FastLED.addLeds<WS2815, 14, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 15:
        testController = &FastLED.addLeds<WS2815, 15, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 16:
        testController = &FastLED.addLeds<WS2815, 16, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 17:
        testController = &FastLED.addLeds<WS2815, 17, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 18:
        testController = &FastLED.addLeds<WS2815, 18, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 19:
        testController = &FastLED.addLeds<WS2815, 19, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 20:
        testController = &FastLED.addLeds<WS2815, 20, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 21:
        testController = &FastLED.addLeds<WS2815, 21, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 22:
        testController = &FastLED.addLeds<WS2815, 22, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 23:
        testController = &FastLED.addLeds<WS2815, 23, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 24:
        testController = &FastLED.addLeds<WS2815, 24, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 25:
        testController = &FastLED.addLeds<WS2815, 25, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 26:
        testController = &FastLED.addLeds<WS2815, 26, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 27:
        testController = &FastLED.addLeds<WS2815, 27, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 28:
        testController = &FastLED.addLeds<WS2815, 28, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    case 29:
        testController = &FastLED.addLeds<WS2815, 29, RGB>(testLeds, TEST_NUM_LEDS);
        break;
    }

    FastLED.setBrightness(TEST_BRIGHTNESS);
    fill_solid(testLeds, TEST_NUM_LEDS, CRGB::Black);
    FastLED.show();
    printf("Output pin set to %02d\n", pin);
}

static void runChase(CRGB color, const char *name)
{
    if (testCurrentPin < 0)
    {
        printf("No pin selected. Send two digits first (e.g., 02)\n");
        return;
    }

    printf("Chase %s on pin %02d\n", name, testCurrentPin);
    for (int i = 0; i < TEST_NUM_LEDS; ++i)
    {
        fill_solid(testLeds, TEST_NUM_LEDS, CRGB::Black);
        testLeds[i] = color;
        FastLED.show();
        delay(1);
    }
    fill_solid(testLeds, TEST_NUM_LEDS, CRGB::Black);
    FastLED.show();
}

// Start animation by keyboard command over serial connection (e.g.: stroke "03r" change pin 3 to Red)
void activateLedByKeyboard()
{
    while (Serial.available() > 0)
    {
        int ch = Serial.read();
        if (ch == '\r' || ch == '\n' || ch == ' ' || ch == '\t')
            continue;

        if (ch >= '0' && ch <= '9')
        {
            pinDigits[pinDigitCount++] = (char)ch;
            if (pinDigitCount == 2)
            {
                int pin = (pinDigits[0] - '0') * 10 + (pinDigits[1] - '0');
                setTestPin(pin);
                pinDigitCount = 0;
            }
            continue;
        }

        // Non-digit resets pin buffer
        pinDigitCount = 0;

        char c = (char)tolower(ch);
        if (c == 'r')
        {
            runChase(CRGB::Red, "RED");
        }
        else if (c == 'g')
        {
            runChase(CRGB::Green, "GREEN");
        }
        else if (c == 'b')
        {
            runChase(CRGB::Blue, "BLUE");
        }
        else
        {
            printf("UNKNOWN input '%c' (use r/g/b or two-digit pin like 02)\n", ch);
        }
    }
}