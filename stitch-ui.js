/* HON Stitch UI v36
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
 ['history','history','היסטוריה חודשית'],
 ['review','event_available','סגירת חודש'],
 ['settings','settings','הגדרות']
];
var stitchPrimary=['dashboard','cashflow','wealth','goals'];
var stitchGoalPlanMonth=monthKey();

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
 if(tx.kind==='debt')return'credit_score';
 if(tx.kind==='transfer')return'swap_horiz';
 return categoryIconName(cat(tx.category))
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
  ${detailed?`<span class="stitch-tx-account"><small>חשבון</small><b>${esc(account(tx.account).name)}</b></span><span class="stitch-tx-kind"><small>סוג</small><b>${transactionTypeName(tx)}</b></span>`:''}
  ${reviewButton?`<button type="button" class="mini-btn" data-review-one="${tx.id}">אישור</button>`:`<strong class="${tx.kind==='income'?'income':''}" dir="ltr">${stitchTxAmount(tx)}</strong>`}
 </article>`
}
function stitchNetChange(net){
 let points=[...db.snapshots].filter(x=>x.month&&x.month<monthKey()).sort((a,b)=>a.month.localeCompare(b.month));
 let previous=points.at(-1)?.net;
 if(!previous)return null;
 return (net-previous)/Math.abs(previous)*100
}
function stitchMonthlyBalanceDelta(delta){
 let state=delta>0.009?'up':delta<-.009?'down':'neutral',label=state==='up'?'עלה':state==='down'?'ירד':'ללא שינוי';
 return `<span class="stitch-balance-delta ${state}"><small>שינוי החודש</small><b>${label}${state==='neutral'?'':` ב-<em dir="ltr">${money(Math.abs(delta))}</em>`}</b></span>`
}
function stitchCombinedBalanceText(delta){
 if(Math.abs(delta)<.009)return'בסך הכול העו״ש והמזומן נשארו ללא שינוי החודש';
 return `בסך הכול העו״ש והמזומן ${delta>0?'עלו':'ירדו'} החודש ב-${money(Math.abs(delta))}`
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

function stitchMonthlyTargets(month=selectedMonth){
 ensureMonthBudget(month);
 let expenseCategories=db.categories.filter(c=>c.kind==='expense');
 let income=roundBudgetAmount(planFor(month).income);
 let expenses=roundBudgetAmount(expenseCategories.reduce((sum,c)=>sum+budgetFor(month,c.id),0));
 let savings=roundBudgetAmount(goalMonthlyTotal(month));
 let debts=roundBudgetAmount(debtPortfolio().monthly);
 let out=roundBudgetAmount(expenses+savings+debts);
 return{income,expenses,savings,debts,out,balance:roundBudgetAmount(income-out),hasIncome:income>0,hasOut:out>0,hasPlan:income>0||out>0}
}
function stitchTargetComparison(actual,target,kind,defined=true){
 actual=roundBudgetAmount(actual);target=roundBudgetAmount(target);
 if(!defined)return'<span class="stitch-target-compare neutral"><b>לא הוגדר יעד לחודש</b></span>';
 let difference=roundBudgetAmount(actual-target),exact=Math.abs(difference)<.009,good=kind==='out'?difference<=.009:difference>=-.009,label;
 if(exact)label='בדיוק לפי היעד';
 else if(kind==='income')label=difference>0?`מעל יעד ההכנסה ב-${money(difference)}`:`מתחת ליעד ההכנסה ב-${money(Math.abs(difference))}`;
 else if(kind==='out')label=difference>0?`חריגה של ${money(difference)} מהמסגרת`:`נשארו ${money(Math.abs(difference))} במסגרת`;
 else label=difference>0?`מעל תוכנית המאזן ב-${money(difference)}`:`מתחת לתוכנית המאזן ב-${money(Math.abs(difference))}`;
 let ratio=kind==='balance'||Math.abs(target)<.009?`יעד ${kind==='balance'?signedMoney(target):money(target)}`:`${numberAmount(Math.round(actual/target*1000)/10)}% מהיעד`;
 return `<span class="stitch-target-compare ${exact?'exact':good?'good':'bad'}"><b>${label}</b><em>${ratio}</em></span>`
}
function stitchCategoryBudgetComparison(actual,target,defined=true){
 actual=roundBudgetAmount(actual);target=roundBudgetAmount(target);
 if(!defined)return'<span class="stitch-target-compare neutral"><b>לא הוגדר תקציב לקטגוריות</b></span>';
 let difference=roundBudgetAmount(actual-target),exact=Math.abs(difference)<.009,label=exact?'הוצאות הקטגוריות בדיוק לפי התקציב':difference>0?`חריגה של ${money(difference)} מתקציב הקטגוריות`:`נשארו ${money(Math.abs(difference))} בתקציב הקטגוריות`;
 return `<span class="stitch-target-compare ${exact?'exact':difference>0?'bad':'good'}"><b>${label}</b><em>${money(actual)} מתוך ${money(target)}</em></span>`
}

function stitchForecastCard(month=selectedMonth){
 let f=forecast(month);
 return `<section class="stitch-forecast stitch-forecast-luxury">
   <div class="stitch-forecast-luxury-top"><div class="stitch-forecast-luxury-copy"><span>המבט קדימה</span><h2>תחזית לסוף החודש</h2><p>תמונה שמרנית המבוססת על התקציב, התנועות, המטרות וקופת הגמישות.</p></div><div class="stitch-forecast-luxury-result ${f.free<0?'negative':'positive'}"><small>${f.free<0?'חוסר צפוי':'צפוי להישאר'}</small><strong dir="ltr">${signedMoney(f.free)}</strong></div></div>
   <div class="stitch-forecast-breakdown"><div class="income"><span>הכנסה צפויה</span><strong>${money(f.projectedIncome)}</strong></div><div class="expense"><span>הוצאות צפויות</span><strong>${money(f.projectedExpense)}</strong></div><div class="goals"><span>מטרות וחיסכון</span><strong>${money(f.goalCommit)}</strong></div></div>
  </section>`
}

dashboard=function(){
 heading('סקירה','תמונה קצרה וברורה של החודש');
 let currentMonth=monthKey();ensureMonthlyOpeningBalances(currentMonth);
 let bankNow=subtypeBalance('bank'),cashNow=subtypeBalance('cash'),bankOpening=monthlyOpeningBalance('bank',currentMonth),cashOpening=monthlyOpeningBalance('cash',currentMonth),bankDelta=monthlyBalanceChange('bank',currentMonth),cashDelta=monthlyBalanceChange('cash',currentMonth),combinedDelta=roundBudgetAmount(bankDelta+cashDelta),openingMonth=new Date(currentMonth+'-15T12:00:00').toLocaleDateString('he-IL',{month:'long'}),net=liveAssets()-liveLiabilities(),change=stitchNetChange(net),t=totals(currentMonth),out=t.expense+t.saving+t.debt,remaining=t.income-out,max=Math.max(1,t.income,out),currentRows=monthTx(currentMonth),incomeCount=currentRows.filter(x=>x.kind==='income').length,outCount=currentRows.filter(x=>['expense','saving','debt'].includes(x.kind)).length,recent=[...db.transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,4),advice=professionalInsights(currentMonth).slice(0,2),wallets=db.wallets.slice(0,2);
 let adviceHtml=advice.map((x,i)=>`<article class="stitch-advice-card ${i===1?'blue':''}"><span class="stitch-advice-icon">${stitchIcon(i===0?'restaurant':'savings')}</span><div class="stitch-advice-copy"><h3>${esc(x.title)}</h3>${x.text?`<p>${esc(x.text)}</p>`:''}${x.action?`<strong>${esc(x.action)}</strong>`:''}</div></article>`).join('');
 let walletHtml=wallets.map(w=>`<article class="stitch-wallet-compact" style="--wallet-color:${walletColor(w)}" data-action="editWallet" data-id="${w.id}"><span class="stitch-wallet-logo" style="--wallet-color:${walletColor(w)}">${walletInitial(w.walletType)}</span><span class="stitch-wallet-copy"><b>${esc(w.name||walletTypeName(w.walletType))}</b><small>${walletTypeName(w.walletType)}</small></span><strong dir="ltr">${money(w.balance)}</strong></article>`).join('');
 let trend=change==null?'נתונים חיים':`${change>=0?'+':'−'}${numberAmount(Math.abs(change))}% ↗`,monthLabel=new Date(currentMonth+'-15T12:00:00').toLocaleDateString('he-IL',{month:'long'}),flowStatus=remaining>=0?'מאזן חודשי חיובי':'מאזן חודשי שלילי';
 $('#view').innerHTML=`<section class="stitch-page stitch-dashboard">
  ${stitchMobileHeader('HON')}
  <header class="stitch-overview-heading">
   <div><h1>${esc(stitchOverviewGreeting())}</h1><p>תמונה קצרה וברורה של המצב הפיננסי - כל מה שחשוב במקום אחד.</p></div>
  </header>
  <div class="stitch-dashboard-grid">
   <div class="stitch-dashboard-main">
    <article class="stitch-net-hero ${change!=null&&change<0?'declining':''}"><small>הון נקי</small><strong>${money(net)}</strong><div class="stitch-net-trend"><b dir="ltr">${trend}</b><span>${change==null?'מתעדכן מכל הנכסים והחובות':'לעומת החודש האחרון'}</span></div></article>
    <article class="stitch-overview-flow-card ${remaining<0?'negative':'positive'}" aria-label="הכנסות ויציאות החודש">
     <header class="stitch-overview-flow-head"><div><small>תנועת הכסף - ${monthLabel}</small><h2>מה נכנס, מה יצא ומה נשאר</h2></div><span class="stitch-overview-flow-status">${stitchIcon(remaining>=0?'trending_up':'trending_down')} ${flowStatus}</span></header>
     <div class="stitch-overview-flow-metrics">
      <div class="income"><span class="stitch-overview-flow-icon">${stitchIcon('south_west')}</span><div><small>נכנס החודש</small><strong dir="ltr">${money(t.income)}</strong><em>${incomeCount} ${incomeCount===1?'תנועת הכנסה':'תנועות הכנסה'}</em></div></div>
      <div class="out"><span class="stitch-overview-flow-icon">${stitchIcon('north_east')}</span><div><small>יצא החודש</small><strong dir="ltr">${money(out)}</strong><em>${outCount} תנועות - כולל חיסכון וחובות</em></div></div>
      <div class="balance"><span class="stitch-overview-flow-icon">${stitchIcon('account_balance_wallet')}</span><div><small>נשאר לניהול</small><strong dir="ltr">${signedMoney(remaining)}</strong><em>${remaining>=0?'יותר נכנס משיצא':'יותר יצא משנכנס'}</em></div></div>
     </div>
     <div class="stitch-overview-flow-track" aria-hidden="true"><i class="income" style="--flow-size:${Math.min(100,t.income/max*100)}%"></i><i class="out" style="--flow-size:${Math.min(100,out/max*100)}%"></i></div>
    </article>
    <article class="stitch-month-card stitch-mobile-overview-month">
     <div class="stitch-month-head"><span class="stitch-month-icon">${stitchIcon('calendar_month')}</span><div><small>החודש הנוכחי</small><h2>סיכום חודש ${new Date(monthKey()+'-15').toLocaleDateString('he-IL',{month:'long'})}</h2></div></div>
     <div class="stitch-month-line income"><span>הכנסות</span><strong>${money(t.income)}</strong><div class="stitch-line-progress"><i style="width:${Math.min(100,t.income/max*100)}%"></i></div></div>
     <div class="stitch-month-line out"><span>הוצאות / חיסכון / חובות</span><strong>${money(out)}</strong><div class="stitch-line-progress"><i style="width:${Math.min(100,out/max*100)}%"></i></div></div>
     <div class="stitch-month-total ${remaining<0?'negative':''}"><span>נשאר לניהול</span><strong dir="ltr">${signedMoney(remaining)}</strong></div>
    </article>
    <section class="stitch-activity-section"><div class="stitch-section-title"><h2>פעילות אחרונה</h2><div class="stitch-section-actions"><button type="button" class="stitch-section-link" data-page="cashflow">כל הפעולות ${stitchIcon('chevron_left')}</button><button type="button" class="stitch-add-circle" data-action="addTx" aria-label="הוספת תנועה">${stitchIcon('add')}</button></div></div><div class="stitch-activity-card">${recent.length?recent.map(x=>stitchTxRow(x)).join(''):empty('＋','מתחילים מכאן','הוסף תנועה ראשונה')}</div></section>
   </div>
   <div class="stitch-dashboard-rail" role="complementary" aria-label="יתרות והמלצות">
    <div class="stitch-balance-grid">
     <button type="button" class="stitch-balance-card bank" data-action="correctBank"><span class="stitch-balance-icon">${stitchIcon('account_balance')}</span><span class="stitch-balance-copy"><small>עו״ש עכשיו</small><strong dir="ltr">${money(bankNow)}</strong><span class="stitch-balance-monthly"><span><small>בתחילת ${openingMonth}</small><b dir="ltr">${money(bankOpening)}</b></span>${stitchMonthlyBalanceDelta(bankDelta)}</span></span><span class="stitch-balance-edit" aria-hidden="true">${stitchIcon('edit')}</span></button>
     <button type="button" class="stitch-balance-card cash" data-action="correctCash"><span class="stitch-balance-icon">${stitchIcon('payments')}</span><span class="stitch-balance-copy"><small>מזומן נגיש</small><strong dir="ltr">${money(cashNow)}</strong><span class="stitch-balance-monthly"><span><small>בתחילת ${openingMonth}</small><b dir="ltr">${money(cashOpening)}</b></span>${stitchMonthlyBalanceDelta(cashDelta)}</span></span><span class="stitch-balance-edit" aria-hidden="true">${stitchIcon('edit')}</span></button>
     <div class="stitch-opening-summary ${combinedDelta>0.009?'up':combinedDelta<-.009?'down':'neutral'}"><span>${stitchCombinedBalanceText(combinedDelta)}</span><button type="button" data-action="correctOpeningBalances">תיקון יתרות פתיחה</button></div>
    </div>
    <section class="stitch-advice-section">${stitchSectionTitle('הצעות ייעול') }<div class="stitch-advice-grid">${adviceHtml||'<p class="muted">לאחר הוספת תנועות יוצגו כאן המלצות.</p>'}</div></section>
    <section class="stitch-wallet-section stitch-mobile-overview-wallets">${stitchSectionTitle('ארנקים דיגיטליים','נהל הכל','wallets')}<div class="stitch-wallet-compact-list">${walletHtml||'<p class="muted">עוד לא נוספו ארנקים.</p>'}</div></section>
   </div>
   <section class="stitch-overview-forecast" aria-label="תחזית לסוף החודש">${stitchForecastCard(currentMonth)}</section>
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
  let target=budgetFor(selectedMonth,c.id),spent=actual.get(c.id)||0,left=target-spent,over=spent>target,pct=target?Math.min(100,spent/target*100):spent?100:0,collected=flexCollectedForCategory(c.id),allocated=flexAllocatedForCategory(c.id),flexNote=allocated?`נוספו ${money(allocated)} מקופת הגמישות`:collected?`שוחררו ${money(collected)} לקופת הגמישות`:'';
  return `<article class="stitch-budget-card budget-card ${over?'over overspent':'within-budget'}" style="--cat-color:${c.color}" data-cat-id="${c.id}" ${mode==='manual'?'draggable="true"':''}>
   <div class="stitch-budget-card-head"><div class="stitch-budget-title"><span class="stitch-budget-category-icon" style="--cat-color:${c.color}">${stitchIcon(categoryIconName(c))}</span><div><h3>${esc(c.name)}</h3><span class="stitch-budget-state">${over?stitchIcon('warning'):''}${over?(target?`חריגה של ${money(Math.abs(left))}`:`חריגה ללא יעד: ${money(spent)}`):`נשאר ${money(left)}`}</span>${flexNote?`<span class="stitch-budget-flex-note ${allocated?'received':'released'}">${flexNote}</span>`:''}</div></div><div><strong>${money(spent)}</strong><small>מתוך ${money(target)}</small></div></div>
   <div class="stitch-budget-progress"><i style="width:${pct}%"></i></div>
   ${mode==='manual'?`<div class="stitch-order-buttons"><button type="button" data-action="moveCatUp" data-id="${c.id}" ${index===0?'disabled':''}>↑</button><button type="button" data-action="moveCatDown" data-id="${c.id}" ${index===rows.length-1?'disabled':''}>↓</button></div>`:''}
  </article>`
 }).join('')
}
function stitchFlexHistoryText(entry){
 if(entry.type==='collect')return `נאספו ${money(entry.amount)} מתוך ${esc(cat(entry.sourceCategory).name)}`;
 return `הועברו ${money(entry.amount)} אל ${esc(cat(entry.targetCategory).name)}`
}
function stitchFlexFundCard(){
 let entries=flexFundEntries(selectedMonth),balance=flexFundBalance(selectedMonth),collected=entries.filter(x=>x.type==='collect').reduce((sum,x)=>sum+x.amount,0),allocated=entries.filter(x=>x.type==='allocate').reduce((sum,x)=>sum+x.amount,0),latest=entries.slice(-2).reverse();
 return `<section class="stitch-flex-fund">
  <div class="stitch-flex-copy"><span>מרחב התמרון של החודש</span><h2>קופת הגמישות</h2><p>אוספים יתרות שסיימו את תפקידן ומחלקים אותן מחדש בלי לשנות את הכסף בבנק.</p></div>
  <div class="stitch-flex-balance"><small>זמין לחלוקה עכשיו</small><strong>${money(balance)}</strong><span>${entries.length?`נאספו ${money(collected)} · חולקו ${money(allocated)}`:'הקופה עדיין ריקה'}</span></div>
  <div class="stitch-flex-actions">
   <button type="button" class="primary" data-action="collectFlex">איסוף יתרות</button>
   <button type="button" class="ghost" data-action="allocateFlex" ${balance<=0?'disabled':''}>חלוקה מחדש</button>
   <button type="button" class="stitch-flex-history-button" data-action="flexHistory" ${entries.length?'':'disabled'}>היסטוריה</button>
  </div>
  ${latest.length?`<div class="stitch-flex-latest">${latest.map(x=>`<span>${stitchFlexHistoryText(x)}</span>`).join('')}</div>`:''}
 </section>`
}
function stitchOpenFlexCollector(){
 ensureMonthBudget(selectedMonth);
 let choices=db.categories.filter(c=>c.kind==='expense').map(c=>({category:c,available:flexAvailableForCategory(c.id)})).filter(x=>x.available>.009);
 if(!choices.length)return toast('אין כרגע יתרות זמינות לאיסוף');
 modal('איסוף יתרות לקופה',`<div class="stitch-flex-modal-intro"><b>${monthName(selectedMonth)}</b><p>בחר את הקטגוריות שסיימו את תפקידן. אפשר לקחת את כל היתרה או סכום מדויק בלבד.</p></div><div class="stitch-flex-select-toolbar"><span>${choices.length} קטגוריות זמינות</span><button type="button" id="flexSelectAll">בחירת כל היתרות</button></div><div class="stitch-flex-collector">${choices.map(({category,available})=>`<article class="stitch-flex-collect-row" data-flex-category="${category.id}" data-flex-max="${available}"><label class="stitch-flex-collect-main"><input type="checkbox" class="stitch-flex-check"><i></i><span><b>${esc(category.name)}</b><small>יתרה זמינה ${money(available)}</small></span></label><div class="stitch-flex-collect-amount"><label><span>כמה להעביר?</span><input class="stitch-flex-amount-input" type="number" inputmode="decimal" min="0.01" max="${available}" step="0.01" placeholder="0" disabled></label><button type="button" class="stitch-flex-all-button">כל היתרה</button></div><small class="stitch-flex-after">יישארו בקטגוריה ${money(available)}</small></article>`).join('')}</div><div class="stitch-flex-modal-total"><span><small>נבחר להעברה</small><strong id="flexCollectTotal">${money(0)}</strong></span><span><small>יישאר בקטגוריות</small><b id="flexRemainTotal">${money(choices.reduce((sum,x)=>sum+x.available,0))}</b></span></div><div class="form-actions full"><button class="primary">העברה לקופת הגמישות</button><button type="button" class="ghost" data-close-flex>ביטול</button></div>`,()=>{});
 $('#modal').classList.add('stitch-flex-modal');
 let rows=$$('.stitch-flex-collect-row'),totalAvailable=choices.reduce((sum,x)=>sum+x.available,0);
 const refresh=()=>{
  let selected=0;
  rows.forEach(row=>{let checked=row.querySelector('.stitch-flex-check').checked,input=row.querySelector('.stitch-flex-amount-input'),max=+row.dataset.flexMax||0,amount=checked?Math.min(max,Math.max(0,+input.value||0)):0;row.classList.toggle('selected',checked);input.disabled=!checked;row.querySelector('.stitch-flex-after').textContent=`יישארו בקטגוריה ${money(Math.max(0,max-amount))}`;selected+=amount});
  $('#flexCollectTotal').textContent=money(selected);$('#flexRemainTotal').textContent=money(Math.max(0,totalAvailable-selected))
 };
 rows.forEach(row=>{let check=row.querySelector('.stitch-flex-check'),input=row.querySelector('.stitch-flex-amount-input'),all=row.querySelector('.stitch-flex-all-button'),max=+row.dataset.flexMax||0;check.onchange=()=>{if(check.checked&&!+input.value)input.value=max;refresh()};input.oninput=refresh;all.onclick=()=>{check.checked=true;input.value=max;refresh()}});
 $('#flexSelectAll').onclick=()=>{rows.forEach(row=>{row.querySelector('.stitch-flex-check').checked=true;row.querySelector('.stitch-flex-amount-input').value=row.dataset.flexMax});refresh()};
 $('[data-close-flex]').onclick=()=>$('#modal').hidden=true;
 $('#form').onsubmit=e=>{e.preventDefault();let transfers=[];rows.forEach(row=>{if(!row.querySelector('.stitch-flex-check').checked)return;let sourceCategory=row.dataset.flexCategory,max=flexAvailableForCategory(sourceCategory),amount=Math.min(max,roundBudgetAmount(row.querySelector('.stitch-flex-amount-input').value));if(amount>0)transfers.push({sourceCategory,amount})});if(!transfers.length)return toast('בחר לפחות יתרה אחת להעברה');let stamp=new Date().toISOString();transfers.forEach((x,index)=>{adjustBudgetAmount(selectedMonth,x.sourceCategory,-x.amount);db.budgetFlexTransfers.push({id:uid(),month:selectedMonth,type:'collect',sourceCategory:x.sourceCategory,amount:x.amount,createdAt:`${stamp}-${String(index).padStart(2,'0')}`})});$('#modal').hidden=true;save(`${money(transfers.reduce((sum,x)=>sum+x.amount,0))} הועברו לקופת הגמישות`)};
 refresh()
}
function stitchOpenFlexAllocator(){
 let balance=flexFundBalance(selectedMonth);
 if(balance<=0)return toast('קופת הגמישות עדיין ריקה');
 let targets=db.categories.filter(c=>c.kind==='expense').map(c=>{let spent=budgetSpentFor(selectedMonth,c.id),target=budgetFor(selectedMonth,c.id);return{category:c,variance:spent-target,left:target-spent}}).sort((a,b)=>(b.variance>0?b.variance:0)-(a.variance>0?a.variance:0)||a.category.name.localeCompare(b.category.name,'he'));
 modal('חלוקה מחדש מהקופה',`<div class="stitch-flex-modal-intro"><b>בקופה זמינים ${money(balance)}</b><p>בחר לאיזו קטגוריה להעביר וכמה. תקציב היעד יתעדכן מיד.</p></div><div class="stitch-flex-allocate-form"><label>קטגוריית יעד<select name="category" id="flexTarget">${targets.map(x=>`<option value="${x.category.id}">${esc(x.category.name)} · ${x.variance>0?`חריגה ${money(x.variance)}`:`נשאר ${money(Math.max(0,x.left))}`}</option>`).join('')}</select></label><label>סכום להעברה<input name="amount" id="flexAllocateAmount" type="number" inputmode="decimal" min="0.01" max="${balance}" step="0.01" required></label><button type="button" id="flexAllocateAll">כל הקופה</button></div><div class="stitch-flex-modal-total single"><span><small>יישאר בקופה לאחר ההעברה</small><strong id="flexAllocateRemain">${money(balance)}</strong></span></div><div class="form-actions full"><button class="primary">העברה לקטגוריה</button><button type="button" class="ghost" data-close-flex>ביטול</button></div>`,()=>{});
 $('#modal').classList.add('stitch-flex-modal');
 let amount=$('#flexAllocateAmount'),refresh=()=>{$('#flexAllocateRemain').textContent=money(Math.max(0,flexFundBalance(selectedMonth)-Math.min(flexFundBalance(selectedMonth),+amount.value||0)))};
 amount.oninput=refresh;$('#flexAllocateAll').onclick=()=>{amount.value=flexFundBalance(selectedMonth);refresh()};$('[data-close-flex]').onclick=()=>$('#modal').hidden=true;
 $('#form').onsubmit=e=>{e.preventDefault();let currentBalance=flexFundBalance(selectedMonth),value=roundBudgetAmount(amount.value),target=$('#flexTarget').value;if(!target||value<=0)return toast('בחר קטגוריה וסכום');if(value>currentBalance+.009)return toast('הסכום גבוה מהיתרה בקופה');adjustBudgetAmount(selectedMonth,target,value);db.budgetFlexTransfers.push({id:uid(),month:selectedMonth,type:'allocate',targetCategory:target,amount:value,createdAt:new Date().toISOString()});$('#modal').hidden=true;save(`${money(value)} הועברו אל ${cat(target).name}`)}
}
function stitchUndoLastFlex(){
 let last=flexFundEntries(selectedMonth).at(-1);
 if(!last)return toast('אין פעולה לביטול');
 if(last.type==='collect'){if(flexFundBalance(selectedMonth)+.009<last.amount)return toast('כדי לבטל, החזר קודם כסף שחולק מהקופה');adjustBudgetAmount(selectedMonth,last.sourceCategory,last.amount)}
 else adjustBudgetAmount(selectedMonth,last.targetCategory,-last.amount);
 db.budgetFlexTransfers=db.budgetFlexTransfers.filter(x=>x.id!==last.id);$('#modal').hidden=true;save('הפעולה האחרונה בקופת הגמישות בוטלה')
}
function stitchOpenFlexHistory(){
 let entries=flexFundEntries(selectedMonth).slice().reverse();
 if(!entries.length)return toast('אין עדיין פעולות בקופת הגמישות');
 modal('היסטוריית קופת הגמישות',`<div class="stitch-flex-modal-intro"><b>${monthName(selectedMonth)}</b><p>כל מעבר נשמר כדי שתמיד יהיה ברור מאיפה הכסף הגיע ולאן חולק.</p></div><div class="stitch-flex-history-list">${entries.map(x=>`<article><span class="${x.type}">${x.type==='collect'?'איסוף':'חלוקה'}</span><div><b>${stitchFlexHistoryText(x)}</b><small>${new Date((x.createdAt||'').slice(0,24)).toLocaleString('he-IL')}</small></div><strong>${money(x.amount)}</strong></article>`).join('')}</div><div class="form-actions full"><button type="button" class="ghost" id="undoLastFlex">ביטול הפעולה האחרונה</button><button type="button" class="primary" data-close-flex>סגירה</button></div>`,()=>{});
 $('#modal').classList.add('stitch-flex-modal');
 $('#form').onsubmit=e=>e.preventDefault();$('[data-close-flex]').onclick=()=>$('#modal').hidden=true;$('#undoLastFlex').onclick=stitchUndoLastFlex
}
actions.collectFlex=stitchOpenFlexCollector;
actions.allocateFlex=stitchOpenFlexAllocator;
actions.flexHistory=stitchOpenFlexHistory;

function stitchForecastView(){
 let mode=db.settings.budgetSort||'manual';
 return `<div class="stitch-budget-command-row">${stitchFlexFundCard()}
  <div class="stitch-budget-toolbar stitch-budget-toolbar-v23">
   <div class="stitch-budget-toolbar-heading"><h3>קטגוריות תקציב</h3><small>בחר סידור, עדכן את החודש או השתמש בתבנית הקבועה.</small></div>
   <div class="stitch-budget-controls">
    <label class="stitch-budget-sort"><span>סידור הקטגוריות</span><select id="budgetSort" aria-label="סידור התקציב"><option value="manual" ${mode==='manual'?'selected':''}>הסדר הידני שלי</option><option value="remaining_desc" ${mode==='remaining_desc'?'selected':''}>הכי הרבה נשאר</option><option value="remaining_asc" ${mode==='remaining_asc'?'selected':''}>חריגה / הכי מעט נשאר</option><option value="spent_desc" ${mode==='spent_desc'?'selected':''}>ההוצאה הגבוהה תחילה</option><option value="spent_asc" ${mode==='spent_asc'?'selected':''}>ההוצאה הנמוכה תחילה</option></select></label>
    <button type="button" class="ghost" data-action="setIronBudget">תקציב ברזל</button>
    <button type="button" class="ghost" data-action="applyIronBudget">החלת הברזל</button>
    <button type="button" class="primary" data-action="setBudget">עריכת החודש</button>
   </div>
  </div></div><div class="stitch-budget-grid">${stitchBudgetCards()}</div>`
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
 heading('תקציב ותזרים','תקציב ותנועות במקום אחד');
 let t=totals(selectedMonth),out=t.expense+t.saving+t.debt,balance=t.income-out,targets=stitchMonthlyTargets(selectedMonth);
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('תקציב ותזרים')}
  <section class="stitch-cashflow-command">
   <header class="stitch-cashflow-command-head"><div class="stitch-cashflow-command-copy"><span>מרכז התקציב החודשי</span><h1>ניהול תקציב</h1><p>כל הנתונים החשובים של החודש, במקום אחד.</p></div><div class="stitch-cashflow-command-tools"><div class="stitch-month-switch"><button type="button" data-month="-1" aria-label="החודש הקודם">${stitchIcon('chevron_right')}</button><b>${monthName(selectedMonth)}</b><button type="button" data-month="1" aria-label="החודש הבא">${stitchIcon('chevron_left')}</button></div><button class="stitch-sync" type="button" data-sync-now title="סנכרון">${stitchIcon('sync')}</button></div></header>
   <div class="stitch-cashflow-kpis"><article class="income"><small>הכנסות בפועל</small><strong dir="ltr">${money(t.income)}</strong>${stitchTargetComparison(t.income,targets.income,'income',targets.hasIncome)}</article><article class="out"><small>יצא בפועל</small><strong dir="ltr">${money(out)}</strong>${stitchCategoryBudgetComparison(t.expense,targets.expenses,targets.expenses>0)}</article><article class="balance ${balance<0?'negative':''}"><small>יתרה לניהול</small><strong dir="ltr">${signedMoney(balance)}</strong></article></div>
   <div class="stitch-tabs"><button type="button" class="${flowView==='forecast'?'active':''}" data-flow-tab="forecast">תקציב</button><button type="button" class="${flowView==='transactions'?'active':''}" data-flow-tab="transactions">תנועות</button></div>
  </section>
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
 let currentValue=goalCurrentValue(g),linked=goalLinkedAccount(g),progress=Math.min(100,g.target?currentValue/g.target*100:0),planned=goalPlanAmountForMonth(g,monthKey())||goalMonthlyAmount(g),status=goalStatus(g),future=status.className==='future',deadline=g.deadlineMonth||(g.date||'').slice(0,7),deposited=goalDepositedInMonth(g,monthKey()),nextMonthly=goalMonthlyAmount(g,shiftMonth(monthKey(),1)),monthDone=deposited+.009>=planned&&planned>0,monthly=deposited>0?nextMonthly:planned,depositLabel=deposited>0?`${monthDone?'✓':'◔'} הופקד החודש ${money(deposited)}${nextMonthly?` · היעד הבא ${money(nextMonthly)}`:' · המטרה הושלמה'}`:'ממתין להפקדה החודש';
 return `<article class="stitch-goal-card ${future?'future':''}">
  <div class="stitch-goal-head"><div><h3>${esc(g.name)}</h3><small class="stitch-goal-location ${linked?'linked':''}">${linked?stitchIcon('link'):''}${linked?'מקושר אל ':''}${esc(goalLocationLabel(g))}</small><span class="term ${g.term==='long'?'long':''}">${goalTerm(g)}</span></div><button type="button" class="mini-btn" data-action="editGoal" data-id="${g.id}">עריכה</button></div>
  <div class="stitch-goal-amounts"><div><strong>${money(currentValue)}</strong><span> מתוך ${money(g.target)}</span></div><b>${numberAmount(progress)}%</b></div>
  <div class="stitch-goal-progress"><i style="width:${progress}%"></i></div>
  <div class="stitch-goal-facts"><div><small>${deposited>0?'היעד החודשי הבא':'חיסכון חודשי נדרש'}</small><b>${monthly?money(monthly):'לא נדרש כרגע'}</b></div><div><small>תאריך היעד</small><b>${deadline?monthName(deadline):'לא הוגדר'}</b></div></div>
  ${!future&&monthly?`<div class="stitch-goal-deposit-state ${monthDone?'complete':deposited>0?'partial':'pending'}">${depositLabel}</div>`:''}
  <div class="stitch-goal-actions"><button type="button" class="ghost" data-action="editGoal" data-id="${g.id}">פרטים</button><button type="button" class="primary" data-action="deposit" data-id="${g.id}" ${future?'disabled':''}>＋ הפקדה</button></div>
 </article>`
}

function stitchGoalPlanForMonth(goals,m){
 return goals.filter(g=>goalIsActive(g,m)).map(g=>{let amount=goalPlanAmountForMonth(g,m),deposited=goalDepositedInMonth(g,m),nextAmount=goalMonthlyAmount(g,shiftMonth(m,1)),remaining=Math.max(0,roundBudgetAmount(amount-deposited)),complete=amount>0&&remaining<.009;return{goal:g,amount,deposited,nextAmount,remaining,complete}}).filter(x=>x.amount>0||x.deposited>0)
}
function stitchGoalMonthlyPlan(goals){
 let now=monthKey(),year=+stitchGoalPlanMonth.slice(0,4),depositYears=db.transactions.filter(t=>t.goalDeposit&&t.date).map(t=>+t.date.slice(0,4)).filter(Boolean),goalStartYears=goals.map(g=>+(g.startMonth||'').slice(0,4)).filter(Boolean),goalEndYears=goals.map(g=>+((g.deadlineMonth||(g.date||'').slice(0,7)||'').slice(0,4))).filter(Boolean),minYear=Math.min(+now.slice(0,4),...goalStartYears,...depositYears),maxYear=Math.max(+now.slice(0,4),...goalEndYears),parts=stitchGoalPlanForMonth(goals,stitchGoalPlanMonth),total=roundBudgetAmount(parts.reduce((sum,x)=>sum+x.amount,0)),remaining=roundBudgetAmount(parts.reduce((sum,x)=>sum+x.remaining,0)),completed=parts.filter(x=>x.complete).length,canDeposit=stitchGoalPlanMonth<=now;
 let months=Array.from({length:12},(_,index)=>{
  let value=`${year}-${String(index+1).padStart(2,'0')}`,label=new Date(value+'-15T12:00').toLocaleDateString('he-IL',{month:'short'}),past=value<now;
  return `<button type="button" data-goal-plan-month="${value}" class="${value===stitchGoalPlanMonth?'active':''} ${past?'past':''}">${label}</button>`
 }).join('');
 return `<section class="stitch-goal-plan-card">
  <header class="stitch-goal-plan-head"><div><span class="stitch-kicker">תוכנית חודשית</span><h2>כמה צריך לחסוך בכל חודש</h2><p>אפשר לחזור לחודש קודם, להשלים הפקדה שנשכחה ולראות ממה מורכב הסכום.</p></div><div class="stitch-goal-year-switch"><button type="button" data-goal-year="-1" ${year<=minYear?'disabled':''}>${stitchIcon('chevron_right')}</button><b>${year}</b><button type="button" data-goal-year="1" ${year>=maxYear?'disabled':''}>${stitchIcon('chevron_left')}</button></div></header>
  <div class="stitch-goal-month-strip">${months}</div>
  <div class="stitch-goal-month-result">
   <div class="stitch-goal-month-total"><span class="stitch-goal-month-icon">${stitchIcon(remaining?'savings':'task_alt')}</span><div><small>תוכנית החיסכון ב${new Date(stitchGoalPlanMonth+'-15T12:00').toLocaleDateString('he-IL',{month:'long',year:'numeric'})}</small><strong>${money(total)}</strong><span>${parts.length?(remaining?`נותר להשלים ${money(remaining)} · ${completed} מתוך ${parts.length} בוצעו`:`✓ כל ההפקדות של החודש בוצעו`):'אין מטרות פעילות בחודש הזה'}</span></div></div>
   <div class="stitch-goal-month-parts">${parts.length?parts.map(({goal,amount,deposited,nextAmount,complete,remaining:partRemaining})=>`<div class="${complete?'complete':deposited>0?'partial':''}"><span class="stitch-goal-month-part-main"><b>${esc(goal.name)}</b><small>${esc(goalLocationLabel(goal))}</small><em>${complete?`✓ הופקד ${money(deposited)}${nextAmount?` · היעד הבא ${money(nextAmount)}`:' · המטרה הושלמה'}`:deposited>0?`הופקד ${money(deposited)} · נותר ${money(partRemaining)}`:'טרם הופקד החודש'}</em></span><span class="stitch-goal-month-part-actions"><strong>${money(amount)}</strong>${canDeposit?`<button type="button" data-goal-deposit-month="${stitchGoalPlanMonth}" data-id="${goal.id}">${deposited>0?'הפקדה נוספת':'רישום הפקדה'}</button>`:''}</span></div>`).join(''):`<div class="stitch-goal-month-empty">${stitchIcon('event_available')}<span><b>אין חיסכון מתוכנן</b><small>בחודש שנבחר לא מתחילה או ממשיכה אף מטרה.</small></span></div>`}</div>
  </div>
 </section>`
}

goals=function(){
 heading('מטרות','תוכנית החיסכון והיעדים המשפחתיים');
 let sorted=[...db.goals].sort((a,b)=>(a.startMonth||'').localeCompare(b.startMonth||'')),active=sorted.filter(g=>goalIsActive(g,selectedMonth)),targets=sorted.reduce((s,g)=>s+(+g.target||0),0),saved=goalPortfolioSaved(sorted),monthly=active.reduce((s,g)=>s+goalNextRequiredAmount(g,selectedMonth),0),linkedCount=sorted.filter(goalLinkedAccount).length;
 let roadmap=sorted.map(g=>{let future=(g.startMonth||monthKey())>monthKey(),deadline=g.deadlineMonth||(g.date||'').slice(0,7);return `<div class="stitch-roadmap-line ${future?'future':''}"><span class="stitch-roadmap-dot">${stitchIcon(future?'schedule':'flag')}</span><span><b>${esc(g.name)}</b><small>${future?`מתחילים ב־${monthName(g.startMonth)}`:`פעילה עכשיו`}${deadline?` · יעד ${monthName(deadline)}`:''} · ${money(goalNextRequiredAmount(g,monthKey()))} בחודש</small></span></div>`}).join('');
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('מטרות',`<button type="button" class="primary" data-action="addGoal">＋ מטרה חדשה</button>`)}
  <div class="stitch-page-top"><h1>מטרות פיננסיות</h1><button type="button" class="primary" data-action="addGoal">＋ מטרה חדשה</button></div>
  <div class="stitch-goal-summary"><div><small>סך כל היעדים</small><strong>${money(targets)}</strong></div><div><small>נצבר לפי המטרות</small><strong class="up">${money(saved)}</strong><span>${linkedCount?`${linkedCount} מטרות מסונכרנות עם ההון העצמי`:'הסכומים מנוהלים בתוך המטרות'}</span></div><div><small>יעד חודשי מעודכן</small><strong>${money(monthly)}</strong></div></div>
  ${stitchGoalMonthlyPlan(sorted)}
  ${stitchSectionTitle('מטרות פעילות')}
  <div class="stitch-goal-grid">${sorted.length?sorted.map(stitchGoalCard).join(''):empty('emoji_events','עוד אין מטרות','הוסף מטרה ראשונה ובנה תוכנית חודשית')}</div>
  <section class="stitch-roadmap">${stitchSectionTitle('מפת דרכים פיננסית')}<div>${roadmap||'<p class="muted">המטרות שתגדיר יסתדרו כאן לפי מועד ההתחלה.</p>'}</div></section>
 </section>`;
 $$('[data-goal-year]').forEach(button=>button.onclick=()=>{let d=new Date(stitchGoalPlanMonth+'-15T12:00');d.setFullYear(d.getFullYear()+(+button.dataset.goalYear||0));stitchGoalPlanMonth=monthKey(d);render()});
 $$('[data-goal-plan-month]').forEach(button=>button.onclick=()=>{stitchGoalPlanMonth=button.dataset.goalPlanMonth;render()});
 $$('[data-goal-deposit-month]').forEach(button=>button.onclick=()=>openGoalDeposit(db.goals.find(g=>g.id===button.dataset.id),button.dataset.goalDepositMonth));
 stitchBindCommon()
};

function stitchDebtCard(d){
 let sim=debtCalc(d,0),fast=debtCalc(d,200),original=Math.max(+d.originalBalance||0,+d.balance||0),paid=Math.max(0,original-(+d.balance||0)),progress=original?Math.min(100,paid/original*100):0;
 return `<article class="stitch-debt-card"><div class="stitch-debt-card-head"><div><span class="stitch-kicker">${esc(d.lender||(d._source==='account'?'מההון העצמי':'חוב עצמאי'))}</span><h3>${esc(d.name)}</h3></div><button type="button" class="mini-btn" data-action="${d._source==='account'?'editAccount':'editDebt'}" data-id="${d.id}">עריכה</button></div><small class="muted">יתרה לסילוק</small><strong class="stitch-debt-balance">${money(d.balance)}</strong><div class="stitch-budget-progress" style="--cat-color:var(--st-primary)"><i style="width:${progress}%"></i></div><div class="stitch-debt-facts"><div><small>ריבית</small><b>${numberAmount(d.interest||0)}%</b></div><div><small>החזר חודשי</small><b>${d.payment?money(d.payment):'לא הוגדר'}</b></div><div><small>סיום משוער</small><b>${d.payment?debtEndLabel(sim.months):'-'}</b></div></div>${d.payment?`<div class="stitch-debt-saving">עוד 200 ₪ בחודש: כ־${Math.max(0,sim.months-fast.months)} חודשים פחות וחיסכון של ${money(Math.max(0,sim.interest-fast.interest))} בריבית</div>`:''}</article>`
}

debts=function(){
 heading('חובות','תוכנית חכמה ליציאה מחובות');
 let p=debtPortfolio(),items=[...p.items].filter(d=>(+d.balance||0)>0);
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('חובות',`<button type="button" class="primary" data-action="addDebt">＋ חוב</button>`)}
  <div class="stitch-page-top"><h1>ניהול חובות חכם</h1><button type="button" class="primary" data-action="addDebt">＋ הוספת חוב</button></div>
  <article class="stitch-debt-hero"><small>סה״כ יתרת חובות</small><strong>${money(p.total)}</strong><div class="stitch-debt-stats"><div><span>החזר חודשי</span><b>${money(p.monthly)}</b></div><div><span>ריבית משוקללת</span><b>${numberAmount(p.weightedInterest)}%</b></div><div><span>יעד יציאה</span><b>${items.length?debtEndLabel(p.longest):'אין חובות'}</b></div></div></article>
  <div class="stitch-budget-toolbar"><h3>פירוט התחייבויות</h3><button type="button" class="stitch-section-link" data-action="addDebt">＋ הוספת חוב</button></div>
  <div class="stitch-debt-grid">${items.length?items.map(stitchDebtCard).join(''):empty('credit_score','אין חובות פעילים','מצב מצוין - אין התחייבויות לסילוק')}</div>
 </section>`;
 stitchBindCommon()
};

function stitchHistoryChange(value){
 if(Math.abs(value)<.009)return'<span class="neutral">ללא שינוי</span>';
 return `<span class="${value>0?'up':'down'}">${value>0?'עלייה':'ירידה'} של <b dir="ltr">${money(Math.abs(value))}</b></span>`
}
function stitchBudgetChangeLine(change={}){
 if(!change.count)return'<span class="stitch-history-category-budget-change neutral">התקציב לא שונה החודש</span>';
 let text=change.increased&&change.decreased?`${change.count} שינויים: נוספו ${money(change.increased)} והופחתו ${money(change.decreased)}`:change.increased?`התקציב הוגדל ב-${money(change.increased)}`:`התקציב הוקטן ב-${money(change.decreased)}`;
 return `<span class="stitch-history-category-budget-change ${change.net>0?'raised':change.net<0?'reduced':'balanced'}">${esc(text)}</span>`
}
function stitchAssessmentMeta(value){
 return value==='excellent'?{label:'מצוין',icon:'verified',className:'excellent'}:value==='improve'?{label:'דרוש שיפור',icon:'build_circle',className:'improve'}:value==='extreme'?{label:'חריגה קיצונית',icon:'error',className:'extreme'}:null
}
function stitchHistoryCategoryRow(row,max,review={}){
 let width=Math.min(100,row.spent/Math.max(1,row.target,row.spent,max*.08)*100),state=row.target===0&&row.spent>0?'no-target':row.difference<0?'over':'ok',status=state==='no-target'?'הוצאה ללא יעד':state==='over'?`חריגה ${money(Math.abs(row.difference))}`:`נשאר ${money(row.difference)}`;
 let assessment=review.categoryAssessments?.find(x=>x.category===row.id),meta=stitchAssessmentMeta(assessment?.rating);
 return `<article class="stitch-history-category ${state}"><div class="stitch-history-category-head"><span class="stitch-history-category-name"><i style="--history-color:${row.color}"></i><b>${esc(row.name)}</b></span><strong>${money(row.spent)}</strong></div><div class="stitch-history-category-meta"><span>${row.target?`יעד ${money(row.target)}`:'לא הוגדר יעד'}</span><b>${status}</b></div><div class="stitch-history-category-progress"><i style="width:${width}%;--history-color:${row.color}"></i></div><div class="stitch-history-category-footer">${stitchBudgetChangeLine(row.budgetChange)}${meta?`<span class="stitch-history-assessment ${meta.className}">${stitchIcon(meta.icon)} ${meta.label}</span>`:''}</div>${assessment?.note?`<p class="stitch-history-category-note">${esc(assessment.note)}</p>`:''}</article>`
}

monthlyHistory=function(){
 heading('היסטוריה חודשית','הסיפור הפיננסי של כל חודש, במספרים החשובים באמת');
 let months=availableHistoryMonths();if(!months.includes(selectedMonth))selectedMonth=months.at(-1)||monthKey();
 let index=months.indexOf(selectedMonth),data=monthlyHistoryData(selectedMonth),closed=!!(data.review||data.snapshot),historyStatus=closed?'חודש סגור ומתועד':selectedMonth===monthKey()?'נתונים חיים':'סיכום מחושב',maxCategory=Math.max(1,...data.categories.map(x=>x.spent)),resultLabel=data.result>=0?'רווח חודשי':'הפסד חודשי',recentMonths=months.slice(-7).reverse(),net=data.snapshot?.net,reviewText=data.review?.decision||data.review?.lesson||data.review?.win||'';
 $('#view').innerHTML=`<section class="stitch-page stitch-history-page">
  ${stitchMobileHeader('היסטוריה חודשית')}
  <header class="stitch-history-page-head"><div><span class="stitch-kicker">הארכיון הפיננסי שלך</span><h1>סיכום ${monthName(selectedMonth)}</h1><p>תמונת החודש נשמרת לפי התנועות, התקציב ויתרות העו״ש והמזומן.</p></div><div class="stitch-history-month-switch"><button type="button" data-history-shift="-1" ${index<=0?'disabled':''}>${stitchIcon('chevron_right')}</button><b>${monthName(selectedMonth)}</b><button type="button" data-history-shift="1" ${index>=months.length-1?'disabled':''}>${stitchIcon('chevron_left')}</button></div></header>
  <div class="stitch-history-months">${recentMonths.map(m=>`<button type="button" class="${m===selectedMonth?'active':''}" data-history-month="${m}">${new Date(m+'-15T12:00:00').toLocaleDateString('he-IL',{month:'short',year:'2-digit'})}</button>`).join('')}</div>
  <article class="stitch-history-hero ${data.result<0?'negative':''}"><div><span>${historyStatus}</span><h2>${resultLabel}</h2><p>${data.result>=0?'ההכנסות היו גבוהות מכל מה שיצא החודש.':'כל מה שיצא היה גבוה מההכנסות החודש.'}</p></div><strong dir="ltr">${signedMoney(data.result)}</strong></article>
  <section class="stitch-history-balance-journey"><div class="stitch-history-balance-point"><small>יתרות בתחילת החודש</small><strong dir="ltr">${money(data.opening)}</strong><span>עו״ש ${money(data.bank.start)} · מזומן ${money(data.cash.start)}</span></div><div class="stitch-history-balance-change">${stitchIcon(data.liquidChange>=0?'trending_up':'trending_down')}${stitchHistoryChange(data.liquidChange)}</div><div class="stitch-history-balance-point closing"><small>יתרות בסוף החודש</small><strong dir="ltr">${money(data.closing)}</strong><span>עו״ש ${money(data.bank.end)} · מזומן ${money(data.cash.end)}</span></div></section>
  <div class="stitch-history-kpis"><article><span class="income">${stitchIcon('south_west')}</span><small>הכנסות</small><strong>${money(data.totals.income)}</strong></article><article class="expense-only"><span class="out">${stitchIcon('north_east')}</span><small>כל מה שיצא</small><strong>${money(data.expenseOnly)}</strong><em>הוצאות בלבד, ללא הפקדות</em></article><article><span class="saving">${stitchIcon('savings')}</span><small>חיסכון והפקדות</small><strong>${money(data.totals.saving)}</strong></article><article><span class="count">${stitchIcon('receipt_long')}</span><small>מספר תנועות</small><strong>${data.transactionCount}</strong></article></div>
  <div class="stitch-history-content">
   <section class="stitch-history-categories"><div class="stitch-section-title"><div><span class="stitch-kicker">תקציב בפועל</span><h2>סיכום לפי קטגוריות</h2></div><small>${data.categories.length} קטגוריות פעילות</small></div><div class="stitch-history-category-grid">${data.categories.length?data.categories.map(row=>stitchHistoryCategoryRow(row,maxCategory,data.review||{})).join(''):empty('receipt_long','אין פעילות תקציבית','לא נרשמו הוצאות או יעדים בחודש הזה')}</div></section>
   <div class="stitch-history-insights" role="complementary" aria-label="תובנות החודש"><article><span>${stitchIcon('monitoring')}</span><div><small>הקטגוריה הגדולה</small><b>${data.topCategory?esc(data.topCategory.name):'אין עדיין'}</b><strong>${data.topCategory?money(data.topCategory.spent):'0 ₪'}</strong></div></article><article><span>${stitchIcon('savings')}</span><div><small>שיעור חיסכון</small><b>${numberAmount(data.savingsRate)}%</b><strong>${data.totals.income?'מתוך ההכנסות':'אין הכנסה רשומה'}</strong></div></article>${Number.isFinite(+net)?`<article><span>${stitchIcon('account_balance_wallet')}</span><div><small>הון נקי בסגירת החודש</small><b>${money(net)}</b><strong>ללא ארנקים דיגיטליים</strong></div></article>`:''}${reviewText?`<article class="decision"><span>${stitchIcon('task_alt')}</span><div><small>החלטת החודש</small><b>${esc(reviewText)}</b></div></article>`:''}</div>
  </div>
 </section>`;
 $$('[data-history-shift]').forEach(button=>button.onclick=()=>{let next=index+Number(button.dataset.historyShift);if(months[next]){selectedMonth=months[next];render()}});
 $$('[data-history-month]').forEach(button=>button.onclick=()=>{selectedMonth=button.dataset.historyMonth;render()});
 stitchBindCommon()
};

function stitchCategoryAssessmentCard(row,saved={}){
 let noTarget=row.target===0&&row.spent>0,over=row.difference<0,status=noTarget?`חריגה ללא יעד: ${money(row.spent)}`:over?`חריגה של ${money(Math.abs(row.difference))}`:`נשארו ${money(row.difference)}`,state=noTarget||over?'over':'ok';
 let choices=[['excellent','verified','מצוין'],['improve','build_circle','דרוש שיפור'],['extreme','error','חריגה קיצונית']];
 return `<article class="stitch-category-assessment-card ${state}" data-category-assessment="${esc(row.id)}"><header><span class="stitch-category-assessment-icon" style="--assessment-color:${row.color}">${stitchIcon(row.icon||'receipt_long')}</span><div><h3>${esc(row.name)}</h3><p class="${state}">${status}</p></div><strong>${money(row.spent)}</strong></header><div class="stitch-category-assessment-facts"><span><small>יעד חודשי</small><b>${money(row.target)}</b></span><span><small>הוצאה בפועל</small><b>${money(row.spent)}</b></span><span><small>תנועות</small><b>${row.transactions}</b></span></div><div class="stitch-category-assessment-budget">${stitchBudgetChangeLine(row.budgetChange)}</div><fieldset><legend>איך היה החודש בקטגוריה הזו?</legend><div class="stitch-category-rating">${choices.map(([value,icon,label])=>`<label class="${value}"><input type="radio" name="rating_${esc(row.id)}" value="${value}" ${saved.rating===value?'checked':''} required><span>${stitchIcon(icon)}<b>${label}</b></span></label>`).join('')}</div></fieldset><label class="stitch-category-note"><span>הערה אישית <small>אופציונלי</small></span><textarea rows="2" maxlength="300" placeholder="מה עבד, מה השתנה ומה כדאי לזכור לחודש הבא?">${esc(saved.note||'')}</textarea></label></article>`
}

review=function(){
 heading('סגירת חודש','אימות, תובנות והחלטה אחת לחודש הבא');
 let t=totals(selectedMonth),rows=[...monthTx(selectedMonth)].sort((a,b)=>(b.date||'').localeCompare(a.date||'')),unreviewed=rows.filter(x=>!x.reviewed),existing=db.reviews.find(r=>r.month===selectedMonth)||{},categoryRows=monthlyCategoryStats(selectedMonth),savedAssessments=new Map((existing.categoryAssessments||[]).map(x=>[x.category,x])),assessedCount=categoryRows.filter(x=>savedAssessments.get(x.id)?.rating).length,steps=['סיכום פיננסי','אימות עסקאות','הערכת קטגוריות','רפלקציה'],body='',targets=stitchMonthlyTargets(selectedMonth),actualOut=t.expense+t.saving+t.debt,actualBalance=t.income-actualOut;
 if(reviewStep===1)body=`<article class="stitch-review-card"><h2>סיכום פיננסי מול היעדים</h2><p class="muted">התמונה מבוססת על התנועות שנרשמו בפועל ועל היעדים שהוגדרו בתקציב ${monthName(selectedMonth)}.</p><div class="stitch-review-kpis"><div><small>הכנסות</small><strong class="up">${money(t.income)}</strong>${stitchTargetComparison(t.income,targets.income,'income',targets.hasIncome)}</div><div><small>כל מה שיצא</small><strong>${money(actualOut)}</strong>${stitchTargetComparison(actualOut,targets.out,'out',targets.hasOut)}</div><div><small>מאזן בפועל</small><strong dir="ltr">${signedMoney(actualBalance)}</strong>${stitchTargetComparison(actualBalance,targets.balance,'balance',targets.hasPlan)}</div></div><div class="stitch-review-actions"><button type="button" class="primary" data-review-step="2">להמשך: אימות עסקאות</button></div></article>`;
 if(reviewStep===2)body=`<article class="stitch-review-card"><div class="stitch-section-title"><div><h2>אימות עסקאות</h2><small class="muted">${unreviewed.length} עסקאות עדיין מחכות לאישור</small></div>${unreviewed.length?'<button type="button" class="ghost" id="reviewAllTx">אישור כולן</button>':''}</div><div class="stitch-review-list">${unreviewed.length?unreviewed.map(x=>stitchTxRow(x,true)).join(''):empty('done_all','הכול מאומת','אפשר לעבור להערכת הקטגוריות')}</div><div class="stitch-review-actions"><button type="button" class="ghost" data-review-step="1">חזרה</button><button type="button" class="primary" data-review-step="3">להמשך: הערכת קטגוריות</button></div></article>`;
 if(reviewStep===3)body=`<article class="stitch-review-card stitch-category-review"><div class="stitch-section-title"><div><span class="stitch-kicker">הערכה אישית של החודש</span><h2>מה קרה בכל קטגוריה?</h2><p class="muted">הנתונים כבר מסודרים. עכשיו נשאר לסווג כל קטגוריה ולהוסיף הערה שתרצה לזכור.</p></div><span class="stitch-category-review-progress">${assessedCount} מתוך ${categoryRows.length} סווגו</span></div><form id="categoryAssessmentForm"><div class="stitch-category-assessment-grid">${categoryRows.length?categoryRows.map(row=>stitchCategoryAssessmentCard(row,savedAssessments.get(row.id)||{})).join(''):empty('category','אין קטגוריות פעילות','לא נמצאו יעדים או הוצאות לסיווג בחודש הזה')}</div><div class="stitch-review-actions"><button type="button" class="ghost" data-review-step="2">חזרה</button><button type="submit" class="primary">שמירת ההערכה והמשך</button></div></form></article>`;
 if(reviewStep===4)body=`<article class="stitch-review-card"><h2>רפלקציה והחלטה</h2><p class="muted">סיים עם מסקנה קצרה שתהיה שימושית גם בחודש הבא.</p><form id="reviewForm" class="stitch-review-form"><label>הניצחון של החודש<textarea name="win" rows="2" placeholder="מה עבד טוב?">${esc(existing.win||'')}</textarea></label><label>מה הפתיע או לא עבד?<textarea name="improve" rows="2">${esc(existing.improve||'')}</textarea></label><label>מה למדנו על ההתנהלות שלנו?<textarea name="lesson" rows="2">${esc(existing.lesson||'')}</textarea></label><label>החלטה אחת לחודש הבא<textarea name="decision" rows="2" placeholder="פעולה אחת ברורה">${esc(existing.decision||'')}</textarea></label><div class="stitch-review-actions"><button type="button" class="ghost" data-review-step="3">חזרה</button><button class="primary">סגירת החודש ושמירה</button></div></form></article>`;
 if(reviewStep===5)body=`<article class="stitch-review-card" style="text-align:center;padding-block:45px"><span class="stitch-mobile-avatar" style="margin:auto">${stitchIcon('done_all')}</span><span class="stitch-kicker" style="margin-top:14px">החודש נסגר בהצלחה</span><h2>${monthName(selectedMonth)} מתועד ומסודר</h2><p class="muted">העסקאות אומתו, צילום ההון נשמר והלקחים יחכו לך בהמשך.</p><div class="stitch-review-actions" style="justify-content:center"><button type="button" class="ghost" data-review-step="1">צפייה מחדש</button><button type="button" class="primary" data-page="dashboard">חזרה לסקירה</button></div></article>`;
 $('#view').innerHTML=`<section class="stitch-page stitch-review-shell">${stitchMobileHeader('סגירת חודש')}<div class="stitch-page-top"><h1>סגירת חודש ${monthName(selectedMonth)}</h1></div><div class="stitch-month-switch" style="max-width:280px"><button type="button" data-month="-1">${stitchIcon('chevron_right')}</button><b>${monthName(selectedMonth)}</b><button type="button" data-month="1">${stitchIcon('chevron_left')}</button></div><div class="stitch-review-steps">${steps.map((x,i)=>`<button type="button" data-review-step="${i+1}" class="${reviewStep===i+1?'active':''} ${reviewStep>i+1||reviewStep===5?'done':''}">${reviewStep>i+1||reviewStep===5?'✓ ':''}${x}</button>`).join('')}</div>${body}</section>`;
 $$('[data-review-step]').forEach(b=>b.onclick=()=>{reviewStep=+b.dataset.reviewStep;render()});
 $$('[data-review-one]').forEach(b=>b.onclick=e=>{e.stopPropagation();let tx=db.transactions.find(x=>x.id===b.dataset.reviewOne);if(tx)tx.reviewed=true;persist();render()});
 if($('#reviewAllTx'))$('#reviewAllTx').onclick=()=>{rows.forEach(x=>x.reviewed=true);persist();render()};
 $$('.stitch-category-rating input').forEach(input=>input.onchange=()=>{let count=$$('[data-category-assessment]').filter(card=>card.querySelector('input:checked')).length,progress=$('.stitch-category-review-progress');if(progress)progress.textContent=`${count} מתוך ${categoryRows.length} סווגו`});
 if($('#categoryAssessmentForm'))$('#categoryAssessmentForm').onsubmit=e=>{e.preventDefault();let categoryAssessments=$$('[data-category-assessment]').map(card=>{let category=card.dataset.categoryAssessment,stats=categoryRows.find(x=>x.id===category)||{};return{category,rating:card.querySelector('input[type="radio"]:checked')?.value||'',note:card.querySelector('textarea').value.trim(),target:stats.target||0,spent:stats.spent||0,difference:stats.difference||0,transactions:stats.transactions||0,budgetChange:stats.budgetChange||{count:0,net:0,increased:0,decreased:0}}});if(categoryAssessments.some(x=>!x.rating))return toast('יש לבחור דירוג לכל קטגוריה');let record=db.reviews.find(r=>r.month===selectedMonth);if(record)record.categoryAssessments=categoryAssessments;else db.reviews.push({month:selectedMonth,categoryAssessments});persist();reviewStep=4;render();toast('הערכת הקטגוריות נשמרה')};
 if($('#reviewForm'))$('#reviewForm').onsubmit=e=>{e.preventDefault();let value=Object.fromEntries(new FormData(e.target)),currentReview=db.reviews.find(r=>r.month===selectedMonth)||{};db.reviews=db.reviews.filter(r=>r.month!==selectedMonth);db.reviews.push({...currentReview,...value,month:selectedMonth,closedAt:new Date().toISOString()});rows.forEach(x=>x.reviewed=true);actions.snapshot(null,false);reviewStep=5;save('החודש נסגר וההערכות נשמרו')};
 stitchBindCommon()
};

function stitchOpenCloudVersions(){
 let backups=window.HONCloud?.getBackups?.()||[];
 modal('גרסאות קודמות בענן',`<div class="stitch-cloud-version-intro"><b>רשת ביטחון לסנכרון</b><p>לפני החלפת גרסה נשמר עותק קודם. שחזור יחזיר את כל האפליקציה למצב שבחרת ואז יסנכרן אותו לכל המכשירים.</p></div><div class="stitch-cloud-version-list">${backups.length?[...backups].reverse().map((entry,reverseIndex)=>{let originalIndex=backups.length-1-reverseIndex,date=entry.savedAt?new Date(entry.savedAt).toLocaleString('he-IL'):'מועד לא ידוע',counts=entry.data||{};return `<article><span>${stitchIcon('history')}</span><div><b>${date}</b><small>${counts.transactions?.length||0} תנועות · ${counts.accounts?.length||0} חשבונות · ${counts.goals?.length||0} מטרות</small></div><button type="button" class="ghost" data-restore-cloud="${originalIndex}">שחזור</button></article>`}).join(''):'<p class="muted">גרסאות קודמות יופיעו כאן לאחר השינויים הבאים שיסונכרנו.</p>'}</div><div class="form-actions full"><button type="button" class="primary" data-close-cloud>סגירה</button></div>`,()=>{});
 $('[data-close-cloud]').onclick=()=>$('#modal').hidden=true;
 $$('[data-restore-cloud]').forEach(button=>button.onclick=async()=>{if(!confirm('לשחזר את הגרסה הזו? המצב הנוכחי יישמר גם הוא כגרסה קודמת.'))return;button.disabled=true;button.textContent='משחזר…';await window.HONCloud.restoreVersion(+button.dataset.restoreCloud);$('#modal').hidden=true;toast('הגרסה שוחזרה ומסתנכרנת')})
}

settings=function(){
 heading('הגדרות','פרופיל, קטגוריות, גיבוי ופרטיות');
 let cloudBackups=window.HONCloud?.getBackups?.()||[];
 $('#view').innerHTML=`<section class="stitch-page">
  ${stitchMobileHeader('הגדרות')}
  <div class="stitch-page-top"><h1>הגדרות</h1><button type="button" class="stitch-sync" data-sync-now>${stitchIcon('sync')}</button></div>
  <div class="stitch-settings-grid">
   <article class="stitch-review-card"><span class="stitch-kicker">המשפחה</span><h2>הפרופיל שלי</h2><label>השם שיופיע באפליקציה<input id="userName" value="${esc(db.settings.name||'')}"></label><div class="stitch-review-actions"><button type="button" class="ghost" id="settingsTheme">${stitchIcon(document.documentElement.classList.contains('dark')?'light_mode':'dark_mode')} החלפת מצב תצוגה</button><button type="button" class="primary" data-action="saveName">שמירת השם</button></div></article>
   <article class="stitch-review-card"><span class="stitch-kicker">שמירה והעברה</span><h2>גיבוי מלא</h2><p class="muted">הורד עותק פרטי של כל המידע. אפשר לשחזר אותו בכל מכשיר ובכל גרסה.</p><div class="stitch-review-actions"><label class="ghost upload">שחזור מגיבוי<input id="importFile" type="file" accept=".json" hidden></label><button type="button" class="primary" data-action="export">הורדת גיבוי</button></div></article>
   <article class="stitch-review-card full-width-card stitch-sync-protection"><div><span class="stitch-kicker">הגנת מידע בין מכשירים</span><h2>סנכרון מוגן</h2><p class="muted">המחשב והטלפון ממזגים שינויים. מכשיר ישן לא יכול עוד לדרוס מידע חדש.</p></div><div class="stitch-sync-protection-facts"><span>${stitchIcon('merge')}<b>מיזוג שינויים</b></span><span>${stitchIcon('verified_user')}<b>מניעת דריסה</b></span><span>${stitchIcon('history')}<b>${cloudBackups.length} גרסאות קודמות</b></span></div><button type="button" class="ghost" id="cloudVersions">צפייה ושחזור</button></article>
   <article class="stitch-review-card full-width-card"><div class="stitch-section-title"><div><span class="stitch-kicker">סדר, אייקונים וצבעים</span><h2>קטגוריות</h2></div><button type="button" class="primary" data-action="addCat">＋ קטגוריה</button></div><div id="categorySorter" class="stitch-category-list">${db.categories.map((c,index)=>`<div class="stitch-category-row" draggable="true" data-cat-id="${c.id}"><span class="drag-handle">⋮⋮</span><span class="stitch-category-icon" style="--cat-color:${c.color}">${stitchIcon(categoryIconName(c))}</span><span><b>${esc(c.name)}</b><small>${typeName(c.kind)}</small></span><div><button type="button" class="mini-btn" data-action="moveCatUp" data-id="${c.id}" ${index===0?'disabled':''}>↑</button><button type="button" class="mini-btn" data-action="moveCatDown" data-id="${c.id}" ${index===db.categories.length-1?'disabled':''}>↓</button><button type="button" class="mini-btn" data-action="editCat" data-id="${c.id}">עריכה</button></div></div>`).join('')}</div></article>
   <article class="stitch-review-card full-width-card"><span class="stitch-kicker">פרטיות ותחזוקה</span><h2>המידע שלך</h2><p class="muted">המידע נשמר במכשיר ומסתנכרן לענן כשהחשבון מחובר.</p><div class="stitch-data-facts"><span>${db.transactions.length}<small>תנועות</small></span><span>${db.accounts.length}<small>חשבונות</small></span><span>${db.wallets.length}<small>ארנקים</small></span><span>${db.goals.length}<small>מטרות</small></span></div><button type="button" class="danger" data-action="reset">מחיקת כל הנתונים</button></article>
  </div>
 </section>`;
 $('#importFile').onchange=importData;
 $('#settingsTheme').onclick=()=>{toggleTheme();render()};
 $('#cloudVersions').onclick=stitchOpenCloudVersions;
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
