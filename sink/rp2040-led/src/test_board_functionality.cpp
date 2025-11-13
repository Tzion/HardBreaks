#include <Arduino.h>
#include "helper.h"
#include "debug.h"
#include "test_board_functionality.h"

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
static int pin = -1;

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
                pin = (pinDigits[0] - '0') * 10 + (pinDigits[1] - '0');
                printf("REQUEST: change output pin to %02d\n", pin);
                pinDigitCount = 0;
            }
            continue;
        }

        // Non-digit resets pin buffer
        pinDigitCount = 0;

        char c = (char)tolower(ch);
        if (c == 'r')
        {
            printf("COMMAND: run RED chase animation on pin: %02d\n", pin);
        }
        else if (c == 'g')
        {
            printf("COMMAND: run GREEN chase animation on pin: %02d\n", pin);
        }
        else if (c == 'b')
        {
            printf("COMMAND: run BLUE chase animation on pin: %02d\n", pin);
        }
        else
        {
            printf("UNKNOWN input '%c' (use r/g/b or two-digit pin like 02)\n", ch);
        }
    }
}