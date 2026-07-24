(function(){
 const DEFAULT_CLOUD={url:'https://bofbgdoadqzwijhqeoed.supabase.co',key:'sb_publishable_mshQte_V_xRw2GKvL1FZUg_mP-xc0-D'};
 const clone=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}};
 const stable=value=>{
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).filter(key=>key!=='_honSyncRevision').sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  return JSON.stringify(value)
 };
 const API={
  config:null,session:null,timer:null,syncTimer:null,pollTimer:null,syncing:false,pulling:false,
  pendingPayload:null,pendingVersion:0,lastRemoteAt:null,lastPullAt:0,
  get configured(){return !!(this.config?.url&&this.config?.key)},
  get dirty(){return localStorage.getItem('honCloudDirty')==='1'},
  set dirty(value){if(value)localStorage.setItem('honCloudDirty','1');else localStorage.removeItem('honCloudDirty')},
  headers(token=true){let h={'apikey':this.config.key,'Content-Type':'application/json'};if(token&&this.session?.access_token)h.Authorization='Bearer '+this.session.access_token;return h},
  async request(path,options={}){
   const {auth=true,_retried=false,...fetchOptions}=options;
   let res=await fetch(this.config.url.replace(/\/$/,'')+path,{...fetchOptions,cache:'no-store',headers:{...this.headers(auth),...(fetchOptions.headers||{})}});
   let body=await res.text(),data=null;
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
   ['honCloudConfig','honCloudSession','honCloudDirty','honLastRemoteAt','honLastRemoteRevision'].forEach(k=>localStorage.removeItem(k));
   this.config=this.session=this.pendingPayload=null
  },
  saveSession(s){this.session=s;localStorage.setItem('honCloudSession',JSON.stringify(s));this.scheduleRefresh()},
  async signUp(email,password){let data=await this.request('/auth/v1/signup',{method:'POST',auth:false,body:JSON.stringify({email,password})});if(data.access_token)this.saveSession(data);return data},
  async signIn(email,password){let data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:JSON.stringify({email,password})});this.saveSession(data);return data},
  async refresh(){
   if(!this.session?.refresh_token)return false;
   try{
    let data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:JSON.stringify({refresh_token:this.session.refresh_token})});
    this.saveSession(data);return true
   }catch{return false}
  },
  signOut(){
   this.session=null;localStorage.removeItem('honCloudSession');clearTimeout(this.timer);clearInterval(this.pollTimer);this.showAuth()
  },
  scheduleRefresh(){
   clearTimeout(this.timer);
   if(!this.session?.expires_in)return;
   this.timer=setTimeout(async()=>{if(!await this.refresh())this.setStatus('error','נדרשת התחברות מחדש')},Math.max(30000,(this.session.expires_in-120)*1000))
  },
  rememberRemote(updatedAt,revision){
   if(updatedAt){this.lastRemoteAt=updatedAt;localStorage.setItem('honLastRemoteAt',updatedAt);localStorage.setItem('honLocalChangedAt',updatedAt)}
   if(revision)localStorage.setItem('honLastRemoteRevision',revision)
  },
  async pull(force=false){
   if(!this.session?.user?.id||this.pulling||this.syncing)return;
   if(this.dirty&&!force)return this.push(this.pendingPayload||window.HONGetData?.());
   this.pulling=true;this.setStatus('syncing','בודק עדכונים…');
   try{
    let rows=await this.request('/rest/v1/hon_data?select=payload,updated_at&user_id=eq.'+encodeURIComponent(this.session.user.id)+'&limit=1',{method:'GET'});
    let row=rows?.[0];
    if(!row?.payload){
     this.pulling=false;
     await this.push(window.HONGetData?.());
     return
    }
    let remoteChanged=row.updated_at||'',remoteRevision=row.payload?._honSyncRevision||'',lastRevision=localStorage.getItem('honLastRemoteRevision')||'';
    let legacyLocal=localStorage.getItem('honLocalChangedAt')||'',shouldApply=force;
    if(!shouldApply){
     if(remoteRevision&&lastRevision)shouldApply=remoteRevision!==lastRevision;
     else if(!legacyLocal)shouldApply=true;
     else if(remoteChanged>legacyLocal)shouldApply=true;
     else if(remoteChanged<legacyLocal){
      this.pulling=false;
      this.dirty=true;
      await this.push(window.HONGetData?.());
      return
     }
     else if(remoteChanged===legacyLocal&&stable(window.HONGetData?.())!==stable(row.payload)){
      this.pulling=false;
      this.dirty=true;
      await this.push(window.HONGetData?.());
      return
     }
    }
    if(shouldApply)window.HONApplyCloud?.(row.payload,remoteChanged);
    this.rememberRemote(remoteChanged,remoteRevision);
    this.lastPullAt=Date.now();this.setStatus('ok',shouldApply?'עודכן מהענן':'הכול מסונכרן')
   }catch(e){this.setStatus('error','שגיאת סנכרון');console.warn('HON cloud pull failed',e)}
   finally{this.pulling=false}
  },
  queueSync(payload){
   if(!this.session?.user?.id)return;
   this.pendingPayload=clone(payload);this.pendingVersion++;this.dirty=true;
   localStorage.setItem('honLocalChangedAt',new Date().toISOString());
   clearTimeout(this.syncTimer);this.syncTimer=setTimeout(()=>this.push(),450)
  },
  async push(payload){
   if(!this.session?.user?.id)return;
   if(payload)this.pendingPayload=clone(payload);
   if(this.syncing)return;
   let snapshot=clone(this.pendingPayload||window.HONGetData?.());
   if(!snapshot)return;
   let version=this.pendingVersion,revision=(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)),now=new Date().toISOString();
   snapshot._honSyncRevision=revision;
   this.syncing=true;this.setStatus('syncing','שומר בענן…');
   try{
    let rows=await this.request('/rest/v1/hon_data?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:this.session.user.id,payload:snapshot,updated_at:now})});
    let saved=rows?.[0]||{},savedAt=saved.updated_at||now,savedRevision=saved.payload?._honSyncRevision||revision;
    this.rememberRemote(savedAt,savedRevision);
    if(version===this.pendingVersion){this.pendingPayload=null;this.dirty=false}
    this.setStatus('ok',version===this.pendingVersion?'נשמר וסונכרן':'שומר שינוי נוסף…')
   }catch(e){
    this.dirty=true;this.setStatus('error',navigator.onLine?'השמירה בענן נכשלה':'ממתין לאינטרנט');console.warn('HON cloud push failed',e)
   }finally{
    this.syncing=false;
    if(this.dirty&&this.pendingVersion!==version){clearTimeout(this.syncTimer);this.syncTimer=setTimeout(()=>this.push(),150)}
   }
  },
  async syncNow(forcePull=false){
   if(!this.session?.user?.id)return;
   if(this.syncing||this.pulling)return;
   if(forcePull)return this.pull(true);
   if(this.dirty)return this.push(this.pendingPayload||window.HONGetData?.());
   return this.pull(false)
  },
  startWatch(){
   clearInterval(this.pollTimer);
   this.pollTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine)this.syncNow()},15000)
  },
  setStatus(kind,text){
   let p=document.querySelector('#syncPill');if(!p)return;
   p.hidden=false;p.className='sync-pill '+kind;p.textContent=(kind==='ok'?'● ':kind==='error'?'! ':'↻ ')+text;
   p.title=this.session?.user?.email?`מחובר: ${this.session.user.email} · לחץ לסנכרון עכשיו`:'לחץ לסנכרון עכשיו'
  },
  showSetup(){
   let g=document.querySelector('#authGate');g.hidden=false;g.innerHTML=`<div class="modal-card auth-card"><button class="x" id="closeSetup">×</button><div class="brandmark">H</div><h2>חיבור HON לענן</h2><p class="muted">הדבק כאן את כתובת הפרויקט ואת המפתח הציבורי שקיבלת מ־Supabase.</p><form id="cloudSetup"><label>Project URL<input name="url" type="url" value="${this.config?.url||''}" placeholder="https://xxxxx.supabase.co" required></label><label>Publishable / anon key<textarea name="key" rows="4" required>${this.config?.key||''}</textarea></label><p id="setupError" class="down"></p><button class="primary full-btn">שמירה וחיבור</button></form><button class="text-btn" id="clearCloud">מחיקת הגדרת הענן</button></div>`;
   g.querySelector('#closeSetup').onclick=()=>g.hidden=true;
   g.querySelector('#clearCloud').onclick=()=>{this.clearConfig();location.reload()};
   g.querySelector('form').onsubmit=e=>{e.preventDefault();let fd=new FormData(e.target);this.saveConfig(fd.get('url'),fd.get('key'));location.reload()}
  },
  showAuth(){
   if(!this.configured)return;let g=document.querySelector('#authGate');g.hidden=false;g.innerHTML=`<div class="modal-card auth-card"><div class="brandmark">H</div><h2>המידע המשפחתי שלך</h2><p class="muted">התחבר כדי לשמור ולסנכרן בין המחשב לטלפון.</p><form id="cloudLogin"><label>אימייל<input name="email" type="email" required autocomplete="email"></label><label>סיסמה<input name="password" type="password" minlength="8" required autocomplete="current-password"></label><p id="authError" class="down"></p><button class="primary full-btn" name="mode" value="login">כניסה ל־HON</button><button class="ghost full-btn" name="mode" value="signup">יצירת חשבון חדש</button></form><button class="text-btn" id="localOnly">עבודה מקומית בלבד</button></div>`;
   let form=g.querySelector('form'),mode='login';form.querySelectorAll('button[name=mode]').forEach(b=>b.onclick=()=>mode=b.value);
   form.onsubmit=async e=>{e.preventDefault();let fd=new FormData(form),err=g.querySelector('#authError');err.textContent='';try{let result=mode==='signup'?await this.signUp(fd.get('email'),fd.get('password')):await this.signIn(fd.get('email'),fd.get('password'));if(mode==='signup'&&!result.access_token){err.textContent='נשלח אליך אימייל לאישור. אשר אותו ואז התחבר.';return}g.hidden=true;this.setStatus('ok','מחובר');this.startWatch();await this.syncNow(true)}catch(x){err.textContent=x.message}};
   g.querySelector('#localOnly').onclick=()=>{g.hidden=true;this.setStatus('error','מצב מקומי')}
  },
  async init(){
   this.loadConfig();let pill=document.querySelector('#syncPill');
   if(!this.configured){this.setStatus('error','הפעלת שמירה בענן');pill.onclick=()=>this.showSetup();return}
   pill.onclick=()=>this.syncNow();
   if(this.session){
    if(this.session.expires_at&&this.session.expires_at*1000<Date.now()&&!await this.refresh()){
     this.session=null;localStorage.removeItem('honCloudSession');this.showAuth();return
    }
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
