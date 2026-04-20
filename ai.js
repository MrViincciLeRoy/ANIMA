/* ai.js — Groq API + Web Speech TTS + Lip-sync (app.html) */

const AI = (() => {
  const apiKey = localStorage.getItem('anima_groq_key') || '';
  let muted = false;
  let speaking = false;
  let lipSyncInterval = null;
  const history = [];

  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL = 'llama3-8b-8192';

  const SYSTEM = `You are ANIMA, a warm and expressive anime-style AI companion.
You are helpful, curious, and emotionally intelligent. Keep responses concise (2-4 sentences).
At the very start of your response, include ONE emotion tag on its own line:
[happy] [sad] [angry] [surprised] [thinking] [neutral]
Then give your response. Example:
[happy]
That sounds amazing! I'd love to help with that.`;

  //  Sentiment fallback 
  function detectSentiment(t) {
    const l = t.toLowerCase();
    if (/great|wonderful|amazing|love|happy|joy|excit|glad|fantastic/.test(l)) return 'happy';
    if (/sorry|sad|unfortunate|disappoint|regret|miss|lost|hurt/.test(l)) return 'sad';
    if (/angry|furious|rage|hate|annoying|frustrat/.test(l)) return 'angry';
    if (/wow|whoa|really|surprising|unexpected|unbelievable/.test(l)) return 'surprised';
    if (/hmm|think|consider|wonder|perhaps|let me/.test(l)) return 'thinking';
    return 'neutral';
  }

  //  Lip-sync 
  function startLipSync() {
    if (lipSyncInterval) clearInterval(lipSyncInterval);
    let t = 0;
    lipSyncInterval = setInterval(() => {
      if (!speaking) { AvatarEngine.setMouth(0); clearInterval(lipSyncInterval); lipSyncInterval = null; return; }
      t += 0.25;
      AvatarEngine.setMouth(Math.max(0, Math.min(1, 0.35 + Math.sin(t * 3.1) * 0.25 + Math.random() * 0.15)));
    }, 80);
  }

  function stopLipSync() {
    speaking = false; AvatarEngine.setMouth(0);
    if (lipSyncInterval) { clearInterval(lipSyncInterval); lipSyncInterval = null; }
  }

  //  TTS 
  function speak(text) {
    if (muted || !window.speechSynthesis) return Promise.resolve();
    return new Promise(resolve => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      const pick = voices.find(v =>
        v.name.includes('Samantha') || v.name.includes('Karen') ||
        v.name.includes('Moira') || v.name.toLowerCase().includes('female') ||
        v.name.includes('Google UK English Female')
      );
      if (pick) u.voice = pick;
      u.rate = 0.95; u.pitch = 1.1; u.volume = 1;
      u.onstart = () => { speaking = true; startLipSync(); };
      u.onend = () => { stopLipSync(); resolve(); };
      u.onerror = () => { stopLipSync(); resolve(); };
      setTimeout(() => speechSynthesis.speak(u), 50);
    });
  }

  //  Status 
  function setStatus(mode, text) {
    const dot = document.getElementById('sdot');
    const label = document.getElementById('stext');
    if (!dot || !label) return;
    dot.className = 'sdot ' + mode;
    label.textContent = text;
  }

  //  Messages 
  function addMsg(role, text) {
    const h = document.getElementById('chatHistory');
    if (!h) return;
    const d = document.createElement('div');
    d.className = 'msg ' + role;
    if (role === 'sys') {
      d.innerHTML = `<span>${text}</span>`;
    } else {
      const lbl = role === 'user' ? 'YOU' : 'ANIMA';
      d.innerHTML = `<span class="mlabel">${lbl}</span><div class="bubble">${text}</div>`;
    }
    h.appendChild(d); h.scrollTop = h.scrollHeight;
  }

  function showThinking() {
    const h = document.getElementById('chatHistory');
    if (!h) return;
    const d = document.createElement('div');
    d.className = 'msg ai'; d.id = 'thinkMsg';
    d.innerHTML = `<span class="mlabel">ANIMA</span><div class="bubble dots"><span></span><span></span><span></span></div>`;
    h.appendChild(d); h.scrollTop = h.scrollHeight;
  }
  function removeThinking() { document.getElementById('thinkMsg')?.remove(); }

  function setSendEnabled(v) {
    const s = document.getElementById('sendBtn');
    const i = document.getElementById('userInput');
    if (s) s.disabled = !v;
    if (i) i.disabled = !v;
  }

  //  Groq call 
  async function callGroq(userMsg) {
    history.push({ role: 'user', content: userMsg });
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM }, ...history],
        max_tokens: 200, temperature: 0.8,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const full = data.choices[0].message.content.trim();
    history.push({ role: 'assistant', content: full });
    return full;
  }

  function parseReply(raw) {
    const m = raw.match(/^\[(happy|sad|angry|surprised|thinking|neutral)\]\s*/i);
    if (m) return { expr: m[1].toLowerCase(), text: raw.slice(m[0].length).trim() };
    return { expr: detectSentiment(raw), text: raw };
  }

  //  Public: send 
  window.sendMessage = async () => {
    const inp = document.getElementById('userInput');
    const text = inp?.value.trim();
    if (!text) return;
    inp.value = '';
    addMsg('user', text);
    setSendEnabled(false);
    setStatus('thinking', 'THINKING');
    AvatarEngine.setExpression('thinking');
    showThinking();

    try {
      const raw = await callGroq(text);
      const { expr, text: reply } = parseReply(raw);
      removeThinking();
      AvatarEngine.setExpression(expr);
      addMsg('ai', reply);
      setStatus('online', 'SPEAKING');
      await speak(reply);
      setStatus('online', 'ONLINE');
      setTimeout(() => AvatarEngine.setExpression('neutral'), 1200);
    } catch (err) {
      removeThinking();
      AvatarEngine.setExpression('sad');
      addMsg('sys', ` ${err.message}`);
      setStatus('online', 'ERROR');
      setTimeout(() => { setStatus('online', 'ONLINE'); AvatarEngine.setExpression('neutral'); }, 3000);
    }

    setSendEnabled(true);
    inp?.focus();
  };

  //  Public: mute 
  window.toggleMute = () => {
    muted = !muted;
    const btn = document.getElementById('muteBtn');
    if (btn) btn.textContent = muted ? '' : '';
    if (muted) speechSynthesis.cancel();
  };

  //  Init 
  if (apiKey) {
    setStatus('online', 'ONLINE');
    AvatarEngine.setExpression('happy');
    setTimeout(() => AvatarEngine.setExpression('neutral'), 2000);
  }

  if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
})();
