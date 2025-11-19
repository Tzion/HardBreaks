// HardBreaks - A heart that breaks and heals, growing bigger with each cycle
// TO RUN: canvas-sketch hardbreaks.js --open
import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random';

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Crack {
  constructor(startX, startY, crackColor) {
    this.points = [new Point(startX, startY)];
    this.crackColor = crackColor;
    this.growthSpeed = 2.0;
    this.maxPoints = 30;
    this.healProgress = 0;
  }

  grow() {
    if (this.points.length >= this.maxPoints) return;

    const last = this.points[this.points.length - 1];

    // Move towards center with some randomness
    const angleToCenter = Math.atan2(-last.y, -last.x);
    const randomAngle = angleToCenter + random.range(-0.5, 0.5);

    const next = new Point(
      last.x + Math.cos(randomAngle) * this.growthSpeed,
      last.y + Math.sin(randomAngle) * this.growthSpeed
    );

    this.points.push(next);
  }

  heal() {
    this.healProgress += 0.015;
    if (this.healProgress > 1.0) this.healProgress = 1.0;
  }

  draw(context, offsetX, offsetY) {
    const visiblePoints = Math.floor(this.points.length * (1 - this.healProgress));

    // Draw crack line
    if (visiblePoints > 1) {
      context.strokeStyle = 'black';
      context.lineWidth = 3;
      context.beginPath();
      for (let i = 0; i < Math.min(visiblePoints, this.points.length); i++) {
        const p = this.points[i];
        if (i === 0) {
          context.moveTo(offsetX + p.x, offsetY + p.y);
        } else {
          context.lineTo(offsetX + p.x, offsetY + p.y);
        }
      }
      context.stroke();
    }

    // Draw healing glow
    if (this.healProgress > 0) {
      for (let i = visiblePoints; i < this.points.length; i++) {
        const p = this.points[i];
        const alpha = 0.6 * this.healProgress;
        context.fillStyle = `rgba(${this.crackColor.r}, ${this.crackColor.g}, ${this.crackColor.b}, ${alpha})`;
        context.beginPath();
        context.arc(offsetX + p.x, offsetY + p.y, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  isComplete() {
    return this.points.length >= this.maxPoints;
  }

  isFullyHealed() {
    return this.healProgress >= 1.0;
  }
}

class Heart {
  constructor(x, y, size, cycle) {
    this.x = x;
    this.y = y;
    this.baseSize = size;
    this.cycleNum = cycle;

    // States: BEATING, CRACKING, HALTED, HEALING, COMPLETE
    this.state = 'BEATING';
    this.beatCount = 0;
    this.maxBeats = 8;
    this.beatPhase = 0;

    this.cracks = [];
    this.haltTimer = 0;
    this.maxHaltTime = 60; // frames

    // Original heart is pure red, gets more varied with each cycle
    this.heartColor = { r: 255, g: 20, b: 60 };
    this.healColors = [];
    for (let i = 0; i <= cycle; i++) {
      this.healColors.push({
        r: 255 - i * 20,
        g: 20 + i * 30,
        b: 60 + i * 40
      });
    }
  }

  update() {
    if (this.state === 'BEATING') {
      this.beatPhase += 0.15;
      if (this.beatPhase > Math.PI * 2) {
        this.beatPhase = 0;
        this.beatCount++;
        if (this.beatCount >= this.maxBeats) {
          this.startCracking();
        }
      }
    } else if (this.state === 'CRACKING') {
      let allComplete = true;
      for (const crack of this.cracks) {
        crack.grow();
        if (!crack.isComplete()) allComplete = false;
      }
      if (allComplete) {
        this.state = 'HALTED';
        this.haltTimer = 0;
      }
    } else if (this.state === 'HALTED') {
      this.haltTimer++;
      if (this.haltTimer >= this.maxHaltTime) {
        this.startHealing();
      }
    } else if (this.state === 'HEALING') {
      let allHealed = true;
      for (const crack of this.cracks) {
        crack.heal();
        if (!crack.isFullyHealed()) allHealed = false;
      }
      if (allHealed) {
        this.state = 'COMPLETE';
      }
    }
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);

    let beatScale = 1.0;
    if (this.state === 'BEATING') {
      beatScale = 1.0 + Math.sin(this.beatPhase) * 0.08;
    }

    context.scale(beatScale, beatScale);

    // Draw heart shape
    context.fillStyle = `rgb(${this.heartColor.r}, ${this.heartColor.g}, ${this.heartColor.b})`;
    this.drawHeartShape(context, 0, 0, this.baseSize);

    // Draw cracks
    for (const crack of this.cracks) {
      crack.draw(context, 0, 0);
    }

    context.restore();
  }

  drawHeartShape(context, cx, cy, size) {
    context.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.1) {
      const xt = 16 * Math.pow(Math.sin(t), 3);
      const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const x = cx + (xt * size) / 16;
      const y = cy + (yt * size) / 16;
      if (t === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
  }

  startCracking() {
    this.state = 'CRACKING';

    // Generate 2-4 cracks starting from edges
    const numCracks = random.rangeFloor(2, 5);
    for (let i = 0; i < numCracks; i++) {
      const angle = random.range(0, Math.PI * 2);
      const startDist = this.baseSize * 0.8;
      const startX = Math.cos(angle) * startDist;
      const startY = Math.sin(angle) * startDist;

      const crackColor = this.healColors[Math.min(i, this.healColors.length - 1)];
      this.cracks.push(new Crack(startX, startY, crackColor));
    }
  }

  startHealing() {
    this.state = 'HEALING';
  }

  isComplete() {
    return this.state === 'COMPLETE';
  }
}

const sketch = () => {
  let heart;
  let cycle = 0;
  const maxCycles = 4;
  let frame = 0;

  return ({ context, width, height }) => {
    // Initialize heart on first frame
    if (frame === 0) {
      heart = new Heart(width / 2, height / 2, 60, cycle);
    }

    // Clear background
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    // Update and draw heart
    heart.update();
    heart.draw(context);

    // Check if cycle is complete
    if (heart.isComplete()) {
      cycle++;
      if (cycle < maxCycles) {
        heart = new Heart(width / 2, height / 2, 60 + cycle * 40, cycle);
      } else {
        cycle = 0; // Reset to loop forever
        heart = new Heart(width / 2, height / 2, 60, cycle);
      }
    }

    frame++;
  };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
  const settings = {
    dimensions: [980, 780], // 49x39 LEDs scaled by 20
    animate: true,
    fps: 30
  };
  canvasSketch(sketch, settings);
}

// Export for Node runtime
export default sketch;
