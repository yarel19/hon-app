const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');

const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,'');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const stitch=fs.readFileSync(path.join(root,'stitch-ui.js'),'utf8');
const theme=fs.readFileSync(path.join(root,'stitch-theme.css'),'utf8');
const month=new Date().toISOString().slice(0,7);
const seed={
 version:17,
 transactions:[
  {id:'t1',date:`${month}-02`,kind:'income',amount:12500,category:'salary',account:'bank',note:'העברת שכר',reviewed:true},
  {id:'t2',date:`${month}-05`,kind:'expense',amount:450,category:'food',account:'bank',note:'סופר-פארם',reviewed:false},
  {id:'t3',date:`${month}-07`,kind:'saving',amount:700,category:'saving',account:'bank',note:'חיסכון חודשי',reviewed:true}
 ],
 accounts:[
  {id:'bank',name:'חשבון עו״ש',type:'asset',subtype:'bank',liquid:true,balance:12400},
  {id:'cash',name:'מזומן',type:'asset',subtype:'cash',liquid:true,balance:1850},
  {id:'pension',name:'פנסיה',type:'asset',subtype:'pension',liquid:false,balance:60000},
  {id:'car',name:'רכב',type:'asset',subtype:'property',liquid:false,balance:28000},
  {id:'loan',name:'הלוואה',type:'liability',subtype:'other',balance:9000,originalBalance:12000,interest:4.2,payment:600,lender:'הבנק'}
 ],
 wallets:[
  {id:'w1',name:'Bit',walletType:'bit',balance:420,color:'#1976d2'},
  {id:'w2',name:'Paybox',walletType:'paybox',balance:1105,color:'#7c3aed'}
 ],
 categories:[
  {id:'salary',name:'משכורת',kind:'income',color:'#159A75'},
  {id:'food',name:'מזון וקניות',kind:'expense',color:'#3B6FD8'},
  {id:'housing',name:'דיור',kind:'expense',color:'#E28C2D'},
  {id:'health',name:'בריאות',kind:'expense',color:'#D95763'},
  {id:'saving',name:'חיסכון והשקעה',kind:'saving',color:'#159A75'}
 ],
 budgets:[{month,category:'food',amount:2000},{month,category:'housing',amount:3000},{month,category:'health',amount:500}],
 monthPlans:[{month,income:13000}],
 ironBudget:{income:13000,categories:[{category:'food',amount:2000}]},
 goals:[{id:'g1',name:'בר מצווה',target:20000,current:5000,startMonth:month,deadlineMonth:'2029-07',date:'2029-07-01',term:'long',calculationMode:'auto',moneyLocation:'פיקדון'}],
 debts:[],
 recurring:[],
 snapshots:[{month:'2026-06',assets:100000,liabilities:10000,net:90000}],
 reviews:[],
 settings:{name:'משפחת כברה',currency:'ILS',onboarded:true,budgetSort:'manual'}
};

const errors=[];
const virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{
 url:'https://example.test/',
 runScripts:'outside-only',
 pretendToBeVisual:true,
 virtualConsole,
 beforeParse(window){
  Object.defineProperty(window,'innerWidth',{value:390,configurable:true});
  Object.defineProperty(window.navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 14; Mobile)',configurable:true});
  window.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
  window.structuredClone=global.structuredClone;
  window.crypto.randomUUID=()=>`test-${Math.random()}`;
  Object.defineProperty(window.navigator,'serviceWorker',{value:{register:()=>Promise.resolve()},configurable:true});
  window.alert=()=>{};window.confirm=()=>true;
 }
});
dom.window.localStorage.setItem('honSheli',JSON.stringify(seed));
// A browser shares the global lexical environment between classic scripts.
// Evaluate both sources as one program so jsdom mirrors that behavior.
dom.window.eval(`${app}\n${stitch}`);

const d=dom.window.document;
const assert=(value,message)=>{if(!value)throw new Error(message)};
const visit=page=>{
 const button=d.querySelector(`[data-page="${page}"]`);
 assert(button,`קישור חסר: ${page}`);
 button.click();
 assert(d.querySelector('.stitch-page'),`מעטפת Stitch חסרה: ${page}`)
};

assert(d.documentElement.classList.contains('stitch-ui-ready'),'שכבת Stitch לא הופעלה');
assert(d.querySelector('.stitch-mobile-brandmark')?.textContent==='H','האייקון הקודם לא הוחזר');
assert(d.querySelector('.stitch-overview-heading')?.textContent.includes('משפחת כברה'),'הכותרת המשפחתית בסקירה חסרה');
assert(d.querySelector('.stitch-overview-heading')?.textContent.includes('שלכם'),'הפנייה למשפחה אינה מנוסחת נכון');
assert(!d.body.textContent.includes('הסקירה שלך'),'הכותרת הקטנה המיותרת עדיין מוצגת');
assert(theme.includes('text-align:center!important'),'כותרת הסקירה אינה ממורכזת');
assert(!d.querySelector('.stitch-overview-brandmark'),'אייקון H כפול עדיין מוצג במחשב');
assert(d.querySelector('.stitch-net-hero'),'כרטיס ההון של Stitch חסר');
assert(d.querySelectorAll('.stitch-balance-icon').length===2,'אייקוני יתרות העו״ש והמזומן חסרים');
assert(d.querySelector('.stitch-month-icon'),'אייקון סיכום החודש חסר');
assert(d.querySelector('.stitch-advice-copy strong'),'הפעולה המומלצת אינה מודגשת');
assert(d.querySelector('.stitch-wallet-copy'),'פרטי הארנק אינם מסודרים');
assert(d.querySelector('.stitch-wallet-compact')?.style.getPropertyValue('--wallet-color'),'צבע הארנק אינו מחובר לכרטיס');
assert(d.querySelector('.stitch-wallet-compact .stitch-wallet-logo')?.style.getPropertyValue('--wallet-color'),'צבע הארנק אינו מחובר לאות');
assert(theme.includes('--st-gold:#c99a3d'),'צבע הזהב היוקרתי חסר');
assert(theme.includes('--st-teal:#16a085'),'צבע ההכנסות חסר');
assert(theme.includes('@keyframes stitchProgress'),'אנימציית פסי ההתקדמות חסרה');
assert(theme.includes('@media(prefers-reduced-motion:reduce)'),'התאמת נגישות לאנימציות חסרה');
assert(d.body.textContent.includes('12,400'),'יתרת העו״ש הקיימת לא מוצגת');
assert(d.querySelectorAll('#mobileNav .stitch-mobile-nav-btn').length===5,'ניווט הנייד אינו כולל 5 פעולות');

visit('cashflow');
assert(d.querySelector('.stitch-forecast'),'תחזית Stitch חסרה');
assert(d.querySelectorAll('.stitch-forecast-factor').length===3,'רכיבי החישוב בתחזית אינם מסודרים');
assert(d.querySelector('.stitch-forecast-answer'),'תוצאת התחזית חסרה');
assert(!d.querySelector('.stitch-forecast-heading')?.textContent.includes('תחזית חודשית'),'הכותרת הכפולה בתחזית עדיין מוצגת');
assert(d.querySelector('.stitch-budget-toolbar-v23'),'סרגל כלי התקציב החדש חסר');
assert(d.querySelector('.stitch-budget-card'),'קטגוריות התקציב חסרות');
d.querySelector('[data-flow-tab="transactions"]').click();
assert(d.querySelector('.stitch-transactions-card'),'רשימת התנועות חסרה');
assert(d.querySelector('.stitch-activity-row.detailed'),'שורת תנועה מקצועית ומפורטת חסרה');
assert(d.querySelector('.stitch-tx-account'),'עמודת החשבון בתנועות חסרה');
assert(d.body.textContent.includes('סופר-פארם'),'תנועה קיימת לא מוצגת');

visit('wealth');
assert(d.querySelector('.stitch-wealth-bento'),'סיכום ההון חסר');
assert(!d.querySelector('.stitch-wealth-chart-card'),'מגמת ההון העצמי המיותרת עדיין מוצגת');
assert(d.body.textContent.includes('פנסיה'),'נכס קיים לא מוצג');
assert(d.body.textContent.includes('הלוואה'),'התחייבות קיימת לא מוצגת');

visit('wallets');
assert(d.querySelectorAll('.stitch-wallet-card').length===2,'הארנקים הקיימים לא מוצגים');
assert(theme.includes('.stitch-wallet-grid{grid-template-columns:repeat(3,minmax(0,1fr))}'),'הארנקים אינם מסודרים בשלושה טורים במחשב');

visit('goals');
assert(d.querySelector('.stitch-goal-card'),'מטרה קיימת לא מוצגת');
assert(d.body.textContent.includes('בר מצווה'),'שם המטרה הקיימת לא מוצג');
assert(d.querySelectorAll('.stitch-goal-plan-card').length===1,'לוח החיסכון אינו מוצג כמשבצת אחת');
assert(!d.querySelector('.stitch-goal-year-card'),'עדיין מוצגות משבצות נפרדות לכל שנה');
assert(d.querySelectorAll('[data-goal-plan-month]').length===12,'לא ניתן לעבור בין כל חודשי השנה');
assert(d.querySelector('.stitch-goal-month-total')?.textContent.includes('נדרש לחסוך'),'הסכום החודשי הנדרש חסר');
assert(d.querySelector('.stitch-goal-month-parts')?.textContent.includes('בר מצווה'),'הרכב החיסכון החודשי חסר');
assert(d.querySelectorAll('[data-goal-year]').length===2,'מעבר בין שנים חסר');
const nextGoalYear=d.querySelector('[data-goal-year="1"]');
assert(nextGoalYear&&!nextGoalYear.disabled,'לא ניתן לעבור לשנה הבאה');
nextGoalYear.click();
assert(d.querySelector('.stitch-goal-year-switch')?.textContent.includes(String(+month.slice(0,4)+1)),'המעבר בין שנים לא פועל');
assert(d.querySelector('.stitch-goal-month-parts')?.textContent.includes('בר מצווה'),'הרכב החיסכון נעלם לאחר מעבר שנה');

visit('debts');
assert(d.querySelector('.stitch-debt-card'),'חוב מההון העצמי לא מוצג');
assert(!d.querySelector('.stitch-simulation-card'),'הסימולציה החכמה המיותרת עדיין מוצגת');

visit('review');
assert(d.querySelector('.stitch-review-card'),'מסך סגירת החודש חסר');

visit('settings');
assert(d.querySelector('#categorySorter'),'ניהול הקטגוריות חסר');
assert(d.querySelector('.stitch-category-icon'),'תצוגת אייקון הקטגוריה בהגדרות חסרה');
const foodEdit=d.querySelector('[data-cat-id="food"] [data-action="editCat"]');
assert(foodEdit,'כפתור עריכת קטגוריית מזון חסר');
foodEdit.click();
assert(d.querySelectorAll('[data-category-icon]').length>=30,'ספריית האייקונים אינה רחבה מספיק');
const apparel=d.querySelector('[data-category-icon="apparel"]');
assert(apparel,'אייקון ביגוד חסר');
apparel.click();
d.querySelector('#form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
assert(dom.window.HONGetData().categories.find(x=>x.id==='food').icon==='apparel','בחירת אייקון לקטגוריה לא נשמרה');

const saved=dom.window.HONGetData();
assert(saved.version===17,'מבנה הנתונים שונה');
assert(saved.transactions.length===seed.transactions.length,'תנועות נמחקו');
assert(saved.accounts.length===seed.accounts.length,'חשבונות נמחקו');
assert(saved.wallets.length===seed.wallets.length,'ארנקים נמחקו');
assert(saved.goals.length===seed.goals.length,'מטרות נמחקו');
assert(saved.accounts.find(x=>x.id==='bank').balance===12400,'יתרת עו״ש השתנתה');
assert(theme.includes('direction:ltr'),'סדר הכותרת והאייקון בתחזית הנייד לא תוקן');
assert(theme.includes('grid-template-columns:45px minmax(0,1fr)'),'אזור הכותרת בתחזית המחשב אינו מופרד מהאייקון');

visit('dashboard');
const beforeAdd=dom.window.HONGetData().transactions.length;
d.querySelector('[data-action="addTx"]').click();
const txForm=d.querySelector('#form');
assert(txForm&&!d.querySelector('#modal').hidden,'חלון הוספת תנועה לא נפתח');
const accountOptions=[...txForm.elements.account.options];
assert(accountOptions.length===2,'הוצאה חדשה כוללת יותר מעו״ש ומזומן');
assert(accountOptions.map(x=>x.textContent).join('|')==='עו״ש|מזומן','שמות מקורות התנועה אינם עו״ש ומזומן');
assert(txForm.elements.account.value==='bank','עו״ש אינו ברירת המחדל');
const categoryLabels=[...txForm.elements.category.options].map(x=>x.textContent);
assert(categoryLabels.join('|')===[...categoryLabels].sort((a,b)=>a.localeCompare(b,'he')).join('|'),'קטגוריות ההוצאה אינן ממוינות לפי א׳-ב׳');
txForm.elements.kind.value='expense';
txForm.elements.amount.value='25.50';
txForm.elements.date.value=`${month}-09`;
txForm.elements.category.value='food';
txForm.elements.account.value='bank';
txForm.elements.note.value='בדיקת פעולה';
txForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
const afterAdd=dom.window.HONGetData();
assert(afterAdd.transactions.length===beforeAdd+1,'הוספת תנועה לא נשמרה');
assert(afterAdd.transactions.some(x=>x.note==='בדיקת פעולה'&&x.amount===25.5),'פרטי התנועה החדשה לא נשמרו');

assert(!/[—–]/.test(app+stitch+html),'נשאר מקף ארוך בטקסט האפליקציה');
assert(errors.length===0,`שגיאות דפדפן: ${errors.join('; ')}`);

console.log('HON Stitch v24 passed the single monthly goal navigator, category icon library, forecast alignment, three-column wallets, debt cleanup, existing-data preservation, and mobile navigation checks.');
