// Plays the audio tracks in a folder in random order, with a random pause between tracks.
//
//   const audio = new AudioPlayer({ dir: 'audio', pauseMinS: 2 * 60, pauseMaxS: 14 * 60 });
//   audio.start();
//
// A track only starts while the Bluetooth speaker is connected (PipeWire has a Bluetooth output),
// so tracks aren't played into nothing. The folder is rescanned every round, so tracks added by a
// deploy are picked up. It runs inside the animation app and never throws: audio problems are
// logged and retried, and can't stop the animation.
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import random from 'canvas-sketch-util/random.js';

const run = promisify(execFile);
const AUDIO_FILE = /\.(mp3|m4a|wav|ogg|flac|aac)$/i;
const WAIT_MS = 5000; // between checks while waiting for files or the speaker
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class AudioPlayer {
    #state = ''; // the waiting state last logged, so it's logged once, not every check

    constructor({ dir, pauseMinS, pauseMaxS }) {
        this.dir = dir;
        this.pauseMinS = pauseMinS;
        this.pauseMaxS = pauseMaxS;
    }

    start() {
        this.#loop();
    }

    async #loop() {
        let last = null;
        while (true) {
            try {
                const tracks = this.#shuffledTracks();
                if (tracks.length === 0) {
                    this.#note(`no audio files in ${this.dir}, checking every ${WAIT_MS / 1000}s`);
                    await sleep(WAIT_MS);
                    continue;
                }
                // Don't start a round with the track that just ended the previous one
                if (tracks.length > 1 && tracks[0] === last) [tracks[0], tracks[1]] = [tracks[1], tracks[0]];

                for (const track of tracks) {
                    if (!fs.existsSync(track)) continue; // removed since the scan
                    let problem;
                    while ((problem = await this.#speakerProblem())) {
                        this.#note(`waiting for the speaker (${problem}), checking every ${WAIT_MS / 1000}s`);
                        await sleep(WAIT_MS);
                    }
                    this.#state = '';

                    console.log(`Audio: playing ${path.basename(track)}`);
                    await this.#play(track);
                    last = track;

                    const pauseS = random.rangeFloor(this.pauseMinS, this.pauseMaxS + 1);
                    console.log(`Audio: pausing ${pauseS}s`);
                    await sleep(pauseS * 1000);
                }
            } catch (err) {
                console.error('Audio: error, retrying:', err.message);
                await sleep(WAIT_MS);
            }
        }
    }

    #note(message) {
        if (this.#state !== message) console.log(`Audio: ${message}`);
        this.#state = message;
    }

    #shuffledTracks() {
        let names;
        try {
            names = fs.readdirSync(this.dir).filter(name => AUDIO_FILE.test(name));
        } catch {
            return []; // folder missing: same as empty
        }
        return random.shuffle(names.map(name => path.join(this.dir, name)));
    }

    // The speaker is ready when PipeWire has a Bluetooth output, which is then made the default one.
    // Returns why it isn't ready (null when it is), so a setup error looks different from "speaker off".
    async #speakerProblem() {
        try {
            const { stdout } = await run('pactl', ['list', 'short', 'sinks']);
            const sink = stdout.split('\n').map(line => line.split('\t')[1]).find(name => name?.startsWith('bluez_output'));
            if (!sink) return 'no Bluetooth output';
            await run('pactl', ['set-default-sink', sink]);
            return null;
        } catch (err) {
            // e.g. PipeWire not running yet; pactl says why on stderr, a missing pactl only in the message
            return `pactl failed: ${(err.stderr?.trim() || err.message).split('\n')[0]}`;
        }
    }

    #play(track) {
        return new Promise((resolve) => {
            const ffplay = spawn('ffplay', ['-nodisp', '-autoexit', '-nostats', '-loglevel', 'error', track],
                { stdio: ['ignore', 'ignore', 'pipe'] });
            ffplay.stderr.on('data', (chunk) => console.error(`Audio: ffplay: ${chunk.toString().trim()}`));
            ffplay.on('error', (err) => { console.error(`Audio: failed to play ${path.basename(track)}:`, err.message); resolve(); });
            ffplay.on('close', resolve);
        });
    }
}
