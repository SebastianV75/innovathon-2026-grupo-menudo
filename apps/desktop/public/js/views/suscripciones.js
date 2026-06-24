/* Aliester - Suscripciones View */

// suscripcionesData is now loaded from InsForge via store.js

let suscripcionesTab = 'activas';

function calcularTiempo(fechaInicio) {
  const inicio = new Date(fechaInicio);
  const hoy = new Date();
  const meses = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
  if (meses < 1) return 'Menos de 1 mes';
  if (meses === 1) return '1 mes';
  if (meses < 12) return `${meses} meses`;
  const anios = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  if (mesesRestantes === 0) return `${anios} ${anios === 1 ? 'ano' : 'anos'}`;
  return `${anios} ${anios === 1 ? 'ano' : 'anos'} y ${mesesRestantes} meses`;
}

function renderSuscripciones() {
  const activas = suscripcionesData.filter(s => s.estado === 'activa');
  const canceladas = suscripcionesData.filter(s => s.estado === 'cancelada');
  const totalMensual = activas.reduce((s, sub) => s + sub.costo, 0);
  const totalAnual = totalMensual * 12;
  const promedioPorServicio = activas.length > 0 ? totalMensual / activas.length : 0;

  // Cobros próximos (próximos 5 días) — solo si estamos en la pestaña Activas
  const todayDay = new Date().getDate();
  const cobrosProximos = suscripcionesTab === 'activas'
    ? activas
        .filter(s => Number.isFinite(Number(s.fechaCorte)))
        .map(s => ({ sub: s, dias: Number(s.fechaCorte) - todayDay }))
        .filter(x => x.dias >= 0 && x.dias <= 5)
        .sort((a, b) => a.dias - b.dias)
    : [];

  const visibles = suscripcionesTab === 'activas' ? activas : canceladas;
  const emptyMessage = suscripcionesTab === 'activas'
    ? 'Sin suscripciones activas. Cuando tengas una, aparecerá aquí.'
    : 'No tienes suscripciones canceladas.';

  const html = `
    <div class="control-panel">
      <h2 class="control-panel-title">Suscripciones</h2>
      <div class="control-panel-spacer"></div>
      <div class="control-panel-filters">
        <button class="filter-pill ${suscripcionesTab === 'activas' ? 'active' : ''}" onclick="suscripcionesTab='activas';renderSuscripciones()">
          Activas
          <span class="kanban-column-count">${activas.length}</span>
        </button>
        <button class="filter-pill ${suscripcionesTab === 'canceladas' ? 'active' : ''}" onclick="suscripcionesTab='canceladas';renderSuscripciones()">
          Canceladas
          <span class="kanban-column-count">${canceladas.length}</span>
        </button>
      </div>
      <div class="control-panel-actions">
        <button class="btn btn-primary btn-sm" onclick="openNuevaSuscripcionModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Suscripcion
        </button>
      </div>
    </div>

    ${suscripcionesTab === 'activas' ? renderCobrosProximos(cobrosProximos) : ''}

    ${suscripcionesTab === 'activas' ? renderTotalMes(totalMensual, activas.length) : ''}

    <!-- Lista -->
    <div class="list-view">
      <table class="list-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>${suscripcionesTab === 'activas' ? 'Próximo cobro' : 'Cancelación'}</th>
            <th>Cuenta</th>
            <th class="text-right">Costo/mes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${visibles.map(s => renderSubRow(s)).join('')}
          ${visibles.length === 0 ? `
            <tr>
              <td colspan="5" class="list-empty">${emptyMessage}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    ${suscripcionesTab === 'activas' && activas.length > 0 ? `
      <button class="ast-more-toggle" type="button" aria-expanded="false" aria-controls="sub-more-panel" onclick="toggleSubMore(this)">
        <span class="ast-more-toggle-text">Ver más</span>
        <svg class="ast-more-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ast-more" id="sub-more-panel" hidden>
        <div class="sub-insights-grid">
          <div class="sub-insight">
            <span class="sub-insight-value">${formatCurrency(totalAnual)}</span>
            <span class="sub-insight-label">Al año, con tarifas actuales</span>
          </div>
          <div class="sub-insight">
            <span class="sub-insight-value">${formatCurrency(promedioPorServicio)}</span>
            <span class="sub-insight-label">Promedio por servicio</span>
          </div>
        </div>
      </div>
    ` : ''}
  `;
  render(html);
}

function renderCobrosProximos(items) {
  if (!items || items.length === 0) return '';
  const top = items[0];
  const others = items.length - 1;
  return `
    <section class="sub-cobros">
      <div class="sub-cobros-card">
        <div class="sub-cobros-body">
          <span class="sub-cobros-eyebrow">Próximo cobro</span>
          <span class="sub-cobros-title">${esc(top.sub.servicio)} cobra el ${top.sub.fechaCorte}</span>
          <span class="sub-cobros-sub">${top.dias === 0 ? 'Hoy' : `En ${top.dias} ${top.dias === 1 ? 'día' : 'días'}`} · ${formatCurrency(top.sub.costo)}</span>
        </div>
        ${others > 0 ? `<span class="sub-cobros-more">+${others} más esta semana</span>` : ''}
      </div>
    </section>
  `;
}

function renderTotalMes(total, count) {
  return `
    <section class="sub-total">
      <div class="sub-total-value">${formatCurrency(total)}</div>
      <div class="sub-total-label">al mes en ${count} ${count === 1 ? 'servicio' : 'servicios'}</div>
    </section>
  `;
}

function renderSubRow(s) {
  const cuenta = getCuentaById(s.cuentaId);
  if (suscripcionesTab === 'activas') {
    const todayDay = new Date().getDate();
    const dias = Number(s.fechaCorte) - todayDay;
    let proximoCorteLabel;
    if (!Number.isFinite(dias)) {
      proximoCorteLabel = '—';
    } else if (dias < 0) {
      proximoCorteLabel = `Día ${s.fechaCorte}`;
    } else if (dias === 0) {
      proximoCorteLabel = 'Hoy';
    } else if (dias <= 5) {
      proximoCorteLabel = `En ${dias} ${dias === 1 ? 'día' : 'días'} · ${formatCurrency(s.costo)}`;
    } else {
      proximoCorteLabel = `Día ${s.fechaCorte}`;
    }
    return `
      <tr>
        <td>
          <div class="sub-row-name">${esc(s.servicio)}</div>
          ${s.descripcion ? `<div class="sub-row-desc">${esc(s.descripcion)}</div>` : ''}
        </td>
        <td><span class="sub-row-corte ${dias >= 0 && dias <= 5 ? 'is-soon' : ''}">${proximoCorteLabel}</span></td>
        <td>${getCuentaBadge(cuenta)}</td>
        <td class="text-right text-mono" style="font-weight:600">${formatCurrency(s.costo)}</td>
        <td class="text-right">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="cancelarSuscripcion('${s.id}')" title="Cancelar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="eliminarSuscripcion('${s.id}')" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }
  return `
    <tr>
      <td>
        <div class="sub-row-name">${esc(s.servicio)}</div>
        ${s.motivoCancelacion ? `<div class="sub-row-desc">${esc(s.motivoCancelacion)}</div>` : ''}
      </td>
      <td>${s.fechaCancelacion ? `<div style="font-weight:500">${formatDate(s.fechaCancelacion)}</div>` : '—'}</td>
      <td>${getCuentaBadge(cuenta)}</td>
      <td class="text-right text-mono" style="font-weight:600;color:var(--text-tertiary)">${formatCurrency(s.costo)}</td>
      <td class="text-right">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="reactivarSuscripcion('${s.id}')" title="Reactivar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="eliminarSuscripcion('${s.id}')" title="Eliminar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `;
}

function toggleSubMore(btn) {
  const panel = document.getElementById('sub-more-panel');
  if (!panel) return;
  const isOpen = !panel.hidden;
  panel.hidden = isOpen;
  btn.setAttribute('aria-expanded', String(!isOpen));
  const text = btn.querySelector('.ast-more-toggle-text');
  if (text) text.textContent = isOpen ? 'Ver más' : 'Ver menos';
}

function esc(str) {
  if (str === null || str === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function openNuevaSuscripcionModal() {
  const body = `
    <div class="form-group full">
      <div class="form-field">
        <label>Servicio</label>
        <input type="text" class="input" id="sub-servicio" placeholder="Netflix, Spotify, etc.">
      </div>
    </div>
    <div class="form-group full">
      <div class="form-field">
        <label>Descripcion</label>
        <input type="text" class="input" id="sub-descripcion" placeholder="Que ofrece el servicio">
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Costo mensual</label>
        <input type="number" class="input" id="sub-costo" placeholder="0.00">
      </div>
      <div class="form-field">
        <label>Dia de corte</label>
        <input type="number" class="input" id="sub-corte" min="1" max="31" value="1">
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Fecha de inicio</label>
        <input type="date" class="input" id="sub-inicio" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-field">
        <label>Cuenta de cobro</label>
        <select class="input" id="sub-cuenta">
          ${cuentasData.map(c => `<option value="${c.id}">${c.banco} **** ${c.terminacion} (${getTipoLabel(c.tipo)})</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveSuscripcion()">Crear</button>
  `;

  openModal('Nueva Suscripcion', body, footer);
}

async function saveSuscripcion() {
  const servicio = document.getElementById('sub-servicio').value;
  const descripcion = document.getElementById('sub-descripcion').value;
  const costo = parseFloat(document.getElementById('sub-costo').value) || 0;
  const fechaCorte = parseInt(document.getElementById('sub-corte').value) || 1;
  const fechaInicio = document.getElementById('sub-inicio').value;
  const cuentaId = document.getElementById('sub-cuenta').value || null;

  if (!servicio || !costo) {
    showToast('Completa servicio y costo', 'error');
    return;
  }

  const result = await createSubscription({
    servicio,
    descripcion,
    costo,
    fechaInicio,
    fechaCorte,
    cuentaId
  });

  if (result) {
    closeModal();
    renderSuscripciones();
    openConfirmGenerateExpenseModal(result);
  }
}

function openConfirmGenerateExpenseModal(sub) {
  const body = `
    <div style="text-align:center;padding:var(--space-lg) 0">
      <div style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-sm)">${sub.servicio}</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-lg)">
        Deseas generar el gasto de <strong>${formatCurrency(sub.costo)}</strong> para este mes?
      </div>
      <div style="display:flex;gap:var(--space-md);justify-content:center">
        <div style="text-align:center">
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">Cuenta</div>
          <div style="font-size:var(--text-sm);font-weight:500">${sub.cuentaId ? (() => { const c = getCuentaById(sub.cuentaId); return c ? `${c.banco} **** ${c.terminacion}` : 'Sin cuenta'; })() : 'Sin cuenta'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">Monto</div>
          <div style="font-size:var(--text-sm);font-weight:600;color:var(--error)">${formatCurrency(sub.costo)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">Fecha</div>
          <div style="font-size:var(--text-sm);font-weight:500">${formatDate(new Date().toISOString().split('T')[0])}</div>
        </div>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Ahora no</button>
    <button class="btn btn-primary" onclick="confirmGenerateExpense('${sub.id}')">Crear gasto</button>
  `;

  openModal('Generar primer gasto', body, footer);
}

async function confirmGenerateExpense(subId) {
  const sub = suscripcionesData.find(s => s.id === subId);
  if (!sub) return;

  const result = await createTransaction({
    tipo: 'gasto',
    concepto: sub.servicio,
    categoria: 'Servicios',
    monto: sub.costo,
    fecha: new Date().toISOString().split('T')[0],
    cuentaId: sub.cuentaId,
  });

  if (result) {
    closeModal();
    showToast(`Gasto de ${formatCurrency(sub.costo)} creado para ${sub.servicio}`);
  }
}

function cancelarSuscripcion(id) {
  const sub = suscripcionesData.find(s => s.id === id);
  if (!sub) return;

  const body = `
    <div class="form-group full">
      <div class="form-field">
        <label>Servicio</label>
        <div style="padding:var(--space-sm) 0;font-size:var(--text-sm);font-weight:500">${sub.servicio} - ${formatCurrency(sub.costo)}/mes</div>
      </div>
    </div>
    <div class="form-group full">
      <div class="form-field">
        <label>Motivo de cancelacion</label>
        <textarea class="input" id="sub-motivo" placeholder="Por que cancelas esta suscripcion?" style="min-height:80px"></textarea>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Volver</button>
    <button class="btn btn-danger" onclick="confirmarCancelacion('${id}')">Cancelar suscripcion</button>
  `;

  openModal('Cancelar Suscripcion', body, footer);
}

async function confirmarCancelacion(id) {
  const sub = suscripcionesData.find(s => s.id === id);
  if (!sub) return;

  const motivo = document.getElementById('sub-motivo').value || 'Sin motivo especificado';

  const ok = await updateSubscription(id, {
    estado: 'cancelada',
    fecha_cancelacion: new Date().toISOString().split('T')[0],
    motivo_cancelacion: motivo
  });

  if (ok) {
    closeModal();
    renderSuscripciones();
    showToast('Suscripcion cancelada');
  }
}

async function reactivarSuscripcion(id) {
  const ok = await updateSubscription(id, {
    estado: 'activa',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_cancelacion: null,
    motivo_cancelacion: null
  });

  if (ok) {
    renderSuscripciones();
    showToast('Suscripcion reactivada');
  }
}

function eliminarSuscripcion(id) {
  const sub = suscripcionesData.find(s => s.id === id);
  if (!sub) return;

  const body = `
    <p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.5">
      ¿Eliminar <strong>${sub.servicio}</strong> de forma permanente?
      Esta accion no se puede deshacer.
    </p>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="confirmarEliminarSuscripcion('${id}')">Eliminar</button>
  `;
  openModal('Eliminar Suscripcion', body, footer);
}

async function confirmarEliminarSuscripcion(id) {
  const ok = await deleteSubscriptionRemote(id);
  if (ok) {
    closeModal();
    renderSuscripciones();
    showToast('Suscripcion eliminada');
  }
}

Router.register('/suscripciones', renderSuscripciones);
