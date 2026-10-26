// Plays a list of animations (canvas-sketch sketches) one after another, with a transition between them.
//
// The first item plays first. When an item's minutes are up, the next one is set up and the
// transition starts; the next item's minutes count from the start of its transition.
// Both animations keep running during the transition, mixed at LED resolution (see transitions.js).
import { createCanvas } from 'canvas';
import * as pixelize from './pixelize.js';
import { fadeThroughBlack } from './transitions.js';

export class Player {
    constructor(items, { size = [490, 390], ledSize = [49, 39], order = 'shuffle', transition = fadeThroughBlack() } = {}) {
        if (!items.length) throw new Error('Player needs at least one item');
        this.items = items;
        this.size = size;
        this.ledSize = ledSize;
        this.order = order;
        this.transition = transition;

        this.current = null;    // the animation playing: { item, render, context, startedAt }
        this.next = null;       // during a transition: the animation coming in
        this.preparing = false; // the next animation is being set up

        const [w, h] = ledSize;
        this.out = createCanvas(w, h).getContext('2d').createImageData(w, h);
    }

    async start() {
        this.current = await this.#setUp(this.items[0]);
        this.current.startedAt = Date.now();
        console.log(`Playing ${this.current.item.name} for ${this.current.item.minutes} min`);
    }

    // The frame to show now, at LED resolution
    frame() {
        const now = Date.now();
        this.#advance(now);

        const from = this.#renderLed(this.current);
        if (!this.next) return from;

        const transition = this.#transitionTo(this.next.item);
        const progress = (now - this.next.startedAt) / (transition.seconds * 1000);
        const to = this.#renderLed(this.next);
        transition.blend(from.data, to.data, Math.min(1, progress), this.out.data);
        return this.out;
    }

    // Start setting up the next animation when the current one's time is up, and finish transitions
    #advance(now) {
        if (this.next) {
            const seconds = this.#transitionTo(this.next.item).seconds;
            if (now - this.next.startedAt >= seconds * 1000) {
                this.current = this.next;
                this.next = null;
            }
            return;
        }
        const playedMs = now - this.current.startedAt;
        if (this.preparing || playedMs < this.current.item.minutes * 60 * 1000) return;

        // Setting up can be async (e.g. video); the current animation keeps playing meanwhile
        this.preparing = true;
        const item = this.#pickNext();
        this.#setUp(item)
            .then((next) => {
                next.startedAt = Date.now();
                this.next = next;
                const transition = this.#transitionTo(item);
                console.log(`Playing ${item.name} for ${item.minutes} min (${transition.name}, ${transition.seconds} s)`);
            })
            .catch((err) => {
                // Keep the current animation for another round, then try again
                console.error(`Failed to start ${item.name}, keeping ${this.current.item.name}:`, err);
                this.current.startedAt = Date.now();
            })
            .finally(() => { this.preparing = false; });
    }

    // Each animation gets its own canvas, so two can run at once during a transition
    async #setUp(item) {
        const [width, height] = this.size;
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');
        const render = await item.sketch({ canvas, context, width, height });
        return { item, render, context, startedAt: 0 };
    }

    #renderLed({ render, context }) {
        const [width, height] = this.size;
        render({ context, width, height });
        const full = context.getImageData(0, 0, width, height);
        return pixelize.scaleDown(full, ...this.ledSize);
    }

    #pickNext() {
        const current = this.current.item;
        if (this.order === 'in-order') {
            return this.items[(this.items.indexOf(current) + 1) % this.items.length];
        }
        const others = this.items.filter(item => item !== current);
        return others.length ? others[Math.floor(Math.random() * others.length)] : current;
    }

    #transitionTo(item) {
        return item.transitionIn ?? this.transition;
    }
}
