/* avatar.js — 2D Anime Avatar Engine */

const AvatarEngine = (() => {
  const canvas = document.getElementById('avatarCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // ── STATE ──
  const state = {
    expression: 'neutral', // neutral | happy | sad | angry | surprised | thinking
    mouthOpen: 0,          // 0–1 (lip-sync)
    blinkT: 0,
    blinkDuration: 0,
    nextBlink: 120,
    breathY: 0,
    breathT: 0,
    eyebrowRaise: 0,       // target
    eyebrowCurrent: 0,
    eyeSquint: 0,
    cheekFlush: 0,
    swayX: 0,
    swayT: 0,
    frame: 0,
    speaking: false,
    expressionT: 0,        // transition timer
  };

  // ── EXPRESSION CONFIGS ──
  const EXPRESSIONS = {
    neutral:   { eyebrow: 0,    squint: 0,    flush: 0,    mouthCurve: 0,    eyeOpen: 1.0, label: 'NEUTRAL' },
    happy:     { eyebrow: -4,   squint: 0.4,  flush: 0.5,  mouthCurve: 1,    eyeOpen: 0.8, label: 'HAPPY' },
    sad:       { eyebrow: 6,    squint: 0,    flush: 0,    mouthCurve: -1,   eyeOpen: 0.9, label: 'SAD' },
    angry:     { eyebrow: 8,    squint: 0.3,  flush: 0.2,  mouthCurve: -0.5, eyeOpen: 0.85,label: 'ANGRY' },
    surprised: { eyebrow: -10,  squint: -0.2, flush: 0.1,  mouthCurve: 0,    eyeOpen: 1.3, label: 'SURPRISED' },
    thinking:  { eyebrow: -2,   squint: 0.1,  flush: 0,    mouthCurve: 0.2,  eyeOpen: 0.95,label: 'THINKING' },
  };

  let currentExpr = { ...EXPRESSIONS.neutral };

  // ── HELPERS ──
  const lerp = (a, b, t) => a + (b - a) * t;

  function lerpExpr(target, speed = 0.06) {
    const T = EXPRESSIONS[target] || EXPRESSIONS.neutral;
    for (const k in T) {
      if (typeof T[k] === 'number') {
        currentExpr[k] = lerp(currentExpr[k], T[k], speed);
      }
    }
  }

  // ── HAIR DRAWING ──
  function drawHair(cx, cy, eyeOpenFactor) {
    // Back hair
    ctx.save();
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, 88, 105, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair shine
    const hairGrad = ctx.createLinearGradient(cx - 60, cy - 80, cx + 40, cy + 20);
    hairGrad.addColorStop(0, '#5533aa');
    hairGrad.addColorStop(0.4, '#2a1060');
    hairGrad.addColorStop(1, '#0d0520');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, 86, 103, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top spiky bangs
    ctx.fillStyle = '#3d1a7a';
    const spikes = [
      { x: cx - 55, y: cy - 95, w: 22, h: 55, angle: -0.3 },
      { x: cx - 30, y: cy - 110, w: 20, h: 65, angle: -0.08 },
      { x: cx,      y: cy - 118, w: 22, h: 68, angle: 0 },
      { x: cx + 28, y: cy - 110, w: 20, h: 62, angle: 0.1 },
      { x: cx + 52, y: cy - 95,  w: 22, h: 52, angle: 0.3 },
    ];
    spikes.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s.w / 2, s.h);
      ctx.lineTo(s.w / 2, s.h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Side hair strands
    ctx.fillStyle = '#2a1060';
    // Left strand
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy - 40);
    ctx.bezierCurveTo(cx - 100, cy + 10, cx - 95, cy + 60, cx - 75, cy + 80);
    ctx.lineTo(cx - 60, cy + 80);
    ctx.bezierCurveTo(cx - 80, cy + 55, cx - 85, cy + 5, cx - 65, cy - 35);
    ctx.closePath();
    ctx.fill();
    // Right strand
    ctx.beginPath();
    ctx.moveTo(cx + 80, cy - 40);
    ctx.bezierCurveTo(cx + 100, cy + 10, cx + 95, cy + 60, cx + 75, cy + 80);
    ctx.lineTo(cx + 60, cy + 80);
    ctx.bezierCurveTo(cx + 80, cy + 55, cx + 85, cy + 5, cx + 65, cy - 35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ── FACE ──
  function drawFace(cx, cy) {
    // Shadow under face
    const shadowGrad = ctx.createRadialGradient(cx, cy + 15, 20, cx, cy + 15, 90);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
    shadowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 82, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base face
    const faceGrad = ctx.createLinearGradient(cx, cy - 80, cx, cy + 80);
    faceGrad.addColorStop(0, '#f5d5c8');
    faceGrad.addColorStop(0.5, '#f0c5b0');
    faceGrad.addColorStop(1, '#e8b09a');
    ctx.fillStyle = faceGrad;

    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, 78, 92, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chin/jaw taper
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy + 45);
    ctx.quadraticCurveTo(cx - 55, cy + 95, cx, cy + 100);
    ctx.quadraticCurveTo(cx + 55, cy + 95, cx + 60, cy + 45);
    ctx.fillStyle = '#eab89e';
    ctx.fill();

    // Cheek flush
    if (currentExpr.flush > 0.01) {
      ctx.save();
      ctx.globalAlpha = currentExpr.flush * 0.45;
      const cheekCol = ctx.createRadialGradient(cx - 48, cy + 25, 0, cx - 48, cy + 25, 30);
      cheekCol.addColorStop(0, '#ff8888');
      cheekCol.addColorStop(1, 'transparent');
      ctx.fillStyle = cheekCol;
      ctx.beginPath(); ctx.ellipse(cx - 48, cy + 25, 28, 18, 0, 0, Math.PI * 2); ctx.fill();
      const cheekColR = ctx.createRadialGradient(cx + 48, cy + 25, 0, cx + 48, cy + 25, 30);
      cheekColR.addColorStop(0, '#ff8888');
      cheekColR.addColorStop(1, 'transparent');
      ctx.fillStyle = cheekColR;
      ctx.beginPath(); ctx.ellipse(cx + 48, cy + 25, 28, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ── EYES ──
  function drawEyes(cx, cy) {
    const eyeOpenFactor = currentExpr.eyeOpen;
    const eyeH = 14 * eyeOpenFactor;
    const squint = currentExpr.squint;

    [cx - 28, cx + 28].forEach((ex, i) => {
      const ey = cy - 15 + (i === 0 ? state.eyebrowCurrent * 0.3 : -state.eyebrowCurrent * 0.1);

      // Eye white
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 18, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Iris gradient
      const irisGrad = ctx.createRadialGradient(ex - 2, ey - 2, 1, ex, ey, 12);
      irisGrad.addColorStop(0, '#a0e8ff');
      irisGrad.addColorStop(0.4, '#4080ff');
      irisGrad.addColorStop(0.8, '#1a3080');
      irisGrad.addColorStop(1, '#0a1040');
      ctx.fillStyle = irisGrad;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 18, eyeH, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(ex, ey, 11, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(ex - 3, ey - 3, 3.5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(ex + 4, ey + 2, 1.5, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Upper eyelid (blink + squint)
      const blinkClose = state.blinkT > 0 ? state.blinkT : 0;
      const squintClose = squint > 0 ? squint : 0;
      const lidClose = Math.max(blinkClose, squintClose);

      ctx.fillStyle = '#f0c5b0';
      ctx.beginPath();
      ctx.ellipse(ex, ey - eyeH * (1 - lidClose), 19, eyeH + 2, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Eyelashes (top)
      ctx.strokeStyle = '#1a0a2e';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let l = -3; l <= 3; l++) {
        const lx = ex + l * 5;
        const ly = ey - eyeH;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + l * 1.5, ly - 5 - Math.abs(l) * 0.5);
        ctx.stroke();
      }

      // Eyeliner
      ctx.strokeStyle = '#1a0a2e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 19, eyeH + 1, 0, Math.PI * 1.1, Math.PI * 2 - 0.1);
      ctx.stroke();
    });
  }

  // ── EYEBROWS ──
  function drawEyebrows(cx, cy) {
    const raise = state.eyebrowCurrent;
    const angryTilt = state.expression === 'angry' ? 0.3 : 0;

    ctx.strokeStyle = '#2a1060';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    // Left brow
    ctx.save();
    ctx.translate(cx - 28, cy - 36 - raise);
    ctx.rotate(angryTilt);
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.quadraticCurveTo(0, -4, 14, 2);
    ctx.stroke();
    ctx.restore();

    // Right brow
    ctx.save();
    ctx.translate(cx + 28, cy - 36 - raise);
    ctx.rotate(-angryTilt);
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.quadraticCurveTo(0, -4, 14, 4);
    ctx.stroke();
    ctx.restore();
  }

  // ── NOSE ──
  function drawNose(cx, cy) {
    ctx.strokeStyle = '#c89070';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 15);
    ctx.quadraticCurveTo(cx - 8, cy + 28, cx, cy + 30);
    ctx.quadraticCurveTo(cx + 8, cy + 28, cx + 5, cy + 15);
    ctx.stroke();
  }

  // ── MOUTH ──
  function drawMouth(cx, cy) {
    const curve = currentExpr.mouthCurve;
    const mouthOpen = state.mouthOpen;
    const my = cy + 55;
    const mw = 22;

    // Lips base
    ctx.fillStyle = '#d4806a';
    ctx.beginPath();
    // Upper lip
    ctx.moveTo(cx - mw, my);
    ctx.bezierCurveTo(cx - mw * 0.5, my - 5 - curve * 5, cx + mw * 0.5, my - 5 - curve * 5, cx + mw, my);
    // Lower lip
    ctx.bezierCurveTo(cx + mw * 0.5, my + 8 + mouthOpen * 12 + curve * 4,
                      cx - mw * 0.5, my + 8 + mouthOpen * 12 + curve * 4,
                      cx - mw, my);
    ctx.closePath();
    ctx.fill();

    // Mouth interior when open
    if (mouthOpen > 0.05) {
      ctx.fillStyle = '#1a0510';
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, my + mouthOpen * 4, mw * 0.7, mouthOpen * 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Teeth
      ctx.fillStyle = '#f5f0e8';
      ctx.beginPath();
      ctx.ellipse(cx, my + 2, mw * 0.6, mouthOpen * 5 + 1, 0, 0, Math.PI);
      ctx.fill();
      ctx.restore();
    }

    // Lip shine
    ctx.fillStyle = 'rgba(255,220,200,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, my - 1, mw * 0.5, 2.5, 0, 0, Math.PI);
    ctx.fill();

    // Smile lines
    if (Math.abs(curve) > 0.3) {
      ctx.strokeStyle = '#c07060';
      ctx.lineWidth = 1;
      ctx.globalAlpha = Math.abs(curve) * 0.5;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(cx + side * mw, my);
        ctx.quadraticCurveTo(cx + side * (mw + 10), my + curve * 5, cx + side * (mw + 5), my + 12);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  // ── EAR + NECK ──
  function drawEarNeck(cx, cy) {
    // Neck
    ctx.fillStyle = '#eab89e';
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy + 95);
    ctx.bezierCurveTo(cx - 24, cy + 130, cx - 20, cy + 150, cx - 18, cy + 160);
    ctx.lineTo(cx + 18, cy + 160);
    ctx.bezierCurveTo(cx + 20, cy + 150, cx + 24, cy + 130, cx + 22, cy + 95);
    ctx.closePath();
    ctx.fill();

    // Ears
    [cx - 78, cx + 78].forEach((ex, i) => {
      ctx.fillStyle = '#ebb89e';
      ctx.beginPath();
      ctx.ellipse(ex, cy + 5, 10, 16, i === 0 ? -0.1 : 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c89070';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(ex, cy + 5, 6, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // ── BODY / SHOULDERS ──
  function drawBody(cx, cy) {
    const bodyY = cy + 160;
    // Collarbone
    const bodyGrad = ctx.createLinearGradient(cx, bodyY, cx, bodyY + 80);
    bodyGrad.addColorStop(0, '#1e1060');
    bodyGrad.addColorStop(1, '#0d0830');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(cx - 18, bodyY);
    ctx.bezierCurveTo(cx - 60, bodyY + 15, cx - 110, bodyY + 35, cx - 130, bodyY + 80);
    ctx.lineTo(cx + 130, bodyY + 80);
    ctx.bezierCurveTo(cx + 110, bodyY + 35, cx + 60, bodyY + 15, cx + 18, bodyY);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(cx - 18, bodyY);
    ctx.bezierCurveTo(cx - 5, bodyY + 25, cx + 5, bodyY + 25, cx + 18, bodyY);
    ctx.lineTo(cx + 25, bodyY + 50);
    ctx.lineTo(cx, bodyY + 45);
    ctx.lineTo(cx - 25, bodyY + 50);
    ctx.closePath();
    ctx.fill();
  }

  // ── MAIN DRAW ──
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background subtle glow
    const bg = ctx.createRadialGradient(W/2, H/2, 40, W/2, H/2, 180);
    bg.addColorStop(0, 'rgba(74,240,196,0.04)');
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2 + state.swayX;
    const cy = H / 2 - 40 + state.breathY;

    drawBody(cx, cy);
    drawEarNeck(cx, cy);
    drawHair(cx, cy, currentExpr.eyeOpen);
    drawFace(cx, cy);
    drawNose(cx, cy);
    drawEyebrows(cx, cy);
    drawEyes(cx, cy);
    drawMouth(cx, cy);

    // Hair on top of face (front strands)
    ctx.fillStyle = '#3d1a7a';
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 105);
    ctx.bezierCurveTo(cx - 35, cy - 80, cx - 40, cy - 50, cx - 35, cy - 30);
    ctx.lineTo(cx - 25, cy - 28);
    ctx.bezierCurveTo(cx - 30, cy - 48, cx - 25, cy - 78, cx - 10, cy - 103);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a1060';
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 108);
    ctx.bezierCurveTo(cx + 20, cy - 85, ctx.x, cy - 55, cx + 18, cy - 35);
    ctx.lineTo(cx + 28, cy - 33);
    ctx.bezierCurveTo(cx + 20, cy - 53, cx + 28, cy - 83, cx + 20, cy - 106);
    ctx.closePath();
    ctx.fill();
  }

  // ── ANIMATION LOOP ──
  function animate() {
    state.frame++;

    // Breathing
    state.breathT += 0.018;
    state.breathY = Math.sin(state.breathT) * 3;

    // Sway
    state.swayT += 0.008;
    state.swayX = Math.sin(state.swayT) * 2;

    // Blink
    state.nextBlink--;
    if (state.nextBlink <= 0 && state.blinkT === 0) {
      state.blinkDuration = 8;
      state.nextBlink = 140 + Math.random() * 120;
    }
    if (state.blinkDuration > 0) {
      const half = 4;
      state.blinkT = state.blinkDuration > half
        ? 1 - (state.blinkDuration - half) / half
        : state.blinkDuration / half;
      state.blinkDuration--;
      if (state.blinkDuration <= 0) state.blinkT = 0;
    }

    // Expression lerp
    lerpExpr(state.expression);
    state.eyebrowCurrent = lerp(state.eyebrowCurrent, currentExpr.eyebrow || 0, 0.08);

    draw();
    requestAnimationFrame(animate);
  }

  animate();

  // ── PUBLIC API ──
  return {
    setExpression(expr) {
      state.expression = expr;
      const label = document.getElementById('expressionLabel');
      if (label && EXPRESSIONS[expr]) label.textContent = EXPRESSIONS[expr].label;
    },
    setMouth(val) {
      state.mouthOpen = Math.max(0, Math.min(1, val));
    },
    getMouthOpen() { return state.mouthOpen; },
  };
})();

// Expose globally
window.AvatarEngine = AvatarEngine;

function setExpression(expr) {
  AvatarEngine.setExpression(expr);
}
