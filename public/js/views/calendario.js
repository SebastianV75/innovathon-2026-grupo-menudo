/* Aliester - Calendario View */

// eventosData is now loaded from InsForge via store.js

let calendarioMonth = 5; // June (0-indexed)
let calendarioYear = 2026;

function renderCalendario() {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  const firstDay = new Date(calendarioYear, calendarioMonth, 1).getDay();
  const daysInMonth = new Date(calendarioYear, calendarioMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calendarioYear, calendarioMonth, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === calendarioMonth && today.getFullYear() === calendarioYear;

  let days = '';

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days += `<div class="calendar-day other-month"><span class="calendar-day-number">${daysInPrevMonth - i}</span></div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarioYear}-${String(calendarioMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = isCurrentMonth && today.getDate() === d;
    const dayEvents = eventosData.filter(e => e.fecha === dateStr);

    days += `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="openEventoModal('${dateStr}')">
        <span class="calendar-day-number">${d}</span>
        ${dayEvents.map(e => `
          <div class="calendar-event ${e.color}">${e.titulo}</div>
        `).join('')}
      </div>
    `;
  }

  // Next month days
  const totalCells = firstDay + daysInMonth;
  const remaining = 42 - totalCells;
  for (let i = 1; i <= remaining; i++) {
    days += `<div class="calendar-day other-month"><span class="calendar-day-number">${i}</span></div>`;
  }

  const html = `
    <div class="control-panel">
      <h2 class="control-panel-title">Calendario</h2>
      <div class="control-panel-spacer"></div>
      <div class="control-panel-actions">
        <button class="btn btn-primary btn-sm" onclick="openNuevoEventoModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Evento
        </button>
      </div>
    </div>

    <div class="calendar">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="btn btn-secondary btn-sm" onclick="changeMonth(-1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="changeMonth(1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <span class="calendar-title">${monthNames[calendarioMonth]} ${calendarioYear}</span>
        <button class="btn btn-secondary btn-sm" onclick="goToToday()">Hoy</button>
      </div>
      <div class="calendar-grid">
        ${dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
        ${days}
      </div>
    </div>

    <!-- Proximos eventos -->
    <div style="margin-top:var(--space-lg)">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Proximos Eventos</span>
        </div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:12px">
            ${eventosData.sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5).map(e => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
                <div style="width:4px;height:32px;border-radius:2px;background:var(--${e.color === 'blue' ? 'info' : e.color === 'green' ? 'success' : e.color === 'orange' ? 'warning' : 'error'})"></div>
                <div style="flex:1">
                  <div style="font-size:var(--text-sm);font-weight:500">${e.titulo}</div>
                  <div style="font-size:var(--text-xs);color:var(--text-secondary)">${formatDate(e.fecha)} ${e.hora !== '00:00' ? e.hora : ''}</div>
                </div>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteEvento('${e.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  render(html);
}

function changeMonth(delta) {
  calendarioMonth += delta;
  if (calendarioMonth > 11) { calendarioMonth = 0; calendarioYear++; }
  if (calendarioMonth < 0) { calendarioMonth = 11; calendarioYear--; }
  renderCalendario();
}

function goToToday() {
  const today = new Date();
  calendarioMonth = today.getMonth();
  calendarioYear = today.getFullYear();
  renderCalendario();
}

function openNuevoEventoModal() {
  const body = `
    <div class="form-group full">
      <div class="form-field">
        <label>Titulo</label>
        <input type="text" class="input" id="evento-titulo" placeholder="Nombre del evento">
      </div>
    </div>
    <div class="form-group">
      <div class="form-field">
        <label>Fecha</label>
        <input type="date" class="input" id="evento-fecha" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-field">
        <label>Hora</label>
        <input type="time" class="input" id="evento-hora" value="10:00">
      </div>
    </div>
    <div class="form-group full">
      <div class="form-field">
        <label>Color</label>
        <select class="input" id="evento-color">
          <option value="blue">Azul</option>
          <option value="green">Verde</option>
          <option value="orange">Naranja</option>
          <option value="red">Rojo</option>
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEvento()">Crear</button>
  `;

  openModal('Nuevo Evento', body, footer);
}

function openEventoModal(dateStr) {
  const dayEvents = eventosData.filter(e => e.fecha === dateStr);

  const body = `
    <div style="margin-bottom:var(--space-md)">
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-sm)">${formatDate(dateStr)}</div>
    </div>
    ${dayEvents.length > 0 ? dayEvents.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:8px">
        <div style="width:4px;height:24px;border-radius:2px;background:var(--${e.color === 'blue' ? 'info' : e.color === 'green' ? 'success' : e.color === 'orange' ? 'warning' : 'error'})"></div>
        <div style="flex:1">
          <div style="font-size:var(--text-sm);font-weight:500">${e.titulo}</div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">${e.hora}</div>
        </div>
      </div>
    `).join('') : '<div style="text-align:center;padding:var(--space-lg);color:var(--text-secondary)">No hay eventos</div>'}
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    <button class="btn btn-primary" onclick="closeModal();openNuevoEventoModal()">+ Evento</button>
  `;

  openModal('Eventos del dia', body, footer);
}

async function saveEvento() {
  const titulo = document.getElementById('evento-titulo').value;
  const fecha = document.getElementById('evento-fecha').value;
  const hora = document.getElementById('evento-hora').value;
  const color = document.getElementById('evento-color').value;

  if (!titulo || !fecha) {
    showToast('Completa titulo y fecha', 'error');
    return;
  }

  const result = await createEvent({ titulo, fecha, hora, color });
  if (result) {
    closeModal();
    renderCalendario();
    showToast('Evento creado');
  }
}

async function deleteEvento(id) {
  const ok = await deleteEventRemote(id);
  if (ok) {
    renderCalendario();
    showToast('Evento eliminado');
  }
}

Router.register('/calendario', renderCalendario);
