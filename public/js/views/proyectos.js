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
let mostrarTerminadasAntiguas = false;

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

  const sieteDias = 7 * 24 * 60 * 60 * 1000;
  const ahora = new Date().getTime();
  const tareasTerminadasAntiguas = allTareas.filter(t => {
    if (getTaskEtapaId(t) !== 6) return false;
    if (!t.fechaTerminado) return false;
    return (ahora - new Date(t.fechaTerminado).getTime()) > sieteDias;
  });
  
  if (!mostrarTerminadasAntiguas) {
    allTareas = allTareas.filter(t => {
      if (getTaskEtapaId(t) !== 6) return true;
      if (!t.fechaTerminado) return true;
      return (ahora - new Date(t.fechaTerminado).getTime()) <= sieteDias;
    });
  }

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
        ${tareasTerminadasAntiguas.length > 0 ? `
          <button class="btn btn-secondary btn-sm" onclick="mostrarTerminadasAntiguas=!mostrarTerminadasAntiguas;renderProyectos()">
            ${mostrarTerminadasAntiguas ? 'Ocultar' : 'Mostrar'} ${tareasTerminadasAntiguas.length} terminada${tareasTerminadasAntiguas.length > 1 ? 's' : ''} antigua${tareasTerminadasAntiguas.length > 1 ? 's' : ''}
          </button>
        ` : ''}
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
  const fechaTerminado = etapaId === 6 ? new Date().toISOString() : null;
  const ok = await updateTask(tareaId, { etapaId, estado: String(etapaId), fecha_terminado: fechaTerminado });
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
  cleanupTareaAttachmentPreview();
  let tarea = null;
  let proyecto = null;
  for (const p of proyectosData) { const t = (p.tareas || []).find(t => t.id === id); if (t) { tarea = t; proyecto = p; break; } }
  if (!tarea) return;
  const body = `<div class="form-group full"><div class="form-field"><label>Titulo</label><input type="text" class="input" id="detail-titulo" value="${(tarea.titulo || '').replace(/"/g, '&quot;')}" placeholder="Titulo de la tarea"></div></div><div class="form-group full"><div class="form-field"><label>Proyecto</label><div style="padding:var(--space-sm) 0;font-size:var(--text-sm)">${proyecto.nombre}</div></div></div><div class="form-group"><div class="form-field"><label>Prioridad</label><select class="input" id="detail-prioridad"><option value="baja" ${tarea.prioridad === 'baja' ? 'selected' : ''}>Baja</option><option value="media" ${tarea.prioridad === 'media' ? 'selected' : ''}>Media</option><option value="alta" ${tarea.prioridad === 'alta' ? 'selected' : ''}>Alta</option></select></div><div class="form-field"><label>Etapa</label><select class="input" id="detail-etapa">${etapasData.sort((a, b) => a.orden - b.orden).map(e => `<option value="${e.id}" ${getTaskEtapaId(tarea) === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}</select></div></div><div class="form-separator"></div><div id="tarea-attachments-section">${renderTareaAttachments(id)}</div><div style="margin-top:var(--space-sm)"><input type="file" id="tarea-file-input" multiple accept=".pdf,.txt,image/*" style="display:none" onchange="handleTareaFileUpload('${id}')"><button class="btn btn-secondary btn-sm" onclick="document.getElementById('tarea-file-input').click()">Adjuntar archivo</button></div><div class="form-separator"></div><div id="proyecto-finanzas">${renderProyectoFinanzas(id)}</div><button class="btn btn-secondary btn-sm" style="margin-top:var(--space-sm)" onclick="openAgregarFinanzaProyecto('${id}')">Agregar transaccion</button>`;
  const footer = `<button class="btn btn-danger btn-sm" onclick="deleteTarea('${id}')">Eliminar</button><div style="flex:1"></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button><button class="btn btn-primary" onclick="updateTarea('${id}')">Guardar</button>`;
  openModal(tarea.titulo, body, footer);
}

function renderTareaAttachments(tareaId) {
  const attachments = (window.taskAttachmentsData || []).filter(a => a.task_id === tareaId);
  if (attachments.length === 0) return '<div style="padding:var(--space-sm) 0;color:var(--text-tertiary);font-size:var(--text-sm)">Sin adjuntos</div>';
  return `<div style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-xs)">Adjuntos (${attachments.length})</div><div class="list-view"><table class="list-table"><tbody>${attachments.map(a => {
    const sizeKb = (a.file_size / 1024).toFixed(1);
    const sizeLabel = a.file_size >= 1048576 ? (a.file_size / 1048576).toFixed(1) + ' MB' : sizeKb + ' KB';
    const typeIcon = a.mime_type.startsWith('image/') ? '🖼' : a.mime_type === 'application/pdf' ? '📄' : '📝';
    return `<tr><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${typeIcon} <button class="btn btn-link btn-sm" style="padding:0;border:none;background:none;color:var(--color-primary);text-decoration:underline;cursor:pointer;font:inherit" onclick="openTareaAttachment('${a.id}', '${tareaId}')">${a.file_name}</button></td><td style="white-space:nowrap">${sizeLabel}</td><td style="width:40px"><button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:var(--text-xs)" onclick="deleteTareaAttachment('${a.id}', '${tareaId}')">✕</button></td></tr>`;
  }).join('')}</tbody></table></div>${renderTareaAttachmentPreview(tareaId)}`;
}

function renderTareaAttachmentPreview(tareaId) {
  const preview = window.tareaAttachmentPreview;
  if (!preview || preview.taskId !== tareaId) return '';

  let content = '<div style="padding:var(--space-md);color:var(--text-tertiary);font-size:var(--text-sm)">Vista previa no disponible</div>';
  if (preview.kind === 'image') {
    content = `<div style="display:flex;justify-content:center;padding:var(--space-sm)"><img src="${preview.objectUrl}" alt="${preview.fileName}" style="max-width:100%;max-height:360px;border-radius:12px"></div>`;
  } else if (preview.kind === 'pdf') {
    content = `<iframe src="${preview.objectUrl}" title="${preview.fileName}" style="width:100%;height:420px;border:none;border-radius:12px;background:#fff"></iframe>`;
  } else if (preview.kind === 'text') {
    content = `<pre style="margin:0;max-height:360px;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:var(--space-md);background:rgba(255,255,255,.04);border-radius:12px">${preview.textContent}</pre>`;
  }

  return `<div style="margin-top:var(--space-md);border:1px solid var(--border-primary);border-radius:16px;padding:var(--space-md);background:var(--surface-secondary)"><div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm)"><div style="font-size:var(--text-sm);font-weight:600;flex:1">Vista previa: ${preview.fileName}</div><button class="btn btn-secondary btn-sm" onclick="downloadPreviewedTareaAttachment()">Descargar</button><button class="btn btn-secondary btn-sm" onclick="clearTareaAttachmentPreview('${tareaId}')">Cerrar vista previa</button></div>${content}</div>`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanupTareaAttachmentPreview() {
  if (window.tareaAttachmentPreview && window.tareaAttachmentPreview.objectUrl) {
    URL.revokeObjectURL(window.tareaAttachmentPreview.objectUrl);
  }
  window.tareaAttachmentPreview = null;
}

function clearTareaAttachmentPreview(tareaId) {
  cleanupTareaAttachmentPreview();
  const section = document.getElementById('tarea-attachments-section');
  if (section) section.innerHTML = renderTareaAttachments(tareaId);
}

function downloadPreviewedTareaAttachment() {
  const preview = window.tareaAttachmentPreview;
  if (!preview || !preview.objectUrl) return;
  const link = document.createElement('a');
  link.href = preview.objectUrl;
  link.download = preview.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function openTareaAttachment(attId, tareaId) {
  const attachment = (window.taskAttachmentsData || []).find(a => a.id === attId);
  if (!attachment) return showToast('Adjunto no encontrado', 'error');

  const { data: fileBlob, error } = await window.insforge.storage
    .from('task-attachments')
    .download(attachment.storage_key);

  if (error || !fileBlob) {
    showToast('Error al abrir adjunto', 'error');
    return;
  }

  cleanupTareaAttachmentPreview();
  const objectUrl = URL.createObjectURL(fileBlob);
  const mimeType = attachment.mime_type || '';
  const preview = {
    id: attachment.id,
    taskId: tareaId,
    fileName: attachment.file_name,
    mimeType,
    objectUrl,
    kind: mimeType.startsWith('image/') ? 'image' : mimeType === 'application/pdf' ? 'pdf' : 'binary',
    textContent: '',
  };

  if (mimeType === 'text/plain') {
    preview.kind = 'text';
    preview.textContent = escapeHtml(await fileBlob.text());
  }

  window.tareaAttachmentPreview = preview;
  const section = document.getElementById('tarea-attachments-section');
  if (section) section.innerHTML = renderTareaAttachments(tareaId);
}

async function handleTareaFileUpload(tareaId) {
  const input = document.getElementById('tarea-file-input');
  if (!input || !input.files || input.files.length === 0) return;

  const allowedTypes = ['application/pdf', 'text/plain'];
  const files = Array.from(input.files);

  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isAllowed = allowedTypes.includes(file.type) || isImage;
    if (!isAllowed) {
      showToast(`Tipo no soportado: ${file.name}`, 'error');
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(`Archivo muy grande: ${file.name} (max 10MB)`, 'error');
      continue;
    }
    const result = await createTaskAttachment(tareaId, file);
    if (result) showToast(`Adjunto subido: ${file.name}`);
  }

  input.value = '';
  const section = document.getElementById('tarea-attachments-section');
  if (section) section.innerHTML = renderTareaAttachments(tareaId);
}

async function deleteTareaAttachment(attId, tareaId) {
  const ok = await deleteTaskAttachment(attId);
  if (ok) {
    if (window.tareaAttachmentPreview && window.tareaAttachmentPreview.id === attId) {
      cleanupTareaAttachmentPreview();
    }
    showToast('Adjunto eliminado');
    const section = document.getElementById('tarea-attachments-section');
    if (section) section.innerHTML = renderTareaAttachments(tareaId);
  }
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
  const titulo = document.getElementById('detail-titulo').value.trim();
  const prioridad = document.getElementById('detail-prioridad').value;
  const etapaId = Number(document.getElementById('detail-etapa').value);
  if (!titulo) return showToast('El titulo no puede estar vacio', 'error');
  const fechaTerminado = etapaId === 6 ? new Date().toISOString() : null;
  const ok = await updateTask(id, { titulo, prioridad, etapaId, estado: String(etapaId), fecha_terminado: fechaTerminado });
  if (ok) { closeModal(); renderProyectos(); showToast('Tarea actualizada'); }
}

async function deleteTarea(id) {
  const ok = await deleteTaskRemote(id);
  if (ok) { closeModal(); renderProyectos(); showToast('Tarea eliminada'); }
}

function openEtapasManager() {
  const body = `
    <div class="etapas-manager">
      <div class="etapas-manager-list">
        ${etapasData.sort((a, b) => a.orden - b.orden).map(e => `
          <div class="etapa-manager-item" draggable="true" data-etapa-id="${e.id}">
            <div class="etapa-manager-handle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
              </svg>
            </div>
            <input class="etapa-manager-input" value="${e.nombre}" onchange="renameEtapa(${e.id}, this.value)">
            <div class="etapa-manager-actions">
              <button class="btn-icon" onclick="deleteEtapa(${e.id})" title="Eliminar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addEtapa()" style="margin-top:var(--space-sm)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nueva Etapa
      </button>
    </div>
  `;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
  openModal('Administrar Etapas', body, footer);
  
  setTimeout(initEtapasDragDrop, 100);
}

function initEtapasDragDrop() {
  const items = document.querySelectorAll('.etapa-manager-item');
  items.forEach(item => {
    item.addEventListener('dragstart', handleEtapaDragStart);
    item.addEventListener('dragover', handleEtapaDragOver);
    item.addEventListener('drop', handleEtapaDrop);
    item.addEventListener('dragend', handleEtapaDragEnd);
    item.addEventListener('dragleave', handleEtapaDragLeave);
  });
}

let draggedEtapaId = null;

function handleEtapaDragStart(e) {
  draggedEtapaId = e.currentTarget.dataset.etapaId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleEtapaDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (e.currentTarget.dataset.etapaId !== draggedEtapaId) {
    e.currentTarget.classList.add('drag-over');
  }
}

function handleEtapaDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleEtapaDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const targetId = e.currentTarget.dataset.etapaId;
  if (draggedEtapaId && targetId && draggedEtapaId !== targetId) {
    reorderEtapas(draggedEtapaId, targetId);
  }
}

function handleEtapaDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.etapa-manager-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

function reorderEtapas(draggedId, targetId) {
  const dragged = etapasData.find(e => e.id === Number(draggedId));
  const target = etapasData.find(e => e.id === Number(targetId));
  if (!dragged || !target) return;
  
  const draggedOrden = dragged.orden;
  dragged.orden = target.orden;
  target.orden = draggedOrden;
  
  renderProyectos();
  openEtapasManager();
}

function addEtapa() {
  const maxId = Math.max(...etapasData.map(e => e.id), 0);
  const maxOrden = Math.max(...etapasData.map(e => e.orden), -1);
  
  etapasData.push({
    id: maxId + 1,
    nombre: 'Nueva Etapa',
    orden: maxOrden + 1
  });
  
  renderProyectos();
  openEtapasManager();
}

function deleteEtapa(id) {
  const tareasEnEtapa = proyectosData.flatMap(p => p.tareas || [])
    .filter(t => getTaskEtapaId(t) === id);
  
  if (tareasEnEtapa.length > 0) {
    showToast(`No se puede eliminar: hay ${tareasEnEtapa.length} tarea(s) en esta etapa`, 'error');
    return;
  }
  
  const idx = etapasData.findIndex(e => e.id === id);
  if (idx !== -1) {
    etapasData.splice(idx, 1);
    renderProyectos();
    openEtapasManager();
  }
}

function renameEtapa(id, nombre) {
  const etapa = etapasData.find(e => e.id === id);
  if (etapa && nombre.trim()) etapa.nombre = nombre.trim();
  renderProyectos();
}

Router.register('/proyectos', renderProyectos);
