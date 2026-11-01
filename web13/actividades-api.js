(() => {
 const API=window.CCTA_API_BASE_URL||'http://localhost:8080';
 const list=document.querySelector('#activity-list'), status=document.querySelector('#activity-api-status'), empty=document.querySelector('#no-activities');
 if(!list||!status||!empty)return;
 const money=n=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0}).format(Number(n||0));
 const date=d=>d?new Date(`${d}T12:00:00`).toLocaleDateString('es-CR',{day:'numeric',month:'long',year:'numeric'}):'Fecha por confirmar';
 const typeName=t=>({CAMPAMENTO:'Campamento',CONGRESO:'Congreso',RETIRO:'Retiro',OTRO:'Actividad especial'}[String(t||'').toUpperCase()]||'Actividad de la iglesia');
 function metaItem(icon,label,value){const item=document.createElement('div');item.className='activity-api-meta-item';const symbol=document.createElement('span');symbol.className='activity-api-icon';symbol.setAttribute('aria-hidden','true');symbol.textContent=icon;const text=document.createElement('div');text.className='activity-api-meta-copy';const caption=document.createElement('span');caption.className='activity-api-meta-label';caption.textContent=label;const content=document.createElement('strong');content.textContent=value;text.append(caption,content);item.append(symbol,text);return item;}
 function card(a){
  const article=document.createElement('article');article.className='activity-api-card';
  const info=document.createElement('div');info.className='activity-api-main';
  const type=document.createElement('span');type.className='activity-api-type';type.textContent=typeName(a.tipo);
  const h=document.createElement('h2');h.textContent=a.nombre;
  const desc=document.createElement('p');desc.className='activity-api-description';desc.textContent=a.descripcion||'Próxima actividad de nuestra iglesia.';
  info.append(type,h,desc);
  const meta=document.createElement('div');meta.className='activity-api-meta';
  meta.append(metaItem('◷','Fecha',date(a.fechaInicio)),metaItem('⌖','Lugar',a.ubicacion||'Por confirmar'),metaItem('₡','Aporte',money(a.precio)));
  const slots=document.createElement('span');slots.className='activity-api-slots';slots.textContent=`${Number(a.cuposDisponibles)||0} cupos disponibles`;meta.append(slots);
  const action=document.createElement('div');action.className='activity-api-action';
  if(Number(a.cuposDisponibles)>0&&a.estado==='ACTIVA'){
   const link=document.createElement('a');link.className='btn btn-gold';link.href=`inscripciones.html?actividad=${encodeURIComponent(a.id)}`;link.textContent='Inscribirme';
   const note=document.createElement('span');note.className='activity-api-action-note';note.textContent='Formulario individual';action.append(link,note);
  }else{
   const tag=document.createElement('span');tag.className='activity-api-closed';tag.textContent='Inscripción cerrada o sin cupo';action.append(tag);
  }
  article.append(info,meta,action);return article;
 }
 async function load(){try{
  const r=await fetch(`${API}/api/actividades`,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const activities=await r.json();list.replaceChildren();
  status.hidden=true;
  if(!activities.length){empty.hidden=false;return;}
  empty.hidden=true;activities.forEach(a=>list.append(card(a)));
 }catch(e){status.hidden=false;status.textContent='No se pudo cargar la agenda en este momento. Intentá de nuevo más tarde.';status.dataset.state='error';empty.hidden=true;}}
 load();
})();
