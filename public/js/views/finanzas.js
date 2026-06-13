/* Aliester - Finanzas View */

// finanzasData is now loaded from InsForge via store.js

let finanzasView = 'lista';
let finanzasFilterCuenta = 'todas';
let finanzasFilterTipo = 'todos';

function getProyectoName(tareaId) {
  if (!tareaId) return null;
  for (const p of proyectosData) {
    const t = p.tareas.find(t => t.id === tareaId);
    if (t) return p.nombre;
  }
  return null;
}

function getFilteredFinanzas() {
  let data = [...finanzasData];
  
  if (finanzasFilterCuenta !== 'todas') {
    data = data.filter(f => f.cuentaId === finanzasFilterCuenta);
  }
  
  if (finanzasFilterTipo !== 'todos') {
    data = data.filter(f => f.tipo === finanzasFilterTipo);
  }
  
  return data;
}

function renderFinanzas() {
  const filtered = getFilteredFinanzas();
  const totalIngresos = filtered.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const totalGastos = filtered.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const balance = totalIngresos - totalGastos;
  const totalCuentas = cuentasData.reduce((s, c) => s + c.saldo, 0);

  // Calculate totals per project
  const proyectosTotals = {};
  filtered.filter(f => f.tareaId).forEach(f => {
    const nombre = getProyectoName(f.tareaId);
    if (nombre) {
      if (!proyectosTotals[nombre]) proyectosTotals[nombre] = { gastos: 0, ingresos: 0 };
      if (f.tipo === 'gasto') proyectosTotals[nombre].gastos += f.monto;
      else proyectosTotals[nombre].ingresos += f.monto;
    }
  });

  const html = `
    <div class="control-panel">
      <h2 class="control-panel-title">Finanzas</h2>
      <div class="control-panel-spacer"></div>
      <div class="control-panel-filters">
        <button class="filter-pill ${finanzasView === 'lista' ? 'active' : ''}" onclick="finanzasView='lista';renderFinanzas()">Lista</button>
        <button class="filter-pill ${finanzasView === 'resumen' ? 'active' : ''}" onclick="finanzasView='resumen';renderFinanzas()">Resumen</button>
        <button class="filter-pill ${finanzasView === 'proyectos' ? 'active' : ''}" onclick="finanzasView='proyectos';renderFinanzas()">Por Proyecto</button>
        <button class="filter-pill ${finanzasView === 'cuentas' ? 'active' : ''}" onclick="finanzasView='cuentas';renderFinanzas()">Por Cuenta</button>
      </div>
      <div class="control-panel-actions">
        <button class="btn btn-primary btn-sm" onclick="openFinanzasModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-lg);flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:var(--space-xs)">
        <span style="font-size:var(--text-xs);color:var(--text-secondary);font-weight:500">Cuenta:</span>
        <select class="input" style="height:28px;font-size:var(--text-xs);padding:0 24px 0 8px" onchange="finanzasFilterCuenta=this.value;renderFinanzas()">
          <option value="todas" ${finanzasFilterCuenta === 'todas' ? 'selected' : ''}>Todas</option>
          ${cuentasData.map(c => `<option value="${c.id}" ${finanzasFilterCuenta == c.id ? 'selected' : ''}>${c.banco} **** ${c.terminacion}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-xs)">
        <span style="font-size:var(--text-xs);color:var(--text-secondary);font-weight:500">Tipo:</span>
        <button class="filter-pill ${finanzasFilterTipo === 'todos' ? 'active' : ''}" style="height:28px" onclick="finanzasFilterTipo='todos';renderFinanzas()">Todos</button>
        <button class="filter-pill ${finanzasFilterTipo === 'ingreso' ? 'active' : ''}" style="height:28px" onclick="finanzasFilterTipo='ingreso';renderFinanzas()">Ingresos</button>
        <button class="filter-pill ${finanzasFilterTipo === 'gasto' ? 'active' : ''}" style="height:28px" onclick="finanzasFilterTipo='gasto';renderFinanzas()">Gastos</button>
      </div>
    </div>

    <div class="dashboard-stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:var(--space-lg)">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Total en cuentas</span>
        </div>
        <div class="stat-card-value">${formatCurrency(totalCuentas)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Ingresos</span>
        </div>
        <div class="stat-card-value" style="color:var(--success)">${formatCurrency(totalIngresos)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Gastos</span>
        </div>
        <div class="stat-card-value" style="color:var(--error)">${formatCurrency(totalGastos)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Balance</span>
        </div>
        <div class="stat-card-value">${formatCurrency(balance)}</div>
      </div>
    </div>

    ${finanzasView === 'lista' ? renderFinanzasList(filtered) : finanzasView === 'resumen' ? renderFinanzasResumen(filtered) : finanzasView === 'proyectos' ? renderFinanzasProyectos(proyectosTotals) : renderFinanzasCuentas(filtered)}
  `;
  render(html);
}

function renderFinanzasList(data) {
  return `
    <div class="list-view">
      <table class="list-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Categoria</th>
            <th>Cuenta</th>
            <th>Proyecto</th>
            <th>Tipo</th>
            <th class="text-right">Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.map(f => {
            const cuenta = getCuentaById(f.cuentaId);
            return `
              <tr>
                <td class="text-mono">${formatDate(f.fecha)}</td>
                <td>${f.concepto}</td>
                <td><span class="badge badge-neutral">${f.categoria}</span></td>
                <td>${getCuentaBadge(cuenta)}</td>
                <td>${f.tareaId ? `<span class="badge badge-info">${getProyectoName(f.tareaId) || '-'}</span>` : '<span style="color:var(--text-tertiary)">-</span>'}</td>
                <td><span class="badge ${f.tipo === 'ingreso' ? 'badge-success' : 'badge-error'}">${f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td>
                <td class="text-right text-mono" style="color:${f.tipo === 'ingreso' ? 'var(--success)' : 'var(--error)'}">${f.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(f.monto)}</td>
                <td class="text-right">
                  <button class="btn btn-ghost btn-icon btn-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFinanzasResumen(data) {
  const cats = {};
  data.filter(f => f.tipo === 'gasto').forEach(f => {
    cats[f.categoria] = (cats[f.categoria] || 0) + f.monto;
  });

  const totalGastos = data.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const totalIngresos = data.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);

  return `
    <div class="dashboard-grid" style="grid-template-columns:1fr 1fr">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Gastos por Categoria</span>
        </div>
        <div class="card-body">
          ${Object.entries(cats).map(([cat, total]) => {
            const pct = totalGastos > 0 ? Math.round((total / totalGastos) * 100) : 0;
            return `
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <span style="font-size:var(--text-sm);min-width:100px">${cat}</span>
                <div style="flex:1;height:8px;background:var(--bg-primary);border-radius:var(--radius-full);overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:var(--oc-black);border-radius:var(--radius-full)"></div>
                </div>
                <span style="font-size:var(--text-xs);color:var(--text-secondary);min-width:60px;text-align:right">${formatCurrency(total)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Resumen Mensual</span>
        </div>
        <div class="card-body">
          <div style="text-align:center;padding:var(--space-xl) 0">
            <div style="font-size:var(--text-4xl);font-weight:700;margin-bottom:var(--space-sm)">${formatCurrency(totalIngresos)}</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary)">Ingresos totales</div>
          </div>
          <div class="form-separator"></div>
          <div style="display:flex;justify-content:space-around;text-align:center">
            <div>
              <div style="font-size:var(--text-xl);font-weight:600;color:var(--error)">${formatCurrency(totalGastos)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-secondary)">Gastado</div>
            </div>
            <div>
              <div style="font-size:var(--text-xl);font-weight:600;color:var(--success)">${formatCurrency(totalIngresos - totalGastos)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-secondary)">Ahorrado</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFinanzasProyectos(totals) {
  const entries = Object.entries(totals);

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Finanzas por Proyecto</span>
      </div>
      <div class="card-body">
        ${entries.length > 0 ? entries.map(([nombre, total]) => {
          const balance = total.ingresos - total.gastos;
          return `
            <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--info-light);display:flex;align-items:center;justify-content:center;color:var(--info)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style="flex:1">
                <div style="font-size:var(--text-sm);font-weight:500">${nombre}</div>
                <div style="font-size:var(--text-xs);color:var(--text-secondary)">${total.ingresos > 0 ? `+${formatCurrency(total.ingresos)} ingresos` : ''} ${total.gastos > 0 ? `-${formatCurrency(total.gastos)} gastos` : ''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:var(--text-sm);font-weight:600;color:${balance >= 0 ? 'var(--success)' : 'var(--error)'}">${balance >= 0 ? '+' : ''}${formatCurrency(balance)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-secondary)">Balance</div>
              </div>
            </div>
          `;
        }).join('') : '<div style="text-align:center;padding:var(--space-2xl);color:var(--text-secondary)">No hay transacciones asociadas a proyectos</div>'}
      </div>
    </div>
  `;
}

function renderFinanzasCuentas(data) {
  const cuentasTotals = {};
  data.forEach(f => {
    const cuentaId = f.cuentaId || 'sin-cuenta';
    if (!cuentasTotals[cuentaId]) cuentasTotals[cuentaId] = { gastos: 0, ingresos: 0 };
    if (f.tipo === 'gasto') cuentasTotals[cuentaId].gastos += f.monto;
    else cuentasTotals[cuentaId].ingresos += f.monto;
  });

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Finanzas por Cuenta</span>
      </div>
      <div class="card-body">
        ${Object.entries(cuentasTotals).map(([cuentaId, total]) => {
          const cuenta = cuentaId === 'sin-cuenta' ? null : getCuentaById(cuentaId);
          const balance = total.ingresos - total.gastos;
          return `
            <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="width:40px;height:40px;border-radius:var(--radius-md);background:${cuenta ? cuenta.color + '15' : 'var(--bg-primary)'};display:flex;align-items:center;justify-content:center;color:${cuenta ? cuenta.color : 'var(--text-tertiary)'}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <div style="flex:1">
                <div style="font-size:var(--text-sm);font-weight:500">${cuenta ? `${cuenta.banco} **** ${cuenta.terminacion}` : 'Sin cuenta'}</div>
                <div style="font-size:var(--text-xs);color:var(--text-secondary)">${total.ingresos > 0 ? `+${formatCurrency(total.ingresos)} ingresos` : ''} ${total.gastos > 0 ? `-${formatCurrency(total.gastos)} gastos` : ''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:var(--text-sm);font-weight:600;color:${balance >= 0 ? 'var(--success)' : 'var(--error)'}">${balance >= 0 ? '+' : ''}${formatCurrency(balance)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-secondary)">Balance</div>
              </div>
            </div>
          `;
        }).join('')}
        ${Object.keys(cuentasTotals).length === 0 ? '<div style="text-align:center;padding:var(--space-2xl);color:var(--text-secondary)">No hay transacciones</div>' : ''}
      </div>
    </div>
  `;
}

function openFinanzasModal() {
  const body = `
    <div class="form-group">
      <div class="form-field">
        <label>Tipo</label>
        <select class="input" id="fin-tipo">
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
        </select>
      </div>
      <div class="form-field">
        <label>Monto</label>
        <input type="number" class="input" id="fin-monto" placeholder="0.00">
      </div>
    </div>
    <div class="form-group full">
      <div class="form-field">
        <label>Concepto</label>
        <input type="text" class="input" id="fin-concepto" placeholder="Descripcion del gasto/ingreso">
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Categoria</label>
        <select class="input" id="fin-categoria">
          <option value="Alimentacion">Alimentacion</option>
          <option value="Transporte">Transporte</option>
          <option value="Servicios">Servicios</option>
          <option value="Trabajo">Trabajo</option>
          <option value="Proyecto">Proyecto</option>
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div class="form-field">
        <label>Fecha</label>
        <input type="date" class="input" id="fin-fecha" value="${new Date().toISOString().split('T')[0]}">
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Cuenta</label>
        <select class="input" id="fin-cuenta">
          <option value="">Sin cuenta</option>
          ${cuentasData.map(c => `<option value="${c.id}">${c.banco} **** ${c.terminacion} (${formatCurrency(c.saldo)})</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label>Asociar a tarea (opcional)</label>
        <select class="input" id="fin-tarea">
          <option value="">Sin asociar</option>
          ${proyectosData.flatMap(p => p.tareas.map(t => `<option value="${t.id}">${p.nombre} - ${t.titulo}</option>`)).join('')}
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveFinanzas()">Guardar</button>
  `;

  openModal('Nueva Transaccion', body, footer);
}

async function saveFinanzas() {
  const tipo = document.getElementById('fin-tipo').value;
  const monto = parseFloat(document.getElementById('fin-monto').value) || 0;
  const concepto = document.getElementById('fin-concepto').value;
  const categoria = document.getElementById('fin-categoria').value;
  const fecha = document.getElementById('fin-fecha').value;
  const cuentaIdStr = document.getElementById('fin-cuenta').value;
  const cuentaId = cuentaIdStr ? cuentaIdStr : null;
  const tareaIdStr = document.getElementById('fin-tarea').value;
  const tareaId = tareaIdStr ? tareaIdStr : null;

  if (!concepto || !monto) {
    showToast('Completa todos los campos', 'error');
    return;
  }

  const result = await createTransaction({
    tipo,
    concepto,
    categoria,
    monto,
    fecha,
    cuentaId,
    tareaId
  });

  if (result) {
    closeModal();
    renderFinanzas();
    showToast(`Transaccion guardada${cuentaId ? '. Saldo actualizado.' : ''}`);
  }
}

Router.register('/finanzas', renderFinanzas);
