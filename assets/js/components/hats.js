const TAU = Math.PI * 2;

const hats = {
  'hat:beanie'(ctx) {
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(-15, 1);
    ctx.quadraticCurveTo(-15, -18, 0, -18);
    ctx.quadraticCurveTo(15, -18, 15, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.roundRect(-16, -4, 32, 7, 3.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -20, 4, 0, TAU);
    ctx.fill();
  },
  'hat:cap'(ctx) {
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.quadraticCurveTo(-14, -15, 0, -15);
    ctx.quadraticCurveTo(14, -15, 14, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.roundRect(4, -4, 19, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -8, 2.5, 0, TAU);
    ctx.fill();
  },
  'hat:tophat'(ctx) {
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.roundRect(-10, -25, 20, 26, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-17, -3, 34, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(-10, -9, 20, 5);
  },
  'hat:crown'(ctx) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-13, 1);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-7, -6);
    ctx.lineTo(0, -16);
    ctx.lineTo(7, -6);
    ctx.lineTo(14, -13);
    ctx.lineTo(13, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-13, -3, 26, 4);
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(0, -8, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-8, -3, 1.6, 0, TAU);
    ctx.arc(8, -3, 1.6, 0, TAU);
    ctx.fill();
  },
  'hat:headphones'(ctx, info) {
    const half = info.w / 2;
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 12, half - 1, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.roundRect(-half - 3, 5, 7, 14, 3.5);
    ctx.roundRect(half - 4, 5, 7, 14, 3.5);
    ctx.fill();
  },
  'hat:halo'(ctx, info) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -14 + Math.sin(info.time * 3) * 1.5, 11, 4, 0, 0, TAU);
    ctx.stroke();
  },
  'hat:catears'(ctx, info) {
    ctx.fillStyle = info.dark;
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(-11, -13);
    ctx.lineTo(-2, 0);
    ctx.moveTo(14, 2);
    ctx.lineTo(11, -13);
    ctx.lineTo(2, 0);
    ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(-11, -1);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-5, -1);
    ctx.moveTo(11, -1);
    ctx.lineTo(10, -8);
    ctx.lineTo(5, -1);
    ctx.fill();
  },
  'hat:wizard'(ctx) {
    ctx.fillStyle = '#6d28d9';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.quadraticCurveTo(-4, -16, 6, -33);
    ctx.quadraticCurveTo(10, -14, 12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b21b6';
    ctx.beginPath();
    ctx.roundRect(-18, -3, 36, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-1, -12, 2.4, 0, TAU);
    ctx.arc(5, -22, 1.6, 0, TAU);
    ctx.fill();
  }
};

export function drawHat(ctx, id, info) {
  const draw = hats[id];
  if (draw) draw(ctx, info);
}
