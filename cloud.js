(function(){
 const DEFAULT_CLOUD={url:'https://bofbgdoadqzwijhqeoed.supabase.co',key:'sb_publishable_mshQte_V_xRw2GKvL1FZUg_mP-xc0-D'};
 const API={
  config:null,session:null,timer:null,syncTimer:null,syncing:false,lastRemoteAt:null,
  get configured(){return !!(this.config?.url&&this.config?.key)},
  headers(token=true){let h={'apikey':this.config.key,'Content-Type':'application/json'};if(token&&this.session?.access_token)h.Authorization='Bearer '+this.session.access_token;return h},
  async request(path,options={}){let res=await fetch(this.config.url.replace(/\/$/,'')+path,{...options,headers:{...this.headers(options.auth!==false),...(options.headers||{})}}),body=await res.text(),data=body?JSON.parse(body):null;if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||'שגיאת שרת');return data},
  loadConfig(){try{this.config=JSON.parse(localStorage.getItem('honCloudConfig')||'null')||DEFAULT_CLOUD}catch{this.config=DEFAULT_CLOUD};try{this.session=JSON.parse(localStorage.getItem('honCloudSession')||'null')}catch{}},
  saveConfig(url,key){this.config={url:url.trim(),key:key.trim()};localStorage.setItem('honCloudConfig',JSON.stringify(this.config))},
  clearConfig(){localStorage.removeItem('honCloudConfig');localStorage.removeItem('honCloudSession');this.config=this.session=null},
  saveSession(s){this.session=s;localStorage.setItem('honCloudSession',JSON.stringify(s));this.scheduleRefresh()},
  async signUp(email,password){let data=await this.request('/auth/v1/signup',{method:'POST',auth:false,body:JSON.stringify({email,password})});if(data.access_token)this.saveSession(data);return data},
  async signIn(email,password){let data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:JSON.stringify({email,password})});this.saveSession(data);await this.pull(true);return data},
  async refresh(){if(!this.session?.refresh_token)return false;try{let data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:JSON.stringify({refresh_token:this.session.refresh_token})});this.saveSession(data);return true}catch{return false}},
  signOut(){this.session=null;localStorage.removeItem('honCloudSession');clearTimeout(this.timer);this.showAuth()},
  scheduleRefresh(){clearTimeout(this.timer);if(!this.session?.expires_in)return;this.timer=setTimeout(()=>this.refresh(),Math.max(30000,(this.session.expires_in-120)*1000))},
  async pull(force=false){
   if(!this.session?.user?.id)return;
   this.setStatus('syncing','מסנכרן…');
   try{
    let rows=await this.request('/rest/v1/hon_data?select=payload,updated_at&user_id=eq.'+encodeURIComponent(this.session.user.id),{method:'GET'});
    if(rows?.[0]?.payload){
     let localChanged=localStorage.getItem('honLocalChangedAt')||'',remoteChanged=rows[0].updated_at||'';
     if(force||remoteChanged>localChanged){this.lastRemoteAt=remoteChanged;window.HONApplyCloud?.(rows[0].payload,remoteChanged)}
    }else if(window.HONGetData){await this.push(window.HONGetData())}
    this.setStatus('ok','מסונכרן');
   }catch(e){this.setStatus('error','שגיאת סנכרון');console.warn(e)}
  },
  queueSync(payload){if(!this.session?.user?.id||this.syncing)return;localStorage.setItem('honLocalChangedAt',new Date().toISOString());clearTimeout(this.syncTimer);this.syncTimer=setTimeout(()=>this.push(payload),900)},
  async push(payload){
   if(!this.session?.user?.id)return;this.syncing=true;this.setStatus('syncing','שומר…');
   try{let now=new Date().toISOString();await this.request('/rest/v1/hon_data?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:this.session.user.id,payload,updated_at:now})});localStorage.setItem('honLocalChangedAt',now);this.lastRemoteAt=now;this.setStatus('ok','נשמר בענן')}
   catch(e){this.setStatus('error','שמירה מקומית בלבד');console.warn(e)}
   finally{this.syncing=false}
  },
  setStatus(kind,text){let p=document.querySelector('#syncPill');if(!p)return;p.hidden=false;p.className='sync-pill '+kind;p.textContent=(kind==='ok'?'● ':kind==='error'?'! ':'↻ ')+text},
  showSetup(){
   let g=document.querySelector('#authGate');g.hidden=false;g.innerHTML=`<div class="modal-card auth-card"><button class="x" id="closeSetup">×</button><div class="brandmark">H</div><h2>חיבור HON לענן</h2><p class="muted">הדבק כאן את כתובת הפרויקט ואת המפתח הציבורי שקיבלת מ־Supabase.</p><form id="cloudSetup"><label>Project URL<input name="url" type="url" value="${this.config?.url||''}" placeholder="https://xxxxx.supabase.co" required></label><label>Publishable / anon key<textarea name="key" rows="4" required>${this.config?.key||''}</textarea></label><p id="setupError" class="down"></p><button class="primary full-btn">שמירה וחיבור</button></form><button class="text-btn" id="clearCloud">מחיקת הגדרת הענן</button></div>`;
   g.querySelector('#closeSetup').onclick=()=>g.hidden=true;
   g.querySelector('#clearCloud').onclick=()=>{this.clearConfig();location.reload()};
   g.querySelector('form').onsubmit=e=>{e.preventDefault();let fd=new FormData(e.target);this.saveConfig(fd.get('url'),fd.get('key'));location.reload()}
  },
  showAuth(){
   if(!this.configured)return;let g=document.querySelector('#authGate');g.hidden=false;g.innerHTML=`<div class="modal-card auth-card"><div class="brandmark">H</div><h2>המידע המשפחתי שלך</h2><p class="muted">התחבר כדי לשמור ולסנכרן בין המחשב לטלפון.</p><form id="cloudLogin"><label>אימייל<input name="email" type="email" required autocomplete="email"></label><label>סיסמה<input name="password" type="password" minlength="8" required autocomplete="current-password"></label><p id="authError" class="down"></p><button class="primary full-btn" name="mode" value="login">כניסה ל־HON</button><button class="ghost full-btn" name="mode" value="signup">יצירת חשבון חדש</button></form><button class="text-btn" id="localOnly">עבודה מקומית בלבד</button></div>`;
   let form=g.querySelector('form'),mode='login';form.querySelectorAll('button[name=mode]').forEach(b=>b.onclick=()=>mode=b.value);
   form.onsubmit=async e=>{e.preventDefault();let fd=new FormData(form),err=g.querySelector('#authError');err.textContent='';try{let result=mode==='signup'?await this.signUp(fd.get('email'),fd.get('password')):await this.signIn(fd.get('email'),fd.get('password'));if(mode==='signup'&&!result.access_token){err.textContent='נשלח אליך אימייל לאישור. אשר אותו ואז התחבר.';return}g.hidden=true;this.setStatus('ok','מחובר');await this.pull(true)}catch(x){err.textContent=x.message}};
   g.querySelector('#localOnly').onclick=()=>{g.hidden=true;this.setStatus('error','מצב מקומי')}
  },
  async init(){this.loadConfig();let pill=document.querySelector('#syncPill');if(!this.configured){this.setStatus('error','הפעלת שמירה בענן');pill.onclick=()=>this.showSetup();return}pill.onclick=()=>this.showSetup();if(this.session){if(this.session.expires_at&&this.session.expires_at*1000<Date.now())await this.refresh();if(this.session){this.scheduleRefresh();await this.pull();return}}this.showAuth()}
 };
 window.HONCloud=API;
 window.addEventListener('online',()=>API.pull());
})();
