/* Aliester - Cuentas View */

// cuentasData is now loaded from InsForge via store.js

let cuentasFilter = 'todas';
let cuentaDetalleId = null;
let editingCuentaId = null;

function getCuentaById(id) {
  if (!id) return null;
  return cuentasData.find(c => c.id === id || c.id === String(id));
}

function getCuentaBadge(cuenta) {
  if (!cuenta) return '<span style="color:var(--text-tertiary)">-</span>';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const alpha = isDark ? '30' : '15';
  return `<span class="badge badge-neutral" style="background:${cuenta.color}${alpha};color:${cuenta.color}">${cuenta.banco} **** ${cuenta.terminacion}</span>`;
}

function getRedIcon(red) {
  const icons = {
    visa: '<svg width="32" height="20" viewBox="0 0 32 20"><rect width="32" height="20" rx="3" fill="#1A1F71"/><text x="16" y="13" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="sans-serif">VISA</text></svg>',
    mastercard: '<svg width="32" height="20" viewBox="0 0 32 20"><rect width="32" height="20" rx="3" fill="#3a3a3a"/><circle cx="12" cy="10" r="6" fill="#EB001B"/><circle cx="20" cy="10" r="6" fill="#F79E1B"/></svg>',
    amex: '<svg width="32" height="20" viewBox="0 0 32 20"><rect width="32" height="20" rx="3" fill="#006FCF"/><text x="16" y="13" text-anchor="middle" fill="white" font-size="6" font-weight="bold" font-family="sans-serif">AMEX</text></svg>'
  };
  return icons[red] || '';
}

function getTipoLabel(tipo) {
  const labels = { debito: 'Debito', credito: 'Credito', ahorro: 'Ahorro' };
  return labels[tipo] || tipo;
}

function getTipoBadgeClass(tipo) {
  const classes = { debito: 'badge-info', credito: 'badge-warning', ahorro: 'badge-success' };
  return classes[tipo] || 'badge-neutral';
}

function renderCuentas() {
  const totalSaldo = cuentasData.reduce((s, c) => s + c.saldo, 0);
  const totalDebito = cuentasData.filter(c => c.tipo === 'debito').reduce((s, c) => s + c.saldo, 0);
  const totalCredito = cuentasData.filter(c => c.tipo === 'credito').reduce((s, c) => s + c.saldo, 0);
  const totalAhorro = cuentasData.filter(c => c.tipo === 'ahorro').reduce((s, c) => s + c.saldo, 0);

  const html = `
    <div class="control-panel">
      <h2 class="control-panel-title">Cuentas</h2>
      <div class="control-panel-spacer"></div>
      <div class="control-panel-filters">
        <button class="filter-pill ${cuentasFilter === 'todas' ? 'active' : ''}" onclick="cuentasFilter='todas';cuentaDetalleId=null;renderCuentas()">Todas</button>
        <button class="filter-pill ${cuentasFilter === 'debito' ? 'active' : ''}" onclick="cuentasFilter='debito';cuentaDetalleId=null;renderCuentas()">Debito</button>
        <button class="filter-pill ${cuentasFilter === 'credito' ? 'active' : ''}" onclick="cuentasFilter='credito';cuentaDetalleId=null;renderCuentas()">Credito</button>
        <button class="filter-pill ${cuentasFilter === 'ahorro' ? 'active' : ''}" onclick="cuentasFilter='ahorro';cuentaDetalleId=null;renderCuentas()">Ahorro</button>
      </div>
      <div class="control-panel-actions">
        <button class="btn btn-primary btn-sm" onclick="openNuevaCuentaModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Cuenta
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="dashboard-stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:var(--space-lg)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Total</span>
        </div>
        <div class="stat-card-value">${formatCurrency(totalSaldo)}</div>
        <div class="stat-card-change">${cuentasData.length} cuentas</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Debito</span>
        </div>
        <div class="stat-card-value" style="color:var(--info)">${formatCurrency(totalDebito)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Credito</span>
        </div>
        <div class="stat-card-value" style="color:var(--warning)">${formatCurrency(totalCredito)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Ahorro</span>
        </div>
        <div class="stat-card-value" style="color:var(--success)">${formatCurrency(totalAhorro)}</div>
      </div>
    </div>

    ${cuentaDetalleId ? renderCuentaDetalle(cuentaDetalleId) : renderCuentasGrid()}
  `;
  render(html);
}

function renderCuentasGrid() {
  const filtered = cuentasFilter === 'todas' 
    ? cuentasData 
    : cuentasData.filter(c => c.tipo === cuentasFilter);

  return `
    <div class="cuentas-grid">
      ${filtered.map(cuenta => {
        const subCount = suscripcionesData.filter(s => s.cuentaId === cuenta.id && s.estado === 'activa').length;
        const transCount = finanzasData.filter(f => f.cuentaId === cuenta.id).length;
        return `
          <div class="cuenta-card" onclick="cuentaDetalleId='${cuenta.id}';renderCuentas()" style="border-left:4px solid ${cuenta.color}">
            <div class="cuenta-card-header">
              <div class="cuenta-card-banco">${cuenta.banco}</div>
              <div class="cuenta-card-menu" onclick="event.stopPropagation();toggleCuentaMenu('${cuenta.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                <div class="cuenta-card-dropdown" id="cuenta-menu-${cuenta.id}">
                  <button onclick="event.stopPropagation();openEditarCuentaModal('${cuenta.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                  </button>
                  <button onclick="event.stopPropagation();confirmDeleteCuenta('${cuenta.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
            <div class="cuenta-card-saldo">${formatCurrency(cuenta.saldo)}</div>
            <div class="cuenta-card-footer">
              <div class="cuenta-card-info">
                <span class="cuenta-card-terminacion">**** ${cuenta.terminacion}</span>
                <span class="cuenta-card-red">${getRedIcon(cuenta.red)}</span>
              </div>
              <div class="cuenta-card-meta">
                ${subCount > 0 ? `<span class="badge badge-neutral">${subCount} subs</span>` : ''}
                ${transCount > 0 ? `<span class="badge badge-neutral">${transCount} trans</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
      ${filtered.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="empty-state-title">No hay cuentas</div>
          <div class="empty-state-text">Agrega tu primera cuenta bancaria</div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderCuentaDetalle(cuentaId) {
  const cuenta = getCuentaById(cuentaId);
  if (!cuenta) return '';

  const subs = suscripcionesData.filter(s => s.cuentaId === cuentaId);
  const trans = finanzasData.filter(f => f.cuentaId === cuentaId).slice(0, 10);
  const totalSubs = subs.filter(s => s.estado === 'activa').reduce((s, sub) => s + sub.costo, 0);

  return `
    <div class="cuenta-detalle">
      <!-- Header de la cuenta -->
      <div class="cuenta-detalle-header" style="background:${cuenta.color}">
        <div class="cuenta-detalle-banco">${cuenta.banco}</div>
        <div class="cuenta-detalle-tarjeta">
          <div class="cuenta-detalle-chip">
            <svg width="24" height="18" viewBox="0 0 24 18"><rect width="24" height="18" rx="3" fill="rgba(255,255,255,0.3)"/><rect x="2" y="5" width="8" height="8" rx="1" fill="rgba(255,255,255,0.5)"/></svg>
          </div>
          <div class="cuenta-detalle-numero">**** **** **** ${cuenta.terminacion}</div>
        </div>
        <div class="cuenta-detalle-saldo">
          <div class="cuenta-detalle-saldo-label">Saldo disponible</div>
          <div class="cuenta-detalle-saldo-value">${formatCurrency(cuenta.saldo)}</div>
        </div>
        <div class="cuenta-detalle-footer">
          <span class="badge badge-neutral" style="background:rgba(255,255,255,0.2);color:white">${getTipoLabel(cuenta.tipo)}</span>
          <span style="opacity:0.8">${getRedIcon(cuenta.red)}</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab ${cuentaTab === 'transacciones' ? 'active' : ''}" onclick="cuentaTab='transacciones';renderCuentas()">Transacciones</button>
        <button class="tab ${cuentaTab === 'suscripciones' ? 'active' : ''}" onclick="cuentaTab='suscripciones';renderCuentas()">Suscripciones (${subs.filter(s => s.estado === 'activa').length})</button>
      </div>

      <!-- Contenido -->
      <div class="cuenta-detalle-body">
        ${cuentaTab === 'transacciones' ? renderCuentaTransacciones(trans, totalSubs) : renderCuentaSuscripciones(subs)}
      </div>

      <!-- Boton volver -->
      <div style="padding:var(--space-md);border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center">
        <button class="btn btn-secondary btn-sm" onclick="cuentaDetalleId=null;renderCuentas()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Volver a cuentas
        </button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="openEditarCuentaModal('${cuenta.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteCuenta('${cuenta.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  `;
}

let cuentaTab = 'transacciones';

function renderCuentaTransacciones(trans, totalSubs) {
  return `
    ${totalSubs > 0 ? `
      <div style="padding:var(--space-md);background:var(--warning-light);border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style="font-size:var(--text-sm);color:var(--warning)">Suscripciones pendientes: ${formatCurrency(totalSubs)}/mes</span>
      </div>
    ` : ''}
    <div class="list-view" style="border:none;border-radius:0">
      <table class="list-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Tipo</th>
            <th class="text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${trans.length > 0 ? trans.map(f => `
            <tr>
              <td class="text-mono">${formatDate(f.fecha)}</td>
              <td>${f.concepto}</td>
              <td><span class="badge ${f.tipo === 'ingreso' ? 'badge-success' : 'badge-error'}">${f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td>
              <td class="text-right text-mono" style="color:${f.tipo === 'ingreso' ? 'var(--success)' : 'var(--error)'}">${f.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(f.monto)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4" style="text-align:center;padding:var(--space-2xl);color:var(--text-secondary)">Sin transacciones en esta cuenta</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function renderCuentaSuscripciones(subs) {
  return `
    <div class="list-view" style="border:none;border-radius:0">
      <table class="list-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Estado</th>
            <th>Costo/mes</th>
            <th class="text-right">Corte</th>
          </tr>
        </thead>
        <tbody>
          ${subs.length > 0 ? subs.map(s => `
            <tr>
              <td style="font-weight:500">${s.servicio}</td>
              <td><span class="badge ${s.estado === 'activa' ? 'badge-success' : 'badge-error'}">${s.estado}</span></td>
              <td class="text-mono">${formatCurrency(s.costo)}</td>
              <td class="text-right text-mono">Dia ${s.fechaCorte}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4" style="text-align:center;padding:var(--space-2xl);color:var(--text-secondary)">Sin suscripciones en esta cuenta</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function openNuevaCuentaModal() {
  editingCuentaId = null;
  openCuentaModal('Nueva Cuenta', {}, 'Crear');
}

function openEditarCuentaModal(id) {
  const cuenta = getCuentaById(id);
  if (!cuenta) return;
  editingCuentaId = id;
  openCuentaModal('Editar Cuenta', cuenta, 'Guardar');
}

function openCuentaModal(title, data, submitLabel) {
  const body = `
    <div class="form-group full">
      <div class="form-field">
        <label>Banco</label>
        <select class="input" id="cuenta-banco">
          <option value="BBVA" ${data.banco === 'BBVA' ? 'selected' : ''}>BBVA</option>
          <option value="Nu Bank" ${data.banco === 'Nu Bank' ? 'selected' : ''}>Nu Bank</option>
          <option value="Banorte" ${data.banco === 'Banorte' ? 'selected' : ''}>Banorte</option>
          <option value="Banamex" ${data.banco === 'Banamex' ? 'selected' : ''}>Banamex</option>
          <option value="Santander" ${data.banco === 'Santander' ? 'selected' : ''}>Santander</option>
          <option value="HSBC" ${data.banco === 'HSBC' ? 'selected' : ''}>HSBC</option>
          <option value="Inbursa" ${data.banco === 'Inbursa' ? 'selected' : ''}>Inbursa</option>
          <option value="Hey Banco" ${data.banco === 'Hey Banco' ? 'selected' : ''}>Hey Banco</option>
          <option value="Klar" ${data.banco === 'Klar' ? 'selected' : ''}>Klar</option>
          <option value="Otro" ${data.banco === 'Otro' ? 'selected' : ''}>Otro</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Terminacion (4 digitos)</label>
        <input type="text" class="input" id="cuenta-terminacion" placeholder="1234" maxlength="4" pattern="[0-9]{4}" value="${data.terminacion || ''}">
      </div>
      <div class="form-field">
        <label>Red</label>
        <select class="input" id="cuenta-red">
          <option value="visa" ${data.red === 'visa' ? 'selected' : ''}>Visa</option>
          <option value="mastercard" ${data.red === 'mastercard' ? 'selected' : ''}>Mastercard</option>
          <option value="amex" ${data.red === 'amex' ? 'selected' : ''}>American Express</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Tipo de cuenta</label>
        <select class="input" id="cuenta-tipo">
          <option value="debito" ${data.tipo === 'debito' ? 'selected' : ''}>Debito</option>
          <option value="credito" ${data.tipo === 'credito' ? 'selected' : ''}>Credito</option>
          <option value="ahorro" ${data.tipo === 'ahorro' ? 'selected' : ''}>Ahorro</option>
        </select>
      </div>
      <div class="form-field">
        <label>Saldo actual</label>
        <input type="number" class="input" id="cuenta-saldo" placeholder="0.00" value="${data.saldo !== undefined ? data.saldo : ''}">
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveCuenta()">${submitLabel}</button>
  `;

  openModal(title, body, footer);
}

async function saveCuenta() {
  const banco = document.getElementById('cuenta-banco').value;
  const terminacion = document.getElementById('cuenta-terminacion').value;
  const red = document.getElementById('cuenta-red').value;
  const tipo = document.getElementById('cuenta-tipo').value;
  const saldo = parseFloat(document.getElementById('cuenta-saldo').value) || 0;

  if (!terminacion || terminacion.length !== 4) {
    showToast('Ingresa los ultimos 4 digitos', 'error');
    return;
  }

  const bancoColors = {
    'BBVA': '#004B87',
    'Nu Bank': '#8B00FF',
    'Banorte': '#E31837',
    'Banamex': '#E31837',
    'Santander': '#EC0000',
    'HSBC': '#DB0011',
    'Inbursa': '#006B3F',
    'Hey Banco': '#FF6B00',
    'Klar': '#4ECDC4',
    'Otro': '#888888'
  };

  const color = bancoColors[banco] || '#888888';

  if (editingCuentaId) {
    const result = await updateCuenta(editingCuentaId, {
      banco,
      terminacion,
      tipo,
      red,
      saldo,
      color
    });

    if (result) {
      closeModal();
      renderCuentas();
      showToast('Cuenta actualizada');
    }
  } else {
    const result = await createCuenta({
      banco,
      terminacion,
      tipo,
      red,
      saldo,
      color
    });

    if (result) {
      closeModal();
      renderCuentas();
      showToast('Cuenta creada');
    }
  }
}

function toggleCuentaMenu(id) {
  document.querySelectorAll('.cuenta-card-dropdown.open').forEach(el => {
    if (el.id !== `cuenta-menu-${id}`) el.classList.remove('open');
  });
  const menu = document.getElementById(`cuenta-menu-${id}`);
  if (menu) menu.classList.toggle('open');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.cuenta-card-dropdown.open').forEach(el => el.classList.remove('open'));
});

function confirmDeleteCuenta(id) {
  const cuenta = getCuentaById(id);
  if (!cuenta) return;

  const subsCount = suscripcionesData.filter(s => s.cuentaId === id).length;
  const transCount = finanzasData.filter(f => f.cuentaId === id).length;

  let warningText = '';
  if (subsCount > 0 || transCount > 0) {
    warningText = `<div style="margin-top:12px;padding:10px;background:var(--warning-light);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--warning)">
      Las suscripciones (${subsCount}) y transacciones (${transCount}) asociadas quedaran sin cuenta vinculada.
    </div>`;
  }

  const body = `
    <p style="margin:0">Esta accion eliminara la cuenta <strong>${cuenta.banco} **** ${cuenta.terminacion}</strong>.</p>
    ${warningText}
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="deleteCuenta('${id}')">Eliminar</button>
  `;

  openModal('Eliminar cuenta', body, footer);
}

async function deleteCuenta(id) {
  closeModal();
  const ok = await deleteCuentaRemote(id);
  if (ok) {
    cuentaDetalleId = null;
    renderCuentas();
    showToast('Cuenta eliminada');
  }
}

Router.register('/cuentas', renderCuentas);
