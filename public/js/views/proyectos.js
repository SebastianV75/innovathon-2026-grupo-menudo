/* Aliester - Proyectos View (Etapas Globales + Drag & Drop) */

let etapasData = [
  { id: 1, nombre: 'Idea', orden: 0 },
  { id: 2, nombre: 'Inicio', orden: 1 },
  { id: 3, nombre: 'Planeacion', orden: 2 },
  { id: 4, nombre: 'En proceso', orden: 3 },
  { id: 5, nombre: 'Revision', orden: 4 },
  { id: 6, nombre: 'Terminado', orden: 5 },
];

let kanbanFilter = 'todos';
let draggedTareaId = null;

function getTaskEtapaId(tarea) {
  if (tarea.etapaId) return Number(tarea.etapaId);
  const n = Number(tarea.estado);
  if (!Number.isNaN(n) && n > 0) return n;
  if (tarea.estado === 'completado') return 6;
  if (tarea.estado === 'en-progreso') return 4;
  return 1;
}

function renderProyectos() {
  let allTareas = proyectosData.flatMap(p => p.tareas || []);
  if (kanbanFilter !== 'todos') allTareas = allTareas.filter(t => t.prioridad === kanbanFilter);

  const html = `
    <div class="control-panel">
      <h2 class="control-panel-title">Proyectos y Tareas</h2>
      <div class="control-panel-spacer"></div>
      <div class="control-panel-filters">
        <button class="filter-pill ${kanbanFilter === 'todos' ? 'active' : ''}" onclick="kanbanFilter='todos';renderProyectos()">Todos</button>
        <button class="filter-pill ${kanbanFilter === 'alta' ? 'active' : ''}" onclick="kanbanFilter='alta';renderProyectos()">Alta</button>
        <button class="filter-pill ${kanbanFilter === 'media' ? 'active' : ''}" onclick="kanbanFilter='media';renderProyectos()">Media</button>
        <button class="filter-pill ${kanbanFilter === 'baja' ? 'active' : ''}" onclick="kanbanFilter='baja';renderProyectos()">Baja</button>
      </div>
      <div class="control-panel-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEtapasManager()">Administrar Etapas</button>
        <button class="btn btn-secondary btn-sm" onclick="openProyectoModal()">Nuevo Proyecto</button>
        <button class="btn btn-primary btn-sm" onclick="openTareaModal()" ${proyectosData.length === 0 ? 'disabled' : ''}>Nueva Tarea</button>
      </div>
    </div>

    ${proyectosData.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-title">Sin proyectos todavía</div>
        <div class="empty-state-text">Crea un proyecto para empezar a organizar tareas.</div>
      </div>
    ` : `
      <div class="kanban">
        ${etapasData.sort((a, b) => a.orden - b.orden).map(etapa => {
          const tareas = allTareas.filter(t => getTaskEtapaId(t) === etapa.id);
          return `<div class="kanban-column" data-etapa="${etapa.id}"><div class="kanban-column-header"><span class="kanban-column-title">${etapa.nombre}<span class="kanban-column-count">${tareas.length}</span></span></div><div class="kanban-column-body" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, ${etapa.id})">${tareas.map(t => renderKanbanCard(t)).join('')}</div></div>`;
        }).join('')}
      </div>
    `}
  `;
  render(html);
}

function renderKanbanCard(tarea) {
  const prioridadColors = { alta: 'badge-error', media: 'badge-warning', baja: 'badge-neutral' };
  const proyecto = proyectosData.find(p => (p.tareas || []).some(t => t.id === tarea.id));
  return `<div class="kanban-card" draggable="true" ondragstart="handleDragStart(event, '${tarea.id}')" ondragend="handleDragEnd(event)" onclick="openTareaDetail('${tarea.id}')"><div class="kanban-card-title">${tarea.titulo}</div><div class="kanban-card-meta"><div class="kanban-card-tags"><span class="badge ${prioridadColors[tarea.prioridad] || 'badge-neutral'}">${tarea.prioridad}</span></div><span class="kanban-card-date">${proyecto ? proyecto.nombre : ''}</span></div></div>`;
}

function handleDragStart(event, tareaId) { draggedTareaId = tareaId; event.target.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tareaId); }
function handleDragEnd(event) { event.target.classList.remove('dragging'); document.querySelectorAll('.kanban-column-body').forEach(col => col.classList.remove('drag-over')); }
function handleDragOver(event) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; event.currentTarget.classList.add('drag-over'); }
function handleDragLeave(event) { event.currentTarget.classList.remove('drag-over'); }

async function handleDrop(event, etapaId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const tareaId = event.dataTransfer.getData('text/plain');
  if (!tareaId) return;
  const etapa = etapasData.find(e => e.id === etapaId);
  const ok = await updateTask(tareaId, { etapaId, estado: String(etapaId) });
  if (ok) { renderProyectos(); showToast(`Tarea movida a "${etapa ? etapa.nombre : 'etapa'}"`); }
}

function openProyectoModal() {
  const body = `<div class="form-group full"><div class="form-field"><label>Nombre</label><input type="text" class="input" id="proyecto-nombre" placeholder="Nombre del proyecto"></div></div><div class="form-group full"><div class="form-field"><label>Descripcion</label><textarea class="input" id="proyecto-desc" placeholder="Descripcion opcional"></textarea></div></div>`;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveProyecto()">Crear</button>`;
  openModal('Nuevo Proyecto', body, footer);
}

async function saveProyecto() {
  const nombre = document.getElementById('proyecto-nombre').value;
  const descripcion = document.getElementById('proyecto-desc').value;
  if (!nombre) return showToast('Ingresa un nombre', 'error');
  const result = await createProject({ nombre, descripcion, estado: 'activo' });
  if (result) { closeModal(); renderProyectos(); showToast('Proyecto creado'); }
}

function openTareaModal() {
  const body = `<div class="form-group full"><div class="form-field"><label>Titulo</label><input type="text" class="input" id="tarea-titulo" placeholder="Nombre de la tarea"></div></div><div class="form-group"><div class="form-field"><label>Proyecto</label><select class="input" id="tarea-proyecto">${proyectosData.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div><div class="form-field"><label>Prioridad</label><select class="input" id="tarea-prioridad"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option></select></div></div><div class="form-group full"><div class="form-field"><label>Etapa</label><select class="input" id="tarea-etapa">${etapasData.sort((a, b) => a.orden - b.orden).map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}</select></div></div>`;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveTarea()">Crear</button>`;
  openModal('Nueva Tarea', body, footer);
}

async function saveTarea() {
  const titulo = document.getElementById('tarea-titulo').value;
  const prioridad = document.getElementById('tarea-prioridad').value;
  const etapaId = Number(document.getElementById('tarea-etapa').value);
  const proyectoId = document.getElementById('tarea-proyecto').value;
  if (!titulo) return showToast('Ingresa un titulo', 'error');
  const result = await createTask({ project_id: proyectoId, titulo, etapaId, estado: String(etapaId), prioridad });
  if (result) { closeModal(); renderProyectos(); showToast('Tarea creada'); }
}

function openTareaDetail(id) {
  let tarea = null;
  let proyecto = null;
  for (const p of proyectosData) { const t = (p.tareas || []).find(t => t.id === id); if (t) { tarea = t; proyecto = p; break; } }
  if (!tarea) return;
  const body = `<div class="form-group full"><div class="form-field"><label>Proyecto</label><div style="padding:var(--space-sm) 0;font-size:var(--text-sm)">${proyecto.nombre}</div></div></div><div class="form-group"><div class="form-field"><label>Prioridad</label><select class="input" id="detail-prioridad"><option value="baja" ${tarea.prioridad === 'baja' ? 'selected' : ''}>Baja</option><option value="media" ${tarea.prioridad === 'media' ? 'selected' : ''}>Media</option><option value="alta" ${tarea.prioridad === 'alta' ? 'selected' : ''}>Alta</option></select></div><div class="form-field"><label>Etapa</label><select class="input" id="detail-etapa">${etapasData.sort((a, b) => a.orden - b.orden).map(e => `<option value="${e.id}" ${getTaskEtapaId(tarea) === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}</select></div></div><div class="form-separator"></div><div id="proyecto-finanzas">${renderProyectoFinanzas(id)}</div><button class="btn btn-secondary btn-sm" style="margin-top:var(--space-sm)" onclick="openAgregarFinanzaProyecto('${id}')">Agregar transaccion</button>`;
  const footer = `<button class="btn btn-danger btn-sm" onclick="deleteTarea('${id}')">Eliminar</button><div style="flex:1"></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button><button class="btn btn-primary" onclick="updateTarea('${id}')">Guardar</button>`;
  openModal(tarea.titulo, body, footer);
}

function renderProyectoFinanzas(tareaId) {
  const trans = finanzasData.filter(f => f.tareaId === tareaId);
  if (trans.length === 0) return '<div style="padding:var(--space-md);color:var(--text-tertiary);font-size:var(--text-sm)">Sin transacciones</div>';
  return `<div class="list-view"><table class="list-table"><tbody>${trans.map(f => `<tr><td>${f.concepto}</td><td>${f.tipo}</td><td class="text-right text-mono">${formatCurrency(f.monto)}</td></tr>`).join('')}</tbody></table></div>`;
}

function openAgregarFinanzaProyecto(tareaId) {
  const body = `<div class="form-group"><div class="form-field"><label>Tipo</label><select class="input" id="fin-proy-tipo"><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></select></div><div class="form-field"><label>Monto</label><input type="number" class="input" id="fin-proy-monto" placeholder="0.00"></div></div><div class="form-group full"><div class="form-field"><label>Concepto</label><input type="text" class="input" id="fin-proy-concepto" placeholder="Concepto"></div></div>`;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveFinanzaProyecto('${tareaId}')">Guardar</button>`;
  openModal('Agregar Transaccion', body, footer);
}

async function saveFinanzaProyecto(tareaId) {
  const tipo = document.getElementById('fin-proy-tipo').value;
  const monto = parseFloat(document.getElementById('fin-proy-monto').value) || 0;
  const concepto = document.getElementById('fin-proy-concepto').value;
  if (!concepto || !monto) return showToast('Completa los campos', 'error');
  const result = await createTransaction({ tipo, concepto, categoria: 'Proyecto', monto, fecha: new Date().toISOString().split('T')[0], tareaId });
  if (result) { closeModal(); showToast('Transaccion guardada'); }
}

async function updateTarea(id) {
  const prioridad = document.getElementById('detail-prioridad').value;
  const etapaId = Number(document.getElementById('detail-etapa').value);
  const ok = await updateTask(id, { prioridad, etapaId, estado: String(etapaId) });
  if (ok) { closeModal(); renderProyectos(); showToast('Tarea actualizada'); }
}

async function deleteTarea(id) {
  const ok = await deleteTaskRemote(id);
  if (ok) { closeModal(); renderProyectos(); showToast('Tarea eliminada'); }
}

function openEtapasManager() {
  const body = `<div class="etapas-manager"><div class="etapas-manager-list">${etapasData.sort((a, b) => a.orden - b.orden).map(e => `<div class="etapa-manager-item"><input class="etapa-manager-input" value="${e.nombre}" onchange="renameEtapa(${e.id}, this.value)"></div>`).join('')}</div></div>`;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
  openModal('Administrar Etapas', body, footer);
}

function renameEtapa(id, nombre) {
  const etapa = etapasData.find(e => e.id === id);
  if (etapa && nombre.trim()) etapa.nombre = nombre.trim();
  renderProyectos();
}

Router.register('/proyectos', renderProyectos);
