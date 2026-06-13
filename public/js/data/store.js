/**
 * Aliester Data Store — InsForge-backed data layer
 *
 * Replaces mock arrays with cloud-persisted, per-user data.
 * All CRUD operations update local state first (optimistic) then persist.
 * Views consume the global arrays directly for backward compatibility.
 */

const db = () => window.insforge.database;

// ── Global state arrays (consumed by views) ──────────────────────────────
window.cuentasData = [];
window.finanzasData = [];
window.proyectosData = [];
window.eventosData = [];
window.notasData = [];
window.suscripcionesData = [];

// ── Loading state ────────────────────────────────────────────────────────
let _dataLoaded = false;
let _dataLoading = false;

function isDataLoaded() { return _dataLoaded; }

// ── Load all user data ───────────────────────────────────────────────────
async function loadAllData() {
  if (_dataLoading) return;
  _dataLoading = true;

  try {
    const [accounts, transactions, projects, tasks, events, notes, subs] = await Promise.all([
      db().from('accounts').select().order('created_at', { ascending: false }),
      db().from('transactions').select().order('fecha', { ascending: false }),
      db().from('projects').select().order('created_at', { ascending: false }),
      db().from('tasks').select().order('created_at', { ascending: false }),
      db().from('events').select().order('fecha', { ascending: true }),
      db().from('notes').select().order('created_at', { ascending: false }),
      db().from('subscriptions').select().order('created_at', { ascending: false }),
    ]);

    window.cuentasData = (accounts.data || []).map(mapAccount);
    window.finanzasData = (transactions.data || []).map(mapTransaction);
    window.eventosData = (events.data || []).map(mapEvent);
    window.notasData = (notes.data || []).map(mapNote);
    window.suscripcionesData = (subs.data || []).map(mapSubscription);

    // Build projects with nested tasks
    const projectsList = (projects.data || []).map(mapProject);
    const tasksList = (tasks.data || []).map(mapTask);
    window.proyectosData = projectsList.map(p => ({
      ...p,
      tareas: tasksList.filter(t => t.project_id === p.id)
    }));

    _dataLoaded = true;
    window.dispatchEvent(new CustomEvent('data-loaded'));
  } catch (err) {
    console.error('Failed to load data:', err);
  } finally {
    _dataLoading = false;
  }
}

// ── Mappers: DB row → view-compatible object ─────────────────────────────
function mapAccount(r) {
  return {
    id: r.id,
    banco: r.banco,
    terminacion: r.terminacion,
    tipo: r.tipo,
    red: r.red,
    saldo: Number(r.saldo) || 0,
    color: r.color,
  };
}

function mapTransaction(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    concepto: r.concepto,
    categoria: r.categoria,
    monto: Number(r.monto) || 0,
    fecha: r.fecha,
    cuentaId: r.account_id,
    tareaId: r.task_id || null,
  };
}

function mapProject(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    estado: r.estado,
  };
}

function mapTask(r) {
  const etapaId = Number(r.estado);
  return {
    id: r.id,
    project_id: r.project_id,
    titulo: r.titulo,
    estado: r.estado,
    etapaId: Number.isNaN(etapaId) ? (r.estado === 'completado' ? 6 : r.estado === 'en-progreso' ? 4 : 1) : etapaId,
    prioridad: r.prioridad,
  };
}

function mapEvent(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    fecha: r.fecha,
    hora: r.hora,
    color: r.color,
  };
}

function mapNote(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    contenido: r.contenido || '',
    fecha: r.fecha,
  };
}

function mapSubscription(r) {
  return {
    id: r.id,
    servicio: r.servicio,
    descripcion: r.descripcion,
    costo: Number(r.costo) || 0,
    estado: r.estado,
    fechaInicio: r.fecha_inicio,
    fechaCorte: r.fecha_corte,
    cuentaId: r.account_id,
    fechaCancelacion: r.fecha_cancelacion,
    motivoCancelacion: r.motivo_cancelacion,
  };
}

// ── Cuentas CRUD ─────────────────────────────────────────────────────────
async function createCuenta(data) {
  const row = {
    banco: data.banco,
    terminacion: data.terminacion,
    tipo: data.tipo,
    red: data.red,
    saldo: data.saldo || 0,
    color: data.color,
  };
  const { data: inserted, error } = await db().from('accounts').insert([row]).select();
  if (error) { showToast('Error al crear cuenta', 'error'); return null; }
  const mapped = mapAccount(inserted[0]);
  window.cuentasData.unshift(mapped);
  return mapped;
}

async function updateCuenta(id, updates) {
  const row = {};
  if (updates.banco !== undefined) row.banco = updates.banco;
  if (updates.terminacion !== undefined) row.terminacion = updates.terminacion;
  if (updates.tipo !== undefined) row.tipo = updates.tipo;
  if (updates.red !== undefined) row.red = updates.red;
  if (updates.saldo !== undefined) row.saldo = updates.saldo;
  if (updates.color !== undefined) row.color = updates.color;

  const { error } = await db().from('accounts').update(row).eq('id', id);
  if (error) { showToast('Error al actualizar cuenta', 'error'); return false; }
  const idx = window.cuentasData.findIndex(c => c.id === id);
  if (idx !== -1) Object.assign(window.cuentasData[idx], updates);
  return true;
}

async function deleteCuentaRemote(id) {
  const { error } = await db().from('accounts').delete().eq('id', id);
  if (error) { showToast('Error al eliminar cuenta', 'error'); return false; }
  // Disassociate related records
  window.suscripcionesData.forEach(s => { if (s.cuentaId === id) s.cuentaId = null; });
  window.finanzasData.forEach(f => { if (f.cuentaId === id) f.cuentaId = null; });
  window.cuentasData = window.cuentasData.filter(c => c.id !== id);
  return true;
}

// ── Transactions CRUD ────────────────────────────────────────────────────
async function createTransaction(data) {
  const row = {
    tipo: data.tipo,
    concepto: data.concepto,
    categoria: data.categoria,
    monto: data.monto,
    fecha: data.fecha,
    account_id: data.cuentaId || null,
    task_id: data.tareaId || null,
  };
  const { data: inserted, error } = await db().from('transactions').insert([row]).select();
  if (error) { showToast('Error al crear transaccion', 'error'); return null; }
  const mapped = mapTransaction(inserted[0]);
  window.finanzasData.unshift(mapped);

  // Update account balance if linked
  if (mapped.cuentaId) {
    const cuenta = window.cuentasData.find(c => c.id === mapped.cuentaId);
    if (cuenta) {
      const delta = mapped.tipo === 'ingreso' ? mapped.monto : -mapped.monto;
      const newSaldo = cuenta.saldo + delta;
      cuenta.saldo = newSaldo;
      updateCuenta(cuenta.id, { saldo: newSaldo });
    }
  }
  return mapped;
}

// ── Projects CRUD ────────────────────────────────────────────────────────
async function createProject(data) {
  const row = { nombre: data.nombre, descripcion: data.descripcion, estado: data.estado || 'activo' };
  const { data: inserted, error } = await db().from('projects').insert([row]).select();
  if (error) { showToast('Error al crear proyecto', 'error'); return null; }
  const mapped = mapProject(inserted[0]);
  mapped.tareas = [];
  window.proyectosData.unshift(mapped);
  return mapped;
}

// ── Tasks CRUD ───────────────────────────────────────────────────────────
async function createTask(data) {
  const row = {
    project_id: data.project_id,
    titulo: data.titulo,
    estado: data.estado || (data.etapaId ? String(data.etapaId) : '1'),
    prioridad: data.prioridad || 'media',
  };
  const { data: inserted, error } = await db().from('tasks').insert([row]).select();
  if (error) { showToast('Error al crear tarea', 'error'); return null; }
  const mapped = mapTask(inserted[0]);
  const proyecto = window.proyectosData.find(p => p.id === mapped.project_id);
  if (proyecto) proyecto.tareas.push(mapped);
  return mapped;
}

async function updateTask(id, updates) {
  const row = {};
  if (updates.estado !== undefined) row.estado = updates.estado;
  if (updates.etapaId !== undefined) row.estado = String(updates.etapaId);
  if (updates.prioridad !== undefined) row.prioridad = updates.prioridad;
  if (updates.titulo !== undefined) row.titulo = updates.titulo;

  const { error } = await db().from('tasks').update(row).eq('id', id);
  if (error) { showToast('Error al actualizar tarea', 'error'); return false; }
  for (const p of window.proyectosData) {
    const t = p.tareas.find(t => t.id === id);
    if (t) { Object.assign(t, updates); break; }
  }
  return true;
}

async function deleteTaskRemote(id) {
  const { error } = await db().from('tasks').delete().eq('id', id);
  if (error) { showToast('Error al eliminar tarea', 'error'); return false; }
  for (const p of window.proyectosData) {
    const idx = p.tareas.findIndex(t => t.id === id);
    if (idx !== -1) { p.tareas.splice(idx, 1); break; }
  }
  return true;
}

// ── Events CRUD ──────────────────────────────────────────────────────────
async function createEvent(data) {
  const row = {
    titulo: data.titulo,
    fecha: data.fecha,
    hora: data.hora || '00:00',
    color: data.color || 'blue',
  };
  const { data: inserted, error } = await db().from('events').insert([row]).select();
  if (error) { showToast('Error al crear evento', 'error'); return null; }
  const mapped = mapEvent(inserted[0]);
  window.eventosData.push(mapped);
  return mapped;
}

async function deleteEventRemote(id) {
  const { error } = await db().from('events').delete().eq('id', id);
  if (error) { showToast('Error al eliminar evento', 'error'); return false; }
  window.eventosData = window.eventosData.filter(e => e.id !== id);
  return true;
}

// ── Notes CRUD ───────────────────────────────────────────────────────────
async function createNote(data) {
  const row = {
    titulo: data.titulo,
    contenido: data.contenido || '',
    fecha: data.fecha || null,
  };
  const { data: inserted, error } = await db().from('notes').insert([row]).select();
  if (error) { showToast('Error al crear nota', 'error'); return null; }
  const mapped = mapNote(inserted[0]);
  window.notasData.unshift(mapped);
  return mapped;
}

async function updateNote(id, updates) {
  const row = {};
  if (updates.titulo !== undefined) row.titulo = updates.titulo;
  if (updates.contenido !== undefined) row.contenido = updates.contenido;
  if (updates.fecha !== undefined) row.fecha = updates.fecha;

  const { error } = await db().from('notes').update(row).eq('id', id);
  if (error) { showToast('Error al actualizar nota', 'error'); return false; }
  const idx = window.notasData.findIndex(n => n.id === id);
  if (idx !== -1) Object.assign(window.notasData[idx], updates);
  return true;
}

async function deleteNoteRemote(id) {
  const { error } = await db().from('notes').delete().eq('id', id);
  if (error) { showToast('Error al eliminar nota', 'error'); return false; }
  window.notasData = window.notasData.filter(n => n.id !== id);
  return true;
}

// ── Subscriptions CRUD ───────────────────────────────────────────────────
async function createSubscription(data) {
  const row = {
    servicio: data.servicio,
    descripcion: data.descripcion || '',
    costo: data.costo,
    estado: 'activa',
    fecha_inicio: data.fechaInicio,
    fecha_corte: data.fechaCorte || 1,
    account_id: data.cuentaId || null,
  };
  const { data: inserted, error } = await db().from('subscriptions').insert([row]).select();
  if (error) { showToast('Error al crear suscripcion', 'error'); return null; }
  const mapped = mapSubscription(inserted[0]);
  window.suscripcionesData.unshift(mapped);
  return mapped;
}

async function updateSubscription(id, updates) {
  const row = {};
  if (updates.estado !== undefined) row.estado = updates.estado;
  if (updates.servicio !== undefined) row.servicio = updates.servicio;
  if (updates.costo !== undefined) row.costo = updates.costo;
  if (updates.fecha_inicio !== undefined) row.fecha_inicio = updates.fecha_inicio;
  if (updates.fecha_corte !== undefined) row.fecha_corte = updates.fecha_corte;
  if (updates.account_id !== undefined) row.account_id = updates.account_id;
  if (updates.fecha_cancelacion !== undefined) row.fecha_cancelacion = updates.fecha_cancelacion;
  if (updates.motivo_cancelacion !== undefined) row.motivo_cancelacion = updates.motivo_cancelacion;

  const { error } = await db().from('subscriptions').update(row).eq('id', id);
  if (error) { showToast('Error al actualizar suscripcion', 'error'); return false; }
  const idx = window.suscripcionesData.findIndex(s => s.id === id);
  if (idx !== -1) {
    // Map back to view keys
    if (updates.estado !== undefined) window.suscripcionesData[idx].estado = updates.estado;
    if (updates.fecha_inicio !== undefined) window.suscripcionesData[idx].fechaInicio = updates.fecha_inicio;
    if (updates.fecha_cancelacion !== undefined) window.suscripcionesData[idx].fechaCancelacion = updates.fecha_cancelacion;
    if (updates.motivo_cancelacion !== undefined) window.suscripcionesData[idx].motivoCancelacion = updates.motivo_cancelacion;
  }
  return true;
}
