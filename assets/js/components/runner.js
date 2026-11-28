import { clamp, lerp, parseColor, tintColor, toCss } from '../core/utils.js';
import { drawHat, hatSpec } from './hats.js';
import { drawCharacter, hatFit, traitsOf } from './characters.js';
import { drawRunnerBack } from './runnerback.js';

export const GRAVITY = 2700;
export const JUMP_SPEED = 735;
export const DOUBLE_JUMP_SPEED = 700;
export const BODY_LIFT = 22;
export const BASE_SPEED = 300;
const MAX_TEMPO = 2.4;
const FAST_FALL = 2.4;
const BUFFER_TIME = 0.14;
const MIN_SLIDE = 0.11;
const POSE_RATE = 34;
const SPRING_K = 520;
const SPRING_D = 27;
const FLIP_TIME = 0.42;
const COYOTE = 0.08;

export const jumpTime = () => (2 * JUMP_SPEED) / GRAVITY;
export const tempoAt = speed => Math.min(MAX_TEMPO, Math.max(1, speed / BASE_SPEED));
export const jumpHeight = t => JUMP_SPEED * t - (GRAVITY * t * t) / 2;

export class Runner {
  constructor() {
    this.scaleTempo = true;
    this.reset(90, 0);
  }

  reset(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.y = groundY;
    this.vy = 0;
    this.tempo = 1;
    this.airTempo = 1;
    this.jumps = 0;
    this.jumpCount = 0;
    this.doubleCount = 0;
    this.grounded = true;
    this.sliding = false;
    this.slideHeld = false;
    this.slideTime = 0;
    this.pose = 0;
    this.vis = 0;
    this.visV = 0;
    this.buffer = 0;
    this.clock = 0;
    this.squash = 0;
    this.airK = 0;
    this.alive = true;
    this.landed = false;
    this.slid = false;
    this.flip = 1;
    this.air = 0;
    this.stride = 0;
  }

  jump() {
    const nearGround = !this.grounded && this.vy > 0 && this.groundY - this.y < this.vy * 0.09;
    if (this.jumps >= 2 || (this.jumps === 1 && nearGround)) {
      this.buffer = BUFFER_TIME;
      return null;
    }
    const first = this.jumps === 0;
    this.airTempo = this.scaleTempo ? this.tempo : 1;
    this.vy = -(first ? JUMP_SPEED : DOUBLE_JUMP_SPEED) * this.airTempo;
    this.jumps++;
    this.jumpCount++;
    if (!first) {
      this.doubleCount++;
      this.flip = 0;
    }
    this.air = 0;
    this.grounded = false;
    this.sliding = false;
    this.squash = -0.3;
    return first ? 'jump' : 'double';
  }

  setSlide(down) {
    this.slideHeld = down;
  }

  update(dt, speed, forceLow = false) {
    this.landed = false;
    this.slid = false;
    this.tempo = tempoAt(speed);

    if (!this.grounded) {
      this.air += dt;
      if (this.flip < 1) this.flip = Math.min(1, this.flip + dt / FLIP_TIME);
      const gravity = GRAVITY * this.airTempo * this.airTempo * (this.slideHeld ? FAST_FALL : 1);
      this.vy += gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.grounded = true;
        this.jumps = 0;
        this.landed = true;
        this.squash = 0.35;
        this.flip = 1;
        if (this.buffer > 0) {
          this.buffer = 0;
          this.jump();
        }
      }
    }
    this.buffer = Math.max(0, this.buffer - dt);

    if (this.grounded) {
      const want = this.slideHeld || (forceLow && this.sliding);
      if (want && !this.sliding) {
        this.sliding = true;
        this.slideTime = 0;
        this.slid = true;
        this.squash = 0.06;
      }
      if (this.sliding) {
        this.slideTime += dt;
        if (!want && this.slideTime > MIN_SLIDE) {
          this.sliding = false;
          this.squash = -0.06;
        }
      }
      const rate = 8 + speed / 200;
      this.clock += dt * rate;
      this.stride += (1 - this.stride) * Math.min(1, dt * 16);
    } else {
      this.sliding = false;
      this.stride -= this.stride * Math.min(1, dt * 10);
    }

    this.pose += ((this.sliding ? 1 : 0) - this.pose) * Math.min(1, dt * POSE_RATE);
    const target = this.sliding ? 1 : 0;
    this.visV += ((target - this.vis) * SPRING_K - this.visV * SPRING_D) * dt;
    this.vis = clamp(this.vis + this.visV * dt, -0.12, 1.14);
    this.squash -= this.squash * Math.min(1, dt * 14);
    this.airK += ((this.grounded ? 0 : 1) - this.airK) * Math.min(1, dt * 20);
  }

  box() {
    const p = this.sliding ? 1 : 0;
    const h = lerp(40, 20, p);
    const w = lerp(22, 38, p);
    return { x: this.x + lerp(6, 4, p), y: this.y - 2 - h, w, h };
  }

  drawBack(ctx, p, speed, time, look = {}, lean = 0) {
    drawRunnerBack(this, ctx, p, speed, time, look, lean);
  }

  draw(ctx, p, speed, time, look = {}) {
    const skin = look.skin || {};
    const hue = (time * 90) % 360;
    const bodyColor = skin.rainbow ? `hsl(${hue} 85% 58%)` : skin.runner || p.runner;
    const darkColor = skin.rainbow ? `hsl(${hue} 75% 38%)` : skin.runnerDark || p.runnerDark;
    const visorColor = skin.visor || p.visor;
    const scarfColor = skin.rainbow ? `hsl(${(hue + 140) % 360} 90% 70%)` : skin.scarf || p.scarf;
    const pose = this.vis;
    const w = 34;
    const h = lerp(46, 40, pose);
    const traits = traitsOf(look.char);
    const legRegion = traits.legs ? lerp(9, 0, pose) : 0;
    const bodyH = h - legRegion;
    const sx = 1 + this.squash * 0.45;
    const sy = 1 - this.squash * 0.45;
    const air = this.grounded ? 0 : clamp(this.vy / 3500, -0.18, 0.25);
    const lean = -0.95 * clamp(pose, 0, 1.1);
    const rest = Math.abs(Math.sin(lean)) * (w / 2) + Math.cos(lean) * (h / 2);

    ctx.save();
    ctx.translate(this.x + w / 2, this.y);
    ctx.scale(sx, sy);
    ctx.translate(0, -rest * lerp(1, 0.9, clamp(pose, 0, 1)));
    const spin = this.flip < 1 ? -(1 - Math.pow(1 - this.flip, 2.2)) * Math.PI * 2 : 0;
    ctx.rotate(air + lean + spin);

    const k = Math.min(1, speed / 700) + pose * 0.3;
    if (traits.scarf) {
      const scarfY = traits.scarf(h, pose);
      const wave = Math.sin(time * 20);
      ctx.strokeStyle = scarfColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, scarfY);
      ctx.quadraticCurveTo(-w / 2 - 10 - k * 8, scarfY + wave * 4, -w / 2 - 22 - k * 18, scarfY + 2 + Math.sin(time * 20 + 1.4) * 5);
      ctx.stroke();
    }

    if (pose > 0.05) {
      const amt = clamp(pose, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.28 * amt;
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const len = (14 + i * 7 + Math.sin(time * 26 + i * 2) * 4) * (0.6 + k);
        const y = -h / 2 + 6 + i * (h / 3.2);
        ctx.beginPath();
        ctx.moveTo(-w / 2 - 14 - i * 3, y);
        ctx.lineTo(-w / 2 - 14 - i * 3 - len, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (traits.legs) {
      const swing = this.grounded ? Math.sin(this.clock) * 0.75 : 0;
      const flutter = Math.sin(this.clock * 1.6) * 0.07 * pose;
      const leg = (x, y, angle, len, shade) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.roundRect(-4.5, 0, 9, len, 4);
        if (pose > 0.05) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = bodyColor;
          ctx.globalAlpha = clamp(pose, 0, 1);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = shade;
        ctx.fill();
        ctx.restore();
      };
      const lighter = toCss(tintColor(parseColor(darkColor), [255, 255, 255, 1], 0.22 * clamp(pose, 0, 1)));
      const run = [
        { x: -5.5, y: h / 2 - 12, a: this.grounded ? swing : 0.5 },
        { x: 6.5, y: h / 2 - 12, a: this.grounded ? -swing : -0.35 }
      ];
      const t = clamp(pose, 0, 1);
      const far = {
        x: lerp(run[1].x, w / 2 - 7, t),
        y: lerp(run[1].y, h / 2 - 12, t),
        a: lerp(run[1].a, -0.98 - flutter, t),
        len: lerp(12, 26, t)
      };
      const near = {
        x: lerp(run[0].x, w / 2 - 10, t),
        y: lerp(run[0].y, h / 2 - 5, t),
        a: lerp(run[0].a, -0.62 + flutter, t),
        len: lerp(12, 28, t)
      };
      leg(far.x, far.y, far.a, far.len, lighter);
      leg(near.x, near.y, near.a, near.len, darkColor);
    }

    drawCharacter(ctx, look.char, {
      w,
      h,
      pose,
      bodyH,
      time,
      clock: this.clock,
      hat: !!look.hat && look.hat !== 'hat:none',
      body: bodyColor,
      dark: darkColor,
      visor: visorColor,
      scarf: scarfColor
    });

    if (look.hat && look.hat !== 'hat:none') {
      const spec = hatSpec(look.hat);
      const fit = hatFit(look.char, w, pose, spec.reach, this.clock, spec.sink);
      ctx.save();
      ctx.translate(fit.x, -h / 2 + fit.y);
      drawHat(ctx, look.hat, { time, pose, body: bodyColor, dark: darkColor });
      ctx.restore();
    }

    ctx.restore();
  }
}