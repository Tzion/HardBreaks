// Generates a C header file from config.js for the RP2040 firmware
import config from '../config.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const headerPath = join(__dirname, '../sink/rp2040-led/config.h');

const header = `// Auto-generated from config.js - DO NOT EDIT
// Generated: ${new Date().toISOString()}

#ifndef CONFIG_H
#define CONFIG_H

#define MATRIX_WIDTH ${config.matrix.width}
#define MATRIX_HEIGHT ${config.matrix.height}
#define NUM_LEDS (MATRIX_WIDTH * MATRIX_HEIGHT)
#define FRAME_SIZE (NUM_LEDS * 3)
#define SERIAL_BAUD ${config.serial.baudRate}

#endif
`;

writeFileSync(headerPath, header, 'utf8');
console.log(`Generated ${headerPath}`);
console.log(`  ${config.matrix.width}×${config.matrix.height} = ${config.matrix.width * config.matrix.height} LEDs, ${config.matrix.width * config.matrix.height * 3} bytes/frame`);
