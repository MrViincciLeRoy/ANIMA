/* avatar.js — 2D Anime Avatar Engine (mobile-optimised) */

const AvatarEngine = (() => {
  const canvas = document.getElementById('avatarCanvas');
  const ctx = canvas.getContext('2d');
  // Internal draw resolution (canvas attribute size)
  const W = canvas.width;   // 300
  const H = canvas.height;  // 320

  const lerp = (a, b, t) => a + (b - a) * t;

  // ── STATE ──
  const state = {
    expression: 'neutral',
    mouthOpen: 0,
    blinkT: 0, blinkDuration: 0, nextBlink: 100,
    breathY: 0, breathT: 0,
    swayX: 0, swayT: 0,
    frame: 0,
    speaking: false,
  };

  const EXPRESSIONS = {
    neutral:   { eyebrow: 0,   squint: 0,    flush: 0,   mouthCurve: 0,    eyeOpen: 1.0,  label: 'NEUTRAL' },
    happy:     { eyebrow: -5,  squint: 0.45, flush: 0.6, mouthCurve: 1,    eyeOpen: 0.75, label: 'HAPPY' },
    sad:       { eyebrow: 7,   squint: 0,    flush: 0,   mouthCurve: -1,   eyeOpen: 0.9,  label: 'SAD' },
    angry:     { eyebrow: 9,   squint: 0.35, flush: 0.2, mouthCurve: -0.6, eyeOpen: 0.85, label: 'ANGRY' },
    surprised: { eyebrow: -12, squint: -0.3, flush: 0.1, mouthCurve: 0,    eyeOpen: 1.4,  label: 'SURPRISED' },
    thinking:  { eyebrow: -3,  squint: 0.1,  flush: 0,   mouthCurve: 0.2,  eyeOpen: 0.95, label: 'THINKING' },
  };

  let cur = { ...EXPRESSIONS.neutral };

  function lerpExpr(target, s = 0.07) {
    const T = EXPRESSIONS[target] || EXPRESSIONS.neutral;
    for (const k in T) if (typeof T[k] === 'number') cur[k] = lerp(cur[k], T[k], s);
  }

  // ─────────────────────────────────────────
  //  DRAW FUNCTIONS  (cx,cy = head centre)
  // ─────────────────────────────────────────

  function drawBody(cx, cy) {
    // Neck
    ctx.fillStyle = '#f0bfa8';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 90);
    ctx.lineTo(cx - 20, cy + 140);
    ctx.lineTo(cx + 20, cy + 140);
    ctx.lineTo(cx + 18, cy + 90);
    ctx.closePath();
    ctx.fill();

    // Shoulders / top of outfit
    const bodyGrad = ctx.createLinearGradient(cx, cy + 130, cx, cy + 165);
    bodyGrad.addColorStop(0, '#2a1280');
    bodyGrad.addColorStop(1, '#130840');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 130);
    ctx.bezierCurveTo(cx - 70, cy + 142, cx - 120, cy + 152, cx - 155, cy + 165);
    ctx.lineTo(cx + 155, cy + 165);
    ctx.bezierCurveTo(cx + 120, cy + 152, cx + 70, cy + 142, cx + 20, cy + 130);
    ctx.closePath();
    ctx.fill();

    // Collar highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 130);
    ctx.quadraticCurveTo(cx, cy + 148, cx + 18, cy + 130);
    ctx.stroke();
  }

  function drawHairBack(cx, cy) {
    // ── BACK HAIR (drawn first, behind everything) ──
    const hg = ctx.createLinearGradient(cx - 90, cy - 100, cx + 60, cy + 60);
    hg.addColorStop(0, '#5533cc');
    hg.addColorStop(0.35, '#3a1a90');
    hg.addColorStop(1, '#120830');
    ctx.fillStyle = hg;

    // Main hair mass
    ctx.beginPath();
    ctx.ellipse(cx, cy - 10, 90, 100, 0, 0, Math.PI * 2);
    ctx.fill();

    // Long side strands (left)
    ctx.beginPath();
    ctx.moveTo(cx - 82, cy - 20);
    ctx.bezierCurveTo(cx - 108, cy + 20, cx - 105, cy + 75, cx - 78, cy + 110);
    ctx.lineTo(cx - 60, cy + 108);
    ctx.bezierCurveTo(cx - 88, cy + 70, ctx.x || cx - 90, cy + 18, cx - 68, cy - 18);
    ctx.closePath();
    ctx.fill();

    // Long side strands (right)
    ctx.beginPath();
    ctx.moveTo(cx + 82, cy - 20);
    ctx.bezierCurveTo(cx + 108, cy + 20, cx + 105, cy + 75, cx + 78, cy + 110);
    ctx.lineTo(cx + 60, cy + 108);
    ctx.bezierCurveTo(cx + 88, cy + 70, cx + 90, cy + 18, cx + 68, cy - 18);
    ctx.closePath();
    ctx.fill();
  }

  function drawEars(cx, cy) {
    ctx.fillStyle = '#f0bfa8';
    [cx - 82, cx + 82].forEach((ex, i) => {
      ctx.beginPath();
      ctx.ellipse(ex, cy + 5, 11, 17, i === 0 ? -0.1 : 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d09070'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(ex, cy + 7, 6, 10, 0, 0, Math.PI * 2); ctx.stroke();
    });
  }

  function drawFace(cx, cy) {
    // Face shape — slightly oval with pointed chin
    const fg = ctx.createLinearGradient(cx, cy - 90, cx, cy + 100);
    fg.addColorStop(0, '#fce8d8');
    fg.addColorStop(0.5, '#f5d0b8');
    fg.addColorStop(1, '#ecb898');
    ctx.fillStyle = fg;

    ctx.beginPath();
    // Upper oval
    ctx.ellipse(cx, cy - 10, 78, 88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chin taper
    ctx.beginPath();
    ctx.moveTo(cx - 55, cy + 55);
    ctx.quadraticCurveTo(cx - 48, cy + 98, cx, cy + 105);
    ctx.quadraticCurveTo(cx + 48, cy + 98, cx + 55, cy + 55);
    ctx.fillStyle = '#edb89a';
    ctx.fill();

    // Cheek blush
    if (cur.flush > 0.02) {
      ctx.save();
      ctx.globalAlpha = cur.flush * 0.5;
      [cx - 52, cx + 52].forEach(bx => {
        const bg = ctx.createRadialGradient(bx, cy + 28, 0, bx, cy + 28, 32);
        bg.addColorStop(0, '#ff7777'); bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.ellipse(bx, cy + 28, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }
  }

  function drawEyes(cx, cy) {
    // Anime eyes: wider, taller, more expressive
    const eh = 16 * Math.max(0.1, cur.eyeOpen);
    const ew = 22;

    [cx - 30, cx + 30].forEach((ex, i) => {
      const ey = cy - 10;

      // Clip to eye shape
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.clip();

      // White
      ctx.fillStyle = '#fff';
      ctx.fillRect(ex - ew, ey - eh, ew * 2, eh * 2);

      // Iris
      const ig = ctx.createRadialGradient(ex - 3, ey - 4, 1, ex, ey, 14);
      ig.addColorStop(0, '#c0eeff');
      ig.addColorStop(0.3, '#5090ff');
      ig.addColorStop(0.7, '#1a3aaa');
      ig.addColorStop(1, '#070f30');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(ex, ey, 13, 0, Math.PI * 2); ctx.fill();

      // Pupil
      ctx.fillStyle = '#040810';
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();

      // Iris ring
      ctx.strokeStyle = 'rgba(80,140,255,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ex, ey, 12, 0, Math.PI * 2); ctx.stroke();

      // Specular highlights
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.ellipse(ex - 4, ey - 5, 4, 3, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(ex + 5, ey + 3, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.restore(); // end clip

      // Upper eyelid (blink / squint)
      const blinkAmt = Math.max(state.blinkT, Math.max(0, cur.squint));
      if (blinkAmt > 0) {
        ctx.fillStyle = '#f5d0b8';
        ctx.beginPath();
        ctx.ellipse(ex, ey - eh * (1 - blinkAmt), ew + 2, eh + 3, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      // Eyeliner top
      ctx.strokeStyle = '#18082a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - ew - 2, ey);
      ctx.quadraticCurveTo(ex, ey - eh - 4, ex + ew + 2, ey);
      ctx.stroke();
      // Wing
      ctx.beginPath();
      ctx.moveTo(ex + ew, ey - 2);
      ctx.lineTo(ex + ew + 6 * (i === 0 ? -1 : 1), ey - 6);
      ctx.stroke();

      // Lashes
      ctx.lineWidth = 1.8;
      for (let l = -4; l <= 4; l++) {
        const lx = ex + l * 4.5;
        const ly = ey - eh + 1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + l * 0.8, ly - 5);
        ctx.stroke();
      }

      // Lower lash line (subtle)
      ctx.strokeStyle = 'rgba(24,8,42,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(ex, ey + 1, ew - 2, eh * 0.4, 0, 0, Math.PI);
      ctx.stroke();
    });
  }

  function drawEyebrows(cx, cy) {
    const raise = cur.eyebrow;
    const angerAngle = state.expression === 'angry' ? 0.28 : 0;
    ctx.lineWidth = 3.5; ctx.lineCap = 'round';

    [{ x: cx - 30, dir: 1 }, { x: cx + 30, dir: -1 }].forEach(({ x, dir }) => {
      ctx.save();
      ctx.translate(x, cy - 38 - raise);
      ctx.rotate(dir * angerAngle);
      const bg = ctx.createLinearGradient(-16, 0, 16, 0);
      bg.addColorStop(0, '#28086a');
      bg.addColorStop(1, '#3d1890');
      ctx.strokeStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-16, 4);
      ctx.quadraticCurveTo(0, -6, 16, 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawNose(cx, cy) {
    ctx.strokeStyle = '#c8907a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 18);
    ctx.quadraticCurveTo(cx - 8, cy + 30, cx, cy + 33);
    ctx.quadraticCurveTo(cx + 8, cy + 30, cx + 4, cy + 18);
    ctx.stroke();
  }

  function drawMouth(cx, cy) {
    const c = cur.mouthCurve;
    const o = state.mouthOpen;
    const my = cy + 58;
    const mw = 20;

    ctx.fillStyle = '#cc7060';
    // Upper lip
    ctx.beginPath();
    ctx.moveTo(cx - mw, my);
    ctx.bezierCurveTo(cx - mw * 0.5, my - 5 - c * 5, cx + mw * 0.5, my - 5 - c * 5, cx + mw, my);
    // Lower lip
    ctx.bezierCurveTo(cx + mw * 0.5, my + 7 + o * 14 + c * 4, cx - mw * 0.5, my + 7 + o * 14 + c * 4, cx - mw, my);
    ctx.closePath(); ctx.fill();

    // Interior
    if (o > 0.05) {
      ctx.fillStyle = '#1a0510';
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, my + o * 5, mw * 0.72, o * 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8f0e0';
      ctx.beginPath(); ctx.ellipse(cx, my + 1, mw * 0.62, o * 4.5 + 1, 0, 0, Math.PI); ctx.fill();
      ctx.restore();
    }

    // Shine
    ctx.fillStyle = 'rgba(255,230,210,0.4)';
    ctx.beginPath(); ctx.ellipse(cx, my - 1, mw * 0.45, 2.5, 0, 0, Math.PI); ctx.fill();

    // Dimples on smile
    if (c > 0.5) {
      ctx.strokeStyle = '#b06050'; ctx.lineWidth = 1; ctx.globalAlpha = c * 0.45;
      [-1, 1].forEach(s => {
        ctx.beginPath();
        ctx.moveTo(cx + s * mw, my);
        ctx.quadraticCurveTo(cx + s * (mw + 9), my + c * 5, cx + s * (mw + 5), my + 11);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  function drawHairFront(cx, cy) {
    // Spiky top bangs (drawn over face)
    const hg = ctx.createLinearGradient(cx - 50, cy - 110, cx + 50, cy - 60);
    hg.addColorStop(0, '#6644dd');
    hg.addColorStop(1, '#2a1270');

    const spikes = [
      { ox: -56, oy: -88, w: 24, h: 62, a: -0.32 },
      { ox: -32, oy: -106, w: 22, h: 78, a: -0.1 },
      { ox: -4,  oy: -115, w: 24, h: 85, a: 0 },
      { ox: 28,  oy: -108, w: 22, h: 76, a: 0.1 },
      { ox: 52,  oy: -90,  w: 24, h: 60, a: 0.3 },
    ];

    ctx.fillStyle = hg;
    spikes.forEach(s => {
      ctx.save();
      ctx.translate(cx + s.ox, cy + s.oy);
      ctx.rotate(s.a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s.w / 2, s.h);
      ctx.quadraticCurveTo(0, s.h - 10, s.w / 2, s.h);
      ctx.closePath(); ctx.fill();

      // Spike highlight
      ctx.fillStyle = 'rgba(140,100,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-s.w * 0.35, s.h * 0.6);
      ctx.lineTo(s.w * 0.1, s.h * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = hg;
      ctx.restore();
    });

    // Fringe strands crossing forehead
    ctx.fillStyle = '#3a1888';
    // Left fringe
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 105);
    ctx.bezierCurveTo(cx - 36, cy - 80, cx - 42, cy - 50, cx - 36, cy - 28);
    ctx.lineTo(cx - 24, cy - 26);
    ctx.bezierCurveTo(cx - 30, cy - 48, cx - 24, cy - 78, cx - 8, cy - 103);
    ctx.closePath(); ctx.fill();

    // Right fringe
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 108);
    ctx.bezierCurveTo(cx + 22, cy - 82, cx + 18, cy - 52, cx + 16, cy - 30);
    ctx.lineTo(cx + 26, cy - 28);
    ctx.bezierCurveTo(cx + 28, cy - 50, cx + 32, cy - 80, cx + 22, cy - 106);
    ctx.closePath(); ctx.fill();

    // Hair shine
    ctx.save();
    ctx.globalAlpha = 0.18;
    const shine = ctx.createLinearGradient(cx - 40, cy - 100, cx + 20, cy - 40);
    shine.addColorStop(0, '#fff');
    shine.addColorStop(1, 'transparent');
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.ellipse(cx - 15, cy - 70, 30, 38, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ─────────────────────────────────────────
  //  MAIN DRAW
  // ─────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2 + state.swayX;
    const cy = H / 2 - 30 + state.breathY;

    drawBody(cx, cy);
    drawHairBack(cx, cy);
    drawEars(cx, cy);
    drawFace(cx, cy);
    drawNose(cx, cy);
    drawEyebrows(cx, cy);
    drawEyes(cx, cy);
    drawMouth(cx, cy);
    drawHairFront(cx, cy);
  }

  // ─────────────────────────────────────────
  //  ANIMATION LOOP
  // ─────────────────────────────────────────
  function animate() {
    state.frame++;

    // Breathing
    state.breathT += 0.017;
    state.breathY = Math.sin(state.breathT) * 2.5;

    // Gentle sway
    state.swayT += 0.007;
    state.swayX = Math.sin(state.swayT) * 1.8;

    // Blink
    state.nextBlink--;
    if (state.nextBlink <= 0 && state.blinkT === 0) {
      state.blinkDuration = 9;
      state.nextBlink = 130 + Math.floor(Math.random() * 130);
    }
    if (state.blinkDuration > 0) {
      const h = 4;
      state.blinkT = state.blinkDuration > h
        ? 1 - (state.blinkDuration - h) / h
        : state.blinkDuration / h;
      state.blinkDuration--;
      if (state.blinkDuration <= 0) state.blinkT = 0;
    }

    lerpExpr(state.expression);
    draw();
    requestAnimationFrame(animate);
  }

  animate();

  // ─────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────
  return {
    setExpression(expr) {
      state.expression = expr;
      const el = document.getElementById('expressionLabel');
      if (el && EXPRESSIONS[expr]) el.textContent = EXPRESSIONS[expr].label;
    },
    setMouth(v) { state.mouthOpen = Math.max(0, Math.min(1, v)); },
  };
})();

window.AvatarEngine = AvatarEngine;
function setExpression(expr) { AvatarEngine.setExpression(expr); }
