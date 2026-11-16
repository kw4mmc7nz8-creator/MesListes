'use strict';
const app=document.querySelector('#app'), KEY='meslistes-v1';
let db={lists:[]},page='home',current=null,editing=false,ink=[],photos=[],offset=0,activeNote=null,drag=null,paintPending=false,selected=new Set(),entryMode='hand',typedText='',noteLink='',modeLocked=false;
const SETTINGS_KEY='MesListesDefaultEntryMode', DELETE_CONFIRM_KEY='MesListesConfirmSingleNoteDeletion';
function getDeleteConfirmation(){try{return localStorage.getItem(DELETE_CONFIRM_KEY)==='true'}catch(e){return false}}
let confirmSingleNoteDeletion=getDeleteConfirmation();
function getDefaultEntryMode(){try{return localStorage.getItem(SETTINGS_KEY)==='keyboard'?'keyboard':'hand'}catch(e){return 'hand'}}
let defaultEntryMode=getDefaultEntryMode();
// Display density: affects list content only, never application commands or legends.
const TEXT_SIZE_KEY='MesListesContentSizeV14Bis';
const MIN_TEXT_SIZE=14, MAX_TEXT_SIZE=24, DEFAULT_TEXT_SIZE=18;
function readTextSize(){try{const n=Number(localStorage.getItem(TEXT_SIZE_KEY));return Number.isFinite(n)&&n>=MIN_TEXT_SIZE&&n<=MAX_TEXT_SIZE?n:DEFAULT_TEXT_SIZE}catch(e){return DEFAULT_TEXT_SIZE}}
let contentTextSize=readTextSize();
function applyTextSize(){
 const n=contentTextSize;
 document.documentElement.style.setProperty('--ml-content-font',n+'px');
 document.documentElement.style.setProperty('--ml-content-count',Math.max(13,n-2)+'px');
 document.documentElement.style.setProperty('--ml-content-row',Math.round(n*2.65+5)+'px');
 document.documentElement.style.setProperty('--ml-content-hand',Math.round(n*2.9)+'px');
 document.documentElement.style.setProperty('--ml-content-pad',Math.max(6,Math.round(n*.48))+'px');
}
applyTextSize();

// Keep the editor inside the iPhone's visible viewport when the native keyboard opens.
function syncVisibleViewport(){
 const v=window.visualViewport;
 const height=v?Math.round(v.height):window.innerHeight;
 document.documentElement.style.setProperty('--visible-app-height',height+'px');
 if(page==='editor'&&entryMode==='keyboard'){
   const panel=document.querySelector('.keyboardPanel');
   if(panel)panel.style.maxHeight=Math.max(100,Math.min(260,height-185))+'px';
 }
}
if(window.visualViewport){visualViewport.addEventListener('resize',syncVisibleViewport);visualViewport.addEventListener('scroll',syncVisibleViewport)}
window.addEventListener('resize',syncVisibleViewport);
syncVisibleViewport();
const uid=()=>crypto.randomUUID(), E=(t,c='',v)=>{const e=document.createElement(t);e.className=c;if(v!==undefined)e.textContent=v;return e}, B=(s,fn,c='')=>{const e=E('button',c,s);e.type='button';e.onclick=fn;return e};
const ico=(name)=>({check:'<circle cx="12" cy="12" r="10"/><path d="m7.5 12 3 3 6-6"/>',circle:'<circle cx="12" cy="12" r="10"/>',share:'<path d="M12 14V2m0 0L8.5 5.5M12 2l3.5 3.5"/><path d="M6 9H5.5A1.5 1.5 0 0 0 4 10.5v9A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 18.5 9H18"/>',reset:'<path d="M3 11a9 9 0 0 1 15.4-6.4L21 7"/><path d="M21 2v5h-5"/><path d="M21 13a9 9 0 0 1-15.4 6.4L3 17"/><path d="M3 22v-5h5"/>',eraser:'<path d="M20.5 13.5 12 22H6a3 3 0 0 1-2.1-.9l-2-2a3 3 0 0 1 0-4.2L13.5 3.3a3 3 0 0 1 4.2 0l3.8 3.8a3 3 0 0 1 0 4.2z"/><path d="m8 9 7 7"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6.5 7l.8 13h9.4l.8-13M10 11v6m4-6v6"/>',camera:'<path d="M2 7h4.5l2-3h7l2 3H22v14H2z"/><circle cx="12" cy="14" r="4"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9.5h.01M10 9.5h.01M14 9.5h.01M18 9.5h.01M6 12.5h.01M10 12.5h.01M14 12.5h.01M18 12.5h.01M7 16h10"/>',pen:'<path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20z"/>',folder:'<path d="M3 6h7l2 3h9v12H3z"/>',back:'<path d="M15 3 6 12l9 9"/>',plus:'<path d="M12 4v16M4 12h16"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',import:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 10.5v7m0 0-3-3m3 3 3-3"/>',save:'<path d="M4 2.5h13l4 4V21.5H3V2.5h1z"/><path d="M7 2.5v7h10v-7M7 21.5v-8h10v8"/><path d="M14 3.5v4.5M9.5 16.5h5M9.5 19h5"/>',sort:'<path d="M4 6h16M4 12h12M4 18h8"/>',settings:'<path d="M9.392 4.384 L9.853 2.028 L14.147 2.028 L14.608 4.384 L15.542 4.771 L17.533 3.431 L20.569 6.467 L19.229 8.458 L19.616 9.392 L21.972 9.853 L21.972 14.147 L19.616 14.608 L19.229 15.542 L20.569 17.533 L17.533 20.569 L15.542 19.229 L14.608 19.616 L14.147 21.972 L9.853 21.972 L9.392 19.616 L8.458 19.229 L6.467 20.569 L3.431 17.533 L4.771 15.542 L4.384 14.608 L2.028 14.147 L2.028 9.853 L4.384 9.392 L4.771 8.458 L3.431 6.467 L6.467 3.431 L8.458 4.771 Z"/><circle cx="12" cy="12" r="3.4"/>' ,link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',restore:'<path d="M3 10a9 9 0 1 1 2.5 8"/><path d="M3 4.5V10h5.5"/>'})[name];
function icon(name){const span=E('span','icon');span.innerHTML=`<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.28" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ico(name)}</svg>`;return span}
function ib(name,fn,label,cls=''){const b=B('',fn,'iconButton '+cls);b.append(icon(name));b.setAttribute('aria-label',label);return b}
async function load(){try{const req=indexedDB.open('MesListesDB',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');const database=await new Promise((ok,no)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)});window.store=database;const tx=database.transaction('state'),r=tx.objectStore('state').get('data');const stored=await new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});if(stored?.lists)db=stored;else{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old?.lists){db=old;await save()}}}catch(e){console.error(e);let old=null;try{old=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}if(old?.lists)db=old;alert('Le stockage local n’est pas disponible. Évitez de créer des notes avant de résoudre ce problème.')}render()}
function save(){return new Promise((ok,no)=>{if(!window.store){no(Error('Stockage indisponible'));return}const tx=store.transaction('state','readwrite');tx.objectStore('state').put(db,'data');tx.oncomplete=ok;tx.onabort=()=>no(tx.error||Error('Transaction annulée'));tx.onerror=()=>no(tx.error)})}
async function persist(){try{await save()}catch(e){alert('Enregistrement impossible. Exportez une sauvegarde avant de quitter.');throw e}}
const list=()=>db.lists.find(x=>x.id===current);
function modal(title,buttons,body){const cover=E('div','modal'),box=E('div','dialog');box.append(E('strong','',title));if(body)box.append(body);const bar=E('div','dialogActions');buttons.forEach(([label,action,cls])=>bar.append(B(label,()=>action(()=>cover.remove()),cls||'')));box.append(bar);cover.append(box);document.body.append(cover);return cover}
function ask(title,cb){const inp=E('input');inp.placeholder='Titre de la liste';modal(title,[['Annuler',close=>close()],['Valider',async close=>{const name=inp.value.trim();if(!name)return;const created={id:uid(),name,notes:[],received:false};db.lists.push(created);try{await persist()}catch(e){db.lists=db.lists.filter(l=>l!==created);return}close();render()}]],inp);inp.focus()}
function removeConfirm(what,fn){modal('Supprimer '+what+' ?', [['Annuler',c=>c()],['Supprimer',async c=>{try{await fn();c();render()}catch(e){alert('Suppression impossible : '+e.message)}},'danger']])}
async function removeSingleNoteWithoutConfirmation(arr,i){const removed=arr.splice(i,1);try{await persist();render()}catch(e){arr.splice(i,0,...removed);alert('Suppression impossible : '+e.message)}}
function header(){const h=E('header','top '+(page==='home'?'homeTop':'detailTop'));if(page==='home'){const imp=ib('import',importFile,'Importer une liste','importHome');imp.append(E('span','importLegend','Importer une liste'));h.append(imp,E('strong','brandTitle','MesListes'),ib('settings',()=>{page='settings';editing=false;selected.clear();render()},'Paramètres','settingsHome'))}else{h.append(ib('back',()=>{page='home';editing=false;selected.clear();render()},'Retour aux listes','backDetail'),E('strong','headerTitle',list().name),E('span','count',String(list().notes.length)))}return h}
function showAbout(){modal('À propos de MesListes', [['OK',close=>close()]], E('p','aboutText','Application MesListes créée par ChatGPT en novembre 2026 sur une idée originale de Christophe R.'))}
function renderSettings(){
 const h=E('header','top settingsTop');h.append(ib('back',()=>{page='home';render()},'Retour à l’accueil','settingsBack'),E('strong','settingsTitle','Paramètres'));app.append(h);
 const main=E('main','settingsPage');main.append(E('h2','','Mode de saisie par défaut'));
 const group=E('div','settingsOptions');
 [['hand','Écriture manuscrite'],['keyboard','Clavier']].forEach(([value,label])=>{
  const row=E('label','settingsOption'),radio=E('input');radio.type='radio';radio.name='defaultEntryMode';radio.value=value;radio.checked=defaultEntryMode===value;
  radio.onchange=()=>{if(!radio.checked)return;try{localStorage.setItem(SETTINGS_KEY,value);defaultEntryMode=value}catch(e){alert('Impossible d’enregistrer ce réglage sur cet appareil.');render();return}};
  row.append(radio,E('span','',label));group.append(row);
 });main.append(group,E('p','settingsHint','Ce choix sera appliqué à chaque nouvelle note. Les boutons Clavier et Manuscrit restent disponibles pendant la saisie.'));
 const delRow=E('div','settingsDeleteRow'),delText=E('span','','Confirmation de suppression');
 const delSwitch=B('',()=>{const next=!confirmSingleNoteDeletion;try{localStorage.setItem(DELETE_CONFIRM_KEY,String(next));confirmSingleNoteDeletion=next;delSwitch.setAttribute('aria-checked',String(next));delSwitch.classList.toggle('isOn',next)}catch(e){alert('Impossible d’enregistrer ce réglage sur cet appareil.')}},'settingsSwitch'+(confirmSingleNoteDeletion?' isOn':''));
 delSwitch.setAttribute('role','switch');delSwitch.setAttribute('aria-label','Confirmation de suppression individuelle');delSwitch.setAttribute('aria-checked',String(confirmSingleNoteDeletion));delSwitch.append(E('span','settingsSwitchThumb'));delRow.append(delText,delSwitch);
 main.append(delRow,E('p','settingsDeleteHint','Désactivé par défaut : les notes supprimées individuellement ne demandent pas confirmation. La suppression via Éditer demande toujours confirmation.'));
 const sizeBlock=E('section','settingsTextSize');
 const sizeTitle=E('h2','','Taille des caractères');
 const sizeHint=E('p','settingsSizeHint','Le réglage agit sur les titres de listes, les notes et la hauteur de leurs lignes, sans modifier les icônes ni leurs légendes.');
 const sizeLine=E('div','settingsSizeLine');
 const smallA=E('span','settingsSizeSmall','A'),largeA=E('span','settingsSizeLarge','A');
 const range=E('input','settingsSizeSlider');range.type='range';range.min=String(MIN_TEXT_SIZE);range.max=String(MAX_TEXT_SIZE);range.step='1';range.value=String(contentTextSize);range.setAttribute('aria-label','Taille des caractères');
 const preview=E('div','settingsSizePreview');
 function updateSizePreview(){preview.style.fontSize=contentTextSize+'px';preview.style.minHeight=Math.round(contentTextSize*2.65+5)+'px';preview.textContent='Courses Crozon     [12]';}
 range.oninput=()=>{contentTextSize=Number(range.value);applyTextSize();updateSizePreview();try{localStorage.setItem(TEXT_SIZE_KEY,String(contentTextSize))}catch(e){/* Setting remains usable for this session */}};
 sizeLine.append(smallA,range,largeA);
 const sizeLabels=E('div','settingsSizeLabels');sizeLabels.append(E('span','','Petite'),E('span','','Moyenne'),E('span','','Grande'));
 sizeBlock.append(sizeTitle,sizeHint,sizeLine,sizeLabels,preview);updateSizePreview();main.append(sizeBlock);
 const about=B('À propos',showAbout,'settingsAbout');about.append(icon('back'));main.append(about);app.append(main);
}
function toggleEdit(){editing=!editing;selected.clear();render()}
function deleteSelected(){const arr=page==='home'?db.lists:list().notes;const ids=new Set(selected);const count=arr.filter(x=>ids.has(x.id)).length;if(!count)return;const what=page==='home'?'listes':'notes';const msg=E('p','',`Vous allez supprimer définitivement ${count} ${what}${page==='home'?' ainsi que toutes leurs notes et photos':''}.`);modal(`Supprimer ${count} ${what} ?`,[['Annuler',c=>c()],['Supprimer',async c=>{const before=[...arr];const keep=arr.filter(x=>!ids.has(x.id));arr.splice(0,arr.length,...keep);try{await persist();selected.clear();c();render()}catch(e){arr.splice(0,arr.length,...before)}},'danger']],msg)}
function canSortByAisle(){
 const notes=list().notes;
 return notes.length>0 && notes.every(note=>typeof note.text==='string' && note.text.trim().length>0 && !note.strokes?.some(stroke=>stroke?.length));
}
function footer(){
 const f=E('footer','footer '+(page==='detail'?'detailFoot':''));
 f.append(B(editing?'OK':'Éditer',toggleEdit,'action editAction'));
 if(editing){const count=selected.size,del=B('',deleteSelected,'bulkDelete');del.append(icon('trash'),E('span','',`Supprimer (${count})`));del.disabled=!count;f.append(del)}
 else if(page==='home'){
   const b=B('',backupDialog,'backupAction footerCenter');
   b.append(icon('save'),E('span','','Sauvegarder / Restaurer'));
   b.setAttribute('aria-label','Sauvegarder ou restaurer');f.append(b);
 }else{
   const share=B('',shareList,'shareWithLabel footerCenter');
   share.append(icon('share'),E('span','','Partager cette liste.'));
   share.setAttribute('aria-label','Partager cette liste');f.append(share);
 }
 if(editing && page==='detail' && canSortByAisle()){
   const sort=ib('sort',sortByAisle,'Tri par rayon','sortByAisle');
   sort.append(E('span','sortLabel','Tri par rayon'));
   f.append(sort);
 }else if(!editing){
   f.append(ib('plus',()=>page==='home'?ask('Nouvelle liste'):openEditor(),'Ajouter','plus'));
 }
 return f;
}

// Group typed grocery items without adding headings. Unknown items stay at the end.
// Handwritten notes are preserved exactly; no remote OCR service is configured.
const groceryGroups=[
 ['fruits-legumes','pomme poire banane orange citron fraise framboise raisin kiwi ananas mangue melon pasteque avocat tomate carotte salade laitue concombre courgette aubergine poivron oignon ail pomme-de-terre patate brocoli chou champignon epinard poireau haricot'],
 ['boulangerie','pain baguette croissant brioche biscotte viennoiserie'],
 ['frais','lait beurre yaourt yogourt fromage camembert emmental comte mozzarella creme oeuf oeufs jambon lardon poulet steak viande poisson saumon tofu'],
 ['surgeles','surgele glace sorbet pizza-surgele frites-surgele'],
 ['epicerie','riz pate pates spaghetti farine sucre sel poivre huile vinaigre cafe the chocolat biscuit cereale confiture miel conserve lentille semoule'],
 ['boissons','eau jus soda limonade sirop'],
 ['entretien','lessive detergent liquide-vaisselle eponge nettoyant javel adoucissant sac-poubelle'],
 ['hygiene','shampoing shampooing savon dentifrice brosse-a-dents deodorant gel-douche papier-toilette mouchoir']
];
function normalizedWords(s){return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[^a-z0-9-]+/g,' ').trim().split(/\s+/)}
function groceryGroup(note){
 if(!note.text?.trim())return groceryGroups.length;
 const words=normalizedWords(note.text);
 for(let i=0;i<groceryGroups.length;i++){
   const known=new Set(groceryGroups[i][1].split(' '));
   if(words.some(w=>known.has(w)||known.has(w.replace(/s$/,''))))return i;
 }
 return groceryGroups.length;
}
async function sortByAisle(){
 if(!canSortByAisle())return;
 const notes=list().notes;
 if(notes.length<2)return;
 const previous=[...notes];
 const sorted=previous.map((note,index)=>({note,index,group:groceryGroup(note)}))
   .sort((a,b)=>a.group-b.group||a.index-b.index).map(x=>x.note);
 if(sorted.every((n,i)=>n===previous[i]))return;
 notes.splice(0,notes.length,...sorted);
 try{await persist();selected.clear();render()}
 catch(e){notes.splice(0,notes.length,...previous)}
}
function render(){app.replaceChildren();if(page==='editor')return renderEditor();if(page==='settings')return renderSettings();app.append(header());const area=E('section','items');const arr=page==='home'?db.lists:list().notes;arr.forEach((v,i)=>{const wrap=E('div','swipeWrap'),row=E('div','item '+(v.received?'received':''));if(editing){const cb=B('',()=>{if(selected.has(v.id))selected.delete(v.id);else selected.add(v.id);render()},'selectCircle'+(selected.has(v.id)?' checked':''));cb.setAttribute('aria-label',(selected.has(v.id)?'Désélectionner ':'Sélectionner ')+(page==='home'?v.name:'la note'));cb.setAttribute('aria-pressed',String(selected.has(v.id)));cb.append(icon(selected.has(v.id)?'check':'circle'));row.append(cb)}
if(page==='home'){row.append(B(v.name,()=>{current=v.id;page='detail';editing=false;selected.clear();render()},'name'),E('span','number','['+v.notes.length+']'))}else{const c=E('canvas','noteCanvas');row.append(c);if(v.text){c.style.display='none';row.append(E('span','typedNote',v.text))}else requestAnimationFrame(()=>drawNote(c,v.strokes,v.coordinateVersion));if(v.url){const linkButton=ib('link',()=>openNoteLink(v),'Ouvrir le lien de la note','noteLinkButton');row.append(linkButton)}if(v.photos?.length){const thumb=B('',()=>viewPhotos(v.photos),'photoThumb');const im=E('img');im.src=v.photos[0];im.alt='Première photo de la note';im.loading='lazy';thumb.append(im);row.append(thumb)}}
if(editing){const handle=E('span','handle','☰');row.append(handle);sortable(handle,wrap,arr,i,area)}else{const del=B('Supprimer',()=>{if(page==='detail'&&!confirmSingleNoteDeletion){removeSingleNoteWithoutConfirmation(arr,i);return}removeConfirm(page==='home'?'cette liste':'cette note',async()=>{const removed=arr.splice(i,1);try{await persist()}catch(e){arr.splice(i,0,...removed);throw e}})},'swipeDelete');wrap.append(del);swipe(row)}wrap.append(row);area.append(wrap)});if(!arr.length)area.append(E('p','empty',page==='home'?'Appuyez sur + pour créer une liste.':'Aucune note. Appuyez sur + pour écrire.'));app.append(area,footer())}
function swipe(row){let sx=0,sy=0,open=false;row.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});row.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.4){open=dx<0;row.style.transform=open?'translateX(-116px)':''}},{passive:true})}
function sortable(handle,wrap,arr,index,area){handle.addEventListener('pointerdown',e=>{e.preventDefault();handle.setPointerCapture(e.pointerId);const rect=wrap.getBoundingClientRect();drag={wrap,index,start:e.clientY,rect,arr};wrap.classList.add('dragging');wrap.style.zIndex=5});handle.addEventListener('pointermove',e=>{if(!drag||drag.wrap!==wrap)return;const dy=e.clientY-drag.start;wrap.style.transform=`translateY(${dy}px)`;const center=drag.rect.top+drag.rect.height/2+dy;const rows=[...area.querySelectorAll('.swipeWrap')];let dest=rows.findIndex(r=>center<r.getBoundingClientRect().top+r.getBoundingClientRect().height/2);if(dest<0)dest=rows.length-1;rows.forEach((r,j)=>{if(r!==wrap)r.style.transform=j>index&&j<=dest?'translateY(-100%)':j<index&&j>=dest?'translateY(100%)':''});drag.dest=dest});const finish=async()=>{if(!drag||drag.wrap!==wrap)return;const dest=drag.dest??index;drag=null;if(dest!==index){const previous=[...arr];arr.splice(dest,0,arr.splice(index,1)[0]);try{await persist()}catch(e){arr.splice(0,arr.length,...previous)}}render()};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish)}
function drawNote(c,lines,version){const w=c.clientWidth,h=c.clientHeight,d=devicePixelRatio||1;c.width=Math.round(w*d);c.height=Math.round(h*d);const ctx=c.getContext('2d');ctx.scale(d,d);if(!lines?.length)return;let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;const xfactor=version===3?1:.46;for(const stroke of lines)for(const p of stroke){minx=Math.min(minx,p.x*xfactor);maxx=Math.max(maxx,p.x*xfactor);miny=Math.min(miny,p.y);maxy=Math.max(maxy,p.y)}if(!Number.isFinite(minx))return;const scale=Math.min((w-24)/Math.max(1,maxx-minx),(h-12)/Math.max(1,maxy-miny),1);ctx.strokeStyle='#111';ctx.lineWidth=2.64*scale;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of lines){ctx.beginPath();stroke.forEach((p,i)=>i?ctx.lineTo(12+(p.x*xfactor-minx)*scale,6+(p.y-miny)*scale):ctx.moveTo(12+(p.x*xfactor-minx)*scale,6+(p.y-miny)*scale));if(stroke.length===1)ctx.lineTo(12+(stroke[0].x*xfactor-minx)*scale+.1,6+(stroke[0].y-miny)*scale);ctx.stroke()}}
function openEditor(){ink=[];photos=[];offset=0;entryMode=defaultEntryMode;typedText='';noteLink='';modeLocked=false;page='editor';render()}
async function finishEditor(){const value=entryMode==='keyboard'?typedText.trim():'';if(ink.some(s=>s.length)||value||photos.length||noteLink){const notes=list().notes;notes.push({id:uid(),strokes:entryMode==='hand'?ink:[],text:value,photos,url:noteLink,coordinateVersion:3});try{await persist()}catch(e){notes.pop();return}}page='detail';render()}
function renderEditor(){const root=E('div','editor'),head=E('div','editorHead');const cam=E('div','cameraGroup');cam.append(ib('camera',()=>choosePhoto(false),'Ajouter une ou plusieurs photos à la note'),E('span','cameraLegend','Ajouter une ou plusieurs photos à la note.'));const linkGroup=E('div','linkGroup');linkGroup.append(ib('link',()=>linkDialog(),'Ajouter un lien hypertexte à la note'),E('span','linkLegend','Ajouter un lien hypertexte à la note.'));head.append(B('OK',finishEditor,'editorOk'),linkGroup);const space=E('div','editorSpace');space.append(cam);root.append(head,space);const attached=E('div','attached');root.append(attached);const controls=E('div','entryControls');const switcher=B('',()=>{if(modeLocked)return;entryMode=entryMode==='hand'?'keyboard':'hand';render()},'modeControl');switcher.append(icon(entryMode==='hand'?'keyboard':'pen'),E('span','',entryMode==='hand'?'Clavier':'Manuscrit'));controls.append(switcher);const erase=B('',()=>{ink=[];typedText='';noteLink='';offset=0;modeLocked=false;entryMode=defaultEntryMode;render()},'eraseControl');erase.append(icon('reset'),E('span','','Réinitialiser'));controls.append(erase);root.append(controls);if(entryMode==='keyboard'){const panel=E('div','keyboardPanel'),field=E('textarea','keyboardField');field.placeholder='Saisissez votre note…';field.value=typedText;field.setAttribute('aria-label','Texte de la note');field.oninput=()=>{typedText=field.value;modeLocked=!!typedText.length;switcher.disabled=modeLocked};switcher.disabled=modeLocked;panel.append(field);root.append(panel,E('div','editorBottom'));app.append(root);showAttached();syncVisibleViewport();field.focus({preventScroll:true});return}switcher.disabled=modeLocked;const nav=E('div','navigator'),overview=E('canvas'),view=E('div','viewport');nav.append(overview,view);root.append(nav);const grid=E('div','gridArea'),canvas=E('canvas');grid.append(canvas);root.append(grid,E('div','editorBottom'));app.append(root);
const clamp=v=>Math.max(0,Math.min(1400,v));let moving=false,lastX=0;view.onpointerdown=e=>{moving=true;lastX=e.clientX;view.setPointerCapture(e.pointerId)};view.onpointermove=e=>{if(!moving)return;const dx=e.clientX-lastX;lastX=e.clientX;offset=clamp(offset+dx/Math.max(1,nav.clientWidth*.77)*1400*.85);drawEditor()};view.onpointerup=()=>moving=false;view.onpointercancel=()=>moving=false;nav.onpointerdown=e=>{if(e.target!==view){const r=nav.getBoundingClientRect();offset=clamp(((e.clientX-r.left)/r.width-.115)/.77*1400);drawEditor()}};
let writing=false;const add=e=>{const r=canvas.getBoundingClientRect();const unit=200/r.height;ink.at(-1).push({x:(e.clientX-r.left)*unit+offset,y:(e.clientY-r.top)*unit});schedulePaint()};canvas.onpointerdown=e=>{modeLocked=true;switcher.disabled=true;writing=true;canvas.setPointerCapture(e.pointerId);ink.push([]);add(e)};canvas.onpointermove=e=>{if(!writing)return;for(const p of (e.getCoalescedEvents?.()||[e]))add(p)};canvas.onpointerup=()=>writing=false;canvas.onpointercancel=()=>writing=false;drawEditor();showAttached()}
function schedulePaint(){if(paintPending)return;paintPending=true;requestAnimationFrame(()=>{paintPending=false;drawEditor()})}
function drawEditor(){const grid=document.querySelector('.gridArea canvas'),overview=document.querySelector('.navigator canvas'),view=document.querySelector('.viewport');if(!grid)return;const d=devicePixelRatio||1;for(const c of [grid,overview]){const w=c.clientWidth,h=c.clientHeight;c.width=Math.round(w*d);c.height=Math.round(h*d);const ctx=c.getContext('2d');ctx.scale(d,d);if(c===grid){ctx.strokeStyle='#d2d2d2';ctx.lineWidth=1;for(let x=0;x<=w;x+=w/8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<=h;y+=h/4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}}ctx.strokeStyle='#111';ctx.lineWidth=c===grid?3.9:2.16;ctx.lineCap='round';ctx.lineJoin='round';const sx=c===grid?h/200:w/2200,sy=h/200;for(const stroke of ink){ctx.beginPath();stroke.forEach((p,i)=>{const x=(p.x-(c===grid?offset:0))*sx,y=p.y*sy;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}}view.style.left=offset/1400*77+'%'}
function normalizeLink(raw){
 let v=String(raw||'').trim();if(/^www\./i.test(v))v='https://'+v;
 if(!v)return '';
 try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol)||!u.hostname||u.username||u.password)throw Error();return u.href}catch(e){throw Error('Veuillez saisir une adresse Internet valide (http ou https).')}
}
function linkDialog(existingNote=null){
 const old=existingNote?existingNote.url||'':noteLink;
 const cover=E('div','modal'),box=E('div','dialog linkDialog');box.append(E('strong','',existingNote?'Modifier le lien':'Ajouter un lien'));
 box.append(E('p','linkPrompt','Veuillez copier-coller le lien ci-dessous :'));
 const paste=B('Coller',async()=>{try{field.value=await navigator.clipboard.readText();field.focus()}catch(e){alert('Le collage automatique est indisponible. Maintenez le doigt dans le champ puis choisissez Coller.')}},'linkPaste');box.append(paste);
 const line=E('div','linkInputLine'),field=E('input');field.type='url';field.inputMode='url';field.autocapitalize='off';field.autocomplete='off';field.spellcheck=false;field.placeholder='https://...';field.value=old;
 const clear=B('×',()=>{field.value='';field.focus()},'linkClear');clear.setAttribute('aria-label','Effacer le lien');line.append(field,clear);box.append(line);
 const actions=E('div','dialogActions linkActions');
 if(old){actions.append(B('Supprimer',async()=>{if(existingNote){const previous=existingNote.url;existingNote.url='';try{await persist()}catch(e){existingNote.url=previous;return}render()}else noteLink='';cover.remove()},'danger'))}
 actions.append(B('ANNULER',()=>cover.remove()),B('VALIDER',async()=>{let value;try{value=normalizeLink(field.value);if(!value)throw Error('Veuillez saisir une adresse Internet.')}catch(e){alert(e.message);return}
 if(existingNote){const previous=existingNote.url;existingNote.url=value;try{await persist()}catch(e){existingNote.url=previous;return}render()}else noteLink=value;
 cover.remove()},'linkValidate'));box.append(actions);cover.append(box);document.body.append(cover);
}
function openNoteLink(note){
 const link=note.url;if(!link)return;
 const cover=E('div','modal'),box=E('div','dialog');box.append(E('strong','','Lien de la note'),E('p','linkAddress',link));
 const bar=E('div','dialogActions');bar.append(B('Annuler',()=>cover.remove()),B('Modifier',()=>{cover.remove();linkDialog(note)}),B('Ouvrir',()=>{cover.remove();window.open(link,'_blank','noopener,noreferrer')},'linkValidate'));box.append(bar);cover.append(box);document.body.append(cover);
}
function choosePhoto(){
 const input=E('input');input.type='file';input.accept='image/*';
 Object.assign(input.style,{position:'fixed',left:'-10000px',top:'0',opacity:'0',width:'1px',height:'1px'});
 document.body.append(input);
 const cleanup=()=>input.remove();
 input.addEventListener('cancel',cleanup,{once:true});
 input.onchange=async()=>{const f=input.files?.[0];if(!f){cleanup();return}try{const data=await compressPhoto(f);photos.push(data);showAttached()}catch(e){alert('Impossible de lire cette photo.')}finally{cleanup()}};
 try{input.click()}catch(e){cleanup();alert('Sélection de photo impossible.')} 
}
function compressPhoto(file){return new Promise((ok,no)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const s=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);ok(c.toDataURL('image/jpeg',.76))};img.onerror=()=>{URL.revokeObjectURL(url);no(Error('Image illisible'))};img.src=url})}
function showAttached(){const el=document.querySelector('.attached');if(!el)return;el.replaceChildren();photos.forEach((p,i)=>{const img=E('img','attachedThumb');img.src=p;img.onclick=()=>viewPhotos(photos);el.append(img)})}
function viewPhotos(images){let i=0;const shade=E('div','photoView'),img=E('img');const caption=E('span','photoCounter');const show=()=>{img.src=images[i];caption.textContent=`${i+1} / ${images.length}`};shade.append(B('Fermer ✕',()=>shade.remove()),caption,img,B('◀ Précédente',()=>{i=(i+images.length-1)%images.length;show()}),B('Suivante ▶',()=>{i=(i+1)%images.length;show()}));document.body.append(shade);show()}
function download(name,contents,type='application/json'){const u=URL.createObjectURL(contents instanceof Blob?contents:new Blob([contents],{type})),a=E('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000)}
function choiceDialog(title,description,choices){const cover=E('div','modal'),box=E('div','dialog choiceDialog');box.append(E('strong','',title));if(description)box.append(E('p','dialogDescription',description));const row=E('div','choiceActions');for(const [label,icoName,fn] of choices){const b=B('',()=>{cover.remove();fn()},'choiceAction');b.append(icon(icoName),E('span','',label));row.append(b)}box.append(row);const bottom=E('div','choiceBottom');bottom.append(B('Annuler',()=>cover.remove(),'cancelChoice'));box.append(bottom);cover.append(box);document.body.append(cover);return cover}
function backupDialog(){choiceDialog('Sauvegarde locale','Sauvegardez toutes vos listes ou restaurez une copie de sauvegarde.',[['Créer une copie de sauvegarde','save',()=>download('MesListes-sauvegarde.json',JSON.stringify({format:'MesListes',version:7,kind:'backup',lists:db.lists}))],['Restaurer une copie de sauvegarde','restore',restoreBackup]])}
// Keep the native file input attached to the document while iOS Files is open.
// A new input is created for every attempt so choosing the same file works again.
function pickJsonFile(onFile){
 const inp=E('input');inp.type='file';inp.accept='.json,application/json';
 inp.setAttribute('aria-label','Choisir un fichier MesListes');
 Object.assign(inp.style,{position:'fixed',left:'-10000px',top:'0',width:'1px',height:'1px',opacity:'0'});
 document.body.append(inp);
 let handled=false;
 const cleanup=()=>{inp.removeEventListener('change',changed);inp.removeEventListener('cancel',cancelled);inp.remove()};
 const cancelled=()=>{if(!handled){handled=true;cleanup()}};
 const changed=async()=>{
  if(handled)return;
  handled=true;
  const file=inp.files?.[0];
  // Keep the input attached until the file bytes are read (Safari/iOS).
  try{if(file)await onFile(file)}finally{cleanup()}
 };
 inp.addEventListener('change',changed);
 inp.addEventListener('cancel',cancelled);
 try{inp.click()}catch(e){cleanup();alert('Impossible d’ouvrir les fichiers : '+e.message)}
}
function restoreBackup(){pickJsonFile(async file=>{try{if(file.size>75*1024*1024)throw Error('Fichier trop volumineux (maximum 75 Mo).');const payload=JSON.parse(await file.text());if(payload?.format!=='MesListes'||!Array.isArray(payload.lists)||payload.lists.length>200||![3,4,5,6,7].includes(payload.version)||payload.kind==='single-list')throw Error('Ce fichier n’est pas une sauvegarde complète compatible.');const incoming=validateImport({...payload,lists:payload.lists.length?payload.lists:[{name:'__verification__',notes:[]}]}).filter(l=>l.name!=='__verification__');const desc=E('p','',`Cette opération remplacera vos ${db.lists.length} liste(s) actuelles par ${incoming.length} liste(s) de la sauvegarde. Vos listes actuelles seront perdues si elles ne sont pas sauvegardées séparément.`);modal('Remplacer toutes les listes ?', [['Annuler',c=>c()],['Restaurer et remplacer',async c=>{const previous=db.lists;db.lists=incoming.map((l,i)=>({...l,received:!!payload.lists[i]?.received}));try{await persist();c();page='home';editing=false;selected.clear();render();alert('Sauvegarde restaurée.')}catch(e){db.lists=previous;alert('Restauration impossible : '+e.message)}} ,'danger']],desc)}catch(e){alert('Restauration impossible : '+e.message)}});}function uniqueName(name){let candidate=name,n=1;while(db.lists.some(l=>l.name.toLocaleLowerCase()===candidate.toLocaleLowerCase())){candidate=name+' ('+(n===1?'copie':'copie '+n)+')';n++}return candidate}
function validateImport(payload){if(payload?.format!=='MesListes'||!Array.isArray(payload.lists)||!payload.lists.length||payload.lists.length>200)throw Error('Format de fichier invalide');return payload.lists.map(l=>{if(!l||typeof l.name!=='string'||!l.name.trim()||!Array.isArray(l.notes)||l.notes.length>10000)throw Error('Liste invalide');return {id:uid(),name:l.name.trim().slice(0,150),received:true,notes:l.notes.map(n=>{if(!n||!Array.isArray(n.strokes)||n.strokes.length>5000||!n.strokes.every(st=>Array.isArray(st)&&st.length<100000&&st.every(pt=>Number.isFinite(pt.x)&&Number.isFinite(pt.y))))throw Error('Écriture invalide');if(n.photos!==undefined&&(!Array.isArray(n.photos)||n.photos.some(p=>typeof p!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(p))))throw Error('Photo invalide');if(n.text!==undefined&&(typeof n.text!=='string'||n.text.length>10000))throw Error('Texte invalide');if(n.url!==undefined&&(typeof n.url!=='string'||n.url.length>2048))throw Error('Lien invalide');let url='';if(n.url){try{url=normalizeLink(n.url)}catch(e){throw Error('Lien Internet invalide dans la sauvegarde')}}return {id:uid(),strokes:n.strokes,text:n.text||'',photos:n.photos||[],url,coordinateVersion:n.coordinateVersion===3?3:2}})}})}
function importFile(){pickJsonFile(async file=>{try{if(file.size>75*1024*1024)throw Error('Fichier trop volumineux (maximum 75 Mo).');const payload=JSON.parse(await file.text());const incoming=validateImport(payload);const total=incoming.reduce((n,l)=>n+l.notes.length,0),pics=incoming.reduce((n,l)=>n+l.notes.reduce((m,x)=>m+x.photos.length,0),0);const description=E('p','',incoming.map(l=>l.name).join(', ')+' — '+total+' note(s), '+pics+' photo(s). Vos listes existantes seront conservées.');modal('Ajouter à mes listes ?', [['Annuler',c=>c()],['Ajouter à mes listes',async c=>{try{await importLists(incoming,true);c()}catch(e){alert('Importation impossible : '+e.message)}}]],description)}catch(e){alert('Importation impossible : '+e.message)}});}async function importLists(incoming,validated=false){const newLists=validated?incoming:validateImport({format:'MesListes',lists:incoming});const existing=[...db.lists];const names=[];for(const l of newLists){l.name=uniqueName(l.name);names.push(l.name);db.lists.push(l)}try{await persist()}catch(e){db.lists=existing;throw e}page='home';editing=false;selected.clear();render();alert(names.length+' liste(s) ajoutée(s) sans remplacer vos listes existantes.')}
async function shareList(){choiceDialog('Partager « '+list().name+' »','Image lisible pour consultation, ou fichier complet à importer dans MesListes.',[['Envoyer une image de la liste','photo',shareImages],['Envoyer le fichier de la liste','import',shareComplete]])}
async function shareComplete(){try{const l=list(),data=JSON.stringify({format:'MesListes',version:7,kind:'single-list',lists:[l]}),filename='MesListes-'+l.name.replace(/[^\p{L}\p{N}-]/gu,'_')+'.json',file=new File([data],filename,{type:'application/json'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:l.name});else download(filename,data)}catch(e){if(e.name!=='AbortError')alert('Partage impossible : '+e.message)}}
function drawHandwriting(ctx,n,x,y,maxW,maxH){const strokes=n.strokes||[];let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity,xf=n.coordinateVersion===3?1:.46;for(const st of strokes)for(const pt of st){minx=Math.min(minx,pt.x*xf);maxx=Math.max(maxx,pt.x*xf);miny=Math.min(miny,pt.y);maxy=Math.max(maxy,pt.y)}if(!Number.isFinite(minx))return;const sc=Math.min(maxW/Math.max(1,maxx-minx),maxH/Math.max(1,maxy-miny),2);ctx.strokeStyle='#171717';ctx.lineWidth=Math.max(1.8,2.64*sc);ctx.lineJoin='round';ctx.lineCap='round';for(const st of strokes){ctx.beginPath();st.forEach((pt,i)=>i?ctx.lineTo(x+(pt.x*xf-minx)*sc,y+(pt.y-miny)*sc):ctx.moveTo(x+(pt.x*xf-minx)*sc,y+(pt.y-miny)*sc));ctx.stroke()}}
async function loadPhoto(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src})}
async function listImages(l){const W=1000,H=1400,margin=55;let pages=[],canvas,ctx,y;const fresh=()=>{canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#111';ctx.font='bold 48px -apple-system, sans-serif';ctx.fillText(l.name,margin,85,W-margin*2);ctx.strokeStyle='#ddd';ctx.beginPath();ctx.moveTo(margin,112);ctx.lineTo(W-margin,112);ctx.stroke();y=145};const finish=()=>{ctx.fillStyle='#777';ctx.font='20px sans-serif';ctx.fillText('MesListes — page '+(pages.length+1),margin,H-24);pages.push(canvas)};fresh();for(const note of l.notes){if(y+160>H-70){finish();fresh()}if(note.text){ctx.fillStyle='#171717';ctx.font='32px sans-serif';const words=note.text.split(/\s+/);let line='',yy=y+38;for(const word of words){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>W-margin*2-24&&line){ctx.fillText(line,margin+12,yy);yy+=42;line=word}else line=candidate}if(line)ctx.fillText(line,margin+12,yy);y=Math.max(y+155,yy+28)}else{drawHandwriting(ctx,note,margin+12,y+12,W-margin*2-24,115);y+=155}if(note.url){ctx.fillStyle='#087f82';ctx.font='23px sans-serif';const display=note.url.length>72?note.url.slice(0,69)+'…':note.url;ctx.fillText(display,margin+12,y+20,W-margin*2-24);y+=42}for(const src of note.photos||[]){const im=await loadPhoto(src),avail=W-margin*2,scale=Math.min(avail/im.width,900/im.height),h=Math.ceil(im.height*scale);if(y+h+30>H-65){finish();fresh()}ctx.drawImage(im,margin,y,Math.ceil(im.width*scale),h);y+=h+25}ctx.strokeStyle='#e5e5e5';ctx.beginPath();ctx.moveTo(margin,y);ctx.lineTo(W-margin,y);ctx.stroke();y+=25}finish();return Promise.all(pages.map(c=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Image impossible')),'image/png'))))}
async function shareImages(){try{const l=list(),blobs=await listImages(l),files=blobs.map((b,i)=>new File([b],'MesListes-'+l.name.replace(/[^\p{L}\p{N}-]/gu,'_')+'-'+(i+1)+'.png',{type:'image/png'}));if(navigator.canShare?.({files}))await navigator.share({files,title:l.name});else{files.forEach(f=>download(f.name,f,'image/png'));alert('Images créées. Vous pouvez les envoyer depuis Fichiers ou Photos.')}}catch(e){if(e.name!=='AbortError')alert('Création des images impossible : '+e.message)}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});load();
