import { clamp } from '../core/utils.js';

const GRAVITY = 2700;
const JUMP_SPEED = 900;
const DOUBLE_JUMP_SPEED = 820;
const FAST_FALL = 2.4;
const BUFFER_TIME = 0.12;
const MIN_SLIDE = 0.3;

export class Runner {
  constructor() {
    this.x = 90;
    this.reset(90, 0);
  }

  reset(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.y = groundY;
    this.vy = 0;
    this.jumps = 0;
    this.grounded = true;
    this.sliding = false;
    this.slideHeld = false;
    this.slideTime = 0;
    this.buffer = 0;
    this.clock = 0;
    this.squash = 0;
    this.alive = true;
    this.landed = false;
  }

  jump() {
    if (this.jumps >= 2) {
      this.buffer = BUFFER_TIME;
      return null;
    }
    const first = this.jumps === 0;
    this.vy = -(first ? JUMP_SPEED : DOUBLE_JUMP_SPEED);
    this.jumps++;
    this.grounded = false;
    this.sliding = false;
    this.squash = -0.3;
    return first ? 'jump' : 'double';
  }

  setSlide(down) {
    this.slideHeld = down;
  }

  update(dt, speed) {
    this.landed = false;
    if (!this.grounded) {
      const gravity = GRAVITY * (this.slideHeld ? FAST_FALL : 1);
      this.vy += gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.grounded = true;
        this.jumps = 0;
        this.landed = true;
        this.squash = 0.35;
        if (this.buffer > 0) {
          this.buffer = 0;
          this.jump();
        }
      }
    }
    this.buffer = Math.max(0, this.buffer - dt);

    if (this.grounded) {
      if (this.slideHeld && !this.sliding) {
        this.sliding = true;
        this.slideTime = 0;
      }
      if (this.sliding) {
        this.slideTime += dt;
        if (!this.slideHeld && this.slideTime > MIN_SLIDE) this.sliding = false;
      }
      this.clock += dt * (8 + speed / 60);
    } else {
      this.sliding = false;
    }

    this.squash -= this.squash * Math.min(1, dt * 14);
  }

  box() {
    if (this.sliding) {
      return { x: this.x + 4, y: this.y - 22, w: 38, h: 20 };
    }
    return { x: this.x + 6, y: this.y - 42, w: 22, h: 40 };
  }

  draw(ctx, p, speed, time) {
    const sliding = this.sliding;
    const w = sliding ? 46 : 34;
    const h = sliding ? 24 : 46;
    const sx = 1 + this.squash * 0.45;
    const sy = 1 - this.squash * 0.45;
    const tilt = this.grounded ? 0 : clamp(this.vy / 3500, -0.18, 0.25);
    const legH = sliding ? 0 : 12;
    const bodyH = h - (sliding ? 0 : 9);

    ctx.save();
    ctx.translate(this.x + w / 2, this.y);
    ctx.scale(sx, sy);
    ctx.translate(0, -h / 2);
    ctx.rotate(tilt);

    const k = Math.min(1, speed / 700);
    const scarfY = -h / 2 + (sliding ? 8 : 13);
    const wave = Math.sin(time * 20);
    ctx.strokeStyle = p.scarf;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, scarfY);
    ctx.quadraticCurveTo(-w / 2 - 10 - k * 8, scarfY + wave * 4, -w / 2 - 22 - k * 18, scarfY + 2 + Math.sin(time * 20 + 1.4) * 5);
    ctx.stroke();

    if (legH) {
      ctx.fillStyle = p.runnerDark;
      const swing = this.grounded ? Math.sin(this.clock) : 0;
      const lift = this.grounded ? Math.max(0, Math.sin(this.clock)) * 3 : 0;
      const lift2 = this.grounded ? Math.max(0, -Math.sin(this.clock)) * 3 : 0;
      const tuck = this.grounded ? 0 : -3;
      ctx.beginPath();
      ctx.roundRect(-10 + swing * 5, h / 2 - legH - lift + tuck, 9, legH, 4);
      ctx.roundRect(2 - swing * 5, h / 2 - legH - lift2 + tuck, 9, legH, 4);
      ctx.fill();
    }

    ctx.fillStyle = p.runner;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, bodyH, sliding ? 12 : 11);
    ctx.fill();

    ctx.fillStyle = p.visor;
    ctx.beginPath();
    if (sliding) ctx.roundRect(w / 2 - 22, -h / 2 + 5, 19, 9, 5);
    else ctx.roundRect(w / 2 - 20, -h / 2 + 9, 19, 12, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (sliding) ctx.arc(w / 2 - 8, -h / 2 + 8.5, 1.8, 0, Math.PI * 2);
    else ctx.arc(w / 2 - 9, -h / 2 + 13, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
