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
