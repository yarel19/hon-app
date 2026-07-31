const fs=require('fs');
const {JSDOM}=require('jsdom');
const cloud=fs.readFileSync('cloud.js','utf8');
const initial={version:17,transactions:[{id:'base',date:'2026-07-01',kind:'income',amount:100}],accounts:[],categories:[],budgets:[],settings:{name:'משפחה'}};
let row={payload:{...structuredClone(initial),_honSyncRevision:'r0',_honSyncBackups:[]},updated_at:'2026-07-01T00:00:00.000Z'},conflictOnce=false,patches=0;
const response=(status,data)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
async function serverFetch(url,options={}){
 const parsed=new URL(url),method=options.method||'GET';
 if(method==='GET')return response(200,row?[structuredClone(row)]:[]);
 if(method==='POST'){
  if(row)return response(409,{message:'duplicate'});
  let body=JSON.parse(options.body);row={payload:body.payload,updated_at:body.updated_at};return response(201,[structuredClone(row)])
 }
 if(method==='PATCH'){
  patches++;
  if(conflictOnce){conflictOnce=false;row.payload.transactions.push({id:'remote-race',date:'2026-07-04',kind:'expense',amount:7});row.payload._honSyncRevision='race';row.updated_at=new Date(Date.now()+1000).toISOString();return response(200,[])}
  let expected=(parsed.searchParams.get('updated_at')||'').replace(/^eq\./,''),body=JSON.parse(options.body);
  if(!row||row.updated_at!==expected)return response(200,[]);
  row={payload:body.payload,updated_at:body.updated_at};return response(200,[structuredClone(row)])
 }
 return response(405,{message:'unsupported'})
}
function device(name){
 const dom=new JSDOM('<div id="syncPill"></div><div id="authGate"></div>',{url:`https://${name}.test`,runScripts:'outside-only'}),window=dom.window;
 window.structuredClone=structuredClone;window.fetch=serverFetch;window.crypto.randomUUID=()=>`${name}-${Math.random()}`;window.navigator.onLine=true;
 let data=structuredClone(initial);window.HONGetData=()=>structuredClone(data);window.HONApplyCloud=next=>{data=structuredClone(next)};window.eval(cloud);
 const api=window.HONCloud;api.config={url:'https://supabase.test',key:'key'};api.session={user:{id:'user-1'},access_token:'token'};api.setBase(initial,row.updated_at,'r0');
 return{window,api,get data(){return data},set data(value){data=value}}
}
const assert=(value,message)=>{if(!value)throw new Error(message)};
(async()=>{
 const computer=device('computer'),phone=device('phone');
 computer.data.transactions.push({id:'computer-change',date:'2026-07-02',kind:'expense',amount:20});computer.api.queueSync(computer.data);await computer.api.push();
 assert(row.payload.transactions.some(x=>x.id==='computer-change'),'שינוי המחשב לא נשמר');
 phone.data.transactions.push({id:'phone-change',date:'2026-07-03',kind:'expense',amount:30});phone.api.queueSync(phone.data);conflictOnce=true;await phone.api.push();
 assert(row.payload.transactions.some(x=>x.id==='computer-change'),'שינוי המחשב נדרס על ידי הטלפון');
 assert(row.payload.transactions.some(x=>x.id==='phone-change'),'שינוי הטלפון לא מוזג');
 assert(row.payload.transactions.some(x=>x.id==='remote-race'),'שינוי מקביל בענן לא נשמר לאחר ניסיון חוזר');
 const stale=device('stale-phone'),beforePatches=patches;stale.api.queueSync(stale.data);await stale.api.push();
 assert(patches===beforePatches,'מכשיר ישן ללא שינוי העלה עותק מיותר');
 assert(stale.data.transactions.some(x=>x.id==='computer-change')&&stale.data.transactions.some(x=>x.id==='phone-change'),'המכשיר הישן לא קיבל את המידע החדש');
 assert(row.payload._honSyncBackups.length>0,'היסטוריית גרסאות הענן לא נשמרה');
 const restorer=device('restorer');await restorer.api.pull(true);let backups=restorer.api.getBackups(),revisionBeforeRestore=row.payload._honSyncRevision;
 assert(backups.length>0,'גרסאות הענן אינן זמינות למסך השחזור');
 await restorer.api.restoreVersion(0);
 assert(row.payload._honSyncRevision!==revisionBeforeRestore,'שחזור גרסת ענן לא נשמר כגרסה חדשה');
 assert(restorer.data.transactions.length===backups[0].data.transactions.length,'המידע המקומי לא חזר לגרסה שנבחרה');
 console.log('HON v28 safe sync passed two-device merge, stale-device protection, optimistic retry and cloud-version history.');
 process.exit(0)
})().catch(error=>{console.error(error);process.exit(1)});
