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

/* ── Resumen humano + insights (derivados en cliente, siempre disponibles) ── */

function buildGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function buildDateLabel() {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function joinNatural(parts) {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
}

function buildDayHeadline(s) {
  const ev = s.calendario.eventosHoy.length;
  const urg = s.tareas.urgentes.length;
  const cortes = s.suscripciones.proximasCorte.length;

  const parts = [];
  if (ev > 0) parts.push(`${ev} evento${ev > 1 ? 's' : ''} hoy`);
  if (urg > 0) parts.push(`${urg} tarea${urg > 1 ? 's' : ''} urgente${urg > 1 ? 's' : ''}`);
  if (cortes > 0) parts.push(`${cortes} cobro${cortes > 1 ? 's' : ''} cerca`);

  if (parts.length === 0) {
    const pend = s.tareas.pendientes.length;
    if (pend > 0) return `Sin urgencias hoy. Tienes ${pend} pendiente${pend > 1 ? 's' : ''} cuando quieras avanzar.`;
    return 'Tu dia esta despejado. Buen momento para planear lo que viene.';
  }
  return `Para hoy: ${joinNatural(parts)}.`;
}

function computeInsights(s) {
  const { finanzas, suscripciones, cuentas } = s;
  const out = [];

  // Tasa de ahorro / balance
  if (finanzas.ingresos > 0) {
    const pct = Math.round((finanzas.balance / finanzas.ingresos) * 100);
    if (finanzas.balance >= 0) {
      out.push({
        label: 'Tasa de ahorro',
        value: `${pct}%`,
        detail: `Te queda ${formatCurrency(finanzas.balance)} este mes`,
        tone: pct >= 20 ? 'good' : 'neutral',
      });
    } else {
      out.push({
        label: 'Gastas mas de lo que entra',
        value: `-${formatCurrency(Math.abs(finanzas.balance))}`,
        detail: 'Tus gastos superan tus ingresos del mes',
        tone: 'bad',
      });
    }
  }

  // Deuda en tarjetas de credito
  const credito = (cuentas || []).filter(c => c.tipo === 'credito');
  const deuda = credito.reduce((acc, c) => acc + (c.saldo || 0), 0);
  if (deuda > 0) {
    out.push({
      label: 'En tarjetas de credito',
      value: formatCurrency(deuda),
      detail: `${credito.length} tarjeta${credito.length > 1 ? 's' : ''} con saldo por pagar`,
      tone: 'warn',
    });
  }

  // Costo anual de suscripciones (+ % del ingreso)
  if (suscripciones.gastoMensual > 0) {
    const anual = suscripciones.gastoMensual * 12;
    const pctIng = finanzas.ingresos > 0
      ? Math.round((suscripciones.gastoMensual / finanzas.ingresos) * 100)
      : null;
    out.push({
      label: 'Suscripciones al año',
      value: formatCurrency(anual),
      detail: `${formatCurrency(suscripciones.gastoMensual)}/mes`
        + (pctIng !== null ? ` · ${pctIng}% de tu ingreso` : ''),
      tone: pctIng !== null && pctIng > 15 ? 'warn' : 'neutral',
    });
  }

  // Concentracion de gasto
  if (finanzas.topCategoria && finanzas.gastos > 0) {
    const [cat, monto] = finanzas.topCategoria;
    const pct = Math.round((monto / finanzas.gastos) * 100);
    out.push({
      label: `Mayor gasto: ${cat}`,
      value: `${pct}%`,
      detail: `${formatCurrency(monto)} de ${formatCurrency(finanzas.gastos)} en gastos`,
      tone: pct > 40 ? 'warn' : 'neutral',
    });
  }

  // Disponible en cuentas de debito
  const debito = (cuentas || []).filter(c => c.tipo !== 'credito');
  const disponible = debito.reduce((acc, c) => acc + (c.saldo || 0), 0);
  if (debito.length > 0) {
    out.push({
      label: 'Disponible en cuentas',
      value: formatCurrency(disponible),
      detail: `${debito.length} cuenta${debito.length > 1 ? 's' : ''} de debito`,
      tone: 'neutral',
    });
  }

  return out.slice(0, 4);
}

function renderInsights(items) {
  if (!items || items.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Lo que note</h3>
      <div class="ast-insights-grid">
        ${items.map(i => `
          <div class="ast-insight ast-insight-${esc(i.tone || 'neutral')}">
            <span class="ast-insight-value">${esc(i.value)}</span>
            <span class="ast-insight-label">${esc(i.label)}</span>
            ${i.detail ? `<span class="ast-insight-detail">${esc(i.detail)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

/* ── Tiempo libre estimado ────────────────────────────── */

const DAILY_CAPACITY_H = 8;   // horas productivas asumidas por dia
const EVENT_HOURS = 1;        // duracion asumida por evento
const TASK_MINUTES = 45;      // duracion asumida por tarea

function computeFreeTime(s) {
  const events = s.calendario.eventosHoy.length;
  const committedH = Math.min(events * EVENT_HOURS, DAILY_CAPACITY_H);
  const freeH = Math.max(DAILY_CAPACITY_H - committedH, 0);
  const freePct = Math.round((freeH / DAILY_CAPACITY_H) * 100);
  const taskSlots = Math.floor((freeH * 60) / TASK_MINUTES);
  return { capacityH: DAILY_CAPACITY_H, committedH, freeH, freePct, events, taskSlots };
}

function renderFreeTime(ft) {
  const note = ft.taskSlots > 0
    ? `Alcanza para ~${ft.taskSlots} tarea${ft.taskSlots > 1 ? 's' : ''} de ~${TASK_MINUTES} min`
    : 'Dia muy ocupado para tareas largas';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Tiempo libre hoy</h3>
      <div class="ast-freetime">
        <div class="ast-freetime-top">
          <span class="ast-freetime-value">≈ ${ft.freeH} h libres</span>
          <span class="ast-freetime-sub">${ft.committedH} h en ${ft.events} evento${ft.events === 1 ? '' : 's'}</span>
        </div>
        <div class="ast-bar"><div class="ast-bar-fill" style="width:${ft.freePct}%"></div></div>
        <p class="ast-freetime-note">${note} · estimado sobre ${ft.capacityH} h productivas</p>
      </div>
    </section>
  `;
}

/* ── Por donde empezar (plan de tareas) ───────────────── */

function recommendTasks(s) {
  const isDone = t => t.estado === 'completado' || t.etapaId === 6;
  const inProgress = t => t.estado === 'en-progreso' || (t.etapaId >= 2 && t.etapaId <= 5);

  return s.tareas.all
    .filter(t => !isDone(t))
    .map(t => {
      let score = 0;
      const reasons = [];
      if (t.prioridad === 'alta') { score += 100; reasons.push('Prioridad alta'); }
      else if (t.prioridad === 'media') { score += 40; reasons.push('Prioridad media'); }
      else { score += 10; }
      if (inProgress(t)) { score += 30; reasons.push('ya empezada, cierrala'); }
      else { reasons.push('por empezar'); }
      return {
        titulo: t.titulo,
        proyecto: t.proyecto,
        reason: reasons.join(' · '),
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function renderStartHere(tasks) {
  if (!tasks || tasks.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Por donde empezar</h3>
      <ol class="ast-start-list">
        ${tasks.map((t, i) => `
          <li>
            <a href="#/proyectos" class="ast-start-item">
              <span class="ast-start-num">${i + 1}</span>
              <span class="ast-start-body">
                <span class="ast-start-title">${esc(t.titulo)}</span>
                <span class="ast-start-reason">${esc(t.reason)}${t.proyecto ? ` · ${esc(t.proyecto)}` : ''}</span>
              </span>
            </a>
          </li>
        `).join('')}
      </ol>
    </section>
  `;
}

/* ── Como ahorrar mas / gastar menos ──────────────────── */

function buildSavingsTips(s) {
  const { finanzas, suscripciones } = s;
  const tips = [];

  // Recorte de la mayor categoria de gasto
  if (finanzas.topCategoria && finanzas.gastos > 0) {
    const [cat, monto] = finanzas.topCategoria;
    const ahorro = Math.round(monto * 0.15);
    if (ahorro > 0) {
      tips.push({
        title: `Recorta 15% en ${cat}: ahorras ~${formatCurrency(ahorro)}/mes`,
        detail: `Es tu mayor gasto (${formatCurrency(monto)}). Un ajuste pequeno rinde.`,
      });
    }
  }

  // Suscripcion mas cara
  if (suscripciones.activas.length > 0) {
    const masCara = [...suscripciones.activas].sort((a, b) => b.costo - a.costo)[0];
    if (masCara && masCara.costo > 0) {
      tips.push({
        title: `Revisa ${masCara.servicio}: ${formatCurrency(masCara.costo)}/mes`,
        detail: `Es tu suscripcion mas cara — ${formatCurrency(masCara.costo * 12)} al año. Cancelarla si no la usas libera ese monto.`,
      });
    }
  }

  // Deficit / meta concreta
  if (finanzas.balance < 0) {
    tips.push({
      title: `Recorta ~${formatCurrency(Math.abs(finanzas.balance))} para cerrar el mes en positivo`,
      detail: 'Tus gastos van por encima de tus ingresos este mes.',
    });
  } else if (finanzas.ingresos > 0) {
    const pct = Math.round((finanzas.balance / finanzas.ingresos) * 100);
    if (pct < 20 && finanzas.balance > 0) {
      const meta = Math.round(finanzas.ingresos * 0.20 - finanzas.balance);
      tips.push({
        title: `Te faltan ~${formatCurrency(meta)} para ahorrar el 20% de tu ingreso`,
        detail: `Vas en ${pct}%. Recortar gastos chicos te acerca rapido.`,
      });
    }
  }

  return tips.slice(0, 3);
}

function renderSavings(tips) {
  if (!tips || tips.length === 0) return '';
  return `
    <section class="ast-section">
      <h3 class="ast-label">Como ahorrar mas</h3>
      <ul class="ast-tip-list">
        ${tips.map(t => `
          <li class="ast-tip">
            <span class="ast-tip-title">${esc(t.title)}</span>
            ${t.detail ? `<span class="ast-tip-detail">${esc(t.detail)}</span>` : ''}
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

  // Resumen humano + insights: derivados del snapshot actual (siempre disponibles)
  const snapshot = collectLifeSnapshot();
  const greeting = buildGreeting();
  const dateLabel = buildDateLabel();
  const headline = buildDayHeadline(snapshot);
  const insights = computeInsights(snapshot);
  const freeTime = computeFreeTime(snapshot);
  const startTasks = recommendTasks(snapshot);
  const savings = buildSavingsTips(snapshot);

  const html = `
    <div class="asistente">
      <header class="ast-header">
        <div class="ast-greeting">
          <p class="ast-greeting-hello">${esc(greeting)} · ${esc(dateLabel)}</p>
          <h2 class="ast-title">${esc(headline)}</h2>
          <p class="ast-meta">Actualizado ${esc(generatedAt)}${source === 'local' ? ' · local' : ' · ia'}</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="refreshBrief()">Actualizar</button>
      </header>

      ${renderPriority(priority)}
      ${renderFreeTime(freeTime)}
      ${renderStartHere(startTasks)}
      ${renderInsights(insights)}
      ${renderSavings(savings)}
      ${renderAlerts(alerts)}
      ${renderContext(context)}
      ${renderDefer(deferItems)}
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
