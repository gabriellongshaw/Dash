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
  'hat:sprout'(ctx, info) {
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(0, -8);
    ctx.stroke();
    const sway = Math.sin(info.time * 4) * 0.12;
    ctx.fillStyle = '#4ade80';
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(-0.6 + sway);
    ctx.beginPath();
    ctx.ellipse(-6, 0, 7, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#22c55e';
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(0.6 - sway);
    ctx.beginPath();
    ctx.ellipse(6, 0, 7, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
  'hat:party'(ctx) {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(0, -26);
    ctx.lineTo(10, 1);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fde047';
    for (let i = -2; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-14, -6 + i * 9);
      ctx.lineTo(14, -16 + i * 9);
      ctx.lineTo(14, -12 + i * 9);
      ctx.lineTo(-14, -2 + i * 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -27, 3.4, 0, TAU);
    ctx.fill();
  },
  'hat:chef'(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-8, -10, 7, 0, TAU);
    ctx.arc(0, -14, 8, 0, TAU);
    ctx.arc(8, -10, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-12, -6, 24, 9, 2);
    ctx.fill();
    ctx.stroke();
  },
  'hat:cowboy'(ctx) {
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(-9, -15, 18, 16, [6, 6, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-20, -6);
    ctx.quadraticCurveTo(-14, 5, 0, 3);
    ctx.quadraticCurveTo(14, 5, 20, -6);
    ctx.quadraticCurveTo(14, -1, 0, -1);
    ctx.quadraticCurveTo(-14, -1, -20, -6);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-9, -6, 18, 3);
  },
  'hat:viking'(ctx) {
    ctx.fillStyle = '#fde68a';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 11, -3);
      ctx.quadraticCurveTo(side * 22, -3, side * 21, -17);
      ctx.quadraticCurveTo(side * 17, -8, side * 8, -7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(0, 1, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-13, -4, 26, 4);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(-1.5, -14, 3, 10);
  },
  'hat:pirate'(ctx) {
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(-19, 2);
    ctx.quadraticCurveTo(-14, -9, -6, -12);
    ctx.lineTo(6, -12);
    ctx.quadraticCurveTo(14, -9, 19, 2);
    ctx.quadraticCurveTo(0, -3, -19, 2);
    ctx.fill();
    ctx.fillStyle = '#f9fafb';
    ctx.beginPath();
    ctx.arc(0, -6, 2.6, 0, TAU);
    ctx.fill();
    ctx.fillRect(-3, -4, 6, 2);
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-1, -6.3, 0.7, 0, TAU);
    ctx.arc(1, -6.3, 0.7, 0, TAU);
    ctx.fill();
  },
  'hat:flames'(ctx, info) {
    for (let i = -1; i <= 1; i++) {
      const h = 14 + Math.sin(info.time * 9 + i * 1.7) * 4 + (i === 0 ? 6 : 0);
      const x = i * 8;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(x - 5, 1);
      ctx.quadraticCurveTo(x - 6, -h * 0.5, x, -h);
      ctx.quadraticCurveTo(x + 6, -h * 0.5, x + 5, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(x - 2.5, 1);
      ctx.quadraticCurveTo(x - 3, -h * 0.25, x, -h * 0.55);
      ctx.quadraticCurveTo(x + 3, -h * 0.25, x + 2.5, 1);
      ctx.closePath();
      ctx.fill();
    }
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
  },
  'hat:bow'(ctx) {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(-8, -16, -15, -10);
    ctx.quadraticCurveTo(-13, -2, 0, -6);
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(8, -16, 15, -10);
    ctx.quadraticCurveTo(13, -2, 0, -6);
    ctx.fill();
    ctx.fillStyle = '#be185d';
    ctx.beginPath();
    ctx.arc(0, -6, 3, 0, TAU);
    ctx.fill();
  },
  'hat:flower'(ctx, info) {
    const sway = Math.sin(info.time * 3) * 0.06;
    ctx.save();
    ctx.translate(2, -9);
    ctx.rotate(sway);
    ctx.fillStyle = '#f472b6';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 4.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(-9, -1, 5, 2.4, -0.5, 0, TAU);
    ctx.fill();
  },
  'hat:bunny'(ctx, info) {
    const flop = Math.sin(info.time * 5) * 0.05;
    for (const [x, a] of [[-6, -0.18], [6, 0.18]]) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(a + flop);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -11, 4.6, 12, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(0, -10, 2.4, 8.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
  'hat:antennae'(ctx, info) {
    ctx.strokeStyle = info.dark;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bob = Math.sin(info.time * 6 + side) * 2;
      const tx = side * 11 + bob;
      ctx.beginPath();
      ctx.moveTo(side * 5, 0);
      ctx.quadraticCurveTo(side * 6, -10, tx, -17);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(tx, -18, 3.2, 0, TAU);
      ctx.fill();
    }
  },
  'hat:propeller'(ctx, info) {
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, 1, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.arc(0, 1, 13, Math.PI * 1.34, Math.PI * 1.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-1, -17, 2, 5);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, -18, 1 + Math.abs(Math.cos(info.time * 22)) * 13, 2.2, 0, 0, TAU);
    ctx.fill();
  },
  'hat:graduate'(ctx) {
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.roundRect(-9, -7, 18, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(-19, -8);
    ctx.lineTo(0, -15);
    ctx.lineTo(19, -8);
    ctx.lineTo(0, -1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(15, -8);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(15, 1, 2, 0, TAU);
    ctx.fill();
  },
  'hat:horns'(ctx) {
    ctx.fillStyle = '#dc2626';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 9, 1);
      ctx.quadraticCurveTo(side * 16, -4, side * 11, -16);
      ctx.quadraticCurveTo(side * 8, -8, side * 3, -1);
      ctx.closePath();
      ctx.fill();
    }
  },
  'hat:mushroom'(ctx) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 14, 0, Math.PI, TAU);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(-16, -3, 32, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -9, 2.8, 0, TAU);
    ctx.arc(3, -12, 3.2, 0, TAU);
    ctx.arc(11, -7, 2.2, 0, TAU);
    ctx.fill();
  },
  'hat:fedora'(ctx) {
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(-10, -15, 20, 17, [7, 7, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(0, 1, 20, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-10, -6, 20, 4);
    ctx.fillStyle = '#5b2c0a';
    ctx.beginPath();
    ctx.roundRect(-3, -17, 6, 5, 2.5);
    ctx.fill();
  },
  'hat:antlers'(ctx) {
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 7, 0);
      ctx.lineTo(side * 10, -13);
      ctx.lineTo(side * 8, -21);
      ctx.moveTo(side * 10, -13);
      ctx.lineTo(side * 16, -18);
      ctx.moveTo(side * 9, -7);
      ctx.lineTo(side * 16, -9);
      ctx.stroke();
    }
  },
  'hat:santa'(ctx, info) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.quadraticCurveTo(-14, -18, 4, -22);
    ctx.quadraticCurveTo(14, -20, 15, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-17, -4, 34, 8, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5 + Math.sin(info.time * 6) * 1.2, -22, 4.2, 0, TAU);
    ctx.fill();
  },
  'hat:sombrero'(ctx) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 1, 25, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(-8, -17, 16, 18, [8, 8, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-8, -6, 16, 3.5);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-4, -4.2, 1, 0, TAU);
    ctx.arc(0, -4.2, 1, 0, TAU);
    ctx.arc(4, -4.2, 1, 0, TAU);
    ctx.fill();
  },
  'hat:knight'(ctx, info) {
    const sway = Math.sin(info.time * 7) * 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-3, -13);
    ctx.quadraticCurveTo(-9 + sway, -26, -19 + sway, -19);
    ctx.quadraticCurveTo(-11 + sway, -18, -7, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(0, 1, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-14, -3, 28, 4);
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(3, -9, 10, 3, 1.5);
    ctx.fill();
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(-1.5, -15, 3, 6);
  },
  'hat:unicorn'(ctx, info) {
    ctx.fillStyle = '#f8fafc';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 14, 1);
      ctx.lineTo(side * 12, -9);
      ctx.lineTo(side * 5, -1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(0, -26);
    ctx.lineTo(4.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = '#f9a8d4';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-6, -2 - i * 6);
      ctx.lineTo(6, -6 - i * 6);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#fde047';
    ctx.globalAlpha = 0.5 + Math.sin(info.time * 8) * 0.5;
    ctx.beginPath();
    ctx.arc(9, -22, 1.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
};

export function drawHat(ctx, id, info) {
  const draw = hats[id];
  if (draw) draw(ctx, info);
}