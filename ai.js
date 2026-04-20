/* ai.js — Groq API + Web Speech TTS + Lip-sync */

const AI = (() => {
  let apiKey = '';
  let muted = false;
  let speaking = false;
  let conversationHistory = [];
  let currentUtterance = null;

  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL = 'llama3-70b-8192';

  const SYSTEM_PROMPT = `You are ANIMA, a friendly and expressive anime-style AI avatar assistant.
You are helpful, warm, and have a gentle personality. Keep responses concise (2–4 sentences max).
At the start of your response, optionally include one of these emotion tags on its own line if it fits:
[happy] [sad] [angry] [surprised] [thinking] [neutral]
Then give your actual response. Example:
[happy]
That sounds wonderful! I'd love to help you with that.`;

  // ── SENTIMENT DETECTION (fallback if no tag) ──
  function detectSentiment(text) {
    const lower = text.toLowerCase();
    if (/\b(great|wonderful|amazing|love|happy|joy|excit|glad|yay|fantastic)\b/.test(lower)) return 'happy';
    if (/\b(sorry|sad|unfortunate|disappoint|regret|miss|lost|hurt)\b/.test(lower)) return 'sad';
    if (/\b(angry|furious|rage|hate|annoying|frustrat)\b/.test(lower)) return 'angry';
    if (/\b(wow|whoa|really|surprising|unexpected|oh my|unbelievable)\b/.test(lower)) return 'surprised';
    if (/\b(hmm|think|consider|wonder|perhaps|ponder|let me)\b/.test(lower)) return 'thinking';
    return 'neutral';
  }

  // ── LIP SYNC via Audio Analyser ──
  let lipSyncInterval = null;

  function startLipSync() {
    if (lipSyncInterval) clearInterval(lipSyncInterval);
    let t = 0;
    lipSyncInterval = setInterval(() => {
      if (!speaking) {
        AvatarEngine.setMouth(0);
        clearInterval(lipSyncInterval);
        lipSyncInterval = null;
        return;
      }
      // Simulate lip movement with noise while speaking
      t += 0.25;
      const base = 0.35 + Math.sin(t * 3.1) * 0.25 + Math.random() * 0.15;
      AvatarEngine.setMouth(Math.max(0, Math.min(1, base)));
    }, 80);
  }

  function stopLipSync() {
    speaking = false;
    AvatarEngine.setMouth(0);
    if (lipSyncInterval) {
      clearInterval(lipSyncInterval);
      lipSyncInterval = null;
    }
  }

  // ── TTS via Web Speech API ──
  function speak(text) {
    if (muted || !window.speechSynthesis) return Promise.resolve();

    return new Promise((resolve) => {
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      currentUtterance = utter;

      // Pick a pleasant voice
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.toLowerCase().includes('female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Moira') ||
        v.name.includes('Google UK English Female')
      );
      if (preferred) utter.voice = preferred;

      utter.rate = 0.95;
      utter.pitch = 1.1;
      utter.volume = 1;

      utter.onstart = () => {
        speaking = true;
        startLipSync();
      };
      utter.onend = () => {
        stopLipSync();
        resolve();
      };
      utter.onerror = () => {
        stopLipSync();
        resolve();
      };

      setTimeout(() => speechSynthesis.speak(utter), 50);
    });
  }

  // ── UI HELPERS ──
  function setStatus(mode, text) {
    const dot = document.getElementById('statusDot');
    const label = document.getElementById('statusText');
    dot.className = 'status-dot ' + mode;
    label.textContent = text;
  }

  function addMessage(role, text) {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = `message ${role}`;

    if (role === 'system') {
      div.innerHTML = `<span>${text}</span>`;
    } else {
      const label = role === 'user' ? 'YOU' : 'ANIMA';
      div.innerHTML = `
        <span class="msg-label">${label}</span>
        <div class="bubble">${text}</div>
      `;
    }

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return div;
  }

  function showThinking() {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'thinkingMsg';
    div.innerHTML = `
      <span class="msg-label">ANIMA</span>
      <div class="bubble thinking-dots"><span>●</span><span>●</span><span>●</span></div>
    `;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  }

  function removeThinking() {
    const el = document.getElementById('thinkingMsg');
    if (el) el.remove();
  }

  function setSendEnabled(enabled) {
    document.getElementById('sendBtn').disabled = !enabled;
    document.getElementById('userInput').disabled = !enabled;
  }

  // ── GROQ API CALL ──
  async function callGroq(userMessage) {
    conversationHistory.push({ role: 'user', content: userMessage });

    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory
      ],
      max_tokens: 200,
      temperature: 0.8,
    };

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const full = data.choices[0].message.content.trim();
    conversationHistory.push({ role: 'assistant', content: full });
    return full;
  }

  // ── PARSE RESPONSE ──
  function parseResponse(raw) {
    const tagMatch = raw.match(/^\[(happy|sad|angry|surprised|thinking|neutral)\]\s*/i);
    let expression = null;
    let text = raw;

    if (tagMatch) {
      expression = tagMatch[1].toLowerCase();
      text = raw.slice(tagMatch[0].length).trim();
    } else {
      expression = detectSentiment(raw);
    }

    return { expression, text };
  }

  // ── PUBLIC: SET API KEY ──
  window.setApiKey = function () {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim();
    if (!key.startsWith('gsk_') && !key.startsWith('sk-')) {
      input.style.borderColor = '#ff6b6b';
      return;
    }
    apiKey = key;
    localStorage.setItem('anima_groq_key', key);
    document.getElementById('apiKeyRow').style.display = 'none';
    document.getElementById('inputRow').style.display = 'flex';
    setStatus('online', 'ONLINE');
    addMessage('system', 'Connected via Groq. Say hello to ANIMA!');
    AvatarEngine.setExpression('happy');
    setTimeout(() => AvatarEngine.setExpression('neutral'), 2500);
  };

  // ── PUBLIC: SEND MESSAGE ──
  window.sendMessage = async function () {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || !apiKey) return;

    input.value = '';
    addMessage('user', text);
    setSendEnabled(false);
    setStatus('thinking', 'THINKING');
    AvatarEngine.setExpression('thinking');
    showThinking();

    try {
      const raw = await callGroq(text);
      const { expression, text: reply } = parseResponse(raw);

      removeThinking();
      AvatarEngine.setExpression(expression);
      addMessage('ai', reply);
      setStatus('online', 'SPEAKING');

      await speak(reply);

      setStatus('online', 'ONLINE');
      setTimeout(() => AvatarEngine.setExpression('neutral'), 1200);
    } catch (err) {
      removeThinking();
      AvatarEngine.setExpression('sad');
      addMessage('system', `Error: ${err.message}`);
      setStatus('online', 'ERROR');
      setTimeout(() => setStatus('online', 'ONLINE'), 3000);
      setTimeout(() => AvatarEngine.setExpression('neutral'), 2000);
    }

    setSendEnabled(true);
    document.getElementById('userInput').focus();
  };

  // ── PUBLIC: TOGGLE MUTE ──
  window.toggleMute = function () {
    muted = !muted;
    const btn = document.getElementById('muteBtn');
    btn.textContent = muted ? '🔇' : '🔊';
    if (muted) speechSynthesis.cancel();
  };

  // ── RESTORE KEY ──
  const saved = localStorage.getItem('anima_groq_key');
  if (saved) {
    document.getElementById('apiKeyInput').value = saved;
  }

  // Preload voices
  if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
})();
