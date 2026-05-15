'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Theme='light'|'dark'
type View='dashboard'|'kanban'|'tickets'|'users'|'kb'|'config'|'detail'
interface CatSubcategoria{label:string;peticiones:string[]}
interface CatCategoria{label:string;subcategorias:CatSubcategoria[]}
interface MotivoCierre{key:string;label:string;color:string}
interface AgentStatus{key:string;label:string;color?:string;level?:string}
interface Agent{email:string;nombre:string;agent_status:string;agent_status_detail?:string;agent_status_updated_at?:string;ultimo_acceso?:string}
interface Ticket{id:string;usuario_email:string;area:string;asunto:string;descripcion:string;estado:string;prioridad:string;tecnico_asignado:string;fecha_creacion:string;fecha_actualizacion:string;respuesta_tecnico:string;categoria:string;subcategoria:string;servicio:string;updated_by_user:boolean;rating:number;evidencias_json:any[];motivo_cierre:string}
interface User{id:string;email:string;nombre:string;rol:string;estado:string;agent_status:string;ultimo_acceso:string}
interface KbItem{id:string;titulo:string;categoria:string;contenido:string;activo:boolean;autor:string}
interface Session{token:string;email:string;rol:string;last_active:string;expires_at:string}

const KANBAN_COLS=[{key:'abierto',label:'Abierto',color:'#3b82f6'},{key:'asignado',label:'Asignado',color:'#8b5cf6'},{key:'en_espera_recurso',label:'Espera recurso',color:'#f59e0b'},{key:'en_espera_confirmacion',label:'Espera confirm.',color:'#f97316'},{key:'resuelto',label:'Resuelto',color:'#10b981'}]
const STATE_LABELS:Record<string,string>={abierto:'Abierto',asignado:'Asignado',en_proceso:'En proceso',en_espera_recurso:'Espera recurso',en_espera_confirmacion:'Espera confirmación',resuelto:'Resuelto',cerrado:'Cerrado'}
const PRI_COLORS:Record<string,string>={CRITICA:'#ef4444',ALTA:'#f97316',MEDIA:'#3b82f6',BAJA:'#6b7280'}
function fmtDate(iso:string){if(!iso)return'—';try{return new Date(iso).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}catch{return iso}}

export default function HelpdeskPage(){
  const router=useRouter()
  const [theme,setTheme]=useState<Theme>('light')
  const [view,setView]=useState<View>('dashboard')
  const [prevView,setPrevView]=useState<View>('dashboard')
  const [token,setToken]=useState('')
  const [userEmail,setUserEmail]=useState('')
  const [userRol,setUserRol]=useState('')
  const [agentStatus,setAgentStatusState]=useState('disponible')
  const [agentDetail,setAgentDetail]=useState('')
  const [agentDetailDirty,setAgentDetailDirty]=useState(false)
  const [agents,setAgents]=useState<Agent[]>([])
  const [selectedAgent,setSelectedAgent]=useState<Agent|null>(null)
  const [agentStatuses,setAgentStatuses]=useState<AgentStatus[]>([{key:'disponible',label:'Disponible',color:'#10b981',level:'INFO'},{key:'ocupado',label:'Ocupado',color:'#f59e0b',level:'MEDIA'},{key:'ausente',label:'Ausente',color:'#6b7280',level:'BAJA'}])
  const [stats,setStats]=useState({total:0,abiertos:0,en_proceso:0,resueltos:0,cerrados:0,sin_asignar:0})
  const [statsByArea,setStatsByArea]=useState<{area:string;count:number}[]>([])
  const [statsByEstado,setStatsByEstado]=useState<{estado:string;count:number;color:string}[]>([])
  const [recentTickets,setRecentTickets]=useState<Ticket[]>([])
  const [allTickets,setAllTickets]=useState<Ticket[]>([])
  const [currentTicket,setCurrentTicket]=useState<Ticket|null>(null)
  const [users,setUsers]=useState<User[]>([])
  const [sessions,setSessions]=useState<Session[]>([])
  const [kbItems,setKbItems]=useState<KbItem[]>([])
  const [features,setFeatures]=useState<Record<string,string>>({})
  const [catalogs,setCatalogs]=useState<Record<string,any>>({})
  const [loading,setLoading]=useState(false)
  const [msg,setMsg]=useState({text:'',kind:''})
  const [filterQ,setFilterQ]=useState('')
  const [filterEstado,setFilterEstado]=useState('')
  const [filterPri,setFilterPri]=useState('')
  const [ticketReply,setTicketReply]=useState('')
  const [ticketEstado,setTicketEstado]=useState('')
  const [ticketTecnico,setTicketTecnico]=useState('')
  const [motivoCierre,setMotivoCierre]=useState('')
  const [showCierreModal,setShowCierreModal]=useState(false)
  const [showHistory,setShowHistory]=useState(false)
  const [history,setHistory]=useState<any[]>([])
  const [selectedUser,setSelectedUser]=useState<User|null>(null)
  const [newUser,setNewUser]=useState({email:'',nombre:'',rol:'USUARIO'})
  const [kbSelected,setKbSelected]=useState<KbItem|null>(null)
  const [kbForm,setKbForm]=useState({titulo:'',categoria:'',contenido:''})
  const [uploadingFile,setUploadingFile]=useState(false)
  const [newStatusKey,setNewStatusKey]=useState('')
  const [newStatusLabel,setNewStatusLabel]=useState('')
  const [newStatusColor,setNewStatusColor]=useState('#6b7280')
  const [newStatusLevel,setNewStatusLevel]=useState('INFO')
  const [brandingName,setBrandingName]=useState('Helpdesk')
  const [brandingLogo,setBrandingLogo]=useState('')
  const [brandingColor,setBrandingColor]=useState('#3b82f6')
  const [brandingNameEdit,setBrandingNameEdit]=useState('')
  const [brandingColorEdit,setBrandingColorEdit]=useState('#3b82f6')
  const [uploadingLogo,setUploadingLogo]=useState(false)
  const [retentionDays,setRetentionDays]=useState(90)
  const [retentionDaysEdit,setRetentionDaysEdit]=useState(90)
  const [purgeStats,setPurgeStats]=useState<{pendingTickets:number;pendingFiles:number;lastPurgeAt:string|null;lastPurgeStats:any}>({pendingTickets:0,pendingFiles:0,lastPurgeAt:null,lastPurgeStats:null})
  const [purging,setPurging]=useState(false)
  const [clearOtpEmail,setClearOtpEmail]=useState('')
  const [catAreas,setCatAreas]=useState<string[]>([])
  const [catAlmacenes,setCatAlmacenes]=useState<string[]>([])
  const [catServicios,setCatServicios]=useState<string[]>([])
  const [catCascada,setCatCascada]=useState<CatCategoria[]>([])
  const [motivosCierre,setMotivosCierre]=useState<MotivoCierre[]>([])
  const [newArea,setNewArea]=useState('')
  const [newAlmacen,setNewAlmacen]=useState('')
  const [newServicio,setNewServicio]=useState('')
  const [newMotivo,setNewMotivo]=useState({key:'',label:'',color:'#6b7280'})
  const [newCatLabel,setNewCatLabel]=useState('')
  const [selectedCatEdit,setSelectedCatEdit]=useState('')
  const [newSubLabel,setNewSubLabel]=useState('')

  const d=theme==='dark'
  const bg=d?'#191919':'#f7f6f3'
  const surface=d?'#202020':'#ffffff'
  const border=d?'#2f2f2f':'#e5e4e0'
  const text=d?'#e5e4e0':'#191919'
  const muted=d?'#787774':'#9b9a97'
  const hover=d?'#2a2a2a':'#f0efec'

  useEffect(()=>{
    const stored=localStorage.getItem('theme') as Theme|null
    setTheme(stored??(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))
    // After SSO the token arrives as ?_sso=TOKEN in the URL — persist to localStorage
    const params=new URLSearchParams(window.location.search)
    const ssoToken=params.get('_sso')
    if(ssoToken){localStorage.setItem('auth_token',ssoToken);window.history.replaceState({},'','/helpdesk')}
    const t=ssoToken||localStorage.getItem('auth_token')
    if(!t){router.push('/login');return}
    fetch('/api/auth/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t})})
      .then(r=>r.json()).then(res=>{
        if(!res.ok){localStorage.removeItem('auth_token');router.push('/login');return}
        setToken(res.token??t);setUserEmail(res.email);setUserRol(res.rol)
        localStorage.setItem('auth_token',res.token??t)
      }).catch(()=>router.push('/login'))
  },[])

  useEffect(()=>{loadBranding()},[])
  useEffect(()=>{if(token){loadDashboard();loadCatalogs();loadFeatures();loadUsers();loadMyAgentInfo();loadAgents();loadPurgeInfo()}},[token])
  useEffect(()=>{if(!token)return;const t=setInterval(loadAgents,30000);return()=>clearInterval(t)},[token])

  const api=useCallback(async(path:string,method='GET',body?:any)=>{
    const res=await fetch(path,{method,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
    return res.json()
  },[token])

  function showMsg(text:string,kind:string){setMsg({text,kind});setTimeout(()=>setMsg({text:'',kind:''}),3000)}

  async function loadDashboard(){
    const[tRes,sRes]=await Promise.all([api('/api/tickets'),api('/api/tickets/stats')])
    if(tRes.ok){
      const tickets=tRes.tickets??[]
      setRecentTickets(tickets.slice(0,12))
      // Gráfica por área
      const areaMap:Record<string,number>={}
      tickets.forEach((t:Ticket)=>{if(t.area)areaMap[t.area]=(areaMap[t.area]??0)+1})
      setStatsByArea(Object.entries(areaMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([area,count])=>({area,count})))
      // Gráfica por estado
      const estadoColors:Record<string,string>={abierto:'#3b82f6',asignado:'#8b5cf6',en_espera_recurso:'#f59e0b',en_espera_confirmacion:'#f97316',resuelto:'#10b981',cerrado:'#6b7280',en_proceso:'#8b5cf6'}
      const estadoMap:Record<string,number>={}
      tickets.forEach((t:Ticket)=>{estadoMap[t.estado]=(estadoMap[t.estado]??0)+1})
      setStatsByEstado(Object.entries(estadoMap).map(([estado,count])=>({estado,count,color:estadoColors[estado]??'#6b7280'})))
    }
    if(sRes.ok)setStats(sRes.stats)
  }
  async function loadAllTickets(){
    setLoading(true);const p=new URLSearchParams()
    if(filterQ)p.set('q',filterQ);if(filterEstado)p.set('estado',filterEstado);if(filterPri)p.set('prioridad',filterPri)
    const res=await api(`/api/tickets?${p}`);if(res.ok)setAllTickets(res.tickets??[]);setLoading(false)
  }
  async function loadUsers(){const r=await api('/api/users');if(r.ok)setUsers(r.users??[])}
  async function loadSessions(){const r=await api('/api/admin/sessions');if(r.ok)setSessions(r.sessions??[])}
  async function loadKb(){const r=await api('/api/kb');if(r.ok)setKbItems(r.items??[])}
  async function loadFeatures(){const r=await api('/api/settings');if(r.ok)setFeatures(r.flags??{})}
  async function loadCatalogs(){
    const r=await api('/api/catalogs')
    if(r.ok){
      const c=r.catalogs??{};setCatalogs(c)
      setCatAreas(c.areas??[]);setCatAlmacenes(c.almacenes??[]);setCatServicios(c.servicios??[])
      setCatCascada(c.categorias_cascada??[]);setMotivosCierre(c.motivos_cierre??[])
      if(c.agent_statuses)setAgentStatuses(c.agent_statuses)
    }
  }

  async function openTicket(id:string){
    const res=await api(`/api/tickets/${id}`)
    if(res.ok){setCurrentTicket(res.ticket);setTicketReply(res.ticket.respuesta_tecnico??'');setTicketEstado(res.ticket.estado);setTicketTecnico(res.ticket.tecnico_asignado??'');setPrevView(view);setView('detail')}
  }
  async function saveTicket(){
    if(!currentTicket)return;setLoading(true)
    const res=await api(`/api/tickets/${currentTicket.id}`,'PATCH',{estado:ticketEstado,tecnico_asignado:ticketTecnico,respuesta_tecnico:ticketReply})
    if(res.ok){setCurrentTicket(res.ticket);showMsg('✓ Guardado','ok')}else showMsg(`Error: ${res.error}`,'err')
    setLoading(false)
  }
  async function cerrarTicket(){
    if(!currentTicket||!motivoCierre){showMsg('Selecciona un motivo','err');return}
    const res=await api(`/api/tickets/${currentTicket.id}`,'PATCH',{estado:'cerrado',motivo_cierre:motivoCierre})
    if(res.ok){setCurrentTicket(res.ticket);setTicketEstado('cerrado');setShowCierreModal(false);showMsg('✓ Ticket cerrado','ok')}
    else showMsg(`Error: ${res.error}`,'err')
  }
  async function assignMe(){
    if(!currentTicket)return
    const res=await api(`/api/tickets/${currentTicket.id}/assign`,'POST')
    if(res.ok){setCurrentTicket(res.ticket);setTicketTecnico(userEmail);setTicketEstado('asignado')}
  }
  async function loadHistory(){
    if(!currentTicket)return
    const res=await api(`/api/tickets/${currentTicket.id}/history`)
    if(res.ok){setHistory(res.history??[]);setShowHistory(true)}
  }
  async function downloadPdf(){
    if(!currentTicket)return
    const res=await fetch(`/api/tickets/${currentTicket.id}/pdf`,{headers:{'Authorization':`Bearer ${token}`}})
    const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${currentTicket.id}-resolucion.html`;a.click();URL.revokeObjectURL(url)
  }
  async function exportCsv(){
    const p=new URLSearchParams();if(filterEstado)p.set('estado',filterEstado);if(filterPri)p.set('prioridad',filterPri)
    const res=await fetch(`/api/tickets/export?${p}`,{headers:{'Authorization':`Bearer ${token}`}})
    const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`tickets-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }
  async function uploadFile(file:File){
    if(!currentTicket)return;setUploadingFile(true)
    const fd=new FormData();fd.append('file',file);fd.append('ticketId',currentTicket.id)
    const res=await fetch('/api/files',{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd}).then(r=>r.json())
    if(res.ok)setCurrentTicket(prev=>prev?({...prev,evidencias_json:[...(prev.evidencias_json??[]),res.file]}):prev)
    setUploadingFile(false)
  }
  async function deleteFile(path:string){
    if(!currentTicket)return
    await api('/api/files','DELETE',{path,ticketId:currentTicket.id})
    setCurrentTicket(prev=>prev?({...prev,evidencias_json:(prev.evidencias_json??[]).filter((e:any)=>e.path!==path)}):prev)
  }
  async function createUser(){
    if(!newUser.email)return
    const res=await api('/api/users','POST',newUser)
    if(res.ok){loadUsers();setNewUser({email:'',nombre:'',rol:'USUARIO'});showMsg('Usuario creado','ok')}else showMsg(`Error: ${res.error}`,'err')
  }
  async function saveUser(){
    if(!selectedUser)return
    await api(`/api/users/${selectedUser.id}`,'PATCH',{rol:selectedUser.rol,estado:selectedUser.estado,nombre:selectedUser.nombre})
    loadUsers();setSelectedUser(null);showMsg('Usuario actualizado','ok')
  }
  async function clearOtp(){
    if(!clearOtpEmail)return
    const res=await api('/api/admin/clear-otp','POST',{email:clearOtpEmail})
    if(res.ok){showMsg(`OTP limpiado para ${clearOtpEmail}`,'ok');setClearOtpEmail('')}
  }
  async function killSession(t:string){await api('/api/admin/sessions','DELETE',{token:t});loadSessions()}
  async function saveKb(){
    const res=kbSelected?await api(`/api/kb/${kbSelected.id}`,'PATCH',kbForm):await api('/api/kb','POST',kbForm)
    if(res.ok){loadKb();setKbSelected(null);setKbForm({titulo:'',categoria:'',contenido:''});showMsg('Artículo guardado','ok')}
  }
  async function toggleKb(id:string,active:boolean){await api(`/api/kb/${id}/toggle`,'PATCH',{active:!active});loadKb()}
  async function toggleFlag(key:string){await api('/api/settings','PATCH',{key,value:String(features[key]!=='true')});loadFeatures()}
  async function setAgentStatus(status:string){
    await api('/api/users/agent-status','PATCH',{status})
    setAgentStatusState(status)
    loadAgents()
  }
  async function saveAgentDetail(){
    await api('/api/users/agent-status','PATCH',{detail:agentDetail})
    setAgentDetailDirty(false)
    showMsg('Detalle actualizado','ok')
    loadAgents()
  }
  async function loadAgents(){
    const r=await api('/api/users/agent-status')
    if(r.ok)setAgents((r.agents??[]).filter((a:Agent)=>a.email!==userEmail))
  }
  async function loadMyAgentInfo(){
    const r=await api('/api/users/me')
    if(r.ok&&r.user){
      setAgentStatusState(r.user.agent_status??'disponible')
      setAgentDetail(r.user.agent_status_detail??'')
    }
  }
  function getStatusInfo(key:string):AgentStatus{
    return agentStatuses.find(s=>s.key===key)??{key,label:key,color:'#6b7280',level:'INFO'}
  }
  async function loadBranding(){
    try{
      const r=await fetch('/api/branding').then(r=>r.json())
      if(r.ok){setBrandingName(r.name);setBrandingLogo(r.logoUrl);setBrandingColor(r.primaryColor);setBrandingNameEdit(r.name);setBrandingColorEdit(r.primaryColor);if(typeof document!=='undefined')document.title=r.name}
    }catch{}
  }
  async function saveBrandingName(){
    if(!brandingNameEdit.trim())return
    await api('/api/settings','PATCH',{key:'APP_NAME',value:brandingNameEdit.trim()})
    setBrandingName(brandingNameEdit.trim());document.title=brandingNameEdit.trim()
    showMsg('Nombre actualizado','ok')
  }
  async function saveBrandingColor(){
    await api('/api/settings','PATCH',{key:'APP_PRIMARY_COLOR',value:brandingColorEdit})
    setBrandingColor(brandingColorEdit);showMsg('Color actualizado','ok')
  }
  async function uploadLogo(file:File){
    setUploadingLogo(true)
    const fd=new FormData();fd.append('file',file)
    const r=await fetch('/api/branding/upload',{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd}).then(r=>r.json())
    if(r.ok){setBrandingLogo(r.url);showMsg('Logo subido','ok')}else showMsg(`Error: ${r.error}`,'err')
    setUploadingLogo(false)
  }
  async function removeLogo(){
    await fetch('/api/branding/upload',{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}})
    setBrandingLogo('');showMsg('Logo eliminado','ok')
  }
  async function loadPurgeInfo(){
    const r=await api('/api/admin/purge-attachments')
    if(r.ok){setPurgeStats({pendingTickets:r.pendingTickets,pendingFiles:r.pendingFiles,lastPurgeAt:r.lastPurgeAt,lastPurgeStats:r.lastPurgeStats});setRetentionDays(r.retentionDays);setRetentionDaysEdit(r.retentionDays)}
  }
  async function saveRetention(){
    if(retentionDaysEdit<1)return
    await api('/api/settings','PATCH',{key:'ATTACHMENT_RETENTION_DAYS',value:String(retentionDaysEdit)})
    setRetentionDays(retentionDaysEdit);showMsg('Retención actualizada','ok');loadPurgeInfo()
  }
  async function runPurge(){
    if(!confirm(`¿Purgar capturas de ${purgeStats.pendingTickets} tickets cerrados (${purgeStats.pendingFiles} archivos)?\n\nLos PDFs ya se enviaron por correo como respaldo.`))return
    setPurging(true)
    const r=await api('/api/admin/purge-attachments','POST')
    if(r.ok){showMsg(`✓ ${r.filesDeleted} archivos purgados de ${r.ticketsAffected} tickets`,'ok');loadPurgeInfo()}
    else showMsg(`Error: ${r.error}`,'err')
    setPurging(false)
  }
  async function saveCat(key:string,value:any){const res=await api('/api/catalogs/update','PATCH',{key,value});if(res.ok)showMsg('Guardado','ok');else showMsg('Error','err');loadCatalogs()}
  async function addToArr(key:string,item:string,arr:string[],setter:any,inputSetter:any){if(!item.trim())return;const u=[...arr,item.trim()];await saveCat(key,u);setter(u);inputSetter('')}
  async function removeFromArr(key:string,item:string,arr:string[],setter:any){const u=arr.filter(x=>x!==item);await saveCat(key,u);setter(u)}
  async function addAgentStatus(){
    if(!newStatusKey||!newStatusLabel)return
    const u=[...agentStatuses,{key:newStatusKey,label:newStatusLabel,color:newStatusColor,level:newStatusLevel}]
    await saveCat('agent_statuses',u);setAgentStatuses(u)
    setNewStatusKey('');setNewStatusLabel('');setNewStatusColor('#6b7280');setNewStatusLevel('INFO')
  }
  async function removeAgentStatus(key:string){
    if(key==='disponible')return
    const u=agentStatuses.filter(s=>s.key!==key)
    await saveCat('agent_statuses',u);setAgentStatuses(u)
  }
  async function addMotivoCierre(){if(!newMotivo.key||!newMotivo.label)return;const u=[...motivosCierre,{...newMotivo}];await saveCat('motivos_cierre',u);setMotivosCierre(u);setNewMotivo({key:'',label:'',color:'#6b7280'})}
  async function removeMotivoCierre(key:string){const u=motivosCierre.filter(m=>m.key!==key);await saveCat('motivos_cierre',u);setMotivosCierre(u)}
  async function addCat(){if(!newCatLabel.trim())return;const u=[...catCascada,{label:newCatLabel.trim(),subcategorias:[]}];await saveCat('categorias_cascada',u);setCatCascada(u);setNewCatLabel('')}
  async function removeCat(label:string){const u=catCascada.filter(c=>c.label!==label);await saveCat('categorias_cascada',u);setCatCascada(u)}
  async function addSub(){if(!selectedCatEdit||!newSubLabel.trim())return;const u=catCascada.map(c=>c.label===selectedCatEdit?{...c,subcategorias:[...c.subcategorias,{label:newSubLabel.trim(),peticiones:[]}]}:c);await saveCat('categorias_cascada',u);setCatCascada(u);setNewSubLabel('')}
  function toggleTheme(){const n=d?'light':'dark';setTheme(n as Theme);localStorage.setItem('theme',n)}
  function switchView(v:View){setView(v);if(v==='dashboard')loadDashboard();if(v==='kanban'||v==='tickets')loadAllTickets();if(v==='users'){loadUsers();loadSessions()}if(v==='kb')loadKb();if(v==='config'){loadFeatures();loadCatalogs()}}

  const inp:React.CSSProperties={width:'100%',padding:'8px 10px',borderRadius:'6px',fontSize:'13px',border:`1px solid ${border}`,background:d?'#2f2f2f':'#f7f6f3',color:text,outline:'none',boxSizing:'border-box'}
  const btn:React.CSSProperties={padding:'8px 16px',borderRadius:'6px',border:'none',fontSize:'12px',fontWeight:500,cursor:'pointer',background:d?'#fff':'#191919',color:d?'#191919':'#fff'}
  const btnSec:React.CSSProperties={padding:'8px 16px',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer',background:'transparent',color:muted,border:`1px solid ${border}`}
  const btnDanger:React.CSSProperties={...btnSec,color:'#ef4444',borderColor:'#ef4444'}
  const tag:React.CSSProperties={display:'inline-flex',alignItems:'center',gap:'4px',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',background:d?'#2f2f2f':'#f0efec',border:`1px solid ${border}`,margin:'0 4px 6px 0'}

  function Badge({label,color}:{label:string;color:string}){return<span style={{fontSize:'11px',fontWeight:500,padding:'2px 8px',borderRadius:'20px',background:color+'22',color}}>{label}</span>}
  function Msg2(){if(!msg.text)return null;const ok=msg.kind==='ok';return<div style={{padding:'8px 12px',borderRadius:'6px',fontSize:'12px',background:ok?(d?'#1a2d1a':'#f0fdf4'):(d?'#2d1a1a':'#fef2f2'),color:ok?'#10b981':'#ef4444',marginBottom:'12px'}}>{msg.text}</div>}
  function TH({cols}:{cols:string[]}){return<thead><tr style={{background:d?'#2f2f2f':'#f7f6f3'}}>{cols.map(h=><th key={h} style={{padding:'8px 12px',fontSize:'11px',fontWeight:500,color:muted,textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>}
  function TagList({items,onRemove}:{items:string[];onRemove:(i:string)=>void}){return<div style={{display:'flex',flexWrap:'wrap',marginBottom:'8px'}}>{items.map(item=><span key={item} style={tag}>{item}<button onClick={()=>onRemove(item)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'14px',padding:0,lineHeight:1,marginLeft:'4px'}}>×</button></span>)}</div>}
  function TicketRow({t,onClick}:{t:Ticket;onClick:()=>void}){return<tr onClick={onClick} style={{cursor:'pointer',borderBottom:`1px solid ${border}`}} onMouseEnter={e=>e.currentTarget.style.background=hover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><td style={{padding:'10px 12px',fontSize:'12px',fontWeight:500,color:muted,whiteSpace:'nowrap'}}>{t.id}</td><td style={{padding:'10px 12px',fontSize:'13px',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.asunto}</td><td style={{padding:'10px 12px',fontSize:'12px',color:muted,maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.usuario_email}</td><td style={{padding:'10px 12px'}}><Badge label={STATE_LABELS[t.estado]??t.estado} color={t.estado==='cerrado'?'#6b7280':t.estado==='resuelto'?'#10b981':'#3b82f6'}/></td><td style={{padding:'10px 12px'}}><Badge label={t.prioridad} color={PRI_COLORS[t.prioridad]??'#6b7280'}/></td><td style={{padding:'10px 12px',fontSize:'12px',color:muted}}>{t.tecnico_asignado?.split('@')[0]||'—'}</td><td style={{padding:'10px 12px',fontSize:'11px',color:muted,whiteSpace:'nowrap'}}>{fmtDate(t.fecha_creacion)}</td></tr>}

  const NAV=[{key:'dashboard',label:'Dashboard',icon:'◻'},{key:'kanban',label:'Kanban',icon:'⊞'},{key:'tickets',label:'Tickets',icon:'☰'},{key:'users',label:'Usuarios',icon:'◎'},{key:'kb',label:'KB',icon:'◈'},{key:'config',label:'Config',icon:'⚙'}]
  const helpdesk_users=users.filter(u=>['HELPDESK','ADMIN'].includes(u.rol))
  const maxArea=Math.max(...statsByArea.map(s=>s.count),1)

  return(
    <div style={{display:'flex',height:'100vh',background:bg,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:text}}>
      {/* Sidebar */}
      <div style={{width:'220px',background:surface,borderRight:`1px solid ${border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'20px 16px 16px',borderBottom:`1px solid ${border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {brandingLogo
              ?<img src={brandingLogo} alt="logo" style={{width:'28px',height:'28px',borderRadius:'6px',objectFit:'cover'}}/>
              :<div style={{width:'28px',height:'28px',borderRadius:'6px',background:brandingColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'#fff'}}>{brandingName.charAt(0).toUpperCase()}</div>
            }
            <span style={{fontSize:'13px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{brandingName}</span>
          </div>
        </div>
        <nav style={{flex:1,padding:'8px'}}>
          {NAV.map(item=>(
            <div key={item.key} onClick={()=>switchView(item.key as View)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',borderRadius:'6px',cursor:'pointer',marginBottom:'2px',fontSize:'13px',fontWeight:view===item.key?500:400,background:view===item.key?(d?'#2f2f2f':'#f0efec'):'transparent',color:view===item.key?text:muted}}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
        </nav>
        {/* Equipo en línea */}
        {agents.length>0&&<div style={{padding:'10px 16px',borderTop:`1px solid ${border}`}}>
          <div style={{fontSize:'10px',color:muted,marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:600}}>Equipo · {agents.length}</div>
          <div style={{display:'flex',flexDirection:'column',gap:'4px',maxHeight:'140px',overflowY:'auto'}}>
            {agents.slice(0,8).map(a=>{
              const s=getStatusInfo(a.agent_status)
              return<div key={a.email} onClick={()=>setSelectedAgent(a)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 8px',borderRadius:'6px',cursor:'pointer',transition:'background 0.15s'}} onMouseEnter={e=>e.currentTarget.style.background=hover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:s.color,flexShrink:0,boxShadow:`0 0 0 2px ${s.color}33`}}/>
                <span style={{fontSize:'12px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:text}}>{a.nombre||a.email.split('@')[0]}</span>
                {a.agent_status_detail&&<span style={{fontSize:'9px',color:muted,opacity:0.6}}>···</span>}
              </div>
            })}
          </div>
        </div>}

        {/* Mi estado */}
        <div style={{padding:'12px 16px',borderTop:`1px solid ${border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
            <div style={{width:'10px',height:'10px',borderRadius:'50%',background:getStatusInfo(agentStatus).color,flexShrink:0,boxShadow:`0 0 0 3px ${getStatusInfo(agentStatus).color}33`}}/>
            <select value={agentStatus} onChange={e=>setAgentStatus(e.target.value)} style={{...inp,flex:1,fontSize:'12px',padding:'6px 8px'}}>
              {agentStatuses.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <textarea
            value={agentDetail}
            onChange={e=>{setAgentDetail(e.target.value);setAgentDetailDirty(true)}}
            onBlur={()=>{if(agentDetailDirty)saveAgentDetail()}}
            placeholder="¿En qué estás trabajando?"
            style={{...inp,minHeight:'42px',fontSize:'11px',resize:'none',padding:'6px 8px',lineHeight:1.4,marginBottom:'8px'}}
          />
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'11px',color:muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'140px'}}>{userEmail}</div>
            <button onClick={toggleTheme} style={{background:'none',border:'none',cursor:'pointer',fontSize:'14px',opacity:0.6}}>{d?'☀️':'🌙'}</button>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',padding:'28px'}}>

        {/* DASHBOARD */}
        {view==='dashboard'&&<div>
          <div style={{fontSize:'18px',fontWeight:600,marginBottom:'20px'}}>Dashboard</div>
          {/* Stats cards */}
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'24px'}}>
            {[['Total',stats.total,text],['Abiertos',stats.abiertos,'#3b82f6'],['En proceso',stats.en_proceso,'#8b5cf6'],['Resueltos',stats.resueltos,'#10b981'],['Cerrados',stats.cerrados,'#6b7280'],['Sin asignar',stats.sin_asignar,'#ef4444']].map(([l,v,c])=>(
              <div key={l as string} style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'16px 20px',minWidth:'100px'}}>
                <div style={{fontSize:'28px',fontWeight:700,color:c as string}}>{v as number}</div>
                <div style={{fontSize:'12px',color:muted,marginTop:'2px'}}>{l as string}</div>
              </div>
            ))}
          </div>

          {/* Gráficas */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
            {/* Barras por área */}
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'16px'}}>Tickets por área</div>
              {statsByArea.length===0&&<div style={{fontSize:'12px',color:muted,textAlign:'center',padding:'20px'}}>Sin datos</div>}
              {statsByArea.map(s=>(
                <div key={s.area} style={{marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'12px'}}>{s.area}</span>
                    <span style={{fontSize:'12px',fontWeight:500,color:muted}}>{s.count}</span>
                  </div>
                  <div style={{background:d?'#2f2f2f':'#f0efec',borderRadius:'4px',height:'8px',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:'4px',background:'#3b82f6',width:`${(s.count/maxArea)*100}%`,transition:'width 0.5s'}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Dona por estado */}
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'16px'}}>Distribución por estado</div>
              {statsByEstado.length===0&&<div style={{fontSize:'12px',color:muted,textAlign:'center',padding:'20px'}}>Sin datos</div>}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {statsByEstado.map(s=>{
                  const pct=stats.total>0?Math.round((s.count/stats.total)*100):0
                  return<div key={s.estado} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'50%',background:s.color,flexShrink:0}}/>
                    <span style={{fontSize:'12px',flex:1}}>{STATE_LABELS[s.estado]??s.estado}</span>
                    <div style={{background:d?'#2f2f2f':'#f0efec',borderRadius:'4px',height:'6px',width:'80px',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:'4px',background:s.color,width:`${pct}%`}}/>
                    </div>
                    <span style={{fontSize:'12px',color:muted,minWidth:'30px',textAlign:'right'}}>{s.count}</span>
                  </div>
                })}
              </div>
            </div>
          </div>

          {/* Tabla recientes */}
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:`1px solid ${border}`,fontSize:'13px',fontWeight:500,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Tickets recientes</span>
              <button style={btnSec} onClick={exportCsv}>⬇ Exportar CSV</button>
            </div>
            <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><TH cols={['ID','Asunto','Usuario','Estado','Prioridad','Técnico','Fecha']}/><tbody>{recentTickets.map(t=><TicketRow key={t.id} t={t} onClick={()=>openTicket(t.id)}/>)}</tbody></table></div>
          </div>
        </div>}

        {/* KANBAN */}
        {view==='kanban'&&<div>
          <div style={{fontSize:'18px',fontWeight:600,marginBottom:'20px'}}>Kanban</div>
          <div style={{display:'flex',gap:'12px',overflowX:'auto',paddingBottom:'16px'}}>
            {KANBAN_COLS.map(col=>{
              const cols=allTickets.filter(t=>t.estado===col.key)
              return<div key={col.key} style={{minWidth:'240px',background:surface,border:`1px solid ${border}`,borderRadius:'10px',overflow:'hidden',flexShrink:0}}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${border}`,display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:col.color}}/><span style={{fontSize:'12px',fontWeight:500}}>{col.label}</span>
                  <span style={{fontSize:'11px',color:muted,marginLeft:'auto'}}>{cols.length}</span>
                </div>
                <div style={{padding:'8px',maxHeight:'70vh',overflowY:'auto'}}>
                  {cols.map(t=>(
                    <div key={t.id} onClick={()=>openTicket(t.id)} style={{background:d?'#2f2f2f':'#f7f6f3',borderRadius:'8px',padding:'10px 12px',marginBottom:'8px',cursor:'pointer',border:`1px solid ${border}`}}>
                      <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>{t.id}</div>
                      <div style={{fontSize:'13px',fontWeight:500,marginBottom:'6px',lineHeight:1.3}}>{t.asunto}</div>
                      <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
                        <Badge label={t.prioridad} color={PRI_COLORS[t.prioridad]??'#6b7280'}/>
                        {t.updated_by_user&&<span style={{fontSize:'11px',color:'#f59e0b'}}>● Act. usuario</span>}
                      </div>
                    </div>
                  ))}
                  {cols.length===0&&<div style={{fontSize:'12px',color:muted,textAlign:'center',padding:'16px 0'}}>Sin tickets</div>}
                </div>
              </div>
            })}
          </div>
        </div>}

        {/* TICKETS */}
        {view==='tickets'&&<div>
          <div style={{fontSize:'18px',fontWeight:600,marginBottom:'16px'}}>Tickets</div>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
            <input style={{...inp,maxWidth:'220px'}} placeholder="Buscar…" value={filterQ} onChange={e=>setFilterQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadAllTickets()}/>
            <select style={{...inp,maxWidth:'160px'}} value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
              <option value="">Todos</option>{Object.entries(STATE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            <select style={{...inp,maxWidth:'130px'}} value={filterPri} onChange={e=>setFilterPri(e.target.value)}>
              <option value="">Prioridad</option>{['CRITICA','ALTA','MEDIA','BAJA'].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <button style={btn} onClick={loadAllTickets}>Buscar</button>
            <button style={btnSec} onClick={exportCsv}>⬇ CSV</button>
          </div>
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><TH cols={['ID','Asunto','Usuario','Estado','Prioridad','Técnico','Fecha']}/><tbody>
              {loading?<tr><td colSpan={7} style={{padding:'24px',textAlign:'center',color:muted}}>Cargando…</td></tr>:allTickets.map(t=><TicketRow key={t.id} t={t} onClick={()=>openTicket(t.id)}/>)}
            </tbody></table></div>
          </div>
        </div>}

        {/* DETAIL */}
        {view==='detail'&&currentTicket&&<div>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
            <button style={btnSec} onClick={()=>setView(prevView)}>← Volver</button>
            <div style={{fontSize:'18px',fontWeight:600}}>{currentTicket.id} — {currentTicket.asunto}</div>
            {currentTicket.updated_by_user&&<Badge label="Act. por usuario" color="#f59e0b"/>}
            {currentTicket.estado==='cerrado'&&currentTicket.motivo_cierre&&<Badge label={currentTicket.motivo_cierre} color="#6b7280"/>}
          </div>
          <Msg2/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'16px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Información</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
                  {[['Usuario',currentTicket.usuario_email],['Área',currentTicket.area],['Categoría',[currentTicket.categoria,currentTicket.subcategoria].filter(Boolean).join(' → ')],['Servicio',currentTicket.servicio],['Prioridad',currentTicket.prioridad],['Creado',fmtDate(currentTicket.fecha_creacion)],['Actualizado',fmtDate(currentTicket.fecha_actualizacion)],['Técnico',currentTicket.tecnico_asignado||'Sin asignar']].map(([k,v])=>(
                    <div key={k}><div style={{fontSize:'11px',color:muted,marginBottom:'2px'}}>{k}</div><div style={{fontSize:'13px'}}>{v||'—'}</div></div>
                  ))}
                </div>
                <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Descripción</div>
                  <div style={{fontSize:'13px',whiteSpace:'pre-wrap',background:d?'#2f2f2f':'#f7f6f3',padding:'10px',borderRadius:'6px',lineHeight:1.6}}>{currentTicket.descripcion||'—'}</div>
                </div>
              </div>
              <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Acciones</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                  <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Estado</div>
                    <select style={inp} value={ticketEstado} onChange={e=>setTicketEstado(e.target.value)} disabled={currentTicket.estado==='cerrado'}>
                      {['abierto','asignado','en_espera_recurso','en_espera_confirmacion','resuelto'].map(s=><option key={s} value={s}>{STATE_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Técnico</div>
                    <select style={inp} value={ticketTecnico} onChange={e=>setTicketTecnico(e.target.value)} disabled={currentTicket.estado==='cerrado'}>
                      <option value="">Sin asignar</option>
                      {helpdesk_users.map(u=><option key={u.email} value={u.email}>{u.nombre||u.email}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:'12px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Respuesta</div>
                  <textarea style={{...inp,minHeight:'100px',resize:'vertical'}} value={ticketReply} onChange={e=>setTicketReply(e.target.value)} disabled={currentTicket.estado==='cerrado'}/>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {currentTicket.estado!=='cerrado'&&<button style={btn} onClick={saveTicket} disabled={loading}>Guardar</button>}
                  {currentTicket.estado!=='cerrado'&&<button style={btnSec} onClick={assignMe}>Asignarme</button>}
                  <button style={btnSec} onClick={loadHistory}>Historial</button>
                  <button style={btnSec} onClick={downloadPdf}>⬇ Resolución</button>
                  {currentTicket.estado!=='cerrado'&&<button style={{...btnDanger,marginLeft:'auto'}} onClick={()=>{setMotivoCierre('');setShowCierreModal(true)}}>Cerrar ticket</button>}
                </div>
              </div>
            </div>
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Evidencias</div>
              <label style={{display:'block',padding:'10px',borderRadius:'8px',border:`2px dashed ${border}`,textAlign:'center',cursor:'pointer',fontSize:'12px',color:muted,marginBottom:'12px'}}>
                {uploadingFile?'Subiendo…':'+ Agregar archivo'}
                <input type="file" style={{display:'none'}} accept="image/*,application/pdf,.doc,.docx" onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f)}} disabled={uploadingFile}/>
              </label>
              {(currentTicket.evidencias_json??[]).length===0?<div style={{fontSize:'12px',color:muted,textAlign:'center'}}>Sin evidencias</div>
                :(currentTicket.evidencias_json??[]).map((ev:any,i:number)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',padding:'8px',background:d?'#2f2f2f':'#f7f6f3',borderRadius:'6px'}}>
                    <span>{ev.name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)?'🖼️':'📎'}</span>
                    <a href={ev.url} target="_blank" rel="noreferrer" style={{color:'#3b82f6',fontSize:'12px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.name??`Archivo ${i+1}`}</a>
                    <button onClick={()=>deleteFile(ev.path)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'16px',padding:'0 4px',flexShrink:0}}>×</button>
                  </div>
                ))
              }
            </div>
          </div>

          {showHistory&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
            <div style={{background:surface,borderRadius:'12px',padding:'24px',width:'560px',maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <div style={{fontSize:'15px',fontWeight:600}}>Historial — {currentTicket.id}</div>
                <button style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:muted}} onClick={()=>setShowHistory(false)}>✕</button>
              </div>
              {history.length===0&&<div style={{fontSize:'13px',color:muted}}>Sin registros</div>}
              {history.map((h:any,i:number)=>(
                <div key={i} style={{borderBottom:`1px solid ${border}`,paddingBottom:'10px',marginBottom:'10px'}}>
                  <div style={{fontSize:'12px',fontWeight:500}}>{h.action} — <span style={{color:muted,fontWeight:400}}>{h.actor}</span></div>
                  {h.note&&<div style={{fontSize:'12px',color:muted,marginTop:'2px'}}>{h.note}</div>}
                  <div style={{fontSize:'11px',color:muted,marginTop:'2px'}}>{fmtDate(h.created_at)}</div>
                </div>
              ))}
            </div>
          </div>}

          {showCierreModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
            <div style={{background:surface,borderRadius:'12px',padding:'28px',width:'420px'}}>
              <div style={{fontSize:'15px',fontWeight:600,marginBottom:'8px'}}>Cerrar ticket</div>
              <div style={{fontSize:'13px',color:muted,marginBottom:'16px'}}>Selecciona el motivo. Esta acción no se puede deshacer.</div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'20px'}}>
                {motivosCierre.map(m=>(
                  <label key={m.key} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderRadius:'8px',border:`1.5px solid ${motivoCierre===m.key?m.color:border}`,cursor:'pointer',background:motivoCierre===m.key?m.color+'11':'transparent'}}>
                    <input type="radio" name="motivo" value={m.key} checked={motivoCierre===m.key} onChange={()=>setMotivoCierre(m.key)} style={{accentColor:m.color}}/>
                    <span style={{fontSize:'13px',fontWeight:motivoCierre===m.key?500:400}}>{m.label}</span>
                  </label>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button style={{...btn,background:'#ef4444',color:'#fff'}} onClick={cerrarTicket} disabled={!motivoCierre}>Confirmar cierre</button>
                <button style={btnSec} onClick={()=>setShowCierreModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>}
        </div>}

        {/* USUARIOS */}
        {view==='users'&&<div>
          <div style={{fontSize:'18px',fontWeight:600,marginBottom:'20px'}}>Usuarios</div>
          <Msg2/>
          {userRol==='ADMIN'&&<div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,marginBottom:'12px'}}>Agregar usuario</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-end'}}>
              <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Email</div><input style={{...inp,width:'220px'}} placeholder="email@empresa.com" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/></div>
              <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Nombre</div><input style={{...inp,width:'160px'}} placeholder="Nombre completo" value={newUser.nombre} onChange={e=>setNewUser({...newUser,nombre:e.target.value})}/></div>
              <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Rol</div>
                <select style={{...inp,width:'130px'}} value={newUser.rol} onChange={e=>setNewUser({...newUser,rol:e.target.value})}>
                  <option value="USUARIO">Usuario</option><option value="HELPDESK">Helpdesk</option><option value="ADMIN">Admin</option>
                </select>
              </div>
              <button style={btn} onClick={createUser}>Agregar</button>
            </div>
          </div>}
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',overflow:'hidden',marginBottom:'20px'}}>
            <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><TH cols={['Email','Nombre','Rol','Estado','Último acceso','Acciones']}/>
              <tbody>{users.map(u=>(
                <tr key={u.id} style={{borderBottom:`1px solid ${border}`}}>
                  <td style={{padding:'10px 12px',fontSize:'13px'}}>{u.email}</td>
                  <td style={{padding:'10px 12px',fontSize:'13px',color:muted}}>{u.nombre||'—'}</td>
                  <td style={{padding:'10px 12px'}}><Badge label={u.rol} color={u.rol==='ADMIN'?'#ef4444':u.rol==='HELPDESK'?'#8b5cf6':'#6b7280'}/></td>
                  <td style={{padding:'10px 12px'}}><Badge label={u.estado} color={u.estado==='ACTIVO'?'#10b981':'#6b7280'}/></td>
                  <td style={{padding:'10px 12px',fontSize:'11px',color:muted}}>{fmtDate(u.ultimo_acceso)}</td>
                  <td style={{padding:'10px 12px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {userRol==='ADMIN'&&<button style={{...btnSec,padding:'4px 10px',fontSize:'11px'}} onClick={()=>setSelectedUser(u)}>Editar</button>}
                    {userRol==='ADMIN'&&<button style={{...btnSec,padding:'4px 10px',fontSize:'11px',color:'#f59e0b',borderColor:'#f59e0b'}} onClick={()=>setClearOtpEmail(u.email)}>Limpiar OTP</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
          {clearOtpEmail&&<div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
            <span style={{fontSize:'13px'}}>¿Limpiar OTP de <strong>{clearOtpEmail}</strong>?</span>
            <button style={btn} onClick={clearOtp}>Confirmar</button>
            <button style={btnSec} onClick={()=>setClearOtpEmail('')}>Cancelar</button>
          </div>}
          {userRol==='ADMIN'&&sessions.length>0&&<div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:`1px solid ${border}`,fontSize:'13px',fontWeight:500}}>Sesiones activas ({sessions.length})</div>
            <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><TH cols={['Email','Rol','Última actividad','Expira','']}/>
              <tbody>{sessions.map((s,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${border}`}}>
                  <td style={{padding:'10px 12px',fontSize:'13px'}}>{s.email}</td>
                  <td style={{padding:'10px 12px'}}><Badge label={s.rol} color={s.rol==='ADMIN'?'#ef4444':'#8b5cf6'}/></td>
                  <td style={{padding:'10px 12px',fontSize:'12px',color:muted}}>{fmtDate(s.last_active)}</td>
                  <td style={{padding:'10px 12px',fontSize:'12px',color:muted}}>{fmtDate(s.expires_at)}</td>
                  <td style={{padding:'10px 12px'}}><button style={{...btnDanger,padding:'4px 10px',fontSize:'11px'}} onClick={()=>killSession(s.token)}>Cerrar</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>}
          {selectedUser&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
            <div style={{background:surface,borderRadius:'12px',padding:'24px',width:'400px'}}>
              <div style={{fontSize:'15px',fontWeight:600,marginBottom:'16px'}}>Editar usuario</div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Email</div><div style={{fontSize:'13px',padding:'8px',background:d?'#2f2f2f':'#f7f6f3',borderRadius:'6px'}}>{selectedUser.email}</div></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Nombre</div><input style={inp} value={selectedUser.nombre||''} onChange={e=>setSelectedUser({...selectedUser,nombre:e.target.value})}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Rol</div>
                <select style={inp} value={selectedUser.rol} onChange={e=>setSelectedUser({...selectedUser,rol:e.target.value})}>
                  <option value="USUARIO">Usuario</option><option value="HELPDESK">Helpdesk</option><option value="ADMIN">Admin</option>
                </select>
              </div>
              <div style={{marginBottom:'16px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Estado</div>
                <select style={inp} value={selectedUser.estado} onChange={e=>setSelectedUser({...selectedUser,estado:e.target.value})}>
                  <option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option>
                </select>
              </div>
              <div style={{display:'flex',gap:'8px'}}><button style={btn} onClick={saveUser}>Guardar</button><button style={btnSec} onClick={()=>setSelectedUser(null)}>Cancelar</button></div>
            </div>
          </div>}
        </div>}

        {/* KB */}
        {view==='kb'&&<div>
          <div style={{fontSize:'18px',fontWeight:600,marginBottom:'20px'}}>Base de conocimiento</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 400px',gap:'16px'}}>
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',overflow:'hidden'}}>
              {kbItems.map(item=>(
                <div key={item.id} onClick={()=>{setKbSelected(item);setKbForm({titulo:item.titulo,categoria:item.categoria,contenido:item.contenido})}} style={{padding:'12px 16px',borderBottom:`1px solid ${border}`,cursor:'pointer',background:kbSelected?.id===item.id?(d?'#2f2f2f':'#f0efec'):'transparent'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:'13px',fontWeight:500}}>{item.titulo}</div>
                    <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                      <Badge label={item.activo?'Activo':'Inactivo'} color={item.activo?'#10b981':'#6b7280'}/>
                      <button style={{...btnSec,padding:'2px 8px',fontSize:'11px'}} onClick={e=>{e.stopPropagation();toggleKb(item.id,item.activo)}}>{item.activo?'Desactivar':'Activar'}</button>
                    </div>
                  </div>
                  <div style={{fontSize:'11px',color:muted,marginTop:'2px'}}>{item.categoria}</div>
                </div>
              ))}
              {kbItems.length===0&&<div style={{padding:'24px',textAlign:'center',fontSize:'13px',color:muted}}>Sin artículos</div>}
            </div>
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>{kbSelected?'Editar artículo':'Nuevo artículo'}</div>
              {[['Título','titulo'],['Categoría','categoria']].map(([l,k])=>(
                <div key={k} style={{marginBottom:'10px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>{l}</div><input style={inp} value={(kbForm as any)[k]} onChange={e=>setKbForm({...kbForm,[k]:e.target.value})}/></div>
              ))}
              <div style={{marginBottom:'14px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Contenido</div><textarea style={{...inp,minHeight:'180px',resize:'vertical'}} value={kbForm.contenido} onChange={e=>setKbForm({...kbForm,contenido:e.target.value})}/></div>
              <div style={{display:'flex',gap:'8px'}}>
                <button style={btn} onClick={saveKb}>Guardar</button>
                {kbSelected&&<button style={btnSec} onClick={()=>{setKbSelected(null);setKbForm({titulo:'',categoria:'',contenido:''})}}>Nuevo</button>}
              </div>
            </div>
          </div>
        </div>}

        {/* Modal de detalle de agente */}
        {selectedAgent&&<div onClick={()=>setSelectedAgent(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:surface,borderRadius:'14px',padding:'24px',width:'380px',maxWidth:'90vw',border:`1px solid ${border}`,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:getStatusInfo(selectedAgent.agent_status).color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:600,color:getStatusInfo(selectedAgent.agent_status).color}}>{(selectedAgent.nombre||selectedAgent.email)[0].toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:'14px',fontWeight:600}}>{selectedAgent.nombre||selectedAgent.email.split('@')[0]}</div>
                <div style={{fontSize:'11px',color:muted}}>{selectedAgent.email}</div>
              </div>
              <button onClick={()=>setSelectedAgent(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:muted,lineHeight:1}}>×</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',borderRadius:'8px',background:getStatusInfo(selectedAgent.agent_status).color+'15',marginBottom:'12px'}}>
              <div style={{width:'10px',height:'10px',borderRadius:'50%',background:getStatusInfo(selectedAgent.agent_status).color}}/>
              <span style={{fontSize:'13px',fontWeight:500,color:getStatusInfo(selectedAgent.agent_status).color}}>{getStatusInfo(selectedAgent.agent_status).label}</span>
              {getStatusInfo(selectedAgent.agent_status).level&&<span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'4px',background:getStatusInfo(selectedAgent.agent_status).color+'30',color:getStatusInfo(selectedAgent.agent_status).color,marginLeft:'auto'}}>{getStatusInfo(selectedAgent.agent_status).level}</span>}
            </div>
            {selectedAgent.agent_status_detail
              ?<div style={{padding:'14px',borderRadius:'8px',background:d?'#2f2f2f':'#f7f6f3',fontSize:'13px',lineHeight:1.5,whiteSpace:'pre-wrap',color:text}}>{selectedAgent.agent_status_detail}</div>
              :<div style={{padding:'14px',borderRadius:'8px',background:d?'#2f2f2f':'#f7f6f3',fontSize:'12px',color:muted,fontStyle:'italic',textAlign:'center'}}>Sin detalle</div>
            }
            {selectedAgent.agent_status_updated_at&&<div style={{fontSize:'10px',color:muted,marginTop:'10px',textAlign:'right'}}>Actualizado {fmtDate(selectedAgent.agent_status_updated_at)}</div>}
          </div>
        </div>}

        {/* CONFIG */}
        {view==='config'&&<div>
          <div style={{fontSize:'18px',fontWeight:600,marginBottom:'20px'}}>Configuración</div>
          <Msg2/>

          {/* Branding */}
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,marginBottom:'4px'}}>Identidad de la aplicación</div>
            <div style={{fontSize:'11px',color:muted,marginBottom:'16px'}}>Logo, nombre y color visibles en toda la plataforma</div>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'20px',alignItems:'start'}}>
              {/* Logo preview + upload */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
                {brandingLogo
                  ?<img src={brandingLogo} alt="logo" style={{width:'80px',height:'80px',borderRadius:'12px',objectFit:'cover',border:`1px solid ${border}`}}/>
                  :<div style={{width:'80px',height:'80px',borderRadius:'12px',background:brandingColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',fontWeight:700,color:'#fff'}}>{brandingName.charAt(0).toUpperCase()}</div>
                }
                <label style={{...btnSec,padding:'6px 12px',fontSize:'11px',cursor:'pointer',display:'inline-block'}}>
                  {uploadingLogo?'Subiendo...':(brandingLogo?'Cambiar':'Subir logo')}
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadLogo(f);e.target.value=''}}/>
                </label>
                {brandingLogo&&<button onClick={removeLogo} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'11px',padding:0}}>Quitar logo</button>}
              </div>

              {/* Name + color */}
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <div>
                  <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Nombre de la aplicación</div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input style={{...inp,flex:1}} value={brandingNameEdit} onChange={e=>setBrandingNameEdit(e.target.value)} placeholder="Helpdesk Ultralam"/>
                    <button style={btn} onClick={saveBrandingName} disabled={brandingNameEdit.trim()===brandingName}>Guardar</button>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Color principal</div>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <input type="color" value={brandingColorEdit} onChange={e=>setBrandingColorEdit(e.target.value)} style={{width:'48px',height:'34px',border:`1px solid ${border}`,borderRadius:'6px',cursor:'pointer',background:'transparent'}}/>
                    <input style={{...inp,flex:1,fontFamily:'monospace'}} value={brandingColorEdit} onChange={e=>setBrandingColorEdit(e.target.value)} placeholder="#3b82f6"/>
                    <button style={btn} onClick={saveBrandingColor} disabled={brandingColorEdit===brandingColor}>Guardar</button>
                  </div>
                </div>
                <div style={{fontSize:'11px',color:muted,paddingTop:'4px'}}>Tamaño máx. del logo: 2MB. Formatos: PNG, JPG, SVG, WEBP.</div>
              </div>
            </div>
          </div>

          {/* Retención de adjuntos */}
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,marginBottom:'4px'}}>Retención de capturas</div>
            <div style={{fontSize:'11px',color:muted,marginBottom:'16px'}}>Las capturas de tickets cerrados se eliminan automáticamente. El ticket queda intacto y los PDFs ya están en tu correo como respaldo.</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div style={{padding:'14px',borderRadius:'8px',background:d?'#2f2f2f':'#f7f6f3'}}>
                <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Tickets en cola</div>
                <div style={{fontSize:'22px',fontWeight:700,color:purgeStats.pendingTickets>0?'#f59e0b':text}}>{purgeStats.pendingTickets}</div>
              </div>
              <div style={{padding:'14px',borderRadius:'8px',background:d?'#2f2f2f':'#f7f6f3'}}>
                <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Archivos a purgar</div>
                <div style={{fontSize:'22px',fontWeight:700,color:purgeStats.pendingFiles>0?'#f59e0b':text}}>{purgeStats.pendingFiles}</div>
              </div>
              <div style={{padding:'14px',borderRadius:'8px',background:d?'#2f2f2f':'#f7f6f3'}}>
                <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Última ejecución</div>
                <div style={{fontSize:'13px',fontWeight:500,color:text}}>{purgeStats.lastPurgeAt?fmtDate(purgeStats.lastPurgeAt):'Nunca'}</div>
                {purgeStats.lastPurgeStats&&<div style={{fontSize:'10px',color:muted,marginTop:'2px'}}>{purgeStats.lastPurgeStats.filesDeleted} archivos · {purgeStats.lastPurgeStats.ticketsAffected} tickets</div>}
              </div>
            </div>

            <div style={{display:'flex',gap:'12px',alignItems:'flex-end',flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Días de retención (tras cierre)</div>
                <input type="number" min={1} max={3650} value={retentionDaysEdit} onChange={e=>setRetentionDaysEdit(parseInt(e.target.value)||0)} style={{...inp,width:'120px'}}/>
              </div>
              <button style={btn} onClick={saveRetention} disabled={retentionDaysEdit===retentionDays}>Guardar retención</button>
              <button style={{...btnDanger,padding:'8px 16px'}} onClick={runPurge} disabled={purging||purgeStats.pendingFiles===0}>{purging?'Purgando…':`Purgar ahora (${purgeStats.pendingFiles})`}</button>
              <div style={{fontSize:'10px',color:muted,marginLeft:'auto',alignSelf:'center'}}>Job automático: diario 03:00 CDMX</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Notificaciones por email</div>
              {Object.entries(features).filter(([k])=>k.startsWith('FEATURE_')).map(([key,value])=>{
                const labels:Record<string,string>={'FEATURE_EMAIL_NEW_TICKET_TO_HELPDESK':'Nuevo ticket → helpdesk','FEATURE_EMAIL_CONFIRM_TICKET_TO_USER':'Nuevo ticket → confirmar usuario','FEATURE_EMAIL_USER_ON_REPLY':'Respuesta → notificar usuario','FEATURE_ENABLE_KB':'Habilitar base de conocimiento'}
                return<div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${border}`}}>
                  <div style={{fontSize:'13px'}}>{labels[key]??key}</div>
                  <button style={{padding:'6px 14px',borderRadius:'6px',border:`1px solid ${value==='true'?'#10b981':border}`,fontSize:'12px',fontWeight:500,cursor:'pointer',background:value==='true'?'#10b981':'transparent',color:value==='true'?'#fff':muted}} onClick={()=>toggleFlag(key)}>{value==='true'?'ON':'OFF'}</button>
                </div>
              })}
            </div>
            <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Estados del agente</div>
              {agentStatuses.map(s=>(
                <div key={s.key} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:`1px solid ${border}`}}>
                  <div style={{width:'12px',height:'12px',borderRadius:'50%',background:s.color??'#6b7280',flexShrink:0}}/>
                  <span style={{fontSize:'13px',flex:1}}>{s.label}</span>
                  {s.level&&<span style={{fontSize:'10px',color:muted,padding:'2px 6px',borderRadius:'4px',background:d?'#2f2f2f':'#f0efec'}}>{s.level}</span>}
                  {s.key!=='disponible'&&<button style={{...btnDanger,padding:'3px 10px',fontSize:'11px'}} onClick={()=>removeAgentStatus(s.key)}>×</button>}
                </div>
              ))}
              <div style={{marginTop:'12px',display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'flex-end'}}>
                <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Clave</div><input style={{...inp,width:'90px'}} placeholder="en_campo" value={newStatusKey} onChange={e=>setNewStatusKey(e.target.value.toLowerCase().replace(/\s/g,'_'))}/></div>
                <div style={{flex:1,minWidth:'120px'}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Etiqueta</div><input style={inp} placeholder="En campo" value={newStatusLabel} onChange={e=>setNewStatusLabel(e.target.value)}/></div>
                <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Color</div><input type="color" value={newStatusColor} onChange={e=>setNewStatusColor(e.target.value)} style={{width:'40px',height:'34px',border:`1px solid ${border}`,borderRadius:'6px',cursor:'pointer',background:'transparent'}}/></div>
                <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Nivel</div>
                  <select style={{...inp,width:'90px'}} value={newStatusLevel} onChange={e=>setNewStatusLevel(e.target.value)}>
                    <option value="INFO">INFO</option><option value="BAJA">BAJA</option><option value="MEDIA">MEDIA</option><option value="ALTA">ALTA</option><option value="CRITICA">CRÍTICA</option>
                  </select>
                </div>
                <button style={btn} onClick={addAgentStatus}>+</button>
              </div>
            </div>
          </div>
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Motivos de cierre</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'14px'}}>
              {motivosCierre.map(m=>(
                <div key={m.key} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'8px',border:`1px solid ${border}`,background:m.color+'11'}}>
                  <div style={{width:'12px',height:'12px',borderRadius:'50%',background:m.color,flexShrink:0}}/>
                  <span style={{fontSize:'13px',flex:1}}>{m.label}</span>
                  <button style={{...btnDanger,padding:'2px 10px',fontSize:'11px'}} onClick={()=>removeMotivoCierre(m.key)}>Eliminar</button>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-end'}}>
              <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Clave</div><input style={{...inp,width:'120px'}} placeholder="no_procede" value={newMotivo.key} onChange={e=>setNewMotivo({...newMotivo,key:e.target.value.toLowerCase().replace(/\s/g,'_')})}/></div>
              <div style={{flex:1}}><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Etiqueta</div><input style={inp} placeholder="⚡ No procede" value={newMotivo.label} onChange={e=>setNewMotivo({...newMotivo,label:e.target.value})}/></div>
              <div><div style={{fontSize:'11px',color:muted,marginBottom:'4px'}}>Color</div><input type="color" value={newMotivo.color} onChange={e=>setNewMotivo({...newMotivo,color:e.target.value})} style={{width:'40px',height:'36px',border:`1px solid ${border}`,borderRadius:'6px',cursor:'pointer',background:'transparent'}}/></div>
              <button style={btn} onClick={addMotivoCierre}>Agregar</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            {([['Áreas','areas',catAreas,setCatAreas,newArea,setNewArea],['Almacenes','almacenes',catAlmacenes,setCatAlmacenes,newAlmacen,setNewAlmacen],['Tipos de servicio','servicios',catServicios,setCatServicios,newServicio,setNewServicio]] as any[]).map(([label,key,arr,setter,newVal,setNew])=>(
              <div key={key} style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'12px'}}>{label}</div>
                <TagList items={arr} onRemove={(item:string)=>removeFromArr(key,item,arr,setter)}/>
                <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                  <input style={{...inp,flex:1}} placeholder="Agregar…" value={newVal} onChange={(e:any)=>setNew(e.target.value)} onKeyDown={(e:any)=>{if(e.key==='Enter')addToArr(key,newVal,arr,setter,setNew)}}/>
                  <button style={btn} onClick={()=>addToArr(key,newVal,arr,setter,setNew)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:surface,border:`1px solid ${border}`,borderRadius:'10px',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:500,marginBottom:'14px'}}>Categorías en cascada</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div>
                <div style={{fontSize:'11px',color:muted,marginBottom:'8px'}}>Categorías</div>
                {catCascada.map(c=>(
                  <div key={c.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 10px',borderRadius:'6px',border:`1px solid ${border}`,marginBottom:'4px',background:selectedCatEdit===c.label?(d?'#2f2f2f':'#f0efec'):'transparent',cursor:'pointer'}} onClick={()=>setSelectedCatEdit(c.label)}>
                    <span style={{fontSize:'13px'}}>{c.label}</span>
                    <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                      <span style={{fontSize:'11px',color:muted}}>{c.subcategorias.length} sub</span>
                      <button onClick={e=>{e.stopPropagation();removeCat(c.label)}} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'16px',padding:'0 4px'}}>×</button>
                    </div>
                  </div>
                ))}
                <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                  <input style={{...inp,flex:1}} placeholder="Nueva categoría" value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCat()}/>
                  <button style={btn} onClick={addCat}>+</button>
                </div>
              </div>
              <div>
                <div style={{fontSize:'11px',color:muted,marginBottom:'8px'}}>Subcategorías de: <strong>{selectedCatEdit||'(selecciona una)'}</strong></div>
                {selectedCatEdit&&catCascada.find(c=>c.label===selectedCatEdit)?.subcategorias.map(s=>(
                  <div key={s.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 10px',borderRadius:'6px',border:`1px solid ${border}`,marginBottom:'4px'}}>
                    <span style={{fontSize:'13px'}}>{s.label}</span>
                    <span style={{fontSize:'11px',color:muted}}>{s.peticiones.length} pet.</span>
                  </div>
                ))}
                {selectedCatEdit&&<div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                  <input style={{...inp,flex:1}} placeholder="Nueva subcategoría" value={newSubLabel} onChange={e=>setNewSubLabel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSub()}/>
                  <button style={btn} onClick={addSub}>+</button>
                </div>}
              </div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}
