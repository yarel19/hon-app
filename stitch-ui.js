/* HON Stitch UI v23
 * Visual layer based on the user's exported Google Stitch screens.
 * The data model, persistence and Supabase synchronization remain in app.js/cloud.js.
 */

var stitchPages=[
 ['dashboard','grid_view','סקירה'],
 ['cashflow','swap_horiz','תקציב ותזרים'],
 ['wealth','account_balance_wallet','הון עצמי'],
 ['wallets','wallet','ארנקים'],
 ['goals','emoji_events','מטרות'],
 ['debts','credit_score','חובות'],
 ['review','event_available','סגירת חודש'],
 ['settings','settings','הגדרות']
];
var stitchPrimary=['dashboard','cashflow','wealth','goals'];

function stitchIcon(name,extra=''){
 return `<span class="material-symbols-outlined ${extra}">${name}</span>`
}
function stitchInitials(){
 let value=(db.settings.name||'יראל כברה').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('');
 return value||'H'
}
function stitchOverviewGreeting(){
 let name=(db.settings.name||'').trim();
 if(/^משפחת\s+/.test(name))return `${name}, זו התמונה הפיננסית שלכם`;
 let firstName=name.split(/\s+/).filter(Boolean)[0];
 return firstName?`שלום ${firstName}, זו התמונה הפיננסית שלך`:'זו התמונה הפיננסית שלך';
}
function stitchMobileHeader(title,action=''){
 return `<header class="stitch-mobile-header"><div class="stitch-title-row"><span class="stitch-mobile-brandmark">H</span><h1>${esc(title)}</h1></div>${action||`<button class="stitch-sync" type="button" data-sync-now title="סנכרון">${stitchIcon('sync')}</button>`}</header>`
}
function stitchSectionTitle(title,link='',page=''){
 return `<div class="stitch-section-title"><h2>${esc(title)}</h2>${link?`<button type="button" class="stitch-section-link" ${page?`data-page="${page}"`:''}>${esc(link)} ${stitchIcon('chevron_left')}</button>`:''}</div>`
}
function stitchTypeIcon(tx){
 let name=(cat(tx.category).name||'').toLowerCase();
 if(tx.kind==='income')return'payments';
 if(tx.kind==='saving')return'savings';
 if(tx.kind==='debt')return'credit_score';
 if(tx.kind==='transfer')return'swap_horiz';
 if(/מזון|קניות|סופר/.test(name))return'shopping_cart';
 if(/רכב|דלק|תחבורה/.test(name))return'local_gas_station';
 if(/דיור|שכירות|בית/.test(name))return'home';
 if(/בריאות/.test(name))return'health_and_safety';
 if(/פנאי|בילוי/.test(name))return'celebration';
 return'receipt_long'
}
function stitchTxAmount(tx){
 if(tx.kind==='income')return`+${numberAmount(tx.amount)} ₪`;
 if(tx.kind==='transfer')return`${numberAmount(tx.amount)} ₪`;
 return`−${numberAmount(tx.amount)} ₪`
}
function stitchTxRow(tx,reviewButton=false,detailed=false){
 let c=cat(tx.category),date=tx.date?new Date(tx.date+'T12:00').toLocaleDateString('he-IL',{day:'numeric',month:'short'}):'';
 return `<article class="stitch-activity-row ${detailed?'detailed':''}" data-action="editTx" data-id="${tx.id}">
  <span class="stitch-tx-icon" style="--tx-color:${c.color||'#535f72'}">${stitchIcon(stitchTypeIcon(tx))}</span>
  <span><b>${esc(tx.note||c.name)}</b><small>${esc(c.name)}${date?` · ${date}`:''}</small></span>
  ${detailed?`<span class="stitch-tx-account"><small>חשבון</small><b>${esc(account(tx.account).name)}</b></span><span class="stitch-tx-kind"><small>סוג</small><b>${typeName(tx.kind)}</b></span>`:''}
  ${reviewButton?`<button type="button" class="mini-btn" data-review-one="${tx.id}">אישור</button>`:`<strong class="${tx.kind==='income'?'income':''}" dir="ltr">${stitchTxAmount(tx)}</strong>`}
 </article>`
}
function stitchNetChange(net){
 let points=[...db.snapshots].filter(x=>x.month&&x.month<monthKey()).sort((a,b)=>a.month.localeCompare(b.month));
 let previous=points.at(-1)?.net;
 if(!previous)return null;
 return (net-previous)/Math.abs(previous)*100
}
function stitchAccountIcon(a){
 return a.subtype==='bank'?'account_balance':a.subtype==='cash'?'payments':a.subtype==='pension'?'history_edu':a.subtype==='investment'?'monitoring':a.subtype==='property'?'home':'savings'
}

nav=function(){
 let name=db.settings.name||'יראל כברה',family=document.querySelector('.stitch-family b');
 if(family)family.textContent=name;
 $('#nav').innerHTML=stitchPages.map(([id,icon,label],i)=>`<button type="button" class="stitch-nav-btn ${id===current?'active':''} ${id==='settings'?'settings-link':''}" data-page="${id}">${stitchIcon(icon)}<span>${label}</span></button>`).join('');
 $('#mobileNav').innerHTML=stitchPages.filter(x=>stitchPrimary.includes(x[0])).map(([id,icon,label])=>`<button type="button" class="stitch-mobile-nav-btn ${id===current?'active':''}" data-page="${id}">${stitchIcon(icon)}<span>${label}</span></button>`).join('')+`<button type="button" class="stitch-mobile-nav-btn ${!stitchPrimary.includes(current)?'active':''}" id="mobileMore">${stitchIcon('menu')}<span>עוד</span></button>`
};

openMobilePages=function(){
 let extra=stitchPages.filter(([id])=>!stitchPrimary.includes(id));
 let dark=document.documentElement.classList.contains('dark');
 modal('כל הדפים',`<button type="button" class="mobile-theme-toggle" id="mobileThemeToggle"><span>${stitchIcon(dark?'light_mode':'dark_mode')}</span><div><b>${dark?'מעבר למצב בהיר':'מעבר למצב כהה'}</b><small>בחירת התצוגה נשמרת במכשיר</small></div></button><div class="mobile-page-grid">${extra.map(([id,icon,label])=>`<button type="button" class="mobile-page-btn ${id===current?'active':''}" data-mobile-page="${id}">${stitchIcon(icon)}<b>${label}</b></button>`).join('')}</div><button type="button" class="ghost full-btn" data-close-mobile>סגירה</button>`,()=>{});
 $('#mobileThemeToggle').onclick=()=>{toggleTheme();openMobilePages()};
 $$('[data-mobile-page]').forEach(b=>b.onclick=()=>{current=b.dataset.mobilePage;$('#modal').hidden=true;render()});
 $('[data-close-mobile]').onclick=()=>$('#modal').hidden=true
};

function stitchBindCommon(){
 $$('[data-sync-now]').forEach(b=>b.onclick=()=>{window.HONCloud?.syncNow?.();toast('בודק עדכונים…')});
}

dashboard=function(){
 heading('סקירה','תמונה קצרה וברורה של החודש');
 let net=liveAssets()-liveLiabilities(),change=stitchNetChange(net),t=totals(monthKey()),out=t.expense+t.saving+t.debt,remaining=t.income-out,max=Math.max(1,t.income,out),recent=[...db.transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,4),advice=professionalInsights(monthKey()).slice(0,2),wallets=db.wallets.slice(0,2);
 let adviceHtml=advice.map((x,i)=>`<article class="stitch-advice-card ${i===1?'blue':''}"><span class="stitch-advice-icon">${stitchIcon(i===0?'restaurant':'savings')}</span><div class="stitch-advice-copy"><h3>${esc(x.title)}</h3>${x.text?`<p>${esc(x.text)}</p>`:''}${x.action?`<strong>${esc(x.action)}</strong>`:''}</div></article>`).join('');
 let walletHtml=wallets.map(w=>`<article class="stitch-wallet-compact" style="--wallet-color:${walletColor(w)}" data-action="editWallet" data-id="${w.id}"><span class="stitch-wallet-logo" style="--wallet-color:${walletColor(w)}">${walletInitial(w.walletType)}</span><span class="stitch-wallet-copy"><b>${esc(w.name||walletTypeName(w.walletType))}</b><small>${walletTypeName(w.walletType)}</small></span><strong dir="ltr">${money(w.balance)}</strong></article>`).join('');
 let trend=change==null?'נתונים חיים':`${change>=0?'+':'−'}${numberAmount(Math.abs(change))}% ↗`;
 $('#view').innerHTML=`<section class="stitch-page stitch-dashboard">
  ${stitchMobileHeader('HON')}
  <header class="stitch-overview-heading">
   <div><h1>${esc(stitchOverviewGreeting())}</h1><p>תמונה קצרה וברורה של המצב הפיננסי - כל מה שחשוב במקום אחד.</p></div>
  </header>
  <div class="stitch-dashboard-grid">
   <div class="stitch-dashboard-main">
    <article class="stitch-net-hero ${change!=null&&change<0?'declining':''}"><small>הון נקי</small><strong>${money(net)}</strong><div class="stitch-net-trend"><b dir="ltr">${trend}</b><span>${change==null?'מתעדכן מכל הנכסים והחובות':'לעומת החודש האחרון'}</span></div></article>
    <div class="stitch-balance-grid">
     <button type="button" class="stitch-balance-card bank" data-action="correctBank"><span class="stitch-balance-icon">${stitchIcon('account_balance')}</span><span class="stitch-balance-copy"><small>עו״ש עכשיו</small><strong dir="ltr">${money(subtypeBalance('bank'))}</strong></span><span class="stitch-balance-edit" aria-hidden="true">${stitchIcon('edit')}</span></button>
     <button type="button" class="stitch-balance-card cash" data-action="correctCash"><span class="stitch-balance-icon">${stitchIcon('payments')}</span><span class="stitch-balance-copy"><small>מזומן נגיש</small><strong dir="ltr">${money(subtypeBalance('cash'))}</strong></span><span class="stitch-balance-edit" aria-hidden="true">${stitchIcon('edit')}</span></button>
    </div>
    <article class="stitch-month-card">
     <div class="stitch-month-head"><span class="stitch-month-icon">${stitchIcon('calendar_month')}</span><div><small>החודש הנוכחי</small><h2>סיכום חודש ${new Date(monthKey()+'-15').toLocaleDateString('he-IL',{month:'long'})}</h2></div></div>
     <div class="stitch-month-line income"><span>הכנסות</span><strong>${money(t.income)}</strong><div class="stitch-line-progress"><i style="width:${Math.min(100,t.income/max*100)}%"></i></div></div>
     <div class="stitch-month-line out"><span>הוצאות / חיסכון / חובות</span><strong>${money(out)}</strong><div class="stitch-line-progress"><i style="width:${Math.min(100,out/max*100)}%"></i></div></div>
     <div class="stitch-month-total ${remaining<0?'negative':''}"><span>נשאר לניהול</span><strong dir="ltr">${signedMoney(remaining)}</strong></div>
    </article>
    <section class="stitch-activity-section"><div class="stitch-section-title"><h2>פעילות אחרונה</h2><div class="stitch-section-actions"><button type="button" class="stitch-section-link" data-page="cashflow">כל הפעולות ${stitchIcon('chevron_left')}</button><button type="button" class="stitch-add-circle" data-action="addTx" aria-label="הוספת תנועה">${stitchIcon('add')}</button></div></div><div class="stitch-activity-card">${recent.length?recent.map(x=>stitchTxRow(x)).join(''):empty('＋','מתחילים מכאן','הוסף תנועה ראשונה')}</div></section>
   </div>
   <aside class="stitch-dashboard-rail">
    <section class="stitch-advice-section">${stitchSectionTitle('הצעות ייעול') }<div class="stitch-advice-grid">${adviceHtml||'<p class="muted">לאחר הוספת תנועות יוצגו כאן המלצות.</p>'}</div></section>
    <section class="stitch-wallet-section">${stitchSectionTitle('ארנקים דיגיטליים','נהל הכל','wallets')}<div class="stitch-wallet-compact-list">${walletHtml||'<p class="muted">עוד לא נוספו ארנקים.</p>'}</div></section>
   </aside>
  </div>
 </section>`;
 stitchBindCommon()
};

function stitchBudgetCards(){
 ensureMonthBudget(selectedMonth);
 let cats=db.categories.filter(c=>c.kind==='expense'),actual=new Map(cats.map(c=>[c.id,monthTx(selectedMonth).filter(t=>t.kind==='expense'&&t.category===c.id).reduce((s,t)=>s+t.amount,0)])),remaining=new Map(cats.map(c=>[c.id,budgetFor(selectedMonth,c.id)-(actual.get(c.id)||0)])),mode=db.settings.budgetSort||'manual',rows=[...cats];
 if(mode==='spent_desc')rows.sort((a,b)=>actual.get(b.id)-actual.get(a.id));
 if(mode==='spent_asc')rows.sort((a,b)=>actual.get(a.id)-actual.get(b.id));
 if(mode==='remaining_desc')rows.sort((a,b)=>remaining.get(b.id)-remaining.get(a.id));
 if(mode==='remaining_asc')rows.sort((a,b)=>remaining.get(a.id)-remaining.get(b.id));
 return rows.map((c,index)=>{
  let target=budgetFor(selectedMonth,c.id),spent=actual.get(c.id)||0,left=target-spent,over=spent>target,pct=target?Math.min(100,spent/target*100):spent?100:0;
  return `<article class="stitch-budget-card budget-card ${over?'over overspent':'within-budget'}" style="--cat-color:${c.color}" data-cat-id="${c.id}" ${mode==='manual'?'draggable="true"':''}>
   <div class="stitch-budget-card-head"><div><h3>${esc(c.name)}</h3><span class="stitch-budget-state">${over?stitchIcon('warning'):''}${over?(target?`חריגה של ${money(Math.abs(left))}`:`חריגה ללא יעד: ${money(spent)}`):`נשאר ${money(left)}`}</span></div><div><strong>${money(spent)}</strong><small>מתוך ${money(target)}</small></div></div>
   <div class="stitch-budget-progress"><i style="width:${pct}%"></i></div>
   ${mode==='manual'?`<div class="stitch-order-buttons"><button type="button" data-action="moveCatUp" data-id="${c.id}" ${index===0?'disabled':''}>↑</button><button type="button" data-action="moveCatDown" data-id="${c.id}" ${index===rows.length-1?'disabled':''}>↓</button></div>`:''}
  </article>`
 }).join('')
}
function stitchForecastView(){
 let f=forecast(selectedMonth),mode=db.settings.budgetSort||'manual';
 return `<section class="stitch-forecast stitch-forecast-v23">
   <header class="stitch-forecast-heading"><span>${stitchIcon('monitoring')}</span><div><small>תחזית חודשית</small><h2>תחזית לסוף החודש</h2><p>מבוססת על ההכנסות, ההוצאות והמטרות שתוכננו.</p></div></header>
   <div class="stitch-forecast-equation">
    <div class="stitch-forecast-factor income"><small>הכנסה צפויה</small><strong>${money(f.projectedIncome)}</strong></div>
    <b class="stitch-forecast-operator">-</b>
    <div class="stitch-forecast-factor expense"><small>הוצאות צפויות</small><strong>${money(f.projectedExpense)}</strong></div>
    <b class="stitch-forecast-operator">-</b>
    <div class="stitch-forecast-factor goals"><small>מטרות וחיסכון</small><strong>${money(f.goalCommit)}</strong></div>
    <b class="stitch-forecast-operator">=</b>
    <div class="stitch-forecast-answer ${f.free<0?'negative':'positive'}"><small>צפי יתרה</small><strong dir="ltr">${signedMoney(f.free)}</strong></div>
   </div>
  </section>
  <div class="stitch-budget-toolbar stitch-budget-toolbar-v23">
   <div class="stitch-budget-toolbar-heading"><h3>קטגוריות תקציב</h3><small>בחר סידור, עדכן את החודש או השתמש בתבנית הקבועה.</small></div>
   <div class="stitch-budget-controls">
    <label class="stitch-budget-sort"><span>סידור הקטגוריות</span><select id="budgetSort" aria-label="סידור התקציב"><option value="manual" ${mode==='manual'?'selected':''}>הסדר הידני שלי</option><option value="remaining_desc" ${mode==='remaining_desc'?'selected':''}>הכי הרבה נשאר</option><option value="remaining_asc" ${mode==='remaining_asc'?'selected':''}>חריגה / הכי מעט נשאר</option><option value="spent_desc" ${mode==='spent_desc'?'selected':''}>ההוצאה הגבוהה תחילה</option><option value="spent_asc" ${mode==='spent_asc'?'selected':''}>ההוצאה הנמוכה תחילה</option></select></label>
    <button type="button" class="ghost" data-action="setIronBudget">תקציב ברזל</button>
    <button type="button" class="ghost" data-action="applyIronBudget">החלת הברזל</button>
    <button type="button" class="primary" data-action="setBudget">עריכת החודש</button>
   </div>
  </div><div class="stitch-budget-grid">${stitchBudgetCards()}</div>`
}
function stitchTransactionsView(){
 return `<div class="stitch-search-row"><div class="stitch-searchbox">${stitchIcon('search')}<input id="txSearch" placeholder="חיפוש תנועה…"></div><select id="txKind"><option value="">כל הסוגים</option><option value="income">הכנסות</option><option value="expense">הוצאות</option><option value="saving">חיסכון</option><option value="transfer">העברות</option><option value="debt">החזר חוב</option></select><select id="txSort"><option value="date_desc">תאריך: חדש לישן</option><option value="date_asc">תאריך: ישן לחדש</option><option value="category">לפי קטגוריה</option><option value="amount_desc">סכום: גבוה לנמוך</option><option value="amount_asc">סכום: נמוך לגבוה</option></select><button type="button" class="primary" data-action="addTx">＋ תנועה חדשה</button></div><div class="stitch-transactions-card" id="txList"></div>`
}
function stitchDrawTransactions(){
 let list=$('#txList'),sort=$('#txSort');if(!list||!sort)return;
 let rows=sortedTransactions(monthTx(selectedMonth),sort.value);
 list.innerHTML=rows.length?rows.map(t=>{let c=cat(t.category);return `<div data-kind="${t.kind}" data-search="${esc(((t.note||'')+' '+c.name).toLowerCase())}">${stitchTxRow(t,false,true)}</div>`}).join(''):empty('receipt_long','אין תנועות בחודש הזה','הוסף את התנועה הראשונה שלך');
 $$('#txList [data-action="editTx"]').forEach(b=>b.onclick=()=>actions.editTx(b.dataset.id));
 stitchFilterTransactions()
}
function stitchFilterTransactions(){
 let q=($('#txSearch')?.value||'').toLowerCase(),kind=$('#txKind')?.value||'';
 $$('#txList>[data-kind]').forEach(row=>row.hidden=!!((q&&!row.dataset.search.includes(q))||(kind&&row.dataset.kind!==kind)))
}

cashflow=function(){
 heading('תקציב ותזרים','תקציב, תחזית ותנועות במקום אחד');
 let t=totals(selectedMonth),out=t.expense+t.saving+t.debt,balance=t.income-out;
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('תקציב ותזרים')}
  <div class="stitch-page-top"><h1>ניהול תקציב</h1><button class="stitch-sync" data-sync-now>${stitchIcon('sync')}</button></div>
  <div class="stitch-month-summary"><div class="stitch-month-switch"><button type="button" data-month="-1">${stitchIcon('chevron_right')}</button><b>${monthName(selectedMonth)}</b><button type="button" data-month="1">${stitchIcon('chevron_left')}</button></div><div class="stitch-summary-mini"><small>הכנסות</small><strong class="up">${money(t.income)}</strong></div><div class="stitch-summary-mini"><small>הוצאות</small><strong>${money(out)}</strong></div><div class="stitch-summary-mini balance"><small>יתרה</small><strong dir="ltr">${signedMoney(balance)}</strong></div></div>
  <div class="stitch-tabs"><button type="button" class="${flowView==='forecast'?'active':''}" data-flow-tab="forecast">תקציב ותחזית</button><button type="button" class="${flowView==='transactions'?'active':''}" data-flow-tab="transactions">תנועות</button></div>
  ${flowView==='forecast'?stitchForecastView():stitchTransactionsView()}
 </section>`;
 $$('[data-flow-tab]').forEach(b=>b.onclick=()=>{flowView=b.dataset.flowTab;render()});
 if(flowView==='forecast'){
  let sort=$('#budgetSort');if(sort)sort.onchange=e=>{db.settings.budgetSort=e.target.value;save('סדר התקציב עודכן')};
  if((db.settings.budgetSort||'manual')==='manual')bindCategoryDrag()
 }else{
  stitchDrawTransactions();
  $('#txSearch').oninput=stitchFilterTransactions;
  $('#txKind').onchange=stitchFilterTransactions;
  $('#txSort').onchange=stitchDrawTransactions
 }
 stitchBindCommon()
};
budget=cashflow;

function stitchWealthChart(net){
 let points=[...db.snapshots].filter(x=>x.month).sort((a,b)=>a.month.localeCompare(b.month)).slice(-11);
 if(!points.some(x=>x.month===monthKey()))points.push({month:monthKey(),net});
 points=points.slice(-12);
 let values=points.map(x=>+x.net||0),min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min);
 return `<div class="stitch-bars">${points.map((x,i)=>`<i style="height:${28+(+x.net-min)/range*72}%;opacity:${.2+(i+1)/points.length*.8}"></i>`).join('')}</div><div class="stitch-bars-labels"><span>${points[0]?monthName(points[0].month):''}</span><span>${points.at(-1)?monthName(points.at(-1).month):''}</span></div>`
}
function stitchAssetRow(a){
 let liability=a.type==='liability',meta=liability?'יתרה לתשלום':a.liquid?'נזיל':'לא נזיל';
 return `<article class="stitch-asset-row" data-open-account="${a.id}"><span class="stitch-asset-icon ${liability?'red':a.liquid?'':'blue'}">${stitchIcon(stitchAccountIcon(a))}</span><span><b>${esc(a.name)}</b><small>${meta}${liability&&a.interest!=null?` · ${numberAmount(a.interest)}% ריבית`:''}</small></span><strong>${money(liability?a.balance:effectiveBalance(a))}</strong><button type="button" class="mini-btn" data-action="editAccount" data-id="${a.id}">עריכה</button></article>`
}
function stitchAssetGroup(title,icon,rows,error=false){
 return `<section class="stitch-asset-group"><h2 class="stitch-asset-group-title ${error?'error':''}">${stitchIcon(icon)}${esc(title)}</h2><div class="stitch-asset-list">${rows.length?rows.map(stitchAssetRow).join(''):`<div class="stitch-asset-row"><span class="stitch-asset-icon">${stitchIcon('add')}</span><span><b>אין פריטים בקבוצה</b><small>אפשר להוסיף חשבון או נכס</small></span></div>`}</div></section>`
}

wealth=function(){
 heading('הון עצמי','נכסים והתחייבויות בתמונה אחת');
 let assets=db.accounts.filter(a=>a.type==='asset'),liabilities=db.accounts.filter(a=>a.type==='liability'),net=liveAssets()-liveLiabilities(),liquid=assets.filter(a=>a.liquid),long=assets.filter(a=>!a.liquid&&a.subtype!=='property'),property=assets.filter(a=>!a.liquid&&a.subtype==='property'),change=stitchNetChange(net);
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('הון עצמי',`<button type="button" class="primary" data-action="addAccount">＋ הוספה</button>`)}
  <div class="stitch-page-top"><h1>הון עצמי</h1><button type="button" class="primary" data-action="addAccount">＋ חשבון או נכס</button></div>
  <div class="stitch-wealth-head"><div><h1>הון נקי</h1><strong>${money(net)}</strong></div><span class="stitch-positive-pill">${change==null?'נתונים חיים':`${change>=0?'+':''}${numberAmount(change)}% החודש`}</span></div>
  <div class="stitch-wealth-bento"><article class="stitch-wealth-metric"><small>סך נכסים</small><strong>${money(liveAssets())}</strong></article><article class="stitch-wealth-metric"><small>נכסים נזילים</small><strong class="up">${money(liquid.reduce((s,a)=>s+effectiveBalance(a),0))}</strong></article><article class="stitch-wealth-metric dark"><small>התחייבויות</small><strong>${money(liveLiabilities())}</strong></article></div>
  <div class="stitch-wealth-groups">
   ${stitchAssetGroup('בנקים ומזומן','account_balance',liquid)}
   ${stitchAssetGroup('חיסכון ארוך טווח','history_edu',long)}
   ${stitchAssetGroup('נדל״ן ונכסים','real_estate_agent',property)}
   ${stitchAssetGroup('התחייבויות והלוואות','credit_card_off',liabilities,true)}
  </div>
 </section>`;
 $$('[data-open-account]').forEach(row=>row.onclick=e=>{if(e.target.closest('button'))return;actions.editAccount(row.dataset.openAccount)});
 stitchBindCommon()
};

wallets=function(){
 heading('ארנקים','ארנקים וכרטיסים דיגיטליים');
 let total=walletTotal(),expiring=db.wallets.map(w=>({w,meta:walletExpiryMeta(w)})).filter(x=>x.meta&&x.meta.days<=90).sort((a,b)=>a.meta.days-b.meta.days),first=expiring[0];
 let alert=first?`<article class="stitch-wallet-alert ${first.meta.days<0?'urgent':''}"><span class="stitch-wallet-logo" style="--wallet-color:${walletColor(first.w)}">${walletInitial(first.w.walletType)}</span><div><h3>${first.meta.days<0?'כרטיס שדורש טיפול':'כסף שעומד לפוג'}</h3><p>${esc(first.w.name||walletTypeName(first.w.walletType))} · ${first.meta.label} · יתרה ${money(first.w.balance)}</p></div><button type="button" class="mini-btn" data-action="editWallet" data-id="${first.w.id}">לטיפול</button></article>`:'';
 let cards=db.wallets.map(w=>{let meta=walletExpiryMeta(w);return `<article class="stitch-wallet-card ${meta?.days<0?'expired':''}" style="--wallet-color:${walletColor(w)}"><span class="stitch-wallet-logo" style="--wallet-color:${walletColor(w)}">${walletInitial(w.walletType)}</span><span><b>${esc(w.name||walletTypeName(w.walletType))}</b><small>${walletTypeName(w.walletType)}${meta?` · ${meta.label}`:''}</small></span><strong>${money(w.balance)}</strong><div class="stitch-wallet-actions"><button type="button" data-action="editWallet" data-id="${w.id}">עריכת פרטים</button><button type="button" class="primary-wallet" data-action="editWallet" data-id="${w.id}">עדכון יתרה</button></div></article>`}).join('');
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('ארנקים',`<button type="button" class="primary" data-action="addWallet">＋ הוספה</button>`)}
  <div class="stitch-page-top"><h1>ארנקים וכרטיסים</h1><button type="button" class="primary" data-action="addWallet">＋ אמצעי תשלום</button></div>
  <div class="stitch-wallet-total"><small>יתרה כוללת בארנקים</small><strong>${money(total)}</strong><span class="stitch-positive-pill">${db.wallets.length} פעילים</span></div>
  ${alert}
  ${stitchSectionTitle('ארנקים וכרטיסים')}
  <div class="stitch-wallet-grid">${cards||`<button type="button" class="stitch-wallet-card" data-action="addWallet"><span class="stitch-wallet-logo">${stitchIcon('add_card')}</span><span><b>הוספת אמצעי תשלום</b><small>Bit, פייבוקס, כרטיס או Gift Card</small></span></button>`}</div>
 </section>`;
 stitchBindCommon()
};

function stitchGoalCard(g){
 let progress=Math.min(100,g.target?g.current/g.target*100:0),monthly=goalMonthlyAmount(g),status=goalStatus(g),future=status.className==='future',deadline=g.deadlineMonth||(g.date||'').slice(0,7);
 return `<article class="stitch-goal-card ${future?'future':''}">
  <div class="stitch-goal-head"><div><h3>${esc(g.name)}</h3><small>${esc(g.moneyLocation||'מיקום הכסף לא הוגדר')}</small><span class="term ${g.term==='long'?'long':''}">${goalTerm(g)}</span></div><button type="button" class="mini-btn" data-action="editGoal" data-id="${g.id}">עריכה</button></div>
  <div class="stitch-goal-amounts"><div><strong>${money(g.current)}</strong><span> מתוך ${money(g.target)}</span></div><b>${numberAmount(progress)}%</b></div>
  <div class="stitch-goal-progress"><i style="width:${progress}%"></i></div>
  <div class="stitch-goal-facts"><div><small>חיסכון חודשי נדרש</small><b>${monthly?money(monthly):'לא נדרש כרגע'}</b></div><div><small>תאריך היעד</small><b>${deadline?monthName(deadline):'לא הוגדר'}</b></div></div>
  <div class="stitch-goal-actions"><button type="button" class="ghost" data-action="editGoal" data-id="${g.id}">פרטים</button><button type="button" class="primary" data-action="deposit" data-id="${g.id}" ${future?'disabled':''}>＋ הפקדה</button></div>
 </article>`
}

function stitchGoalAnnualData(goals){
 let now=monthKey(),years=new Map();
 goals.forEach(g=>{
  let remaining=Math.max(0,(+g.target||0)-(+g.current||0)),end=g.deadlineMonth||(g.date||'').slice(0,7);
  if(!remaining||!end)return;
  let start=g.startMonth||now;
  if(start<now)start=now;
  if(end<start)return;
  let monthly=goalMonthlyAmount(g),startOrdinal=monthOrdinal(start),endOrdinal=monthOrdinal(end);
  if(!monthly||!startOrdinal||!endOrdinal)return;
  for(let year=+start.slice(0,4);year<=+end.slice(0,4);year++){
   let yearStart=monthOrdinal(`${year}-01`),yearEnd=monthOrdinal(`${year}-12`);
   let months=Math.max(0,Math.min(endOrdinal,yearEnd)-Math.max(startOrdinal,yearStart)+1);
   if(!months)continue;
   let amount=monthly*months,row=years.get(year)||{year,total:0,parts:[]};
   row.total+=amount;
   row.parts.push({name:g.name,months,amount});
   years.set(year,row)
  }
 });
 return [...years.values()].sort((a,b)=>a.year-b.year)
}
function stitchGoalAnnualPlan(goals){
 let years=stitchGoalAnnualData(goals);
 return `<section class="stitch-goal-years">
  <div class="stitch-section-title"><div><h2>תוכנית החיסכון לפי שנים</h2><small>כמה צריך לחסוך בכל שנה ומאילו מטרות הסכום מורכב.</small></div></div>
  ${years.length?`<div class="stitch-goal-year-grid">${years.map(y=>`<article class="stitch-goal-year-card">
   <header><span>${y.year}</span><div><small>חיסכון מתוכנן</small><strong>${money(y.total)}</strong></div></header>
   <div class="stitch-goal-year-parts">${y.parts.map(p=>`<div><span><b>${esc(p.name)}</b><small>${p.months} ${p.months===1?'חודש':'חודשים'}</small></span><strong>${money(p.amount)}</strong></div>`).join('')}</div>
  </article>`).join('')}</div>`:`<div class="stitch-goal-year-empty">${stitchIcon('calendar_month')}<div><b>עדיין אין תוכנית שנתית</b><small>לאחר הגדרת תאריך התחלה ויעד, התוכנית תיבנה כאן אוטומטית.</small></div></div>`}
 </section>`
}

goals=function(){
 heading('מטרות','תוכנית החיסכון והיעדים המשפחתיים');
 let sorted=[...db.goals].sort((a,b)=>(a.startMonth||'').localeCompare(b.startMonth||'')),active=sorted.filter(g=>goalIsActive(g,selectedMonth)),targets=sorted.reduce((s,g)=>s+(+g.target||0),0),saved=sorted.reduce((s,g)=>s+(+g.current||0),0),monthly=active.reduce((s,g)=>s+goalMonthlyAmount(g),0);
 let roadmap=sorted.map(g=>{let future=(g.startMonth||monthKey())>monthKey(),deadline=g.deadlineMonth||(g.date||'').slice(0,7);return `<div class="stitch-roadmap-line ${future?'future':''}"><span class="stitch-roadmap-dot">${stitchIcon(future?'schedule':'flag')}</span><span><b>${esc(g.name)}</b><small>${future?`מתחילים ב־${monthName(g.startMonth)}`:`פעילה עכשיו`}${deadline?` · יעד ${monthName(deadline)}`:''} · ${money(goalMonthlyAmount(g))} בחודש</small></span></div>`}).join('');
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('מטרות',`<button type="button" class="primary" data-action="addGoal">＋ מטרה חדשה</button>`)}
  <div class="stitch-page-top"><h1>מטרות פיננסיות</h1><button type="button" class="primary" data-action="addGoal">＋ מטרה חדשה</button></div>
  <div class="stitch-goal-summary"><div><small>סך כל היעדים</small><strong>${money(targets)}</strong></div><div><small>כבר נצבר</small><strong class="up">${money(saved)}</strong></div><div><small>נדרש החודש</small><strong>${money(monthly)}</strong></div></div>
  ${stitchGoalAnnualPlan(sorted)}
  ${stitchSectionTitle('מטרות פעילות')}
  <div class="stitch-goal-grid">${sorted.length?sorted.map(stitchGoalCard).join(''):empty('emoji_events','עוד אין מטרות','הוסף מטרה ראשונה ובנה תוכנית חודשית')}</div>
  <section class="stitch-roadmap">${stitchSectionTitle('מפת דרכים פיננסית')}<div>${roadmap||'<p class="muted">המטרות שתגדיר יסתדרו כאן לפי מועד ההתחלה.</p>'}</div></section>
 </section>`;
 stitchBindCommon()
};

function stitchDebtCard(d){
 let sim=debtCalc(d,0),fast=debtCalc(d,200),original=Math.max(+d.originalBalance||0,+d.balance||0),paid=Math.max(0,original-(+d.balance||0)),progress=original?Math.min(100,paid/original*100):0;
 return `<article class="stitch-debt-card"><div class="stitch-debt-card-head"><div><span class="stitch-kicker">${esc(d.lender||(d._source==='account'?'מההון העצמי':'חוב עצמאי'))}</span><h3>${esc(d.name)}</h3></div><button type="button" class="mini-btn" data-action="${d._source==='account'?'editAccount':'editDebt'}" data-id="${d.id}">עריכה</button></div><small class="muted">יתרה לסילוק</small><strong class="stitch-debt-balance">${money(d.balance)}</strong><div class="stitch-budget-progress" style="--cat-color:var(--st-primary)"><i style="width:${progress}%"></i></div><div class="stitch-debt-facts"><div><small>ריבית</small><b>${numberAmount(d.interest||0)}%</b></div><div><small>החזר חודשי</small><b>${d.payment?money(d.payment):'לא הוגדר'}</b></div><div><small>סיום משוער</small><b>${d.payment?debtEndLabel(sim.months):'-'}</b></div></div>${d.payment?`<div class="stitch-debt-saving">עוד 200 ₪ בחודש: כ־${Math.max(0,sim.months-fast.months)} חודשים פחות וחיסכון של ${money(Math.max(0,sim.interest-fast.interest))} בריבית</div>`:''}</article>`
}

debts=function(){
 heading('חובות','תוכנית חכמה ליציאה מחובות');
 let p=debtPortfolio(),items=[...p.items].filter(d=>(+d.balance||0)>0),priority=[...items].sort((a,b)=>(+b.interest||0)-(+a.interest||0))[0],prioritySim=priority?debtCalc(priority,0):null,fast=priority?debtCalc(priority,200):null;
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('חובות',`<button type="button" class="primary" data-action="addDebt">＋ חוב</button>`)}
  <div class="stitch-page-top"><h1>ניהול חובות חכם</h1><button type="button" class="primary" data-action="addDebt">＋ הוספת חוב</button></div>
  <article class="stitch-debt-hero"><small>סה״כ יתרת חובות</small><strong>${money(p.total)}</strong><div class="stitch-debt-stats"><div><span>החזר חודשי</span><b>${money(p.monthly)}</b></div><div><span>ריבית משוקללת</span><b>${numberAmount(p.weightedInterest)}%</b></div><div><span>יעד יציאה</span><b>${items.length?debtEndLabel(p.longest):'אין חובות'}</b></div></div></article>
  ${priority?`<article class="stitch-simulation-card"><span>${stitchIcon('auto_awesome')}</span><div><h3>סימולציה חכמה</h3><p>אם תוסיף 200 ₪ בחודש ל־${esc(priority.name)}, אפשר לקצר כ־${Math.max(0,prioritySim.months-fast.months)} חודשים ולחסוך כ־${money(Math.max(0,prioritySim.interest-fast.interest))} בריבית.</p></div><button type="button" class="ghost" data-action="${priority._source==='account'?'editAccount':'editDebt'}" data-id="${priority.id}">בדיקת החוב</button></article>`:''}
  <div class="stitch-budget-toolbar"><h3>פירוט התחייבויות</h3><button type="button" class="stitch-section-link" data-action="addDebt">＋ הוספת חוב</button></div>
  <div class="stitch-debt-grid">${items.length?items.map(stitchDebtCard).join(''):empty('credit_score','אין חובות פעילים','מצב מצוין - אין התחייבויות לסילוק')}</div>
 </section>`;
 stitchBindCommon()
};

review=function(){
 heading('סגירת חודש','אימות, תובנות והחלטה אחת לחודש הבא');
 let t=totals(selectedMonth),f=forecast(selectedMonth),rows=[...monthTx(selectedMonth)].sort((a,b)=>(b.date||'').localeCompare(a.date||'')),unreviewed=rows.filter(x=>!x.reviewed),existing=db.reviews.find(r=>r.month===selectedMonth)||{},advice=professionalInsights(selectedMonth),steps=['סיכום פיננסי','אימות עסקאות','תובנות','רפלקציה'],body='';
 if(reviewStep===1)body=`<article class="stitch-review-card"><h2>סיכום פיננסי</h2><p class="muted">התמונה מבוססת על התנועות שנרשמו בפועל בחודש ${monthName(selectedMonth)}.</p><div class="stitch-review-kpis"><div><small>הכנסות</small><strong class="up">${money(t.income)}</strong></div><div><small>כל מה שיצא</small><strong>${money(t.expense+t.saving+t.debt)}</strong></div><div><small>מאזן בפועל</small><strong dir="ltr">${signedMoney(t.income-t.expense-t.saving-t.debt)}</strong></div></div><div class="stitch-review-actions"><button type="button" class="primary" data-review-step="2">להמשך: אימות עסקאות</button></div></article>`;
 if(reviewStep===2)body=`<article class="stitch-review-card"><div class="stitch-section-title"><div><h2>אימות עסקאות</h2><small class="muted">${unreviewed.length} עסקאות עדיין מחכות לאישור</small></div>${unreviewed.length?'<button type="button" class="ghost" id="reviewAllTx">אישור כולן</button>':''}</div><div class="stitch-review-list">${unreviewed.length?unreviewed.map(x=>stitchTxRow(x,true)).join(''):empty('done_all','הכול מאומת','אפשר לעבור לתובנות')}</div><div class="stitch-review-actions"><button type="button" class="ghost" data-review-step="1">חזרה</button><button type="button" class="primary" data-review-step="3">להמשך: תובנות</button></div></article>`;
 if(reviewStep===3)body=`<article class="stitch-review-card"><h2>תובנות והמלצות</h2><p class="muted">הנקודות המרכזיות שכדאי לקחת מהחודש הזה.</p><div class="stitch-review-insights"><div class="stitch-review-insight good"><h3>${f.free>=0?'התחזית נשארת מאוזנת':'נדרש תיקון בתוכנית'}</h3><p>${f.free>=0?`אחרי ההוצאות והמטרות צפויים להישאר ${money(f.free)}.`:`לפי הנתונים צפוי חוסר של ${money(Math.abs(f.free))}.`}</p></div>${advice.slice(0,3).map(x=>`<div class="stitch-review-insight"><h3>${esc(x.title)}</h3><p>${esc(x.action||x.text)}</p></div>`).join('')}</div><div class="stitch-review-actions"><button type="button" class="ghost" data-review-step="2">חזרה</button><button type="button" class="primary" data-review-step="4">להמשך: החלטה</button></div></article>`;
 if(reviewStep===4)body=`<article class="stitch-review-card"><h2>רפלקציה והחלטה</h2><p class="muted">סיים עם מסקנה קצרה שתהיה שימושית גם בחודש הבא.</p><form id="reviewForm" class="stitch-review-form"><label>הניצחון של החודש<textarea name="win" rows="2" placeholder="מה עבד טוב?">${esc(existing.win||'')}</textarea></label><label>מה הפתיע או לא עבד?<textarea name="improve" rows="2">${esc(existing.improve||'')}</textarea></label><label>מה למדנו על ההתנהלות שלנו?<textarea name="lesson" rows="2">${esc(existing.lesson||'')}</textarea></label><label>החלטה אחת לחודש הבא<textarea name="decision" rows="2" placeholder="פעולה אחת ברורה">${esc(existing.decision||'')}</textarea></label><div class="stitch-review-actions"><button type="button" class="ghost" data-review-step="3">חזרה</button><button class="primary">סגירת החודש ושמירה</button></div></form></article>`;
 if(reviewStep===5)body=`<article class="stitch-review-card" style="text-align:center;padding-block:45px"><span class="stitch-mobile-avatar" style="margin:auto">${stitchIcon('done_all')}</span><span class="stitch-kicker" style="margin-top:14px">החודש נסגר בהצלחה</span><h2>${monthName(selectedMonth)} מתועד ומסודר</h2><p class="muted">העסקאות אומתו, צילום ההון נשמר והלקחים יחכו לך בהמשך.</p><div class="stitch-review-actions" style="justify-content:center"><button type="button" class="ghost" data-review-step="1">צפייה מחדש</button><button type="button" class="primary" data-page="dashboard">חזרה לסקירה</button></div></article>`;
 $('#view').innerHTML=`<section class="stitch-page stitch-review-shell">${stitchMobileHeader('סגירת חודש')}<div class="stitch-page-top"><h1>סגירת חודש ${monthName(selectedMonth)}</h1></div><div class="stitch-month-switch" style="max-width:280px"><button type="button" data-month="-1">${stitchIcon('chevron_right')}</button><b>${monthName(selectedMonth)}</b><button type="button" data-month="1">${stitchIcon('chevron_left')}</button></div><div class="stitch-review-steps">${steps.map((x,i)=>`<button type="button" data-review-step="${i+1}" class="${reviewStep===i+1?'active':''} ${reviewStep>i+1||reviewStep===5?'done':''}">${reviewStep>i+1||reviewStep===5?'✓ ':''}${x}</button>`).join('')}</div>${body}</section>`;
 $$('[data-review-step]').forEach(b=>b.onclick=()=>{reviewStep=+b.dataset.reviewStep;render()});
 $$('[data-review-one]').forEach(b=>b.onclick=e=>{e.stopPropagation();let tx=db.transactions.find(x=>x.id===b.dataset.reviewOne);if(tx)tx.reviewed=true;persist();render()});
 if($('#reviewAllTx'))$('#reviewAllTx').onclick=()=>{rows.forEach(x=>x.reviewed=true);persist();render()};
 if($('#reviewForm'))$('#reviewForm').onsubmit=e=>{e.preventDefault();let value=Object.fromEntries(new FormData(e.target));db.reviews=db.reviews.filter(r=>r.month!==selectedMonth);db.reviews.push({...value,month:selectedMonth,closedAt:new Date().toISOString()});rows.forEach(x=>x.reviewed=true);actions.snapshot(null,false);reviewStep=5;save('החודש נסגר והלקחים נשמרו')};
 stitchBindCommon()
};

settings=function(){
 heading('הגדרות','פרופיל, קטגוריות, גיבוי ופרטיות');
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('הגדרות')}
  <div class="stitch-page-top"><h1>הגדרות</h1><button type="button" class="stitch-sync" data-sync-now>${stitchIcon('sync')}</button></div>
  <div class="stitch-settings-grid">
   <article class="stitch-review-card"><span class="stitch-kicker">המשפחה</span><h2>הפרופיל שלי</h2><label>השם שיופיע באפליקציה<input id="userName" value="${esc(db.settings.name||'')}"></label><div class="stitch-review-actions"><button type="button" class="ghost" id="settingsTheme">${stitchIcon(document.documentElement.classList.contains('dark')?'light_mode':'dark_mode')} החלפת מצב תצוגה</button><button type="button" class="primary" data-action="saveName">שמירת השם</button></div></article>
   <article class="stitch-review-card"><span class="stitch-kicker">שמירה והעברה</span><h2>גיבוי מלא</h2><p class="muted">הורד עותק פרטי של כל המידע. אפשר לשחזר אותו בכל מכשיר ובכל גרסה.</p><div class="stitch-review-actions"><label class="ghost upload">שחזור מגיבוי<input id="importFile" type="file" accept=".json" hidden></label><button type="button" class="primary" data-action="export">הורדת גיבוי</button></div></article>
   <article class="stitch-review-card full-width-card"><div class="stitch-section-title"><div><span class="stitch-kicker">סדר וצבעים</span><h2>קטגוריות</h2></div><button type="button" class="primary" data-action="addCat">＋ קטגוריה</button></div><div id="categorySorter" class="stitch-category-list">${db.categories.map((c,index)=>`<div class="stitch-category-row" draggable="true" data-cat-id="${c.id}"><span class="drag-handle">⋮⋮</span><i class="dot" style="background:${c.color}"></i><span><b>${esc(c.name)}</b><small>${typeName(c.kind)}</small></span><div><button type="button" class="mini-btn" data-action="moveCatUp" data-id="${c.id}" ${index===0?'disabled':''}>↑</button><button type="button" class="mini-btn" data-action="moveCatDown" data-id="${c.id}" ${index===db.categories.length-1?'disabled':''}>↓</button><button type="button" class="mini-btn" data-action="editCat" data-id="${c.id}">עריכה</button></div></div>`).join('')}</div></article>
   <article class="stitch-review-card full-width-card"><span class="stitch-kicker">פרטיות ותחזוקה</span><h2>המידע שלך</h2><p class="muted">המידע נשמר במכשיר ומסתנכרן לענן כשהחשבון מחובר.</p><div class="stitch-data-facts"><span>${db.transactions.length}<small>תנועות</small></span><span>${db.accounts.length}<small>חשבונות</small></span><span>${db.wallets.length}<small>ארנקים</small></span><span>${db.goals.length}<small>מטרות</small></span></div><button type="button" class="danger" data-action="reset">מחיקת כל הנתונים</button></article>
  </div>
 </section>`;
 $('#importFile').onchange=importData;
 $('#settingsTheme').onclick=()=>{toggleTheme();render()};
 bindCategoryDrag();stitchBindCommon()
};

function stitchAutoHideSyncStatus(){
 let pill=$('#syncPill'),timer;
 if(!pill)return;
 let schedule=()=>{
  clearTimeout(timer);
  if(pill.hidden||pill.classList.contains('error'))return;
  let delay=pill.classList.contains('ok')?2400:5000;
  timer=setTimeout(()=>{pill.hidden=true},delay);
 };
 new MutationObserver(schedule).observe(pill,{attributes:true,childList:true,subtree:true});
 schedule()
}

document.documentElement.classList.add('stitch-ui-ready');
flowView='forecast';
stitchAutoHideSyncStatus();
render();
