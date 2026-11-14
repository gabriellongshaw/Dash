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
  'hat:cap'(ctx, info) {
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.quadraticCurveTo(-14, -15, 0, -15);
    ctx.quadraticCurveTo(14, -15, 14, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    if (info.back) ctx.roundRect(-7, -3, 14, 4, 2);
    else ctx.roundRect(4, -4, 19, 5, 2.5);
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
    const p = Math.min(1, Math.max(0, info.pose || 0));
    const mix = (a, b) => a + (b - a) * p;
    const ear = mix(12, 10);
    const cx = mix(0, -1);
    const rx = mix(16, 3);
    const ry = mix(16, ear + 3);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(cx, ear, rx, ry, 0, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    const cupW = mix(7, 8);
    const cupH = mix(14, 14);
    ctx.roundRect(cx - rx - cupW / 2, ear - cupH / 2, cupW, cupH, 3.5);
    if (p < 0.98) ctx.roundRect(cx + rx - cupW / 2, ear - cupH / 2, cupW, cupH, 3.5);
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
    if (!info.back) {
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(3, -9, 10, 3, 1.5);
      ctx.fill();
    }
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
  },
  'hat:beret'(ctx) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(-1, -4, 17, 8, -0.12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.roundRect(-14, -1, 28, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(-1, -12, 1.8, 0, TAU);
    ctx.fill();
  },
  'hat:hardhat'(ctx) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 1, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.roundRect(-18, -2, 36, 4.5, 2.2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.roundRect(-3.5, -16, 7, 15, 2);
    ctx.fill();
  },
  'hat:bucket'(ctx) {
    ctx.fillStyle = '#a3a380';
    ctx.beginPath();
    ctx.moveTo(-11, -14);
    ctx.lineTo(11, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8b8b66';
    ctx.beginPath();
    ctx.ellipse(0, 1, 21, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d6d3a8';
    ctx.fillRect(-12.5, -5, 25, 3);
  },
  'hat:headband'(ctx, info) {
    const sw = Math.sin(info.time * 9) * 2.5;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-15, -5, 30, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(info.back ? 0 : 5, -2, 2.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(-22, 0 + sw, -27, 5 + sw * 1.5);
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(-21, -5 + sw, -26, -1 + sw * 1.5);
    ctx.stroke();
  },
  'hat:witch'(ctx, info) {
    ctx.fillStyle = '#1f1b2e';
    ctx.beginPath();
    ctx.ellipse(0, 1, 22, 5, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.quadraticCurveTo(-7, -14, 4, -22);
    ctx.quadraticCurveTo(10 + Math.sin(info.time * 5) * 1.5, -28, 15, -23);
    ctx.quadraticCurveTo(7, -17, 11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-10.5, -7, 21, 4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-2, -7.6, 4.5, 5.2);
    ctx.fillStyle = '#1f1b2e';
    ctx.fillRect(-0.6, -6.4, 1.8, 2.8);
  },
  'hat:pumpkin'(ctx) {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.roundRect(-2, -19, 4.5, 7, 1.5);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(-6, -6, 7, 9, 0, 0, TAU);
    ctx.ellipse(6, -6, 7, 9, 0, 0, TAU);
    ctx.ellipse(0, -6, 7.5, 10, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.quadraticCurveTo(-5, -6, -3, 2);
    ctx.moveTo(3, -14);
    ctx.quadraticCurveTo(5, -6, 3, 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  'hat:laurel'(ctx) {
    ctx.fillStyle = '#16a34a';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.98 - i * 0.14);
        const x = side * Math.cos(a) * -13;
        const y = -Math.sin(a) * 9 + 1 - i * 0.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * (0.5 + i * 0.35));
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.2, 5, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-14, -1.5, 28, 2.6);
  },
  'hat:tiara'(ctx, info) {
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-13, 1);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-7, -2);
    ctx.lineTo(-3.5, -11);
    ctx.lineTo(0, -4);
    ctx.lineTo(3.5, -11);
    ctx.lineTo(7, -2);
    ctx.lineTo(12, -6);
    ctx.lineTo(13, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -1, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4 + Math.sin(info.time * 6) * 0.4;
    ctx.beginPath();
    ctx.arc(-3.5, -9.5, 1.5, 0, TAU);
    ctx.arc(3.5, -9.5, 1.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  'hat:ufo'(ctx, info) {
    ctx.fillStyle = '#a5f3fc';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, -4, 8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, -3, 19, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.ellipse(0, -1.5, 15, 3, 0, 0, Math.PI);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = Math.floor(info.time * 6 + i) % 2 ? '#fde047' : '#f472b6';
      ctx.beginPath();
      ctx.arc(-11 + i * 7.3, -3, 1.4, 0, TAU);
      ctx.fill();
    }
  },
  'hat:rainbow'(ctx) {
    const cols = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6'];
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'butt';
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(0, 2, 20 - i * 2.5, Math.PI, 0);
      ctx.stroke();
    });
  },
  'hat:cloud'(ctx, info) {
    const bob = Math.sin(info.time * 3) * 1.2;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(-8, -8 + bob, 6.5, 0, TAU);
    ctx.arc(0, -13 + bob, 8, 0, TAU);
    ctx.arc(8, -8 + bob, 6.5, 0, TAU);
    ctx.roundRect(-14, -8 + bob, 28, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.roundRect(-14, -3 + bob, 28, 2.5, 1.2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < 3; i++) {
      const t = (info.time * 1.6 + i / 3) % 1;
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      ctx.ellipse(-7 + i * 7, -1 + t * 12, 1.2, 2.2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  'hat:pizza'(ctx) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-10.5, -4);
    ctx.lineTo(10.5, -4);
    ctx.lineTo(0, -23);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    for (const [x, y] of [[-3, -8], [4, -11], [-1, -16], [2, -5]]) {
      ctx.beginPath();
      ctx.arc(x, y, 2.3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(-13.5, -2, 27, 3.5, 1.7);
    ctx.fill();
  },
  'hat:donut'(ctx) {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(0, -5, 16, 7.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(0, -6.5, 15, 6.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 2.2, 0, 0, TAU);
    ctx.fill();
    const sprinkles = ['#ffffff', '#fde047', '#38bdf8', '#a3e635'];
    [[-10, -8], [-6, -11], [6, -11], [10, -7], [-9, -4], [9, -3], [0, -12]].forEach(([x, y], i) => {
      ctx.fillStyle = sprinkles[i % 4];
      ctx.fillRect(x - 1.4, y, 2.8, 1.2);
    });
  },
  'hat:mohawk'(ctx, info) {
    const cols = ['#f43f5e', '#f97316', '#facc15', '#22c55e', '#38bdf8'];
    for (let i = 0; i < 5; i++) {
      const x = info.back ? 0 : -9 + i * 4.5;
      const hgt = 11 + Math.sin(i * 1.7) * 3 + (i === 2 ? 5 : 0);
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.moveTo(x - 3.2, 1);
      ctx.lineTo(x + Math.sin(info.time * 6 + i) * 1.2, -hgt);
      ctx.lineTo(x + 3.2, 1);
      ctx.closePath();
      ctx.fill();
      if (info.back) break;
    }
  },
  'hat:fez'(ctx, info) {
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(-11, 1);
    ctx.lineTo(-8, -15);
    ctx.lineTo(8, -15);
    ctx.lineTo(11, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(0, -15, 8, 2.2, 0, 0, TAU);
    ctx.fill();
    const sway = Math.sin(info.time * 5) * 1.5;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(5, -15);
    ctx.quadraticCurveTo(12 + sway, -13, 11 + sway, -6);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(11 + sway, -5, 2, 0, TAU);
    ctx.fill();
  },
  'hat:turban'(ctx) {
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath();
    ctx.ellipse(0, -7, 15, 9, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d6cfb8';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -7 + i * 2.4 - 2, 13 - i * 0.8, 5.5, -0.18 + i * 0.12, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -8, 3.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -8, 2.2, 0, TAU);
    ctx.fill();
  },
  'hat:sailor'(ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-13, -9, 26, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-13, -2, 26, 3.4);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(-16, 0, 32, 3.4, 1.7);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -10, 2.6, 0, TAU);
    ctx.fill();
  },
  'hat:cone'(ctx) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(0, -25);
    ctx.lineTo(10, 1);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-12, -17, 24, 4.5);
    ctx.fillRect(-12, -8, 24, 4.5);
    ctx.restore();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(-13, -1, 26, 3.6, 1.8);
    ctx.fill();
  },
  'hat:bowler'(ctx) {
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.arc(0, 1, 12.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-12.2, -4, 24.4, 3);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(0, 1, 17, 3.2, 0, 0, TAU);
    ctx.fill();
  },
  'hat:visor'(ctx, info) {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.roundRect(-15, -5, 30, 5.5, 2.7);
    ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.roundRect(-15, -1.4, 30, 2, 1);
    ctx.fill();
    if (!info.back) {
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(2, -3, 21, 4.4, 2.2);
      ctx.fill();
    }
  },
  'hat:sunhat'(ctx) {
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 23, 5.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-11.5, -5, 23, 3.2);
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(8, -4, 2.2, 0, TAU);
    ctx.fill();
  },
  'hat:strawberry'(ctx) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(-14, -18, 0, -18);
    ctx.quadraticCurveTo(14, -18, 14, -8);
    ctx.quadraticCurveTo(10, 2, 0, 2);
    ctx.quadraticCurveTo(-10, 2, -14, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    for (const [x, y] of [[-7, -10], [0, -12], [7, -10], [-4, -5], [4, -5], [-10, -5], [10, -5]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 0.9, 1.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#22c55e';
    for (const a of [-0.9, -0.3, 0.3, 0.9]) {
      ctx.save();
      ctx.translate(0, -17);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-2.4, 0);
      ctx.lineTo(0, -8);
      ctx.lineTo(2.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },
  'hat:cactus'(ctx) {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.roundRect(-4, -23, 8, 20, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-11, -16, 3.6, 10, 1.8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-11, -8.4, 8, 3.6, 1.8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(7.4, -19, 3.6, 10, 1.8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(3, -11.4, 8, 3.6, 1.8);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -24, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(9, -4);
    ctx.lineTo(7, 2);
    ctx.lineTo(-7, 2);
    ctx.closePath();
    ctx.fill();
  },
  'hat:duckie'(ctx, info) {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, -7, 11.5, 7.5, 0, 0, TAU);
    ctx.fill();
    const hx = info.back ? 0 : 5;
    ctx.beginPath();
    ctx.arc(hx, -14, 5.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(-2, -6, 5, 3.4, 0, 0, TAU);
    ctx.fill();
    if (!info.back) {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.ellipse(10.6, -13.4, 3.2, 1.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(6.6, -15.2, 1, 0, TAU);
      ctx.fill();
    }
  },
  'hat:cherry'(ctx, info) {
    const sway = Math.sin(info.time * 4) * 0.8;
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6.5, -5);
    ctx.quadraticCurveTo(-5, -18, sway, -23);
    ctx.moveTo(7, -4);
    ctx.quadraticCurveTo(5, -18, sway, -23);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(4 + sway, -24, 5, 2.4, -0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(-7, -3, 5.4, 0, TAU);
    ctx.arc(7.5, -2.5, 5.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-8.6, -5, 1.5, 0, TAU);
    ctx.arc(5.9, -4.5, 1.5, 0, TAU);
    ctx.fill();
  },
  'hat:icecream'(ctx) {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(-12, -2, 24, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.arc(0, -8, 10.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(0, -17, 7.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -25, 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-4, -10, 2.4, 0, TAU);
    ctx.fill();
  },
  'hat:cake'(ctx, info) {
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.roundRect(-12.5, -10, 25, 11, 2);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-12.5, -10);
    for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(-12.5 + i * 5 + 2.5, -3, -12.5 + i * 5 + 5, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1.5, -20, 3, 10);
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.ellipse(0, -23 + Math.sin(info.time * 10) * 0.5, 2, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, -22.4, 0.9, 1.6, 0, 0, TAU);
    ctx.fill();
  },
  'hat:teapot'(ctx, info) {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, -8, 11.5, 8.4, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(9, -9);
    ctx.quadraticCurveTo(17, -9, 16, -18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-12, -8, 4, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.ellipse(0, -15.5, 6.4, 2.4, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -18.4, 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-5, -10, 2.4, 0, TAU);
    ctx.fill();
    const t = (info.time * 1.4) % 1;
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(16 + Math.sin(t * 6) * 1.5, -22 - t * 9, 2 + t * 2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  'hat:rocket'(ctx) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-13, 2);
    ctx.lineTo(-6, 1);
    ctx.closePath();
    ctx.moveTo(6, -4);
    ctx.lineTo(13, 2);
    ctx.lineTo(6, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(-6.5, 1);
    ctx.lineTo(-6.5, -13);
    ctx.quadraticCurveTo(0, -32, 6.5, -13);
    ctx.lineTo(6.5, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-5, -17);
    ctx.quadraticCurveTo(0, -30, 5, -17);
    ctx.quadraticCurveTo(0, -19, -5, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -10, 2.8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();
  },
  'hat:jester'(ctx, info) {
    const sway = Math.sin(info.time * 4) * 2;
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(-1, 1);
    ctx.lineTo(-13, 1);
    ctx.quadraticCurveTo(-14, -12, -21 + sway, -10);
    ctx.quadraticCurveTo(-8, -15, -1, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(13, 1);
    ctx.quadraticCurveTo(14, -12, 21 + sway, -10);
    ctx.quadraticCurveTo(8, -15, 1, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(0, -18);
    ctx.lineTo(5, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-13, -2, 26, 3.4);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-21 + sway, -9, 2.4, 0, TAU);
    ctx.arc(21 + sway, -9, 2.4, 0, TAU);
    ctx.arc(0, -19, 2.4, 0, TAU);
    ctx.fill();
  },
  'hat:kabuto'(ctx) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -12);
    ctx.quadraticCurveTo(-8, -22, -16, -24);
    ctx.moveTo(3, -12);
    ctx.quadraticCurveTo(8, -22, 16, -24);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(0, 1, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-12.4, -4.6, 24.8, 2.4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-13, -1, 26, 2.6);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(2.4, -8);
    ctx.lineTo(0, -5);
    ctx.lineTo(-2.4, -8);
    ctx.closePath();
    ctx.fill();
  },
  'hat:racer'(ctx, info) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 2, 14.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2.6, -12.4, 5.2, 12.4);
    if (!info.back) {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(3, -9, 12, 7, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.fillRect(5, -7.6, 4, 1.4);
    } else {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-14.5, -1, 29, 3);
    }
  },
  'hat:sheriff'(ctx) {
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.quadraticCurveTo(-12, -16, -3, -14);
    ctx.quadraticCurveTo(0, -11, 3, -14);
    ctx.quadraticCurveTo(12, -16, 11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-11.4, -4, 22.8, 2.6);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 2 : 4.4;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r, -9 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  },
  'hat:leaf'(ctx, info) {
    const sway = Math.sin(info.time * 3) * 0.08;
    const leaf = (rot, s, col) => {
      ctx.save();
      ctx.translate(0, 1);
      ctx.rotate(rot + sway);
      ctx.scale(s, s);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-13, -11, 0, -26);
      ctx.quadraticCurveTo(13, -11, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(21,128,61,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, -23);
      ctx.stroke();
      ctx.restore();
    };
    leaf(-0.7, 0.7, '#4ade80');
    leaf(0.7, 0.7, '#4ade80');
    leaf(0, 0.95, '#22c55e');
  },
  'hat:icecrown'(ctx, info) {
    const hs = [9, 15, 22, 15, 9];
    ctx.fillStyle = '#7dd3fc';
    for (let i = 0; i < 5; i++) {
      const x = -12 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x - 3.4, 0);
      ctx.lineTo(x, -hs[i]);
      ctx.lineTo(x + 3.4, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -22);
    ctx.lineTo(1.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-14, -3, 28, 4.5, 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + Math.sin(info.time * 6) * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -14, 1.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  'hat:bee'(ctx, info) {
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.quadraticCurveTo(-8, -14, -10, -19);
    ctx.moveTo(4, -1);
    ctx.quadraticCurveTo(8, -14, 10, -19);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-10, -20, 2.6, 0, TAU);
    ctx.arc(10, -20, 2.6, 0, TAU);
    ctx.fill();
    const flap = Math.sin(info.time * 30) * 0.25;
    ctx.fillStyle = 'rgba(224,242,254,0.85)';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 9, -3);
      ctx.rotate(s * (0.6 + flap));
      ctx.beginPath();
      ctx.ellipse(0, -5, 3.2, 6.4, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(-14, -4, 28, 5.4, 2.7);
    ctx.fill();
    ctx.fillStyle = '#111827';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5.4 - 1.2, -4, 2.4, 5.4);
  },
  'hat:fish'(ctx, info) {
    const flap = Math.sin(info.time * 8) * 2;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, -8, 12, 6.8, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(-18, -14 + flap);
    ctx.lineTo(-18, -2 - flap);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.quadraticCurveTo(0, -21, 5, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.ellipse(1, -5, 8, 2.6, 0, 0, TAU);
    ctx.fill();
    if (!info.back) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7, -9.6, 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(7.6, -9.6, 1.2, 0, TAU);
      ctx.fill();
    }
  },
  'hat:wings'(ctx, info) {
    const flap = Math.sin(info.time * 6) * 0.1;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s, 1);
      ctx.rotate(-flap);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.quadraticCurveTo(22, -2, 26, -17);
      ctx.quadraticCurveTo(20, -14, 18, -15);
      ctx.quadraticCurveTo(18, -9, 12, -10);
      ctx.quadraticCurveTo(14, -5, 9, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.quadraticCurveTo(17, -2, 20, -10);
      ctx.quadraticCurveTo(14, -7, 9, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.roundRect(-10, -2, 20, 3, 1.5);
    ctx.fill();
  },
  'hat:lollipop'(ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1, -14, 2, 15);
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -21, 9, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -21, 6, 0.4, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -21, 2.6, 0, Math.PI * 1.5);
    ctx.stroke();
  },
  'hat:feather'(ctx, info) {
    const sway = Math.sin(info.time * 3) * 0.08;
    const cols = ['#ef4444', '#facc15', '#3b82f6'];
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(8, -2);
      ctx.rotate(-0.25 + i * 0.38 + sway);
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.ellipse(0, -10, 2.8, 10, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, -19);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(-14, -3, 28, 4.4, 2.2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5.4 - 1, -2, 2, 2);
  },
  'hat:bandana'(ctx, info) {
    const sway = Math.sin(info.time * 6) * 1.6;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 1, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-14, -3.4, 28, 4.6);
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [[-7, -8], [0, -10], [7, -8], [-3, -5], [4, -5]]) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-13, -1);
    ctx.lineTo(-22, 3 + sway);
    ctx.lineTo(-20, -4);
    ctx.closePath();
    ctx.moveTo(-13, -1);
    ctx.lineTo(-21, -8 - sway);
    ctx.lineTo(-17, -2);
    ctx.closePath();
    ctx.fill();
  },
  'hat:disco'(ctx, info) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -27);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -12, 10.5, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-11, -23, 22, 22);
    const cols = ['#38bdf8', '#f472b6', '#facc15', '#a78bfa', '#ffffff'];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const k = Math.floor(info.time * 6 + r * 2 + c * 3) % 5;
        ctx.fillStyle = cols[(k + 5) % 5];
        ctx.globalAlpha = 0.55;
        ctx.fillRect(-10 + c * 4.2, -22 + r * 4.2, 3.4, 3.4);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-4, -16, 2.2, 0, TAU);
    ctx.fill();
  },
  'hat:crab'(ctx, info) {
    const snap = Math.sin(info.time * 7) * 0.18;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(0, -5, 12.5, 6.2, 0, 0, TAU);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 11, -8);
      ctx.rotate(s * (-0.5 + snap));
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -6, 4.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(s * 2.4, -12);
      ctx.lineTo(s * -1, -10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.lineTo(-4, -15);
    ctx.moveTo(3, -9);
    ctx.lineTo(4, -15);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -16, 2.2, 0, TAU);
    ctx.arc(4, -16, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-4, -16, 1, 0, TAU);
    ctx.arc(4, -16, 1, 0, TAU);
    ctx.fill();
  },
  'hat:pineapple'(ctx) {
    ctx.fillStyle = '#22c55e';
    for (const a of [-0.8, -0.4, 0, 0.4, 0.8]) {
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-2.6, 0);
      ctx.lineTo(0, -(11 - Math.abs(a) * 5));
      ctx.lineTo(2.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(0, -6, 11, 10, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -6, 11, 10, 0, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 5 - 12, -17);
      ctx.lineTo(i * 5 + 12, 5);
      ctx.moveTo(i * 5 + 12, -17);
      ctx.lineTo(i * 5 - 12, 5);
      ctx.stroke();
    }
    ctx.restore();
  }
};

const SPEC = {
  'hat:sprout': [0.9, 11.7],
  'hat:beanie': [0.85, 16],
  'hat:cap': [0.82, 14],
  'hat:party': [0.85, 10],
  'hat:catears': [0.85, 14],
  'hat:headphones': [1, 17, 0],
  'hat:chef': [0.8, 15.7],
  'hat:halo': [0.85, 12.5],
  'hat:tophat': [0.8, 17],
  'hat:cowboy': [0.7, 20],
  'hat:viking': [0.7, 21],
  'hat:wizard': [0.75, 18],
  'hat:pirate': [0.72, 19],
  'hat:flames': [0.85, 13],
  'hat:crown': [0.85, 14],
  'hat:bow': [0.8, 15],
  'hat:flower': [0.9, 12.5],
  'hat:bunny': [0.9, 13],
  'hat:antennae': [0.9, 14],
  'hat:propeller': [0.85, 13.5],
  'hat:graduate': [0.72, 19],
  'hat:horns': [0.85, 13],
  'hat:mushroom': [0.75, 18],
  'hat:fedora': [0.7, 20],
  'hat:antlers': [0.78, 17.5],
  'hat:santa': [0.8, 17],
  'hat:sombrero': [0.58, 25],
  'hat:knight': [0.85, 16],
  'hat:unicorn': [0.85, 14],
  'hat:beret': [0.85, 15],
  'hat:hardhat': [0.82, 14],
  'hat:bucket': [0.75, 17],
  'hat:headband': [0.9, 14.5],
  'hat:witch': [0.7, 21],
  'hat:pumpkin': [0.85, 13],
  'hat:laurel': [0.9, 14],
  'hat:tiara': [0.85, 13],
  'hat:ufo': [0.8, 19],
  'hat:rainbow': [0.8, 18],
  'hat:cloud': [0.8, 14],
  'hat:pizza': [0.78, 13],
  'hat:donut': [0.85, 16],
  'hat:mohawk': [0.9, 10],
  'hat:fez': [0.85, 12],
  'hat:turban': [0.85, 15],
  'hat:sailor': [0.82, 15],
  'hat:cone': [0.85, 11],
  'hat:bowler': [0.8, 15],
  'hat:visor': [0.9, 15],
  'hat:sunhat': [0.6, 22],
  'hat:strawberry': [0.85, 13],
  'hat:cactus': [0.9, 10],
  'hat:duckie': [0.85, 11],
  'hat:cherry': [0.9, 11],
  'hat:icecream': [0.8, 12],
  'hat:cake': [0.85, 12],
  'hat:teapot': [0.85, 11],
  'hat:rocket': [0.9, 9],
  'hat:jester': [0.8, 14],
  'hat:kabuto': [0.85, 14],
  'hat:racer': [0.85, 14],
  'hat:sheriff': [0.72, 20],
  'hat:leaf': [0.9, 9],
  'hat:icecrown': [0.85, 14],
  'hat:bee': [0.9, 14],
  'hat:fish': [0.85, 12],
  'hat:wings': [0.85, 14],
  'hat:lollipop': [0.9, 9],
  'hat:feather': [0.9, 14],
  'hat:bandana': [0.9, 14],
  'hat:disco': [0.85, 11],
  'hat:crab': [0.85, 13],
  'hat:pineapple': [0.8, 13]
};

export function hatSpec(id) {
  const spec = SPEC[id] || [0.85, 14];
  return { scale: spec[0], reach: Math.min(14, Math.max(6, spec[0] * spec[1])), sink: spec[2] === undefined ? 1 : spec[2] };
}

export function drawHat(ctx, id, info) {
  const draw = hats[id];
  if (!draw) return;
  const { scale } = hatSpec(id);
  ctx.save();
  ctx.scale(scale, scale);
  draw(ctx, info);
  ctx.restore();
}