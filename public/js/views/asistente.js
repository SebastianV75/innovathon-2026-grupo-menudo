/* Aliester - Asistente (attention center) */

/* ── InsForge Client (uses SDK when available, falls back to fetch) ── */

const INSFORGE_URL = window.INSFORGE_URL || 'https://47br95d3.us-east.insforge.app';

async function invokeFunction(slug, body) {
  // Prefer SDK (auto-attaches auth token)
  if (window.insforge && window.insforge.functions) {
    const { data, error } = await window.insforge.functions.invoke(slug, { body });
    if (error) throw new Error(error.message || `Function error`);
    return data;
  }

  // Fallback: raw fetch (no auth — only works for public functions)
  const res = await fetch(`${INSFORGE_URL}/functions/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Function error: ${res.status}`);
  return res.json();
}

/* ── Data Aggregation ─────────────────────────────────── */

function collectLifeSnapshot() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const allTareas = proyectosData.flatMap(p =>
    p.tareas.map(t => ({ ...t, proyecto: p.nombre }))
  );
  const pendientes = allTareas.filter(t => t.estado === 'pendiente');
  const enProgreso = allTareas.filter(t => t.estado === 'en-progreso');
  const urgentes = pendientes.filter(t => t.prioridad === 'alta');

  const ingresos = finanzasData.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const gastos = finanzasData.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const balance = ingresos - gastos;

  const gastosPorCat = {};
  finanzasData.filter(f => f.tipo === 'gasto').forEach(f => {
    gastosPorCat[f.categoria] = (gastosPorCat[f.categoria] || 0) + f.monto;
  });
  const topCategoria = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1])[0];

  const proximosEventos = eventosData
    .filter(e => e.fecha >= todayStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
    .slice(0, 5);

  const eventosHoy = eventosData.filter(e => e.fecha === todayStr);

  const subsActivas = suscripcionesData.filter(s => s.estado === 'activa');
  const gastoSubsMensual = subsActivas.reduce((s, sub) => s + sub.costo, 0);

  const todayDay = today.getDate();
  const subsProximasCorte = subsActivas
    .filter(s => {
      const diff = s.fechaCorte - todayDay;
      return diff >= 0 && diff <= 5;
    })
    .sort((a, b) => a.fechaCorte - b.fechaCorte);

  const notasRecientes = [...notasData]
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
    .slice(0, 3);

  return {
    today: todayStr,
    todayStr,
    tareas: { all: allTareas, pendientes, enProgreso, urgentes },
    finanzas: { ingresos, gastos, balance, topCategoria, gastosPorCat },
    calendario: { proximosEventos, eventosHoy },
    suscripciones: { activas: subsActivas, gastoMensual: gastoSubsMensual, proximasCorte: subsProximasCorte },
    notas: notasRecientes,
    cuentas: cuentasData
  };
}

/* ── Heuristic Engine (local fallback) ────────────────── */

function generateLocalBrief(snapshot) {
  const { tareas, finanzas, calendario, suscripciones, today } = snapshot;
  const todayDate = new Date(today);
  const todayDay = Number.isFinite(todayDate.getTime()) ? todayDate.getDate() : new Date().getDate();

  // ── Priority (one dominant action) ──
  let priority = null;

  if (tareas.urgentes.length > 0) {
    const t = tareas.urgentes[0];
    priority = {
      title: `Resolver "${t.titulo}"`,
      reason: `Tarea urgente en ${t.proyecto}`,
      route: '#/proyectos',
      label: 'Urgente'
    };
  } else if (calendario.eventosHoy.length > 0) {
    const e = calendario.eventosHoy[0];
    priority = {
      title: `Preparar "${e.titulo}"`,
      reason: `Evento hoy a las ${e.hora}`,
      route: '#/calendario',
      label: 'Hoy'
    };
  } else if (tareas.enProgreso.length > 0) {
    const t = tareas.enProgreso[0];
    priority = {
      title: `Avanzar "${t.titulo}"`,
      reason: `En progreso — ${t.proyecto}`,
      route: '#/proyectos',
      label: 'En curso'
    };
  } else if (tareas.pendientes.length > 0) {
    const t = tareas.pendientes[0];
    priority = {
      title: `Empezar "${t.titulo}"`,
      reason: `Pendiente en ${t.proyecto}`,
      route: '#/proyectos',
      label: 'Pendiente'
    };
  }

  if (!priority) {
    priority = { title: 'Dia libre', reason: 'Sin pendientes criticos hoy', label: 'Libre' };
  }

  // ── Next (1-2 follow-up actions) ──
  const next = [];

  if (tareas.urgentes.length > 1) {
    const t = tareas.urgentes[1];
    next.push({
      title: `Atender "${t.titulo}"`,
      reason: t.proyecto,
      route: '#/proyectos',
      label: 'Urgente'
    });
  }
  if (tareas.enProgreso.length > 0 && !priority.title.includes(tareas.enProgreso[0].titulo)) {
    next.push({
      title: `Impulsar "${tareas.enProgreso[0].titulo}"`,
      reason: tareas.enProgreso[0].proyecto,
      route: '#/proyectos',
      label: 'En curso'
    });
  }
  if (next.length === 0 && calendario.proximosEventos.length > 0 && calendario.eventosHoy.length === 0) {
    const e = calendario.proximosEventos[0];
    next.push({
      title: `Revisar "${e.titulo}"`,
      reason: formatDate(e.fecha),
      route: '#/calendario',
      label: 'Proximo'
    });
  }
  if (suscripciones.proximasCorte.length > 0 && next.length < 2) {
    const s = suscripciones.proximasCorte[0];
    next.push({
      title: `${s.servicio}: ${formatCurrency(s.costo)}`,
      reason: `Cobro dia ${s.fechaCorte}`,
      route: '#/suscripciones',
      label: 'Suscripcion'
    });
  }

  // ── Context (compact info rows) ──
  const context = [];

  if (calendario.eventosHoy.length > 0) {
    context.push({
      label: 'Hoy',
      value: `${calendario.eventosHoy.length} evento${calendario.eventosHoy.length > 1 ? 's' : ''}`,
      detail: calendario.eventosHoy.map(e => e.titulo).join(', '),
      route: '#/calendario'
    });
  } else if (calendario.proximosEventos.length > 0) {
    const e = calendario.proximosEventos[0];
    context.push({
      label: 'Calendario',
      value: e.titulo,
      detail: `${formatDate(e.fecha)} · ${e.hora}`,
      route: '#/calendario'
    });
  }

  context.push({
    label: 'Dinero',
    value: formatCurrency(finanzas.balance),
    detail: `${formatCurrency(finanzas.ingresos)} in · ${formatCurrency(finanzas.gastos)} out`,
    route: '#/finanzas'
  });

  if (tareas.pendientes.length > 0 || tareas.enProgreso.length > 0) {
    context.push({
      label: 'Tareas',
      value: `${tareas.urgentes.length} urgente${tareas.urgentes.length !== 1 ? 's' : ''}`,
      detail: `${tareas.pendientes.length} pendientes · ${tareas.enProgreso.length} en curso`,
      route: '#/proyectos'
    });
  }

  if (suscripciones.activas.length > 0) {
    context.push({
      label: 'Suscripciones',
      value: formatCurrency(suscripciones.gastoMensual) + '/mes',
      detail: `${suscripciones.activas.length} activa${suscripciones.activas.length > 1 ? 's' : ''}`,
      route: '#/suscripciones'
    });
  }

  if (snapshot.notas.length > 0) {
    context.push({
      label: 'Notas recientes',
      value: snapshot.notas[0].titulo,
      detail: snapshot.notas[0].contenido?.substring(0, 50) || '',
      route: '#/notas'
    });
  }

  // ── Defer (low priority items) ──
  const defer = [];

  const lowPriority = tareas.pendientes.filter(t => t.prioridad !== 'alta');
  if (lowPriority.length > 3) {
    defer.push(`${lowPriority.length} tareas de baja prioridad pueden esperar`);
  }

  if (finanzas.balance > 0 && finanzas.gastos > 0) {
    const ahorroPct = Math.round(((finanzas.ingresos - finanzas.gastos) / finanzas.ingresos) * 100);
    if (ahorroPct >= 20) {
      defer.push(`Balance positivo (${ahorroPct}% ahorro)`);
    }
  }

  if (tareas.pendientes.length === 0 && tareas.enProgreso.length === 0) {
    defer.push('Sin tareas abiertas');
  }

  // ── Alerts ──
  const alerts = [];

  if (finanzas.balance < 0) {
    alerts.push({
      title: `Balance negativo: ${formatCurrency(Math.abs(finanzas.balance))}`,
      detail: 'Gastos superan ingresos',
      severity: 'error'
    });
  }

  if (finanzas.topCategoria && finanzas.gastos > 0) {
    const [cat, monto] = finanzas.topCategoria;
    const pct = Math.round((monto / finanzas.gastos) * 100);
    if (pct > 40) {
      alerts.push({
        title: `${pct}% de gastos en ${cat}`,
        detail: formatCurrency(monto),
        severity: 'warning'
      });
    }
  }

  const creditCards = snapshot.cuentas.filter(c => c.tipo === 'credito');
  creditCards.forEach(c => {
    if (c.saldo > 10000) {
      alerts.push({
        title: `${c.banco} ****${c.terminacion}: ${formatCurrency(c.saldo)}`,
        detail: 'Saldo alto — paga antes del corte',
        severity: 'warning'
      });
    }
  });

  suscripciones.proximasCorte.forEach(s => {
    alerts.push({
      title: `${s.servicio}: cobro en ${s.fechaCorte - todayDay} dia(s)`,
      detail: formatCurrency(s.costo),
      severity: 'info'
    });
  });

  return {
    priority,
    next: next.slice(0, 2),
    context: context.slice(0, 5),
    defer: defer.slice(0, 3),
    alerts: alerts.slice(0, 3),
    generatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    source: 'local'
  };
}

/* ── AI Abstraction ───────────────────────────────────── */

async function getAIBrief() {
  const snapshot = collectLifeSnapshot();

  try {
    const data = await invokeFunction('ai-brief', snapshot);
    // Validate AI response has required shape
    if (!data || !data.priority || typeof data.priority !== 'object') {
      throw new Error('Invalid AI response shape');
    }
    return {
      ...data,
      generatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      source: 'ai'
    };
  } catch {
    // Fallback to local heuristic
    return generateLocalBrief(snapshot);
  }
}

/* ── Render ───────────────────────────────────────────── */

let briefData = null;
let briefLoading = false;

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function safeRoute(route) {
  const allowedRoutes = new Set([
    '#/proyectos',
    '#/calendario',
    '#/finanzas',
    '#/suscripciones',
    '#/notas',
    '#/cuentas',
  ]);
  return allowedRoutes.has(route) ? route : '';
}

function renderPriority(p) {
  if (!p) return '';
  const route = safeRoute(p.route);
  const tag = route ? 'a' : 'div';
  const href = route ? `href="${esc(route)}"` : '';
  return `
    <section class="ast-priority">
      <h3 class="ast-label ast-label-accent">Necesita tu atencion</h3>
      <${tag} ${href} class="ast-priority-card">
        <div class="ast-priority-body">
          <span class="ast-priority-title">${esc(p.title)}</span>
          <span class="ast-priority-reason">${esc(p.reason)}</span>
        </div>
        ${p.label ? `<span class="ast-priority-label">${esc(p.label)}</span>` : ''}
      </${tag}>
    </section>
  `;
}

function renderNext(items) {
  if (!items || items.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Luego</h3>
      <ul class="ast-next-list">
        ${items.map(n => {
          const route = safeRoute(n.route);
          const tag = route ? 'a' : 'div';
          const href = route ? `href="${esc(route)}"` : '';
          return `
            <li>
              <${tag} ${href} class="ast-next-item">
                <div class="ast-next-body">
                  <span class="ast-next-title">${esc(n.title)}</span>
                  <span class="ast-next-reason">${esc(n.reason)}</span>
                </div>
                ${n.label ? `<span class="ast-next-label">${esc(n.label)}</span>` : ''}
              </${tag}>
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `;
}

function renderContext(items) {
  if (!items || items.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Contexto</h3>
      <div class="ast-context-grid">
        ${items.map(c => {
          const route = safeRoute(c.route);
          const tag = route ? 'a' : 'div';
          const href = route ? `href="${esc(route)}"` : '';
          return `
            <${tag} ${href} class="ast-context-row">
              <span class="ast-context-label">${esc(c.label)}</span>
              <span class="ast-context-value">${esc(c.value)}</span>
              ${c.detail ? `<span class="ast-context-detail">${esc(c.detail)}</span>` : ''}
            </${tag}>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderDefer(items) {
  if (!items || items.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label ast-label-muted">Puedes ignorar</h3>
      <ul class="ast-defer-list">
        ${items.map(d => `<li>${esc(d)}</li>`).join('')}
      </ul>
    </section>
  `;
}

function renderAlerts(items) {
  if (!items || items.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Alertas</h3>
      <ul class="ast-alert-list">
        ${items.map(a => `
          <li class="ast-alert ast-alert-${esc(a.severity)}">
            <span class="ast-alert-title">${esc(a.title)}</span>
            ${a.detail ? `<span class="ast-alert-detail">${esc(a.detail)}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

async function renderAsistente() {
  if (briefLoading) {
    render(renderAsistenteLoading());
    return;
  }

  if (!briefData) {
    briefLoading = true;
    render(renderAsistenteLoading());
    briefData = await getAIBrief();
    briefLoading = false;
  }

  const { priority, next, context, defer: deferItems, alerts, generatedAt, source } = briefData;

  const html = `
    <div class="asistente">
      <header class="ast-header">
        <div>
          <h2 class="ast-title">Aliester</h2>
          <p class="ast-meta">${esc(generatedAt)}${source === 'local' ? ' · local' : ' · ia'}</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="refreshBrief()">Actualizar</button>
      </header>

      ${renderPriority(priority)}
      ${renderNext(next)}
      ${renderContext(context)}
      ${renderDefer(deferItems)}
      ${renderAlerts(alerts)}
    </div>
  `;
  render(html);
}

function renderAsistenteLoading() {
  return `
    <div class="asistente">
      <div class="ast-loading">
        <div class="ast-loading-dot"></div>
        <p>Analizando...</p>
      </div>
    </div>
  `;
}

async function refreshBrief() {
  briefData = null;
  briefLoading = true;
  render(renderAsistenteLoading());
  briefData = await getAIBrief();
  briefLoading = false;
  renderAsistente();
}

Router.register('/asistente', renderAsistente);
