(()=>{
const $=s=>document.querySelector(s);
const P=window.PUZZLES;
const LS='dgrid:';
let theme=localStorage.getItem(LS+'theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
function applyTheme(){document.documentElement.classList.toggle('dark',theme==='dark');document.body.classList.toggle('dark',theme==='dark');document.querySelector('meta[name=theme-color]').content=theme==='dark'?'#14140f':'#f7f3ea';}
applyTheme();
function toggleTheme(){theme=theme==='dark'?'light':'dark';localStorage.setItem(LS+'theme',theme);applyTheme();}
$('#themeBtn').onclick=toggleTheme;
$('#today').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});

function analyze(p){
  const n=p.size,g=p.grid,cells=[],words=[];let k=0;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const b=g[r][c]==='#';const cell={r,c,b,ans:b?'':g[r][c],num:0,w:{}};cells.push(cell);
    if(b)continue;
    const sa=(c===0||g[r][c-1]==='#')&&c+1<n&&g[r][c+1]!=='#';
    const sd=(r===0||g[r-1][c]==='#')&&r+1<n&&g[r+1][c]!=='#';
    if(sa||sd){k++;cell.num=k;
      if(sa){const w={dir:'across',num:k,cells:[]};for(let x=c;x<n&&g[r][x]!=='#';x++)w.cells.push(r*n+x);words.push(w);}
      if(sd){const w={dir:'down',num:k,cells:[]};for(let y=r;y<n&&g[y][c]!=='#';y++)w.cells.push(y*n+c);words.push(w);}
    }}
  words.forEach(w=>{w.clue=p.clues[w.dir][w.num];w.cells.forEach(i=>cells[i].w[w.dir]=w);});
  const order=[...words.filter(w=>w.dir==='across'),...words.filter(w=>w.dir==='down')];
  return {n,cells,words:order};
}
const KEY=id=>{const p=P.find(x=>x.id===id);let h=0;for(const ch of p.grid.join(''))h=(h*31+ch.charCodeAt(0))|0;return LS+id+':'+(h>>>0).toString(36)};
function load(id){try{return JSON.parse(localStorage.getItem(KEY(id)))||null}catch(e){return null}}
function save(){if(!S)return;localStorage.setItem(KEY(S.p.id),JSON.stringify({f:S.fill,m:S.mark,t:S.time,done:S.done,rev:S.revealed}));}

// ---------- picker
const TIER_NOTE={Easy:'Straight definitions and friendly words. A warm-up.',Medium:'Some wordplay and a few curveballs.',Hard:'Misdirection, puns and late-week trickery.'};
let tier=localStorage.getItem(LS+'tier')||'Easy';
document.querySelectorAll('#tiers button').forEach(b=>b.onclick=()=>{tier=b.dataset.t;localStorage.setItem(LS+'tier',tier);renderPicker();$('#plist').scrollTop=0;});
function renderPicker(){
  if(!P.some(p=>p.tier===tier))tier='Easy';
  document.querySelectorAll('#tiers button').forEach(b=>{const on=b.dataset.t===tier;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);
    const L=P.filter(p=>p.tier===b.dataset.t),d=L.filter(p=>(load(p.id)||{}).done).length;b.innerHTML=`${b.dataset.t}<small>${d}/${L.length}</small>`;});
  $('#tierNote').textContent=TIER_NOTE[tier];
  const ul=$('#plist');ul.innerHTML='';
  P.filter(p=>p.tier===tier).forEach((p,i)=>{
    const st=load(p.id),A=analyze(p),white=A.cells.filter(c=>!c.b);
    const filled=st?white.filter(c=>st.f[c.r*A.n+c.c]).length:0;const pct=Math.round(100*filled/white.length);
    const li=document.createElement('li');li.dataset.id=p.id;
    const th=document.createElement('div');th.className='thumb';th.style.gridTemplateColumns=`repeat(${A.n},1fr)`;
    A.cells.forEach(c=>{const x=document.createElement('i');if(c.b)x.className='b';else if(st&&st.f[c.r*A.n+c.c])x.className='f';th.appendChild(x)});
    const status=st&&st.done?`<span class="badge done">✓ ${fmt(st.t)}</span>`:pct?`<span class="badge">${pct}%</span>`:'<span class="badge">New</span>';
    li.innerHTML=`<div class="pinfo"><b>No. ${i+1} · ${p.title}</b><div class="pmeta">${p.size}×${p.size} · ${p.tier}${p.theme?' · <span class="theme">'+p.theme+'</span>':''}${st&&!st.done&&st.t?' · '+fmt(st.t):''}</div><div class="pbar"><span style="width:${st&&st.done?100:pct}%"></span></div></div>${status}`;
    li.prepend(th);li.onclick=()=>open(p.id);ul.appendChild(li);
  });
}
const fmt=t=>{t=Math.floor(t||0);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0')};

// ---------- solver
let S=null,tick=null;
function open(id){
  const p=P.find(x=>x.id===id),A=analyze(p),st=load(id)||{};
  S={p,...A,fill:st.f||Array(A.n*A.n).fill(''),mark:st.m||Array(A.n*A.n).fill(''),time:st.t||0,done:!!st.done,revealed:!!st.rev,dir:'across',cur:0,pencil:false,paused:false};
  S.cur=A.cells.find(c=>!c.b).r*A.n+A.cells.find(c=>!c.b).c;
  if(!S.done){const e=A.words[0].cells.find(i=>!S.fill[i]);}
  $('#picker').classList.add('hidden');$('#solver').classList.remove('hidden');
  $('#sTitle').textContent=p.title;$('#sDiff').textContent=`${p.size}×${p.size} · ${p.tier}${p.theme?' · '+p.theme:''}`;
  buildGrid();buildKb();setTab('across');renderAll();startTimer();
  history.pushState({s:1},'');
}
function close(){stopTimer();save();S=null;$('#solver').classList.add('hidden');$('#picker').classList.remove('hidden');$('#menu').classList.add('hidden');$('#done').classList.add('hidden');renderPicker();}
$('#backBtn').onclick=()=>history.back();
addEventListener('popstate',()=>{if(S)close()});
function buildGrid(){
  const g=$('#grid');g.innerHTML='';g.style.setProperty('--n',S.n);g.style.gridTemplateColumns=g.style.gridTemplateRows=`repeat(${S.n},minmax(0,1fr))`;g.classList.toggle('solved',S.done);
  S.cells.forEach((c,i)=>{const d=document.createElement('div');d.className='cell'+(c.b?' b':'');d.dataset.i=i;
    if(!c.b){d.innerHTML=(c.num?`<span class="n">${c.num}</span>`:'')+'<span class="l"></span>';}
    g.appendChild(d)});
  g.onclick=e=>{const d=e.target.closest('.cell');if(!d||d.classList.contains('b'))return;tapCell(+d.dataset.i)};
}
function tapCell(i){
  if(S.paused)return;
  if(i===S.cur){const o=S.dir==='across'?'down':'across';if(S.cells[i].w[o])S.dir=o;}
  else{S.cur=i;const o=S.dir==='across'?'down':'across',c=S.cells[i];if(!c.w[S.dir])S.dir=o;else if(c.num&&c.w[o]&&c.w[o].cells[0]===i&&c.w[S.dir].cells[0]!==i)S.dir=o;}
  renderAll();
}
const curWord=()=>S.cells[S.cur].w[S.dir]||S.cells[S.cur].w[S.dir==='across'?'down':'across'];
function renderAll(){
  const w=curWord();if(w)S.dir=w.dir;
  const set=new Set(w?w.cells:[]);
  const els=$('#grid').children;
  S.cells.forEach((c,i)=>{if(c.b)return;const d=els[i];
    d.className='cell'+(i===S.cur?' s':set.has(i)?' w':'')+(S.mark[i]==='p'?' p':'')+(S.mark[i]==='x'?' x':'')+(S.mark[i]==='r'?' r':'')+(S.mark[i]==='ok'?' ok':'');
    d.querySelector('.l').textContent=S.fill[i];});
  $('#clueNum').textContent=w?w.num+(w.dir==='across'?'A':'D'):'';$('#clueStr').textContent=w?w.clue:'';
  if(S.tab!==S.dir)setTab(S.dir);
  [...$('#clist').children].forEach(li=>{const ww=S.words[+li.dataset.k];li.classList.toggle('on',ww===w);li.classList.toggle('fill',ww.cells.every(i=>S.fill[i]))});
  const on=$('#clist .on');if(on)on.scrollIntoView({block:'nearest'});
  $('#kb').querySelector('[data-k=pencil]').classList.toggle('on',S.pencil);
}
function setTab(d){S.tab=d;$('#tabA').classList.toggle('on',d==='across');$('#tabD').classList.toggle('on',d==='down');
  const ol=$('#clist');ol.innerHTML='';S.words.forEach((w,k)=>{if(w.dir!==d)return;const li=document.createElement('li');li.dataset.k=k;li.innerHTML=`<b>${w.num}</b><span></span>`;li.lastChild.textContent=w.clue;li.onclick=()=>{S.dir=w.dir;S.cur=w.cells.find(i=>!S.fill[i])??w.cells[0];renderAll()};ol.appendChild(li)});
  if(S.cells)renderAll2();}
function renderAll2(){[...$('#clist').children].forEach(li=>{const ww=S.words[+li.dataset.k];li.classList.toggle('on',ww===curWord());li.classList.toggle('fill',ww.cells.every(i=>S.fill[i]))});}
$('#tabA').onclick=()=>setTab('across');$('#tabD').onclick=()=>setTab('down');
function jumpWord(delta){const w=curWord();let k=S.words.indexOf(w);k=(k+delta+S.words.length)%S.words.length;const nw=S.words[k];S.dir=nw.dir;S.cur=nw.cells.find(i=>!S.fill[i])??nw.cells[0];renderAll();}
$('#prevClue').onclick=()=>jumpWord(-1);$('#nextClue').onclick=()=>jumpWord(1);
function type(ch){
  if(S.paused||S.done)return;const i=S.cur;
  if(S.mark[i]==='r'||S.mark[i]==='ok'){/*locked*/}else{S.fill[i]=ch;S.mark[i]=S.pencil?'p':'';}
  const w=curWord(),pos=w.cells.indexOf(i);
  let nx=w.cells.slice(pos+1).find(j=>!S.fill[j]);
  if(nx==null&&!w.cells.every(j=>S.fill[j]))nx=w.cells.find(j=>!S.fill[j]);
  if(nx==null){ if(pos<w.cells.length-1)nx=w.cells[pos+1]; else {save();if(!checkDone())jumpWord(1);return;}}
  S.cur=nx;save();renderAll();checkDone();
}
function back(){
  if(S.paused||S.done)return;const w=curWord(),pos=w.cells.indexOf(S.cur);
  if(S.fill[S.cur]&&S.mark[S.cur]!=='r'&&S.mark[S.cur]!=='ok'){S.fill[S.cur]='';S.mark[S.cur]='';}
  else if(pos>0){S.cur=w.cells[pos-1];if(S.mark[S.cur]!=='r'&&S.mark[S.cur]!=='ok'){S.fill[S.cur]='';S.mark[S.cur]='';}}
  else{const k=S.words.indexOf(w);const pw=S.words[(k-1+S.words.length)%S.words.length];S.dir=pw.dir;S.cur=pw.cells[pw.cells.length-1];}
  save();renderAll();
}
function buildKb(){
  const rows=['QWERTYUIOP','ASDFGHJKL','*ZXCVBNM<'];const kb=$('#kb');kb.innerHTML='';
  rows.forEach(r=>{const d=document.createElement('div');d.className='kr';[...r].forEach(ch=>{const b=document.createElement('button');b.className='k';
    if(ch==='*'){b.dataset.k='pencil';b.textContent='✎';b.classList.add('wide');b.setAttribute('aria-label','Pencil');}
    else if(ch==='<'){b.dataset.k='back';b.textContent='⌫';b.classList.add('wide');b.setAttribute('aria-label','Backspace');}
    else{b.dataset.k=ch;b.textContent=ch;}
    d.appendChild(b)});kb.appendChild(d)});
  kb.onpointerdown=e=>{const b=e.target.closest('.k');if(!b)return;e.preventDefault();const k=b.dataset.k;
    if(k==='back')back();else if(k==='pencil'){S.pencil=!S.pencil;renderAll();}else type(k);};
}
document.addEventListener('keydown',e=>{
  if(!S||$('#solver').classList.contains('hidden')||e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key;
  if(/^[a-zA-Z]$/.test(k)){type(k.toUpperCase());e.preventDefault();}
  else if(k==='Backspace'){back();e.preventDefault();}
  else if(k==='Tab'||k==='Enter'){jumpWord(e.shiftKey?-1:1);e.preventDefault();}
  else if(k===' '){tapCell(S.cur);e.preventDefault();}
  else if(k.startsWith('Arrow')){const d={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[k];const want=d[0]?'down':'across';
    if(S.dir!==want&&S.cells[S.cur].w[want]){S.dir=want;}else{let r=Math.floor(S.cur/S.n)+d[0],c=S.cur%S.n+d[1];while(r>=0&&c>=0&&r<S.n&&c<S.n&&S.cells[r*S.n+c].b){r+=d[0];c+=d[1]}if(r>=0&&c>=0&&r<S.n&&c<S.n)S.cur=r*S.n+c;}
    renderAll();e.preventDefault();}
});
// check / reveal
function scope(s){const w=curWord();return s==='letter'?[S.cur]:s==='word'?w.cells:S.cells.map((c,i)=>c.b?-1:i).filter(i=>i>=0)}
$('#menu').onclick=e=>{const a=e.target.dataset.a;if(!a)return;
  if(a==='theme'){toggleTheme();return;}
  if(a==='clear'){if(confirm('Clear the whole grid and reset the timer?')){S.fill.fill('');S.mark.fill('');S.time=0;S.done=false;S.revealed=false;$('#grid').classList.remove('solved');save();renderAll();startTimer();}}
  else{const [act,s]=a.split('-');
    if(act==='reveal'&&s==='puzzle'&&!confirm('Reveal the entire puzzle?'))return;
    scope(s).forEach(i=>{const c=S.cells[i];
      if(act==='check'){if(S.fill[i]){S.mark[i]=S.fill[i]===c.ans?(S.mark[i]==='r'?'r':'ok'):'x';}}
      else{if(S.fill[i]!==c.ans){S.fill[i]=c.ans;S.mark[i]='r';S.revealed=true;}}});
    save();renderAll();checkDone();}
  $('#menu').classList.add('hidden');};
$('#menuBtn').onclick=()=>$('#menu').classList.toggle('hidden');
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#menu,#menuBtn'))$('#menu').classList.add('hidden')});
// timer
function startTimer(){stopTimer();S.paused=false;$('#paused').classList.add('hidden');updT();if(S.done)return;tick=setInterval(()=>{if(!S.paused&&document.visibilityState==='visible'){S.time++;updT();if(S.time%5===0)save();}},1000);}
function stopTimer(){clearInterval(tick);tick=null}
function updT(){$('#timer').textContent=(S.paused?'▶ ':'')+fmt(S.time)}
function pause(v){if(!S||S.done)return;S.paused=v;$('#paused').classList.toggle('hidden',!v);updT();save();}
$('#timer').onclick=()=>pause(!S.paused);$('#resumeBtn').onclick=()=>pause(false);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S)save()});
// completion
function checkDone(){
  const white=S.cells.map((c,i)=>[c,i]).filter(([c])=>!c.b);
  if(!white.every(([c,i])=>S.fill[i]))return false;
  if(white.every(([c,i])=>S.fill[i]===c.ans)){
    if(S.done)return true;S.done=true;stopTimer();white.forEach(([c,i])=>{if(S.mark[i]==='p'||S.mark[i]==='x')S.mark[i]=''});save();renderAll();$('#grid').classList.add('solved');celebrate();return true;}
  toast('Almost! Something isn’t quite right.');return false;
}
let toastT;function toast(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;left:50%;top:70px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:20px;font:14px Helvetica,Arial,sans-serif;z-index:60';document.body.appendChild(t)}t.textContent=m;t.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>t.style.display='none',2200)}
function celebrate(){
  $('#doneTitle').textContent=S.p.title;
  $('#doneStats').textContent=`Solved in ${fmt(S.time)}${S.revealed?' (with a little help)':' — no help needed!'}`;
  $('#done').classList.remove('hidden');
  const cv=$('#confetti'),x=cv.getContext('2d');cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;
  const col=['#8b1e1e','#f6d36b','#2f6fb0','#1b1a17','#e7e1d4'];
  const ps=Array.from({length:140},()=>({x:Math.random()*cv.width,y:-Math.random()*cv.height*.6,v:2+Math.random()*4,s:6+Math.random()*10,a:Math.random()*6,va:(Math.random()-.5)*.3,c:col[Math.floor(Math.random()*5)],ch:Math.random()<.35?String.fromCharCode(65+Math.floor(Math.random()*26)):null}));
  let f=0;(function fr(){x.clearRect(0,0,cv.width,cv.height);ps.forEach(p=>{p.y+=p.v*devicePixelRatio;p.x+=Math.sin(p.a)*1.5;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;
    if(p.ch){x.font=`bold ${p.s*2.2}px Georgia`;x.fillText(p.ch,0,0)}else x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});if(++f<260&&!$('#done').classList.contains('hidden'))requestAnimationFrame(fr);else x.clearRect(0,0,cv.width,cv.height)})();
  if(navigator.vibrate)navigator.vibrate([60,40,120]);
}
$('#doneView').onclick=()=>$('#done').classList.add('hidden');
$('#doneNext').onclick=()=>{const i=P.findIndex(p=>p.id===S.p.id);const T=S.p.tier,ring=P.slice(i+1).concat(P.slice(0,i));const nx=ring.find(p=>p.tier===T&&!(load(p.id)||{}).done)||ring.find(p=>!(load(p.id)||{}).done)||P[(i+1)%P.length];history.replaceState({s:1},'');close();open(nx.id);};
renderPicker();
// Reserve space for the host's injected badge (it can't be turned off on the free plan) instead of hiding it.
const badgeCheck=()=>document.body.classList.toggle('has-badge',!!document.getElementById('nl-badge-frame'));
badgeCheck();new MutationObserver(badgeCheck).observe(document.body,{childList:true});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__dg={get S(){return S}};
})();
