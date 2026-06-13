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

    <!-- Stats -->
    <div class="dashboard-stats" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--space-lg)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Gasto mensual</span>
        </div>
        <div class="stat-card-value" style="color:var(--error)">${formatCurrency(totalMensual)}</div>
        <div class="stat-card-change">${activas.length} servicios activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Gasto anual estimado</span>
        </div>
        <div class="stat-card-value">${formatCurrency(totalAnual)}</div>
        <div class="stat-card-change">Basado en tarifas actuales</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Promedio por servicio</span>
        </div>
        <div class="stat-card-value">${activas.length > 0 ? formatCurrency(totalMensual / activas.length) : formatCurrency(0)}</div>
        <div class="stat-card-change">Mensual</div>
      </div>
    </div>

    <!-- Lista -->
    <div class="list-view">
      <table class="list-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Descripcion</th>
            <th>Costo/mes</th>
            <th>${suscripcionesTab === 'activas' ? 'Tiempo' : 'Cancelacion'}</th>
            <th>Cuenta</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${(suscripcionesTab === 'activas' ? activas : canceladas).map(s => {
            const cuenta = getCuentaById(s.cuentaId);
            return `
              <tr>
                <td style="font-weight:500">${s.servicio}</td>
                <td style="color:var(--text-secondary);font-size:var(--text-xs)">${s.descripcion}</td>
                <td class="text-mono" style="font-weight:600">${formatCurrency(s.costo)}</td>
                <td style="font-size:var(--text-xs)">
                  ${suscripcionesTab === 'activas' 
                    ? `<span class="badge badge-success">${calcularTiempo(s.fechaInicio)}</span>`
                    : `<div><div style="font-weight:500">${formatDate(s.fechaCancelacion)}</div><div style="color:var(--text-secondary);margin-top:2px">${s.motivoCancelacion}</div></div>`
                  }
                </td>
                <td>${getCuentaBadge(cuenta)}</td>
                <td class="text-right">
                  ${suscripcionesTab === 'activas' 
                    ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="cancelarSuscripcion('${s.id}')" title="Cancelar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>`
                    : `<button class="btn btn-ghost btn-icon btn-sm" onclick="reactivarSuscripcion('${s.id}')" title="Reactivar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>`
                  }
                </td>
              </tr>
            `;
          }).join('')}
          ${(suscripcionesTab === 'activas' ? activas : canceladas).length === 0 ? `
            <tr>
              <td colspan="6" style="text-align:center;padding:var(--space-2xl);color:var(--text-secondary)">
                ${suscripcionesTab === 'activas' ? 'No tienes suscripciones activas' : 'No tienes suscripciones canceladas'}
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
  render(html);
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
    showToast('Suscripcion creada');
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

Router.register('/suscripciones', renderSuscripciones);
