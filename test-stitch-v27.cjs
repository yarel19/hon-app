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
  {id:'food',name:'מזון וקניות',kind:'expense',color:'#3B6FD8',icon:'apparel'},
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
assert(dom.window.HONGetData().categories.find(x=>x.id==='food').icon==='checkroom','אייקון הביגוד הישן לא הומר לאייקון נתמך');
assert(d.querySelector('.stitch-mobile-brandmark')?.textContent==='H','האייקון הקודם לא הוחזר');
assert(d.querySelector('.stitch-overview-heading')?.textContent.includes('משפחת כברה'),'הכותרת המשפחתית בסקירה חסרה');
assert(d.querySelector('.stitch-overview-heading')?.textContent.includes('שלכם'),'הפנייה למשפחה אינה מנוסחת נכון');
assert(!d.body.textContent.includes('הסקירה שלך'),'הכותרת הקטנה המיותרת עדיין מוצגת');
assert(theme.includes('text-align:center!important'),'כותרת הסקירה אינה ממורכזת');
assert(!d.querySelector('.stitch-overview-brandmark'),'אייקון H כפול עדיין מוצג במחשב');
assert(d.querySelector('.stitch-net-hero'),'כרטיס ההון של Stitch חסר');
assert(d.querySelectorAll('.stitch-balance-icon').length===2,'אייקוני יתרות העו״ש והמזומן חסרים');
assert(d.querySelectorAll('.stitch-balance-monthly').length===2,'השוואת יתרות תחילת החודש חסרה');
assert(d.querySelector('.stitch-opening-summary'),'סיכום השינוי בעו״ש ובמזומן חסר');
let openingData=dom.window.HONGetData();
assert(openingData.monthlyOpeningBalances.length===2,'יתרות פתיחה חודשיות לא נוצרו');
const currentBankBeforeOpeningEdit=openingData.accounts.find(x=>x.id==='bank').balance;
d.querySelector('[data-action="correctOpeningBalances"]').click();
assert(d.querySelector('#form').elements.bank,'שדה יתרת פתיחה לעו״ש חסר');
d.querySelector('#form').elements.bank.value='12000';
d.querySelector('#form').elements.cash.value='1800';
d.querySelector('#form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
openingData=dom.window.HONGetData();
assert(openingData.monthlyOpeningBalances.find(x=>x.type==='bank').amount===12000,'תיקון יתרת פתיחה לעו״ש לא נשמר');
assert(openingData.monthlyOpeningBalances.find(x=>x.type==='cash').amount===1800,'תיקון יתרת פתיחה למזומן לא נשמר');
assert(openingData.accounts.find(x=>x.id==='bank').balance===currentBankBeforeOpeningEdit,'תיקון יתרת פתיחה שינה בטעות את היתרה הנוכחית');
assert(d.querySelector('.stitch-balance-card.bank')?.textContent.includes('עלה'),'השינוי החודשי בעו״ש אינו מוצג');
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
assert(d.querySelector('.stitch-cashflow-command'),'מרכז השליטה החדש של התקציב חסר');
assert(d.querySelector('.stitch-cashflow-command-head .stitch-month-switch'),'בחירת החודש אינה משולבת במרכז השליטה');
assert(d.querySelectorAll('.stitch-cashflow-kpis article').length===3,'נתוני התקציב אינם מסודרים בשלושה מדדים');
assert(d.querySelector('.stitch-cashflow-command .stitch-tabs'),'לשוניות התקציב אינן משולבות במרכז השליטה');
assert(d.querySelector('.stitch-forecast'),'תחזית Stitch חסרה');
assert(d.querySelector('.stitch-forecast-luxury'),'כרטיס התחזית היוקרתי חסר');
assert(d.querySelectorAll('.stitch-forecast-breakdown>div').length===3,'פירוט התחזית אינו מסודר');
assert(d.querySelector('.stitch-forecast-luxury-result'),'תוצאת התחזית חסרה');
assert(!d.querySelector('.stitch-forecast .material-symbols-outlined'),'עדיין מוצג אייקון בתוך התחזית');
assert(!d.querySelector('.stitch-forecast-operator'),'עדיין מוצגים סימני חישוב בתוך התחזית');
assert(!d.querySelector('.stitch-forecast-heading')?.textContent.includes('תחזית חודשית'),'הכותרת הכפולה בתחזית עדיין מוצגת');
assert(d.querySelector('.stitch-flex-fund'),'קופת הגמישות חסרה');
assert(d.querySelector('.stitch-flex-balance')?.textContent.includes('0 ₪'),'קופת גמישות חדשה אינה מתחילה באפס');
assert(d.querySelector('.stitch-budget-toolbar-v23'),'סרגל כלי התקציב החדש חסר');
assert(d.querySelector('.stitch-budget-card'),'קטגוריות התקציב חסרות');
const forecastBeforeFlex=d.querySelector('.stitch-forecast-luxury-result strong').textContent;
d.querySelector('[data-action="collectFlex"]').click();
const foodFlexRow=d.querySelector('[data-flex-category="food"]');
assert(foodFlexRow,'קטגוריה עם יתרה אינה זמינה לאיסוף');
foodFlexRow.querySelector('.stitch-flex-all-button').click();
assert(+foodFlexRow.querySelector('.stitch-flex-amount-input').value===1550,'כפתור כל היתרה אינו ממלא את מלוא הסכום');
foodFlexRow.querySelector('.stitch-flex-amount-input').value='100';
foodFlexRow.querySelector('.stitch-flex-amount-input').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
assert(d.querySelector('#flexCollectTotal')?.textContent.includes('100'),'סכום ידני אינו מעדכן את סך האיסוף');
d.querySelector('#form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
let flexData=dom.window.HONGetData();
assert(flexData.budgetFlexTransfers.length===1,'איסוף יתרה לא נשמר');
assert(flexData.budgetFlexTransfers[0].amount===100&&flexData.budgetFlexTransfers[0].type==='collect','פרטי האיסוף אינם נכונים');
assert(flexData.budgets.find(x=>x.month===month&&x.category==='food').amount===1900,'תקציב המקור לא קטן בסכום שנאסף');
assert(d.querySelector('.stitch-flex-balance')?.textContent.includes('100 ₪'),'יתרת קופת הגמישות לא התעדכנה');
assert(d.querySelector('.stitch-forecast-luxury-result strong').textContent===forecastBeforeFlex,'איסוף יתרה שינה בטעות את התחזית');
d.querySelector('[data-action="allocateFlex"]').click();
d.querySelector('#flexTarget').value='health';
d.querySelector('#flexAllocateAmount').value='60';
d.querySelector('#form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
flexData=dom.window.HONGetData();
assert(flexData.budgetFlexTransfers.length===2,'חלוקה מחדש לא נשמרה');
assert(flexData.budgets.find(x=>x.month===month&&x.category==='health').amount===560,'תקציב היעד לא גדל מהקופה');
assert(d.querySelector('.stitch-flex-balance')?.textContent.includes('40 ₪'),'יתרת הקופה לאחר החלוקה אינה נכונה');
d.querySelector('[data-action="flexHistory"]').click();
assert(d.querySelectorAll('.stitch-flex-history-list article').length===2,'היסטוריית קופת הגמישות חסרה');
d.querySelector('#undoLastFlex').click();
flexData=dom.window.HONGetData();
assert(flexData.budgetFlexTransfers.length===1,'ביטול הפעולה האחרונה לא פעל');
assert(flexData.budgets.find(x=>x.month===month&&x.category==='health').amount===500,'ביטול החלוקה לא החזיר את תקציב היעד');
assert(d.querySelector('.stitch-flex-balance')?.textContent.includes('100 ₪'),'ביטול החלוקה לא החזיר את הכסף לקופה');
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
const checkroom=d.querySelector('[data-category-icon="checkroom"]');
assert(checkroom,'אייקון ביגוד נתמך חסר');
checkroom.click();
d.querySelector('#form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
assert(dom.window.HONGetData().categories.find(x=>x.id==='food').icon==='checkroom','בחירת אייקון לקטגוריה לא נשמרה');

const saved=dom.window.HONGetData();
assert(saved.version===17,'מבנה הנתונים שונה');
assert(saved.transactions.length===seed.transactions.length,'תנועות נמחקו');
assert(saved.accounts.length===seed.accounts.length,'חשבונות נמחקו');
assert(saved.wallets.length===seed.wallets.length,'ארנקים נמחקו');
assert(saved.goals.length===seed.goals.length,'מטרות נמחקו');
assert(saved.accounts.find(x=>x.id==='bank').balance===12400,'יתרת עו״ש השתנתה');
assert(saved.budgetFlexTransfers.length===1,'קופת הגמישות לא נשמרה בגיבוי הנתונים');
assert(saved.monthlyOpeningBalances.length===2,'יתרות הפתיחה אינן נשמרות בגיבוי הנתונים');
assert(theme.includes('.stitch-forecast.stitch-forecast-luxury'),'עיצוב התחזית היוקרתי חסר');
assert(theme.includes('.stitch-flex-fund'),'עיצוב קופת הגמישות חסר');
assert(theme.includes('@media(max-width:820px)'),'התאמת התחזית וקופת הגמישות לנייד חסרה');

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
assert(afterAdd.monthlyOpeningBalances.find(x=>x.type==='bank').amount===12000,'תנועה חדשה שינתה את יתרת הפתיחה');
assert(d.querySelector('.stitch-balance-card.bank')?.textContent.includes('עלה'),'שינוי העו״ש לא התעדכן אחרי תנועה חדשה');

assert(!/[—–]/.test(app+stitch+html),'נשאר מקף ארוך בטקסט האפליקציה');
assert(errors.length===0,`שגיאות דפדפן: ${errors.join('; ')}`);

console.log('HON Stitch v27 passed monthly opening-balance comparison and correction, compact budget command center, prior flexibility and forecast behavior, existing-data preservation, and all regression checks.');
