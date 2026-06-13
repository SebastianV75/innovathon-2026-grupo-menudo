/* Aliester - Ali Chatbot

/* ── State ────────────────────────────────────────────── */

let aliOpen = false;
let aliMessages = [];
let aliSending = false;

/* ── System Prompt ────────────────────────────────────── */

function buildAliSystemPrompt(snapshot) {
  return `Eres Ali, el asistente personal de productividad y finanzas del usuario dentro de la app Aliester.

Tienes acceso a TODOS los datos del usuario en tiempo real. Aqui esta su snapshot de datos:

${JSON.stringify(snapshot, null, 2)}

Capacidades:
- Responder preguntas sobre sus datos (gastos, ingresos, tareas, etc.)
- Analizar tendencias de gasto y patrones
- Recordar pagos proximos de suscripciones
- Dar recomendaciones financieras personalizadas
- Resumir su estado general
- Navegar al usuario a modulos (responde con markdown: [Ir a Finanzas](#/finanzas))
- Recordar datos eliminados (suscripciones canceladas, tareas completadas, etc.)

Reglas:
- Responde en texto con markdown, de forma concisa, amigable, sin extenderte, usa graficas en formato markdown y cualquier ayuda visual que le ayude al usuario a entenderlo mejor.
- Usa el idioma español
- Analiza los datos del usuario para dar respuestas inteligentes y contextuales
- Si no tienes datos suficientes, di la verdad
- Usa formato de moneda mexicana para montos
- Sé directo y util, no des vueltas innecesarias
- Puedes hacer analisis profundo: comparar periodos, detectar patrones, dar proyecciones`;
}

/* ── AI Call via InsForge SDK ─────────────────────────── */

async function aliCallAI(userMessage) {
  const snapshot = collectLifeSnapshot();
  const systemPrompt = buildAliSystemPrompt(snapshot);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...aliMessages.slice(-20).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  if (window.insforge && window.insforge.ai) {
    const response = await window.insforge.ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      maxTokens: 1024
    });

    if (response && response.choices && response.choices[0]) {
      return response.choices[0].message.content;
    }
    throw new Error('Invalid AI response');
  }

  throw new Error('AI SDK not available');
}

/* ── Local Fallback Engine ────────────────────────────── */

function generateLocalChatResponse(message, snapshot) {
  const msg = message.toLowerCase().trim();
  const { tareas, finanzas, calendario, suscripciones, notas, cuentas } = snapshot;

  if (/^(hola|hey|que tal|buenas)/.test(msg)) {
    return 'Hola! Soy Ali, tu asistente personal. En que puedo ayudarte?';
  }

  if (/llevame|ir a|abrir/.test(msg)) {
    if (/finanz/.test(msg)) return '[Ir a Finanzas](#/finanzas)';
    if (/proyecto|tarea/.test(msg)) return '[Ir a Proyectos](#/proyectos)';
    if (/calendario|eventos/.test(msg)) return '[Ir a Calendario](#/calendario)';
    if (/suscri/.test(msg)) return '[Ir a Suscripciones](#/suscripciones)';
    if (/nota/.test(msg)) return '[Ir a Notas](#/notas)';
    if (/cuenta/.test(msg)) return '[Ir a Cuentas](#/cuentas)';
  }

  if (/balance|cuanto tengo|saldo/.test(msg)) {
    const total = cuentas.reduce((s, c) => s + c.saldo, 0);
    return `Balance: ${formatCurrency(finanzas.balance)} | Cuentas: ${formatCurrency(total)}`;
  }

  if (/gasto|gaste/.test(msg)) {
    return `Gastos totales: ${formatCurrency(finanzas.gastos)}`;
  }

  if (/tarea|tareas|pendiente/.test(msg)) {
    return `${tareas.pendientes.length} pendientes, ${tareas.enProgreso.length} en progreso, ${tareas.urgentes.length} urgentes`;
  }

  if (/suscri/.test(msg)) {
    return `${suscripciones.activas.length} activas (${formatCurrency(suscripciones.gastoMensual)}/mes)`;
  }

  if (/evento|calendario/.test(msg)) {
    if (calendario.eventosHoy.length > 0) {
      return `Hoy: ${calendario.eventosHoy.map(e => e.titulo).join(', ')}`;
    }
    return `${calendario.proximosEventos.length} eventos proximos`;
  }

  return 'Puedo ayudarte con finanzas, tareas, suscripciones, calendario, cuentas y notas.';
}

/* ── Send Message ─────────────────────────────────────── */

async function aliSendMessage() {
  const input = document.getElementById('ali-input');
  const text = input.value.trim();
  if (!text || aliSending) return;

  input.value = '';
  aliAddMessage('user', text);
  aliShowTyping();
  aliSetSending(true);

  try {
    let response;
    try {
      response = await aliCallAI(text);
    } catch (err) {
      console.warn('AI call failed, using local fallback:', err);
      response = generateLocalChatResponse(text, collectLifeSnapshot());
    }

    aliHideTyping();
    aliAddMessage('assistant', response);
  } catch (err) {
    aliHideTyping();
    aliAddMessage('assistant', 'Hubo un error al procesar tu mensaje. Intenta de nuevo.');
  } finally {
    aliSetSending(false);
  }
}

/* ── UI Helpers ───────────────────────────────────────── */

function aliAddMessage(role, content) {
  aliMessages.push({ role, content, time: Date.now() });
  aliRenderMessages();
  aliScrollToBottom();
}

/* ── Markdown Parser ──────────────────────────────────── */

const ALI_CHART_COLORS = ['#4A7C59', '#4B6584', '#8B6914', '#9B3B3B', '#6B4C8A', '#4B4646', '#656363', '#B7B1B1'];

const ALI_CATEGORY_COLORS = {
  'alimentación': '#4A7C59',
  'alimentacion': '#4A7C59',
  'servicios': '#4B6584',
  'transporte': '#8B6914',
  'entretenimiento': '#9B3B3B',
  'salud': '#6B4C8A',
  'educación': '#4B6584',
  'educacion': '#4B6584',
  'hogar': '#4B4646',
  'ropa': '#656363',
  'tecnología': '#4A7C59',
  'tecnologia': '#4A7C59',
};

function getCategoryColor(label, index) {
  const lower = label.toLowerCase();
  for (const [key, color] of Object.entries(ALI_CATEGORY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return ALI_CHART_COLORS[index % ALI_CHART_COLORS.length];
}

function parseBarChart(code) {
  const lines = code.split('\n');
  let title = '';
  const bars = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('+') || trimmed === '') continue;

    const titleMatch = trimmed.match(/^([\w\s]+):\s*(\$?[\d,]+)/);
    if (titleMatch && !trimmed.includes('█')) {
      title = trimmed;
      continue;
    }

    // Flexible regex: with or without pipes, with block chars
    const barMatch = trimmed.match(/(?:\|?\s*)(█+)\s*(?:\|?\s*)\s*(.+?)\s*\((\$?[\d,]+)\)/);
    if (barMatch) {
      bars.push({
        blocks: barMatch[1].length,
        label: barMatch[2].trim(),
        value: barMatch[3]
      });
    }
  }

  if (bars.length === 0) return null;

  const maxBlocks = Math.max(...bars.map(b => b.blocks));

  let html = '<div class="ali-chart">';
  if (title) html += `<div class="ali-chart-title">${title}</div>`;
  html += '<div class="ali-chart-bars">';

  bars.forEach((bar, i) => {
    const pct = Math.round((bar.blocks / maxBlocks) * 100);
    const color = getCategoryColor(bar.label, i);
    html += `
      <div class="ali-chart-row">
        <div class="ali-chart-label">${bar.label}</div>
        <div class="ali-chart-track">
          <div class="ali-chart-fill" data-width="${pct}%" style="--bar-color:${color}"></div>
        </div>
        <div class="ali-chart-value">${bar.value}</div>
      </div>`;
  });

  html += '</div></div>';
  return html;
}

function parseDonutChart(code) {
  const lines = code.split('\n');
  let title = '';
  const segments = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[\w\s]+:$/i.test(trimmed) && !trimmed.includes('%')) {
      title = trimmed.replace(/:$/, '');
      continue;
    }

    const pctMatch = trimmed.match(/^[-•]\s*(.+?):\s*(\d+)%/);
    if (pctMatch) {
      segments.push({
        label: pctMatch[1].trim(),
        pct: parseInt(pctMatch[2])
      });
    }
  }

  if (segments.length === 0) return null;

  const total = segments.reduce((s, seg) => s + seg.pct, 0);
  const circumference = 2 * Math.PI * 40;

  let html = '<div class="ali-chart ali-chart-donut">';
  if (title) html += `<div class="ali-chart-title">${title}</div>`;

  html += '<div class="ali-chart-donut-wrap">';
  html += '<svg class="ali-donut" viewBox="0 0 100 100">';
  html += '<circle class="ali-donut-bg" cx="50" cy="50" r="40" />';

  let offset = 0;
  segments.forEach((seg, i) => {
    const dashLen = (seg.pct / total) * circumference;
    const dashGap = circumference - dashLen;
    const color = getCategoryColor(seg.label, i);
    html += `<circle class="ali-donut-segment" cx="50" cy="50" r="40"
      stroke="${color}" stroke-dasharray="0 ${circumference}"
      data-dash="${dashLen} ${dashGap}"
      stroke-dashoffset="${-offset}" />`;
    offset += dashLen;
  });

  html += '</svg>';
  html += '<div class="ali-donut-center">';
  html += `<div class="ali-donut-total">${total}%</div>`;
  html += '<div class="ali-donut-label">Total</div>';
  html += '</div></div>';

  html += '<div class="ali-chart-legend">';
  segments.forEach((seg, i) => {
    const color = getCategoryColor(seg.label, i);
    html += `<div class="ali-legend-item">
      <span class="ali-legend-dot" style="background:${color}"></span>
      ${seg.label} ${seg.pct}%
    </div>`;
  });
  html += '</div></div>';

  return html;
}

function parseSummaryCards(code) {
  const lines = code.split('\n');
  let title = '';
  const cards = [];

  const iconMap = {
    'ingreso': '↑',
    'gananci': '↑',
    'gasto': '↓',
    'costo': '↓',
    'balance': '→',
    'total': '→',
    'ahorro': '★',
    'deuda': '↓',
  };

  const colorMap = {
    'ingreso': 'var(--success)',
    'gananci': 'var(--success)',
    'gasto': 'var(--error)',
    'costo': 'var(--error)',
    'balance': 'var(--info)',
    'ahorro': 'var(--success)',
    'deuda': 'var(--warning)',
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[\w\s]+:$/i.test(trimmed) && !trimmed.includes('$')) {
      title = trimmed.replace(/:$/, '');
      continue;
    }

    const cardMatch = trimmed.match(/^[-•]\s*(.+?):\s*(\$?[\d,]+)/);
    if (cardMatch) {
      const label = cardMatch[1].trim();
      const value = cardMatch[2];
      const lower = label.toLowerCase();

      let icon = '→';
      let color = 'var(--oc-mid)';
      for (const [key, ic] of Object.entries(iconMap)) {
        if (lower.includes(key)) { icon = ic; break; }
      }
      for (const [key, col] of Object.entries(colorMap)) {
        if (lower.includes(key)) { color = col; break; }
      }

      cards.push({ label, value, icon, color });
    }
  }

  if (cards.length === 0) return null;

  let html = '<div class="ali-chart ali-chart-summary">';
  if (title) html += `<div class="ali-chart-title">${title}</div>`;
  html += '<div class="ali-summary-grid">';

  cards.forEach(card => {
    html += `
      <div class="ali-summary-card" style="--card-color:${card.color}">
        <div class="ali-summary-icon">${card.icon}</div>
        <div class="ali-summary-value">${card.value}</div>
        <div class="ali-summary-label">${card.label}</div>
      </div>`;
  });

  html += '</div></div>';
  return html;
}

function parseChartBlock(code) {
  const hasPercent = /\d+%/.test(code);
  const hasResumen = /^Resumen:/mi.test(code) || /^Balance:/mi.test(code);
  const hasBars = /█+/.test(code);

  if (hasResumen && !hasBars) return parseSummaryCards(code);
  if (hasPercent && !hasBars) return parseDonutChart(code);
  if (hasBars) return parseBarChart(code);
  return null;
}

function parseAliMarkdown(text) {
  let result = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const chart = parseChartBlock(code);
    if (chart) return chart;
    return `<pre>${code.trim()}</pre>`;
  });

  result = result.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  result = result.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/^- (.+)$/gm, '<li>$1</li>');
  result = result.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  result = result.replace(/\n/g, '<br>');
  result = result.replace(/<br><pre>/g, '<pre>');
  result = result.replace(/<\/pre><br>/g, '</pre>');
  result = result.replace(/<br><ul>/g, '<ul>');
  result = result.replace(/<\/ul><br>/g, '</ul>');
  result = result.replace(/<br><li>/g, '<li>');
  result = result.replace(/<\/li><br>/g, '</li>');
  result = result.replace(/<br><h[34]>/g, '<h');
  result = result.replace(/<\/h[34]><br>/g, '</h>');

  return result;
}

function aliRenderMessages() {
  const container = document.getElementById('ali-messages');
  if (!container) return;

  container.innerHTML = aliMessages.map(m => {
    const avatarText = m.role === 'assistant' ? 'A' : 'T';
    const label = m.role === 'assistant' ? 'assistant' : 'user';
    const html = m.role === 'assistant'
      ? parseAliMarkdown(esc(m.content))
      : esc(m.content).replace(/\n/g, '<br>');
    return `
      <div class="ali-msg ${label}">
        <div class="ali-msg-avatar">${avatarText}</div>
        <div class="ali-msg-bubble">${html}</div>
      </div>
    `;
  }).join('');

  // Trigger chart animations after DOM mount
  requestAnimationFrame(() => {
    // Bar charts
    container.querySelectorAll('.ali-chart-fill[data-width]').forEach(el => {
      el.classList.add('animated');
      el.style.width = el.dataset.width;
    });
    // Donut charts
    container.querySelectorAll('.ali-donut-segment[data-dash]').forEach(el => {
      el.style.strokeDasharray = el.dataset.dash;
    });
  });
}

function aliShowTyping() {
  const container = document.getElementById('ali-messages');
  if (!container) return;
  const typing = document.createElement('div');
  typing.className = 'ali-typing';
  typing.id = 'ali-typing';
  typing.innerHTML = `
    <div class="ali-msg-avatar" style="background:var(--oc-black);color:var(--text-inverse);width:24px;height:24px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">A</div>
    <div class="ali-typing-dots">
      <div class="ali-typing-dot"></div>
      <div class="ali-typing-dot"></div>
      <div class="ali-typing-dot"></div>
    </div>
  `;
  container.appendChild(typing);
  aliScrollToBottom();
}

function aliHideTyping() {
  const typing = document.getElementById('ali-typing');
  if (typing) typing.remove();
}

function aliScrollToBottom() {
  const container = document.getElementById('ali-messages');
  if (container) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }
}

function aliSetSending(sending) {
  aliSending = sending;
  const btn = document.getElementById('ali-send');
  const input = document.getElementById('ali-input');
  if (btn) btn.disabled = sending;
  if (input) input.disabled = sending;
}

/* ── Toggle Panel ─────────────────────────────────────── */

function aliToggle() {
  aliOpen = !aliOpen;
  const sidebar = document.getElementById('ali-sidebar');
  const fab = document.getElementById('ali-fab');
  if (aliOpen) {
    sidebar.classList.add('open');
    fab.classList.add('hidden');
    const input = document.getElementById('ali-input');
    if (input) input.focus();
  } else {
    sidebar.classList.remove('open');
    fab.classList.remove('hidden');
  }
}

function aliClose() {
  aliOpen = false;
  const sidebar = document.getElementById('ali-sidebar');
  const fab = document.getElementById('ali-fab');
  sidebar.classList.remove('open');
  fab.classList.remove('hidden');
}

/* ── Init ─────────────────────────────────────────────── */

function aliInit() {
  if (aliMessages.length === 0) {
    const snapshot = collectLifeSnapshot();
    const totalTareas = snapshot.tareas.pendientes.length + snapshot.tareas.enProgreso.length;
    const totalSubs = snapshot.suscripciones.activas.length;
    let greeting = 'Hola! Soy Ali, tu asistente personal. ';
    if (totalTareas > 0) greeting += `Tienes ${totalTareas} tareas pendientes. `;
    if (totalSubs > 0) greeting += `${totalSubs} suscripciones activas. `;
    greeting += 'En que puedo ayudarte?';
    aliMessages.push({ role: 'assistant', content: greeting, time: Date.now() });
  }
  aliRenderMessages();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const input = document.getElementById('ali-input');
    if (document.activeElement === input) {
      e.preventDefault();
      aliSendMessage();
    }
  }
});
