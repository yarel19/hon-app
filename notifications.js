(function(){
 const state={ready:false,busy:false,error:'',subscription:null};
 const supported=()=>('Notification'in window)&&('serviceWorker'in navigator)&&('PushManager'in window);
 const decodeKey=value=>{let padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64);return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)))};
 const api=()=>window.HONCloud;
 const session=()=>api()?.session;
 const notifyRender=()=>{if(document.querySelector('.stitch-notification-settings')&&typeof window.render==='function')window.render()};
 function label(){
  if(!supported())return'המכשיר לא תומך';
  if(Notification.permission==='denied')return'חסומות בהגדרות הטלפון';
  if(state.ready)return'פעילות בטלפון';
  if(state.error)return'נדרשת השלמת הגדרה';
  return Notification.permission==='granted'?'ממתינות לחיבור':'טרם הופעלו'
 }
 function status(){return{supported:supported(),permission:supported()?Notification.permission:'unsupported',ready:state.ready,label:label(),error:state.error}}
 async function saveSubscription(subscription){
  let cloud=api(),active=session();if(!cloud?.configured||!active?.user?.id)throw new Error('יש להתחבר לענן לפני הפעלת ההתראות');
  let json=subscription.toJSON(),keys=json.keys||{};
  await cloud.request('/rest/v1/hon_push_subscriptions?on_conflict=user_id,endpoint',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:active.user.id,endpoint:json.endpoint,p256dh:keys.p256dh,auth:keys.auth,expiration_time:json.expirationTime||null,user_agent:navigator.userAgent,active:true,updated_at:new Date().toISOString()})})
 }
 function reminderRecord(reminder,userId){
  let scheduled=reminder.nextAt?new Date(reminder.nextAt):new Date(`${reminder.date}T${reminder.time||'09:00'}:00`);
  return{user_id:userId,id:reminder.id,title:reminder.title,body:reminder.body||'',next_at:scheduled.toISOString(),repeat_type:reminder.repeat||'none',interval_value:Math.max(1,+reminder.intervalValue||1),interval_unit:reminder.intervalUnit||'days',active:reminder.active!==false,payload:{date:reminder.date,time:reminder.time,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Jerusalem'},updated_at:reminder.updatedAt||reminder.createdAt||new Date().toISOString()}
 }
 async function sync(){
  if(state.busy||!state.ready)return false;
  let cloud=api(),active=session(),data=window.HONGetData?.();if(!cloud||!active?.user?.id||!data)return false;
  state.busy=true;
  try{
   let existing=await cloud.request('/rest/v1/hon_reminders?select=id,next_at,active,updated_at&user_id=eq.'+encodeURIComponent(active.user.id),{method:'GET'});window.HONApplyReminderServerState?.(existing||[]);data=window.HONGetData?.()||data;
   let serverById=new Map((existing||[]).map(row=>[row.id,row])),rows=(data.reminders||[]).filter(reminder=>{let server=serverById.get(reminder.id);return!server||String(reminder.updatedAt||'')>=String(server.updated_at||'')}).map(reminder=>reminderRecord(reminder,active.user.id));
   if(rows.length)await cloud.request('/rest/v1/hon_reminders?on_conflict=user_id,id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
   let keep=new Set((data.reminders||[]).map(x=>x.id));
   for(const row of existing||[])if(!keep.has(row.id))await cloud.request('/rest/v1/hon_reminders?user_id=eq.'+encodeURIComponent(active.user.id)+'&id=eq.'+encodeURIComponent(row.id),{method:'DELETE'});
   state.error='';return true
  }catch(error){state.error=error.message||'שגיאת חיבור';console.warn('HON reminder sync failed',error);return false}
  finally{state.busy=false;notifyRender()}
 }
 async function enable(){
  if(!supported()){window.toast?.('המכשיר הזה אינו תומך בהתראות PWA');return false}
  if(state.busy)return false;
  state.busy=true;
  try{
   let permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('יש לאשר התראות בהגדרות הטלפון');
   let cloud=api(),active=session();if(!cloud?.configured||!active?.user?.id)throw new Error('יש להתחבר לענן לפני הפעלת ההתראות');
   let registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
   if(!subscription){let result=await cloud.request('/functions/v1/hon-reminders?action=vapid',{method:'GET'});if(!result?.publicKey)throw new Error('שירות ההתראות עדיין לא הוגדר');subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(result.publicKey)})}
   await saveSubscription(subscription);state.subscription=subscription;state.ready=true;localStorage.setItem('honPushReady','1');state.error='';window.toast?.('ההתראות הופעלו בטלפון');state.busy=false;await sync();notifyRender();return true
  }catch(error){state.ready=false;state.error=error.message||'הפעלת ההתראות נכשלה';localStorage.removeItem('honPushReady');window.toast?.(state.error);console.warn('HON notifications enable failed',error);notifyRender();return false}
  finally{state.busy=false}
 }
 async function test(){
  if(!state.ready){window.toast?.('יש להפעיל תחילה את ההתראות');return}
  try{await api().request('/functions/v1/hon-reminders?action=test',{method:'POST',body:JSON.stringify({title:'HON · בדיקת התראה',body:'ההתראות פועלות גם כשהאפליקציה סגורה.'})});window.toast?.('התראת בדיקה נשלחה לטלפון')}
  catch(error){state.error=error.message||'בדיקת ההתראה נכשלה';window.toast?.(state.error);notifyRender()}
 }
 async function init(){
  if(!supported()||Notification.permission!=='granted')return;
  try{let registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();if(subscription){state.subscription=subscription;state.ready=true;localStorage.setItem('honPushReady','1');await saveSubscription(subscription);await sync()}}
  catch(error){state.error=error.message||'שירות ההתראות אינו מחובר';state.ready=false;localStorage.removeItem('honPushReady')}
  notifyRender()
 }
 window.HONNotifications={status,enable,test,sync,init};
 window.addEventListener('load',()=>setTimeout(init,900));
})();
