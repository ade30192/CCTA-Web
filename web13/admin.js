(() => {
  'use strict';
  const API = window.CCTA_API_BASE_URL || 'http://localhost:8080';
  const $ = id => document.getElementById(id);
  const data = { key: '', activities: [], registrations: [], selected: null };
  const money = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(Number(n || 0));
  const date = d => d ? new Date(`${String(d).slice(0,10)}T12:00:00`).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const stateNames = { PENDIENTE_PERMISO: 'Permiso pendiente', PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', RECHAZADA: 'Rechazada', ACTIVA: 'Activa', CERRADA: 'Cerrada', CANCELADA_ACTIVIDAD: 'Cancelada', FINALIZADA: 'Finalizada' };
  const typeNames = { CAMPAMENTO: 'Campamento', CONGRESO: 'Congreso', RETIRO: 'Retiro', OTRO: 'Otra actividad' };
  const paymentNames = { SINPE_MOVIL: 'SINPE Móvil', EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', OTRO: 'Otro' };
//Interacción con la API y renderizado de vistas
//Recordar Corregir funcionamiento y contradicción especifica.
  function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function message(id, text, type = 'info') { const el = $(id); if (!el) return; el.hidden = false; el.className = `admin-message ${type}`; el.textContent = text; }
  function hideMessage(id) { const el = $(id); if (el) el.hidden = true; }
  function stateLabel(v) { return stateNames[v] || v || '—'; }
  function button(label, cls, handler, disabled = false, title = '') { const b = document.createElement('button'); b.type = 'button'; b.className = cls || 'btn-small'; b.textContent = label; b.disabled = disabled; if (title) b.title = title; b.addEventListener('click', handler); return b; }
  function addCell(tr, value) { const td = document.createElement('td'); td.textContent = value ?? '—'; tr.append(td); return td; }
  function setView(name) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.toggle('admin-hidden', v.id !== `view-${name}`));
    document.querySelectorAll('.admin-nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if (name === 'inscripciones') renderRegistrations();
    if (name === 'permisos') renderPermissions();
    if (name === 'pagos') renderPayments();
    if (name === 'actividades') renderActivities();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API}${path}`, {
        ...options,
        headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), 'X-Admin-Key': data.key, ...(options.headers || {}) }
      });
    } catch (_) {
      throw new Error('No se pudo conectar con la API Java. Comprueba que sigue ejecutándose en el puerto 8080.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const err = new Error(body.message || body.mensaje || body.detail || body.error || `La API respondió HTTP ${response.status}.`); err.status = response.status; throw err; }
    return body;
  }
  async function loadAll() {
    const [activities, registrations] = await Promise.all([
      request('/api/admin/actividades'), request('/api/admin/inscripciones')
    ]);
    data.activities = Array.isArray(activities) ? activities : [];
    data.registrations = Array.isArray(registrations) ? registrations : [];
    renderSummary(); renderRecent(); renderRegistrations(); renderPermissions(); renderPayments(); renderActivities(); fillActivitySelect();
    hideMessage('global-message');
  }
  function renderSummary() {
    $('stat-all').textContent = data.registrations.length;
    $('stat-pending').textContent = data.registrations.filter(r => r.estado === 'PENDIENTE').length;
    $('stat-permissions').textContent = data.registrations.filter(needsPermission).length;
    const balance = data.registrations.filter(r => !['CANCELADA','RECHAZADA'].includes(r.estado)).reduce((s,r)=>s+Math.max(0,Number(r.saldoPendiente)||0),0);
    $('stat-balance').textContent = money(balance);
    $('stat-activities').textContent = data.activities.length;
  }
  function needsPermission(r) { return Number(r.edad) < 18 && !r.permisoRecibido && !['CANCELADA','RECHAZADA'].includes(r.estado); }
  function participant(r) { return `${r.nombre || ''} ${r.apellidos || ''}`.trim() || 'Sin nombre'; }
  function renderRecent() {
    const tbody = $('recent-rows'); tbody.replaceChildren();
    data.registrations.slice(0, 8).forEach(r => {
      const tr = document.createElement('tr'); addCell(tr, `#${r.id}`); addCell(tr, participant(r)); addCell(tr, r.actividadNombre); addCell(tr, stateLabel(r.estado)); addCell(tr, money(r.saldoPendiente));
      const actions = addCell(tr, ''); actions.append(button('Ver ficha','btn-small',()=>showDetails(r.id))); tbody.append(tr);
    });
    if (!data.registrations.length) emptyRow(tbody, 6, 'Todavía no hay inscripciones.');
  }
  function emptyRow(tbody, colspan, text) { const tr=document.createElement('tr'); const td=document.createElement('td'); td.colSpan=colspan; td.className='empty-cell'; td.textContent=text; tr.append(td); tbody.append(tr); }
  function renderRegistrations() {
    const tbody = $('registration-rows'); if (!tbody) return; tbody.replaceChildren();
    const search = ($('registration-search')?.value || '').trim().toLocaleLowerCase('es-CR');
    const filter = $('registration-filter')?.value || 'TODOS';
    const list = data.registrations.filter(r => {
      const text = [participant(r),r.identificacion,r.actividadNombre,String(r.id)].join(' ').toLocaleLowerCase('es-CR');
      return (!search || text.includes(search)) && (filter === 'TODOS' || r.estado === filter);
    });
    list.forEach(r => {
      const tr=document.createElement('tr'); addCell(tr,`#${r.id}`); addCell(tr,participant(r)); addCell(tr,r.identificacion); addCell(tr,r.actividadNombre); addCell(tr,stateLabel(r.estado)); addCell(tr,Number(r.edad)<18?(r.permisoRecibido?'Recibido':'Pendiente'):'No requerido'); addCell(tr,money(r.precioInscripcion)); addCell(tr,money(r.totalPagado)); addCell(tr,money(r.saldoPendiente));
      const td=addCell(tr,''); td.className='actions-cell';
      td.append(button('Ficha','btn-small',()=>showDetails(r.id)));
      td.append(button('Editar','btn-small gold',()=>openEdit(r.id)));
      td.append(button('Cambiar estado','btn-small',()=>openState(r.id)));
      if(r.estado==='PENDIENTE') td.append(button('Confirmar','btn-small green',()=>confirmRegistration(r.id)));
      if(!['CANCELADA','RECHAZADA'].includes(r.estado)) td.append(button('Cancelar','btn-small secondary',()=>cancelRegistration(r.id)));
      const hasPayment = Number(r.totalPagado)>0;
      td.append(button('Eliminar','btn-small danger',()=>deleteRegistration(r.id),hasPayment,hasPayment?'Tiene pagos: para conservar el historial debe cancelarse.':'Eliminar inscripción sin pagos'));
      td.append(button('Eliminar persona','btn-small danger',()=>deletePerson(r.id),false,'Elimina a la persona y todas sus inscripciones (solo si ninguna tiene pagos)'));
      tbody.append(tr);
    });
    if (!list.length) emptyRow(tbody,10,'No hay inscripciones que coincidan con la búsqueda.');
  }
  function renderPermissions() {
    const tbody=$('permission-rows'); if(!tbody)return; tbody.replaceChildren();
    const list=data.registrations.filter(needsPermission);
    list.forEach(r=>{const tr=document.createElement('tr');addCell(tr,`#${r.id}`);addCell(tr,`${participant(r)} · ${r.identificacion}`);addCell(tr,r.nombreEncargadoLegal||'Sin indicar');addCell(tr,r.actividadNombre);addCell(tr,stateLabel(r.estado));const td=addCell(tr,'');td.append(button('Marcar recibido','btn-small gold',()=>markPermission(r.id)));tbody.append(tr);});
    if(!list.length)emptyRow(tbody,6,'No hay permisos pendientes.');
  }
  function renderPayments() {
    const tbody=$('payment-rows');if(!tbody)return;tbody.replaceChildren();
    const list=data.registrations.filter(r=>Number(r.saldoPendiente)>0&&!['CANCELADA','RECHAZADA'].includes(r.estado));
    list.forEach(r=>{const tr=document.createElement('tr');addCell(tr,`#${r.id}`);addCell(tr,participant(r));addCell(tr,r.actividadNombre);addCell(tr,money(r.precioInscripcion));addCell(tr,money(r.totalPagado));addCell(tr,money(r.saldoPendiente));addCell(tr,r.estadoPago||'PENDIENTE');const td=addCell(tr,'');td.append(button('Registrar abono','btn-small gold',()=>openPayment(r.id)));td.append(button('Historial','btn-small',()=>showDetails(r.id)));tbody.append(tr);});
    if(!list.length)emptyRow(tbody,8,'No hay saldos pendientes.');
  }
  function renderActivities() {
    const tbody=$('activity-rows');if(!tbody)return;tbody.replaceChildren();
    data.activities.forEach(a=>{
      const tr=document.createElement('tr');
      addCell(tr,`#${a.id}`);addCell(tr,`${a.nombre} · ${typeNames[a.tipo]||a.tipo}`);
      addCell(tr,a.fechaFin?`${date(a.fechaInicio)} – ${date(a.fechaFin)}`:date(a.fechaInicio));
      addCell(tr,money(a.precio));addCell(tr,a.cupoMaximo);addCell(tr,a.inscritos);addCell(tr,a.cuposDisponibles);addCell(tr,stateLabel(a.estado));
      const td=addCell(tr,'');td.className='actions-cell';
      td.append(button('Editar','btn-small gold',()=>editActivity(a)));
      td.append(button('Limpiar participantes','btn-small danger',()=>clearActivityRegistrations(a),false,'Borra inscripciones y pagos de esta actividad; la actividad permanece.'));
      td.append(button('Eliminar actividad','btn-small danger',()=>deleteActivity(a),false,'Permite conservar el historial o borrarlo expresamente.'));
      tbody.append(tr);
    });
    if(!data.activities.length)emptyRow(tbody,9,'Todavía no hay actividades. Puedes crear la primera con el formulario.');
  }
  function fillActivitySelect() {
    const select=$('new-activity'); if(!select)return; const current=select.value; select.replaceChildren();
    const initial=document.createElement('option');initial.value='';initial.textContent='Selecciona una actividad';select.append(initial);
    data.activities.forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=`#${a.id} · ${a.nombre} · ${date(a.fechaInicio)} · ${a.cuposDisponibles} cupos · ${stateLabel(a.estado)}`;if(a.estado!=='ACTIVA'||Number(a.cuposDisponibles)<=0)o.disabled=true;select.append(o);});
    if ([...select.options].some(o=>o.value===current&&!o.disabled))select.value=current;
    updateCampFields();
  }
  function openDialog(id) { const d=$(id); if(d.open || d.hasAttribute('open')) return; if(typeof d.showModal==='function')d.showModal(); else d.setAttribute('open','open'); }
  function closeDialog(id) { const d=$(id); if(typeof d.close==='function')d.close(); else d.removeAttribute('open'); }
  function setText(el, value) { el.textContent = value ?? '—'; }
  function showDetails(id) {
    const r=data.registrations.find(x=>Number(x.id)===Number(id));if(!r)return;data.selected=r;
    $('detail-title').textContent=`Ficha de inscripción #${r.id}`;
    const items=[['Actividad',r.actividadNombre],['Tipo',typeNames[r.actividadTipo]||r.actividadTipo],['Fecha',date(r.fechaInicio)+(r.fechaFin?` – ${date(r.fechaFin)}`:'')],['Lugar',r.ubicacion],['Estado de actividad',stateLabel(r.estadoActividad)],['Participante',participant(r)],['Identificación',r.identificacion],['Edad',r.edad],['Teléfono',r.telefono],['Provincia',r.provincia],['Cantón',r.canton],['Localidad',r.localidad],['Iglesia',r.iglesia],['Encargado legal',r.nombreEncargadoLegal],['Estado de inscripción',stateLabel(r.estado)],['Permiso firmado',Number(r.edad)<18?(r.permisoRecibido?'Recibido':'Pendiente'):'No requerido'],['Contacto de emergencia',r.contactoEmergenciaNombre],['Teléfono de emergencia',r.contactoEmergenciaTelefono],['Parentesco',r.contactoEmergenciaParentesco],['Padecimientos / alergias',r.padecimientos],['Condiciones de participación',r.condicionesParticipacion],['Medicamentos e instrucciones',r.medicamentos],['Talla de camisa',r.tallaCamisa],['Dirección completa',r.direccionCompleta],['Costo general de actividad',money(r.precioActividad)],['Costo para esta inscripción',money(r.precioInscripcion)],['Total pagado',money(r.totalPagado)],['Saldo pendiente',money(r.saldoPendiente)],['Estado de pago',r.estadoPago],['Descripción de actividad',r.actividadDescripcion]];
    const container=$('detail-content');container.replaceChildren();const dl=document.createElement('dl');dl.className='detail-grid';items.forEach(([label,value])=>{const wrap=document.createElement('div');wrap.className='detail-item';const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=(value===null||value===undefined||value==='')?'No indicado':String(value);wrap.append(dt,dd);dl.append(wrap);});container.append(dl);
    const h=document.createElement('section');h.className='payments-history';h.innerHTML='<h3>Historial de pagos</h3><p>Cargando historial…</p>';container.append(h);
    request(`/api/admin/inscripciones/${id}/pagos`).then(rows=>{h.replaceChildren();const title=document.createElement('h3');title.textContent='Historial de pagos';h.append(title);if(!rows.length){const p=document.createElement('p');p.textContent='No hay pagos registrados.';h.append(p);return;}const table=document.createElement('table');table.className='admin-table';const head=document.createElement('thead');head.innerHTML='<tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Observaciones</th></tr>';table.append(head);const body=document.createElement('tbody');rows.forEach(p=>{const tr=document.createElement('tr');addCell(tr,p.fechaPago?date(String(p.fechaPago).slice(0,10)):'—');addCell(tr,money(p.monto));addCell(tr,paymentNames[p.metodo]||p.metodo);addCell(tr,p.referencia);addCell(tr,p.observaciones);body.append(tr);});table.append(body);h.append(table);}).catch(e=>{h.replaceChildren();const p=document.createElement('p');p.className='admin-error-text';p.textContent='No se pudo cargar el historial: '+e.message;h.append(p);});
    $('detail-edit').onclick=()=>{closeDialog('detail-dialog');openEdit(id);};$('detail-history').onclick=()=>showDetails(id);openDialog('detail-dialog');
  }
  function field(id,value){if($(id))$(id).value=value??'';}
  function openEdit(id) {
    const r=data.registrations.find(x=>Number(x.id)===Number(id));if(!r)return;data.selected=r;hideMessage('edit-message');
    const map={ 'edit-id':r.id,'edit-identificacion':r.identificacion,'edit-nombre':r.nombre,'edit-apellidos':r.apellidos,'edit-edad':r.edad,'edit-telefono':r.telefono,'edit-provincia':r.provincia,'edit-canton':r.canton,'edit-localidad':r.localidad,'edit-iglesia':r.iglesia,'edit-encargado':r.nombreEncargadoLegal,'edit-padecimientos':r.padecimientos,'edit-condiciones':r.condicionesParticipacion,'edit-medicamentos':r.medicamentos,'edit-talla':r.tallaCamisa,'edit-direccion':r.direccionCompleta,'edit-estado':r.estado,'edit-precio':r.precioAcordado };
    Object.entries(map).forEach(([k,v])=>field(k,v));$('edit-permiso').checked=Number(r.edad)<18&&Boolean(r.permisoRecibido);$('edit-permiso').disabled=Number(r.edad)>=18;$('edit-encargado').required=Number(r.edad)<18;openDialog('edit-dialog');
  }
  async function markPermission(id) { if(!confirm('¿Confirmas que el líder ya recibió y revisó el permiso firmado?'))return;try{const out=await request(`/api/admin/inscripciones/${id}/permiso`,{method:'POST'});message('global-message',out.mensaje||'Permiso actualizado.','success');await loadAll();}catch(e){message('global-message','No se pudo actualizar el permiso: '+e.message,'error');} }
  async function confirmRegistration(id) { if(!confirm('¿Confirmas esta inscripción? Revisa primero los datos y los permisos.'))return;try{const out=await request(`/api/admin/inscripciones/${id}/confirmar`,{method:'POST'});message('global-message',out.mensaje||'Inscripción confirmada.','success');await loadAll();}catch(e){message('global-message','No se pudo confirmar: '+e.message,'error');} }
  async function cancelRegistration(id) { if(!confirm('¿Cancelar esta inscripción? Los pagos registrados se conservarán en el historial.'))return;try{const out=await request(`/api/admin/inscripciones/${id}/cancelar`,{method:'POST'});message('global-message',out.mensaje||'Inscripción cancelada.','success');await loadAll();}catch(e){message('global-message','No se pudo cancelar: '+e.message,'error');} }
  async function deleteRegistration(id) { const r=data.registrations.find(x=>Number(x.id)===Number(id));if(!r)return;if(Number(r.totalPagado)>0){message('global-message','Esta inscripción tiene pagos registrados. Para conservar el historial financiero, utiliza Cancelar en lugar de eliminar.','error');return;}if(!confirm(`Vas a eliminar permanentemente la inscripción #${id} de ${participant(r)}. Si es su única inscripción, también se eliminarán la ficha y su contacto de emergencia. Esta acción no se puede deshacer. ¿Deseas continuar?`))return;try{const out=await request(`/api/admin/inscripciones/${id}`,{method:'DELETE'});message('global-message',out.mensaje||'Inscripción eliminada.','success');await loadAll();}catch(e){message('global-message','No se pudo eliminar: '+e.message,'error');} }
  function payStatus(r) { const cost = Number(r.precioInscripcion) || 0; if (cost <= 0) return 'Sin costo'; return Number(r.saldoPendiente) <= 0 ? 'Pago completo' : `Saldo pendiente ${money(r.saldoPendiente)}`; }
  function stateRules(r) {
    const minor = Number(r.edad) < 18, permit = Boolean(r.permisoRecibido);
    return {
      PENDIENTE_PERMISO: minor && !permit ? '' : (minor ? 'El permiso ya fue recibido.' : 'Solo aplica a menores de edad.'),
      PENDIENTE: !minor || permit ? '' : 'Falta el permiso firmado.',
      CONFIRMADA: !minor || permit ? '' : 'Falta el permiso firmado.',
      CANCELADA: '', RECHAZADA: ''
    };
  }
  function updateStateHint() {
    const r = data.registrations.find(x => Number(x.id) === Number($('state-registration-id').value)); if (!r) return;
    const rules = stateRules(r), reasons = [];
    [...$('state-select').options].forEach(o => { o.disabled = Boolean(rules[o.value]) && o.value !== r.estado; if (rules[o.value]) reasons.push(`${stateLabel(o.value)}: ${rules[o.value]}`); });
    $('state-hint').textContent = reasons.length ? 'No disponibles — ' + reasons.join(' · ') : 'Todos los estados están disponibles.';
  }
  function openState(id) {
    const r = data.registrations.find(x => Number(x.id) === Number(id)); if (!r) return;
    field('state-registration-id', r.id); hideMessage('state-message');
    const permit = Number(r.edad) < 18 ? (r.permisoRecibido ? 'permiso recibido' : 'permiso pendiente') : 'mayor de edad';
    $('state-summary').textContent = `#${r.id} · ${participant(r)} · ${r.actividadNombre} · Estado actual: ${stateLabel(r.estado)} · ${payStatus(r)} · ${permit}`;
    $('state-select').value = r.estado; updateStateHint(); openDialog('state-dialog');
  }
  function openPayment(id) { const r=data.registrations.find(x=>Number(x.id)===Number(id));if(!r)return;field('payment-registration-id',r.id);field('payment-amount','');field('payment-reference','');field('payment-notes','');$('payment-method').value='SINPE_MOVIL';$('payment-summary').textContent=`${participant(r)} · ${r.actividadNombre} · Saldo pendiente: ${money(r.saldoPendiente)}`;hideMessage('payment-message');$('payment-amount').max=String(Number(r.saldoPendiente)||0);openDialog('payment-dialog'); }
  const idKey = v => String(v ?? '').trim().replace(/\s+/g, '').toUpperCase();
  function regsOfPerson(r) { const k = idKey(r.identificacion); return data.registrations.filter(x => idKey(x.identificacion) === k); }
  function regsOfActivity(a) {
    return data.registrations.filter(x => x.actividadId !== undefined && x.actividadId !== null
      ? Number(x.actividadId) === Number(a.id)
      : x.actividadNombre === a.nombre && String(x.fechaInicio || '').slice(0, 10) === String(a.fechaInicio || '').slice(0, 10));
  }
  async function deletePerson(id) {
    const r = data.registrations.find(x => Number(x.id) === Number(id)); if (!r) return;
    const regs = regsOfPerson(r); const paid = regs.reduce((s, x) => s + (Number(x.totalPagado) || 0), 0);
    if (paid > 0) { message('global-message', `No se puede eliminar a ${participant(r)}: sus inscripciones tienen pagos registrados por ${money(paid)}. Para conservar el historial financiero, cancela las inscripciones en lugar de eliminarlas.`, 'error'); return; }
    if (!confirm(`Vas a eliminar permanentemente a ${participant(r)} (${r.identificacion}), su ficha, su contacto de emergencia y sus ${regs.length} inscripción(es). Esta acción no se puede deshacer. ¿Deseas continuar?`)) return;
    let done = 0;
    try {
      for (const x of regs) { await request(`/api/admin/inscripciones/${x.id}`, { method: 'DELETE' }); done++; }
      message('global-message', `${participant(r)} fue eliminado(a) junto con ${done} inscripción(es).`, 'success');
    } catch (e) { message('global-message', `No se pudo completar la eliminación (${done} de ${regs.length} inscripciones eliminadas): ${e.message}`, 'error'); }
    try { await loadAll(); } catch (_) {}
  }
  async function deleteActivity(a) {
    const regs = regsOfActivity(a);
    const paid = regs.reduce((sum, r) => sum + (Number(r.totalPagado) || 0), 0);
    if (!regs.length) {
      if (!confirm(`¿Eliminar definitivamente la actividad «${a.nombre}»? No tiene inscripciones asociadas. Esta acción no se puede deshacer.`)) return;
      try {
        const out = await request(`/api/admin/actividades/${a.id}`, { method: 'DELETE' });
        message('activity-form-message', out.mensaje || 'Actividad eliminada.', 'success');
        if (String($('activity-id').value) === String(a.id)) resetActivityForm();
      } catch (e) { message('activity-form-message', `No se pudo eliminar la actividad: ${e.message}`, 'error'); }
      try { await loadAll(); } catch (_) {}
      return;
    }

    const choice = prompt(
      `La actividad «${a.nombre}» tiene ${regs.length} inscripción(es) y ${money(paid)} en pagos registrados.\n\n` +
      `Escribe una opción exacta:\n` +
      `CONSERVAR = mantener todas las inscripciones y pagos, y ocultar la actividad de la web.\n` +
      `BORRAR TODO = eliminar definitivamente la actividad, sus inscripciones y los pagos asociados.\n\n` +
      `No se borrará nada si cierras o cancelas este cuadro.`
    );
    if (choice === null) return;
    const selected = choice.trim().toUpperCase();
    if (selected === 'CONSERVAR') {
      const statusInput = prompt('Para conservar el historial, ¿qué estado querés poner? Escribe CANCELADA o FINALIZADA:', 'FINALIZADA');
      if (statusInput === null) return;
      const estado = statusInput.trim().toUpperCase();
      if (!['CANCELADA', 'FINALIZADA'].includes(estado)) {
        message('activity-form-message', 'Estado no válido. Escribe CANCELADA o FINALIZADA.', 'error'); return;
      }
      try {
        const out = await request(`/api/admin/actividades/${a.id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) });
        message('activity-form-message', out.mensaje || `Actividad marcada como ${estado}. El historial se conserva.`, 'success');
      } catch (e) { message('activity-form-message', `No se pudo cambiar el estado: ${e.message}`, 'error'); }
    } else if (selected === 'BORRAR TODO') {
      const typed = prompt(`CONFIRMACIÓN FINAL\n\nSe borrarán ${regs.length} inscripción(es) y sus pagos (total actualmente registrado: ${money(paid)}), junto con la actividad «${a.nombre}». No hay forma de deshacerlo desde el panel.\n\nEscribe BORRAR DEFINITIVAMENTE para confirmar:`);
      if (typed === null || typed.trim().toUpperCase() !== 'BORRAR DEFINITIVAMENTE') return;
      const deleteOrphans = confirm('¿También eliminar las fichas personales y contactos de emergencia de las personas que, después de esta limpieza, ya no tengan ninguna otra inscripción? Pulsa Cancelar para conservar esas fichas.');
      try {
        const query = `?eliminarRegistros=true&eliminarFichasSinOtrasInscripciones=${deleteOrphans}`;
        const out = await request(`/api/admin/actividades/${a.id}${query}`, { method: 'DELETE' });
        message('activity-form-message', `${out.mensaje || 'Actividad eliminada.'} Inscripciones eliminadas: ${out.inscripcionesEliminadas ?? regs.length}; pagos eliminados: ${out.pagosEliminados ?? 'ver respuesta'}; fichas eliminadas: ${out.fichasEliminadas ?? 0}.`, 'success');
        if (String($('activity-id').value) === String(a.id)) resetActivityForm();
      } catch (e) { message('activity-form-message', `No se pudo completar la eliminación: ${e.message}`, 'error'); }
    } else {
      message('activity-form-message', 'Operación cancelada. Escribe CONSERVAR o BORRAR TODO para seleccionar una opción.', 'info');
    }
    try { await loadAll(); } catch (_) {}
  }

  async function clearActivityRegistrations(a) {
    if (!['CANCELADA', 'FINALIZADA'].includes(a.estado)) {
      message('activity-form-message', `Por seguridad, primero marcá «${a.nombre}» como CANCELADA o FINALIZADA antes de limpiar sus participantes y pagos.`, 'error');
      return;
    }
    const regs = regsOfActivity(a);
    if (!regs.length) { message('activity-form-message', `La actividad «${a.nombre}» no tiene inscripciones para limpiar.`, 'info'); return; }
    const paymentsTotal = regs.reduce((sum, r) => sum + (Number(r.totalPagado) || 0), 0);
    const typed = prompt(
      `LIMPIAR PARTICIPANTES DE «${a.nombre}»\n\n` +
      `Inscripciones que se eliminarán: ${regs.length}\n` +
      `Pagos/abonos que se eliminarán: ${money(paymentsTotal)}\n\n` +
      `La actividad se conservará, pero se borrarán de forma permanente las inscripciones y sus pagos relacionados.\n` +
      `Escribe LIMPIAR para continuar:`
    );
    if (typed === null || typed.trim().toUpperCase() !== 'LIMPIAR') return;
    const deleteOrphans = confirm('¿También eliminar las fichas personales y contactos de emergencia de las personas que ya no tengan ninguna otra inscripción? Pulsa Cancelar para conservar sus fichas.');
    try {
      const out = await request(`/api/admin/actividades/${a.id}/inscripciones?eliminarFichasSinOtrasInscripciones=${deleteOrphans}`, { method: 'DELETE' });
      message('global-message', `${out.mensaje || 'Limpieza completada.'} Inscripciones eliminadas: ${out.inscripcionesEliminadas ?? 0}; pagos eliminados: ${out.pagosEliminados ?? 0}; fichas eliminadas: ${out.fichasEliminadas ?? 0}.`, 'success');
      if (String($('activity-id').value) === String(a.id)) resetActivityForm();
    } catch (e) { message('activity-form-message', `No se pudo limpiar la actividad: ${e.message}`, 'error'); }
    try { await loadAll(); } catch (_) {}
  }
  function activityPayload() { return { nombre:$('activity-name').value.trim(),tipo:$('activity-type').value,descripcion:$('activity-description').value.trim(),fechaInicio:$('activity-start').value,fechaFin:$('activity-end').value||null,ubicacion:$('activity-location').value.trim(),precio:Number($('activity-price').value),cupoMaximo:Number($('activity-capacity').value),estado:$('activity-state').value }; }
  function editActivity(a) { field('activity-id',a.id);field('activity-name',a.nombre);field('activity-type',a.tipo);field('activity-start',a.fechaInicio);field('activity-end',a.fechaFin);field('activity-location',a.ubicacion);field('activity-price',a.precio);field('activity-capacity',a.cupoMaximo);field('activity-state',a.estado);field('activity-description',a.descripcion);$('activity-form-title').textContent=`Editar actividad #${a.id}`;$('activity-save').textContent='Guardar cambios';hideMessage('activity-form-message');setView('actividades');window.scrollTo({top:0,behavior:'smooth'}); }
  function resetActivityForm() { $('activity-form').reset();field('activity-id','');$('activity-form-title').textContent='Agregar actividad nueva';$('activity-save').textContent='Crear actividad';hideMessage('activity-form-message'); }
  function updateCampFields() {const activity=data.activities.find(a=>String(a.id)===$('new-activity').value);const camp=activity&&activity.tipo==='CAMPAMENTO';$('new-camp-fields').classList.toggle('admin-hidden',!camp);$('new-talla').required=Boolean(camp);$('new-direccion').required=Boolean(camp);$('new-talla').disabled=!camp;$('new-direccion').disabled=!camp;if(!camp){$('new-talla').value='';$('new-direccion').value='';}}

  $('login-btn').addEventListener('click', async () => {
    data.key=$('admin-key').value.trim();if(!data.key){message('login-message','Escribe la clave administrativa.','error');return;}
    $('login-btn').disabled=true;
    try{await loadAll();$('login-card').classList.add('admin-hidden');$('dashboard').classList.remove('admin-hidden');hideMessage('global-message');}
    catch(e){message('login-message','No se pudo ingresar o cargar el sistema: '+e.message,'error');data.key='';}
    finally{$('login-btn').disabled=false;}
  });
  $('logout-btn').addEventListener('click',()=>{data.key='';data.activities=[];data.registrations=[];$('admin-key').value='';$('dashboard').classList.add('admin-hidden');$('login-card').classList.remove('admin-hidden');hideMessage('global-message');});
  document.querySelectorAll('.admin-nav-btn[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.goto)));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.close)));
  $('refresh-btn').addEventListener('click',async()=>{try{await loadAll();message('global-message','Datos actualizados.','success');}catch(e){message('global-message',e.message,'error');}});
  $('registration-search').addEventListener('input',renderRegistrations);$('registration-filter').addEventListener('change',renderRegistrations);$('clear-filters').addEventListener('click',()=>{field('registration-search','');field('registration-filter','TODOS');renderRegistrations();});
  $('new-activity').addEventListener('change',updateCampFields);$('new-edad').addEventListener('input',()=>{$('new-encargado').required=Number($('new-edad').value)<18;});
  $('create-registration-form').addEventListener('submit',async e=>{
    e.preventDefault();hideMessage('create-registration-message');const edad=Number($('new-edad').value);if(edad<18&&!$('new-encargado').value.trim()){message('create-registration-message','Para menores de 18 años, el nombre del encargado legal es obligatorio.','error');return;}
    const payload={actividadId:Number($('new-activity').value),identificacion:$('new-identificacion').value.trim(),nombre:$('new-nombre').value.trim(),apellidos:$('new-apellidos').value.trim(),edad,telefono:$('new-telefono').value.trim(),provincia:$('new-provincia').value.trim(),canton:$('new-canton').value.trim(),localidad:$('new-localidad').value.trim(),iglesia:$('new-iglesia').value.trim(),nombreEncargadoLegal:$('new-encargado').value.trim(),padecimientos:$('new-padecimientos').value.trim(),condicionesParticipacion:$('new-condiciones').value.trim(),medicamentos:$('new-medicamentos').value.trim(),tallaCamisa:$('new-talla').value,direccionCompleta:$('new-direccion').value.trim(),contactoEmergenciaNombre:$('new-contacto-nombre').value.trim(),contactoEmergenciaTelefono:$('new-contacto-telefono').value.trim(),contactoEmergenciaParentesco:$('new-contacto-parentesco').value.trim(),aceptaTratamientoDatos:$('new-consent').checked};
    try{const out=await request('/api/admin/inscripciones',{method:'POST',body:JSON.stringify(payload)});message('create-registration-message',`${out.mensaje||'Inscripción creada.'} ${out.aviso||''} Número: #${out.idInscripcion||'registrado'}.`,'success');$('create-registration-form').reset();$('new-provincia').value='Puntarenas';updateCampFields();await loadAll();message('global-message','Persona e inscripción registradas correctamente.','success');setView('inscripciones');}
    catch(err){message('create-registration-message','No se pudo registrar: '+err.message,'error');}
  });
  $('edit-edad').addEventListener('input',()=>{const minor=Number($('edit-edad').value)<18;$('edit-encargado').required=minor;$('edit-permiso').disabled=!minor;if(!minor){$('edit-permiso').checked=false;if($('edit-estado').value==='PENDIENTE_PERMISO')$('edit-estado').value='PENDIENTE';}else if(!$('edit-permiso').checked&&$('edit-estado').value==='PENDIENTE')$('edit-estado').value='PENDIENTE_PERMISO';});
  $('edit-form').addEventListener('submit',async e=>{
    e.preventDefault();hideMessage('edit-message');const id=$('edit-id').value;const age=Number($('edit-edad').value);const permit=$('edit-permiso').checked;let state=$('edit-estado').value;
    if(age<18&&!permit&&state==='PENDIENTE')state='PENDIENTE_PERMISO';
    const p=$('edit-precio').value.trim();if(p!==''&&(!Number.isFinite(Number(p))||Number(p)<0||Number(p)>10000000)){message('edit-message','El costo individual debe estar entre ₡0 y ₡10 000 000.','error');return;}const payload={identificacion:$('edit-identificacion').value.trim(),nombre:$('edit-nombre').value.trim(),apellidos:$('edit-apellidos').value.trim(),edad:age,telefono:$('edit-telefono').value.trim(),provincia:$('edit-provincia').value.trim(),canton:$('edit-canton').value.trim(),localidad:$('edit-localidad').value.trim(),iglesia:$('edit-iglesia').value.trim(),nombreEncargadoLegal:$('edit-encargado').value.trim(),padecimientos:$('edit-padecimientos').value.trim(),condicionesParticipacion:$('edit-condiciones').value.trim(),medicamentos:$('edit-medicamentos').value.trim(),tallaCamisa:$('edit-talla').value.trim(),direccionCompleta:$('edit-direccion').value.trim(),contactoEmergenciaNombre:$('edit-contacto-nombre').value.trim(),contactoEmergenciaTelefono:$('edit-contacto-telefono').value.trim(),contactoEmergenciaParentesco:$('edit-contacto-parentesco').value.trim(),estado:state,permisoRecibido:permit,precioAcordado:p===''?null:Number(p)};
    try{const out=await request(`/api/admin/inscripciones/${id}`,{method:'PUT',body:JSON.stringify(payload)});closeDialog('edit-dialog');message('global-message',out.mensaje||'Ficha actualizada.','success');await loadAll();}
    catch(err){message('edit-message','No se pudo guardar: '+err.message,'error');}
  });
  $('payment-form').addEventListener('submit',async e=>{e.preventDefault();hideMessage('payment-message');const id=$('payment-registration-id').value;const monto=Number($('payment-amount').value);const maxPermitido=Math.min(10000000,Number($('payment-amount').max)||10000000);if(!Number.isFinite(monto)||monto<=0||monto>maxPermitido){message('payment-message',`El abono debe ser mayor que ₡0 y no superar el saldo pendiente ni ₡10 000 000 (${money(maxPermitido)}).`,'error');return;}const payload={monto,metodo:$('payment-method').value,referencia:$('payment-reference').value.trim(),observaciones:$('payment-notes').value.trim()};try{const out=await request(`/api/admin/inscripciones/${id}/pagos`,{method:'POST',body:JSON.stringify(payload)});closeDialog('payment-dialog');message('global-message',out.mensaje||'Pago registrado.','success');await loadAll();const upd=data.registrations.find(x=>Number(x.id)===Number(id));if(upd&&Number(upd.saldoPendiente)<=0&&!['CANCELADA','RECHAZADA','CONFIRMADA'].includes(upd.estado)&&confirm(`El pago de ${participant(upd)} quedó completo. ¿Quieres cambiar el estado de la inscripción ahora?`))openState(id);}catch(err){message('payment-message','No se pudo registrar el pago: '+err.message,'error');}});
  $('state-form').addEventListener('submit', async e => {
    e.preventDefault(); hideMessage('state-message');
    const id = $('state-registration-id').value, estado = $('state-select').value;
    try {
      const out = await request(`/api/admin/inscripciones/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) });
      closeDialog('state-dialog'); message('global-message', out.mensaje || 'Estado actualizado.', 'success'); await loadAll();
    } catch (err) {
      message('state-message', err.status === 405 || err.status === 404 ? 'La API en ejecución no incluye el cambio de estado. Detenla y vuelve a iniciarla con la versión actualizada.' : 'No se pudo cambiar el estado: ' + err.message, 'error');
    }
  });
  $('activity-reset').addEventListener('click',resetActivityForm);$('activities-refresh').addEventListener('click',async()=>{try{await loadAll();message('global-message','Agenda actualizada.','success');}catch(e){message('global-message',e.message,'error');}});
  $('activity-form').addEventListener('submit',async e=>{e.preventDefault();hideMessage('activity-form-message');const id=$('activity-id').value;const payload=activityPayload();if(!Number.isFinite(payload.precio)||payload.precio<0||payload.precio>10000000){message('activity-form-message','El precio debe estar entre ₡0 y ₡10 000 000.','error');return;}if(!Number.isInteger(payload.cupoMaximo)||payload.cupoMaximo<1||payload.cupoMaximo>2000){message('activity-form-message','El cupo debe ser un número entero entre 1 y 2 000 personas.','error');return;}if(payload.fechaFin&&payload.fechaFin<payload.fechaInicio){message('activity-form-message','La fecha de fin no puede ser anterior a la fecha de inicio.','error');return;}if(!confirm(id?'¿Guardar los cambios de esta actividad?':'¿Crear esta nueva actividad?'))return;try{const out=await request(id?`/api/admin/actividades/${id}`:'/api/admin/actividades',{method:id?'PUT':'POST',body:JSON.stringify(payload)});message('activity-form-message',out.mensaje||(id?'Actividad actualizada.':'Actividad creada.'),'success');resetActivityForm();await loadAll();}catch(err){message('activity-form-message','No se pudo guardar la actividad: '+err.message,'error');}});
})();
