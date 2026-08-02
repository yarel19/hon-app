(function(){
 const DEFAULT_CLOUD={url:'https://bofbgdoadqzwijhqeoed.supabase.co',key:'sb_publishable_mshQte_V_xRw2GKvL1FZUg_mP-xc0-D'};
 const clone=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}};
 const clean=value=>{let copy=clone(value||{});if(copy&&typeof copy==='object')Object.keys(copy).filter(key=>key.startsWith('_honSync')).forEach(key=>delete copy[key]);return copy};
 const stable=value=>{
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).filter(key=>!key.startsWith('_honSync')).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  return JSON.stringify(value)
 };
 const same=(a,b)=>stable(a)===stable(b);
 const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const itemKey=(path,item,index)=>{
  if(!plain(item))return `value:${stable(item)}`;
  if(item.id)return `id:${item.id}`;
  if(path==='budgets')return `budget:${item.month||''}:${item.category||''}`;
  if(path==='monthPlans'||path==='snapshots'||path==='reviews')return `month:${item.month||''}`;
  if(path==='reviews[].categoryAssessments')return `assessment:${item.category||''}`;
  if(path==='monthlyOpeningBalances')return `opening:${item.month||''}:${item.type||''}`;
  if(path==='ironBudget.categories')return `iron:${item.category||''}`;
  return `object:${stable(item)}:${index}`
 };
 function mergeValue(base,local,remote,context,path=''){
  let localChanged=!same(local,base),remoteChanged=!same(remote,base);
  if(!localChanged)return clone(remote);
  if(!remoteChanged)return clone(local);
  if(same(local,remote))return clone(local);
  if(local===undefined||remote===undefined)return clone(context.localWins?local:remote);
  if(Array.isArray(local)&&Array.isArray(remote))return mergeArray(Array.isArray(base)?base:[],local,remote,context,path);
  if(plain(local)&&plain(remote))return mergeObject(plain(base)?base:{},local,remote,context,path);
  return clone(context.localWins?local:remote)
 }
 function mergeObject(base,local,remote,context,path=''){
  let result={},keys=new Set([...Object.keys(base||{}),...Object.keys(local||{}),...Object.keys(remote||{})]);
  keys.forEach(key=>{if(key.startsWith('_honSync'))return;let value=mergeValue(base?.[key],local?.[key],remote?.[key],context,path?`${path}.${key}`:key);if(value!==undefined)result[key]=value});
  return result
 }
 function mergeArray(base,local,remote,context,path){
  let baseMap=new Map(base.map((item,index)=>[itemKey(path,item,index),item])),localMap=new Map(local.map((item,index)=>[itemKey(path,item,index),item])),remoteMap=new Map(remote.map((item,index)=>[itemKey(path,item,index),item]));
  let preferred=same(local,base)?remote:local,order=[],seen=new Set();
  [...preferred,...remote,...local,...base].forEach((item,index)=>{let key=itemKey(path,item,index);if(!seen.has(key)){seen.add(key);order.push(key)}});
  return order.map(key=>mergeValue(baseMap.get(key),localMap.get(key),remoteMap.get(key),context,`${path}[]`)).filter(value=>value!==undefined)
 }
 const mergeData=(base,local,remote,localChangedAt,remoteChangedAt)=>mergeObject(clean(base),clean(local),clean(remote),{localWins:(localChangedAt||'')>(remoteChangedAt||'')});

 const API={
  config:null,session:null,timer:null,syncTimer:null,pollTimer:null,syncing:false,pulling:false,
  pendingPayload:null,pendingVersion:0,lastRemoteAt:null,lastPullAt:0,
  get configured(){return !!(this.config?.url&&this.config?.key)},
  get dirty(){return localStorage.getItem('honCloudDirty')==='1'},
  set dirty(value){if(value)localStorage.setItem('honCloudDirty','1');else localStorage.removeItem('honCloudDirty')},
  get deviceId(){let id=localStorage.getItem('honCloudDeviceId');if(!id){id=crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);localStorage.setItem('honCloudDeviceId',id)}return id},
  headers(token=true){let h={'apikey':this.config.key,'Content-Type':'application/json'};if(token&&this.session?.access_token)h.Authorization='Bearer '+this.session.access_token;return h},
  async request(path,options={}){
   const {auth=true,_retried=false,...fetchOptions}=options;
   let res=await fetch(this.config.url.replace(/\/$/,'')+path,{...fetchOptions,cache:'no-store',headers:{...this.headers(auth),...(fetchOptions.headers||{})}}),body=await res.text(),data=null;
   try{data=body?JSON.parse(body):null}catch{data=body}
   if(res.status===401&&auth&&!_retried&&await this.refresh())return this.request(path,{...options,_retried:true});
   if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||`שגיאת שרת (${res.status})`);
   return data
  },
  loadConfig(){
   try{this.config=JSON.parse(localStorage.getItem('honCloudConfig')||'null')||DEFAULT_CLOUD}catch{this.config=DEFAULT_CLOUD}
   try{this.session=JSON.parse(localStorage.getItem('honCloudSession')||'null')}catch{this.session=null}
   this.lastRemoteAt=localStorage.getItem('honLastRemoteAt')||null
  },
  saveConfig(url,key){this.config={url:url.trim(),key:key.trim()};localStorage.setItem('honCloudConfig',JSON.stringify(this.config))},
  clearConfig(){
   ['honCloudConfig','honCloudSession','honCloudDirty','honLastRemoteAt','honLastRemoteRevision','honCloudBase','honCloudBackups'].forEach(k=>localStorage.removeItem(k));
   this.config=this.session=this.pendingPayload=null
  },
  loadBase(){try{return JSON.parse(localStorage.getItem('honCloudBase')||'null')}catch{return null}},
  setBase(payload,updatedAt,revision){
   try{localStorage.setItem('honCloudBase',JSON.stringify(clean(payload)))}catch{localStorage.removeItem('honCloudBase')}
   this.rememberRemote(updatedAt,revision)
  },
  rememberRemote(updatedAt,revision){
   if(updatedAt){this.lastRemoteAt=updatedAt;localStorage.setItem('honLastRemoteAt',updatedAt)}
   if(revision)localStorage.setItem('honLastRemoteRevision',revision)
  },
  rememberBackups(payload){
   let backups=Array.isArray(payload?._honSyncBackups)?payload._honSyncBackups:[];
   try{localStorage.setItem('honCloudBackups',JSON.stringify(backups))}catch{localStorage.removeItem('honCloudBackups')}
  },
  getBackups(){try{return JSON.parse(localStorage.getItem('honCloudBackups')||'[]')}catch{return[]}},
  saveSession(s){this.session=s;localStorage.setItem('honCloudSession',JSON.stringify(s));this.scheduleRefresh()},
  async signUp(email,password){let data=await this.request('/auth/v1/signup',{method:'POST',auth:false,body:JSON.stringify({email,password})});if(data.access_token)this.saveSession(data);return data},
  async signIn(email,password){let data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:JSON.stringify({email,password})});this.saveSession(data);return data},
  async refresh(){
   if(!this.session?.refresh_token)return false;
   try{let data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:JSON.stringify({refresh_token:this.session.refresh_token})});this.saveSession(data);return true}catch{return false}
  },
  signOut(){this.session=null;localStorage.removeItem('honCloudSession');clearTimeout(this.timer);clearInterval(this.pollTimer);this.showAuth()},
  scheduleRefresh(){
   clearTimeout(this.timer);if(!this.session?.expires_in)return;
   this.timer=setTimeout(async()=>{if(!await this.refresh())this.setStatus('error','נדרשת התחברות מחדש')},Math.max(30000,(this.session.expires_in-120)*1000))
  },
  async readRemote(){
   let rows=await this.request('/rest/v1/hon_data?select=payload,updated_at&user_id=eq.'+encodeURIComponent(this.session.user.id)+'&limit=1',{method:'GET'});
   return rows?.[0]||null
  },
  applyRemote(payload,updatedAt,revision,message='עודכן מהענן'){
   let data=clean(payload);window.HONApplyCloud?.(data,updatedAt);this.setBase(data,updatedAt,revision||payload?._honSyncRevision||'');this.rememberBackups(payload);this.dirty=false;this.pendingPayload=null;this.setStatus('ok',message)
  },
  async pull(force=false){
   if(!this.session?.user?.id||this.pulling||this.syncing)return;
   if(this.dirty)return this.push(this.pendingPayload||window.HONGetData?.());
   this.pulling=true;this.setStatus('syncing','בודק עדכונים…');
   try{
    let row=await this.readRemote();
    if(!row?.payload){this.pulling=false;this.dirty=true;this.pendingPayload=clean(window.HONGetData?.());return this.push()}
    let remoteRevision=row.payload._honSyncRevision||'',lastRevision=localStorage.getItem('honLastRemoteRevision')||'',base=this.loadBase(),local=clean(window.HONGetData?.()),localAt=localStorage.getItem('honLocalChangedAt')||'';
    if(!base&&localAt&&localAt>row.updated_at&&!same(local,clean(row.payload))){this.pulling=false;this.dirty=true;this.pendingPayload=local;return this.push()}
    if(force||!base||remoteRevision!==lastRevision)this.applyRemote(row.payload,row.updated_at,remoteRevision);
    else{this.rememberBackups(row.payload);this.setStatus('ok','הכול מסונכרן')}
    this.lastPullAt=Date.now()
   }catch(error){this.setStatus('error','שגיאת סנכרון');console.warn('HON cloud pull failed',error)}
   finally{this.pulling=false}
  },
  queueSync(payload){
   this.pendingPayload=clean(payload);this.pendingVersion++;this.dirty=true;localStorage.setItem('honLocalChangedAt',new Date().toISOString());
   if(!this.session?.user?.id)return;
   clearTimeout(this.syncTimer);this.syncTimer=setTimeout(()=>this.push(),450)
  },
  buildSnapshot(merged,row,revision,now){
   let previous=row?.payload?clean(row.payload):null,backups=Array.isArray(row?.payload?._honSyncBackups)?row.payload._honSyncBackups.filter(x=>x?.data):[];
   if(previous&&Object.keys(previous).length&&!same(previous,merged))backups.push({revision:row.payload._honSyncRevision||'',savedAt:row.updated_at||'',deviceId:row.payload._honSyncDevice||'',data:previous});
   return {...clean(merged),_honSyncRevision:revision,_honSyncDevice:this.deviceId,_honSyncSavedAt:now,_honSyncBackups:backups.slice(-5)}
  },
  async push(payload){
   if(payload)this.pendingPayload=clean(payload);
   if(!this.session?.user?.id||this.syncing)return;
   let local=clean(this.pendingPayload||window.HONGetData?.());if(!local)return;
   let version=this.pendingVersion,localAt=localStorage.getItem('honLocalChangedAt')||new Date().toISOString(),base=this.loadBase();
   this.syncing=true;this.setStatus('syncing','ממזג ושומר…');
   try{
    for(let attempt=0;attempt<4;attempt++){
     let row=await this.readRemote(),remote=row?.payload?clean(row.payload):{},remoteAt=row?.updated_at||'';
     if(!base&&row&&!(this.dirty&&localAt>remoteAt)){this.applyRemote(row.payload,row.updated_at,row.payload._honSyncRevision||'','נשמרה הגרסה החדשה מהענן');return}
     let merged=mergeData(base||{},local,remote,localAt,remoteAt);
     if(row&&same(merged,remote)){this.applyRemote(row.payload,row.updated_at,row.payload._honSyncRevision||'','עודכן בלי לדרוס שינויים');return}
     let revision=crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),now=new Date().toISOString(),snapshot=this.buildSnapshot(merged,row,revision,now),savedRows;
     if(row){
      let condition='updated_at=eq.'+encodeURIComponent(row.updated_at);
      savedRows=await this.request('/rest/v1/hon_data?user_id=eq.'+encodeURIComponent(this.session.user.id)+'&'+condition,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload:snapshot,updated_at:now})});
      if(!savedRows?.length)continue
     }else{
      try{savedRows=await this.request('/rest/v1/hon_data',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:this.session.user.id,payload:snapshot,updated_at:now})})}catch{continue}
     }
     let saved=savedRows?.[0]||{},savedAt=saved.updated_at||now,savedPayload=saved.payload||snapshot;
     this.rememberRemote(savedAt,savedPayload._honSyncRevision||revision);this.rememberBackups(savedPayload);
     if(version===this.pendingVersion){this.applyRemote(merged,savedAt,savedPayload._honSyncRevision||revision,'נשמר וסונכרן');this.pendingPayload=null;this.dirty=false}
     else{this.setStatus('syncing','שומר שינוי נוסף…')}
     return
    }
    throw new Error('המידע השתנה במכשיר אחר בזמן השמירה')
   }catch(error){this.dirty=true;this.setStatus('error',navigator.onLine?'הסנכרון נעצר בבטחה - נסה שוב':'ממתין לאינטרנט');console.warn('HON cloud push failed',error)}
   finally{
    this.syncing=false;
    if(this.dirty&&this.pendingVersion!==version){clearTimeout(this.syncTimer);this.syncTimer=setTimeout(()=>this.push(),180)}
   }
  },
  async restoreVersion(index){
   let backup=this.getBackups()[index];if(!backup?.data)return false;
   let data=clean(backup.data);window.HONApplyCloud?.(data);this.pendingPayload=data;this.pendingVersion++;this.dirty=true;localStorage.setItem('honLocalChangedAt',new Date().toISOString());await this.push();return true
  },
  async syncNow(forcePull=false){
   if(!this.session?.user?.id||this.syncing||this.pulling)return;
   if(this.dirty)return this.push(this.pendingPayload||window.HONGetData?.());
   return this.pull(forcePull)
  },
  startWatch(){clearInterval(this.pollTimer);this.pollTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)this.syncNow()},5000)},
  setStatus(kind,text){
   let pill=document.querySelector('#syncPill');if(!pill)return;
   pill.hidden=false;pill.className='sync-pill '+kind;pill.textContent=(kind==='ok'?'● ':kind==='error'?'! ':'↻ ')+text;
   pill.title=this.session?.user?.email?`מחובר: ${this.session.user.email} · לחץ לסנכרון עכשיו`:'לחץ לסנכרון עכשיו'
  },
  showSetup(){
   let gate=document.querySelector('#authGate');gate.hidden=false;gate.innerHTML=`<div class="modal-card auth-card"><button class="x" id="closeSetup">×</button><div class="brandmark">H</div><h2>חיבור HON לענן</h2><p class="muted">הדבק כאן את כתובת הפרויקט ואת המפתח הציבורי שקיבלת מ-Supabase.</p><form id="cloudSetup"><label>Project URL<input name="url" type="url" value="${this.config?.url||''}" placeholder="https://xxxxx.supabase.co" required></label><label>Publishable / anon key<textarea name="key" rows="4" required>${this.config?.key||''}</textarea></label><p id="setupError" class="down"></p><button class="primary full-btn">שמירה וחיבור</button></form><button class="text-btn" id="clearCloud">מחיקת הגדרת הענן</button></div>`;
   gate.querySelector('#closeSetup').onclick=()=>gate.hidden=true;gate.querySelector('#clearCloud').onclick=()=>{this.clearConfig();location.reload()};gate.querySelector('form').onsubmit=event=>{event.preventDefault();let form=new FormData(event.target);this.saveConfig(form.get('url'),form.get('key'));location.reload()}
  },
  showAuth(){
   if(!this.configured)return;let gate=document.querySelector('#authGate');gate.hidden=false;gate.innerHTML=`<div class="modal-card auth-card"><div class="brandmark">H</div><h2>המידע המשפחתי שלך</h2><p class="muted">התחבר כדי לשמור ולסנכרן בין המחשב לטלפון.</p><form id="cloudLogin"><label>אימייל<input name="email" type="email" required autocomplete="email"></label><label>סיסמה<input name="password" type="password" minlength="8" required autocomplete="current-password"></label><p id="authError" class="down"></p><button class="primary full-btn" name="mode" value="login">כניסה ל-HON</button><button class="ghost full-btn" name="mode" value="signup">יצירת חשבון חדש</button></form><button class="text-btn" id="localOnly">עבודה מקומית בלבד</button></div>`;
   let form=gate.querySelector('form'),mode='login';form.querySelectorAll('button[name=mode]').forEach(button=>button.onclick=()=>mode=button.value);
   form.onsubmit=async event=>{event.preventDefault();let values=new FormData(form),error=gate.querySelector('#authError');error.textContent='';try{let result=mode==='signup'?await this.signUp(values.get('email'),values.get('password')):await this.signIn(values.get('email'),values.get('password'));if(mode==='signup'&&!result.access_token){error.textContent='נשלח אליך אימייל לאישור. אשר אותו ואז התחבר.';return}gate.hidden=true;this.setStatus('ok','מחובר');this.startWatch();await this.syncNow(true)}catch(reason){error.textContent=reason.message}};
   gate.querySelector('#localOnly').onclick=()=>{gate.hidden=true;this.setStatus('error','מצב מקומי')}
  },
  async init(){
   this.loadConfig();let pill=document.querySelector('#syncPill');
   if(!this.configured){this.setStatus('error','הפעלת שמירה בענן');pill.onclick=()=>this.showSetup();return}
   pill.onclick=()=>this.syncNow();
   if(this.session){
    if(this.session.expires_at&&this.session.expires_at*1000<Date.now()&&!await this.refresh()){this.session=null;localStorage.removeItem('honCloudSession');this.showAuth();return}
    this.scheduleRefresh();this.startWatch();await this.syncNow();return
   }
   this.showAuth()
  }
 };
 window.HONCloud=API;
 window.addEventListener('online',()=>API.syncNow());
 window.addEventListener('focus',()=>API.syncNow());
 window.addEventListener('pageshow',()=>API.syncNow());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)API.syncNow()});
})();
