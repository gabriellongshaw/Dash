const VIEW_H = 420;
const VIEW_W = 480;
const MAX_SCALE = 2.4;

export function fitStage(canvas, fill = false) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = fill ? canvas.clientWidth || VIEW_W : window.innerWidth;
  const ch = fill ? canvas.clientHeight || VIEW_H : window.innerHeight;
  const scale = fill ? cw / VIEW_W : Math.min(ch / VIEW_H, cw / VIEW_W, MAX_SCALE);
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  const viewW = cw / scale;
  const viewH = ch / scale;
  return {
    viewW,
    viewH,
    groundY: Math.round(viewH * 0.74),
    pxScale: dpr * scale
  };
}