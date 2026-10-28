const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('/mnt/user-data/outputs/libretaw.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const main=scripts[scripts.length-1];
const body=html.split('<script')[0];
const idTags={};for(const m of body.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g))idTags[m[2]]=m[1];
const errors=[];const logs=[];
function mk(tag,id){
  const store={tag:(tag||'div').toUpperCase(),id:id||'',value:'',textContent:'',className:'',innerHTML:'',style:{setProperty(k,v){this[k]=v},removeProperty(){},cssText:''},dataset:{},children:[],attrs:{},disabled:false,checked:false,placeholder:'',title:'',src:'',href:'',files:[],hidden:false,type:'',min:'',max:'',step:'',maxLength:0};
  const classes=new Set();store.classList={add:(...a)=>a.forEach(x=>classes.add(x)),remove:(...a)=>a.forEach(x=>classes.delete(x)),toggle:(c,f)=>{const on=f===undefined?!classes.has(c):!!f;on?classes.add(c):classes.delete(c);return on},contains:c=>classes.has(c)};
  const fns={append(...a){store.children.push(...a)},prepend(...a){store.children.unshift(...a)},before(){},after(){},remove(){},replaceWith(){},insertAdjacentHTML(){},setAttribute(k,v){store.attrs[k]=v},getAttribute(k){return k in store.attrs?store.attrs[k]:null},removeAttribute(k){delete store.attrs[k]},addEventListener(){},removeEventListener(){},click(){if(typeof el.onclick==='function')return el.onclick({stopPropagation(){},preventDefault(){}})},focus(){},blur(){},play(){return Promise.resolve()},pause(){},close(){},querySelectorAll(){return[]},querySelector(){return mk('div')},closest(){return null},contains(){return false},getContext(){return new Proxy({},{get:()=>()=>({data:[]})})},captureStream(){return {addTrack(){},getTracks(){return[]}}},postMessage(){},toBlob(cb){cb(new Blob([]))},getBoundingClientRect(){return{}},scrollIntoView(){},setPointerCapture(){}};
  const el=new Proxy(store,{get(t,k){if(k==='nextElementSibling'||k==='firstChild'||k==='lastChild'||k==='parentElement'||k==='parentNode'||k==='previousElementSibling')return mk('div');if(k in fns)return fns[k];if(k==='contentWindow')return{postMessage(){}};if(k==='scrollHeight')return 100;if(k==='offsetWidth')return 10;if(k==='length')return 0;if(k===Symbol.toPrimitive)return undefined;return t[k]},set(t,k,v){t[k]=v;return true}});
  return el;
}
const els={};function getEl(id){return els[id]||(els[id]=mk(idTags[id]||'div',id))}
const ls={},ss={};
const mkStore=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v)},removeItem:k=>{delete o[k]},clear(){}});
class BC{constructor(){this.posted=[]}postMessage(d){this.posted.push(d)}set onmessage(f){this._h=f}get onmessage(){return this._h}}
class FakeWS{constructor(){}}
const doc={getElementById:getEl,createElement:t=>mk(t),createTextNode:t=>({nodeValue:t}),body:mk('body'),documentElement:mk('html'),querySelectorAll:s=>s.indexOf('script')>=0?[{textContent:main}]:[],querySelector:()=>mk('div'),addEventListener(){},createTreeWalker:()=>({nextNode:()=>null}),hidden:false,permissionsPolicy:undefined};
const sb={console:{log:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push('ERR '+a.join(' ')),warn(){}},document:doc,localStorage:mkStore(ls),sessionStorage:mkStore(ss),
 navigator:{userAgent:'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',language:'ru-RU',clipboard:{writeText:()=>Promise.resolve()},onLine:true},
 location:{protocol:'http:',hostname:'localhost',reload(){logs.push('RELOAD')},hash:''},screen:{width:1280,height:720},devicePixelRatio:1,
 matchMedia:()=>({matches:false,addEventListener(){}}),BroadcastChannel:BC,MutationObserver:class{observe(){}},NodeFilter:{SHOW_TEXT:4},
 setTimeout:(f,ms)=>{const t=setTimeout(()=>{try{f()}catch(e){errors.push('timer: '+e.stack.split('\n').slice(0,3).join(' | '))}},Math.min(ms||0,50));t.unref&&t.unref();return t},clearTimeout,setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
 crypto:globalThis.crypto,TextEncoder,TextDecoder,Blob,URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},Image:class{set src(v){setTimeout(()=>this.onload&&this.onload(),0)}},FileReader:class{readAsDataURL(){this.result='data:image/png;base64,AAAA';setTimeout(()=>this.onload&&this.onload(),0)}},
 WebSocket:FakeWS,Intl,Uint8Array,Promise,JSON,Math,Date,Set,Map,WeakMap,WeakSet,Array,Object,String,Number,Error,Symbol,btoa,atob,parseInt,parseFloat,isFinite,Response,CompressionStream,DecompressionStream,
 addEventListener(){},removeEventListener(){},qrcode:undefined,jsQR:undefined,claude:undefined,indexedDB:undefined,RTCPeerConnection:undefined,MediaRecorder:undefined,Notification:undefined,
 encodeURIComponent,decodeURIComponent,screenX:0,innerWidth:1200,performance:{now:()=>Date.now()}};
sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
function run(label,code){try{const r=vm.runInContext(code,sb);if(r&&typeof r.then==='function')return r.catch(e=>{errors.push(label+': '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | '))});return r}catch(e){errors.push(label+': '+String(e&&e.stack||e).split('\n').slice(0,4).join(' | '))}}
(async()=>{
 // 1. load
 try{vm.runInContext(main,sb,{filename:'main.js'})}catch(e){errors.push('LOAD: '+e.stack.split('\n').slice(0,5).join(' | '))}
 console.log('load errors so far:',errors.length);
 if(errors.length){console.log(errors.join('\n'));process.exit(1)}
 const R=async(l,c)=>{await run(l,'(async()=>{'+c+'\n})()')};
 await R('prep',`store.pend=false;store.chats.unshift({id:'pc1',name:'Боб',peer:'LTW-CCCC-DDDD',sys:'x',msgs:[{text:'привет',t:1,me:0,from:'Боб'}]});
  store.chats.unshift({id:'g9',name:'Группа',group:1,gid:'GR-AAAA-BBBB',own:1,admins:[],perm:{send:'all',add:'all'},members:['Аня'],sys:'g',msgs:[]});
  store.chats.unshift({id:'k9',name:'Канал',ch:1,own:1,chid:'CH-AAAA-BBBB',admins:[],desc:'d',sys:'c',msgs:[]});`);
 await R('renderList',`renderList()`);
 for(const id of ['pc1','g9','k9','fav','lan']){
  await R('open '+id,`open('${id}')`);
  await R('send text '+id,`$('t').value='тест сообщения';send()`);
  await R('send cmd '+id,`$('t').value='/hello Вася';send()`);
  await R('stickers '+id,`sendMedia(store.chats.find(x=>x.id==='${id}'),{kind:'sticker',k:'std:2'},'')`);
  await R('poll '+id,`openPoll();$('pq').value='Вопрос?';drawPo(['А','Б']);$('pos').querySelectorAll=()=>[{value:'А'},{value:'Б'}];$('pook').onclick&&$('pook').onclick()`);
  await R('render '+id,`renderMsgs();refreshRx();renderList()`);
 }
 await R('poll vote',`{const c=store.chats.find(x=>x.id==='pc1');if(!c.msgs.some(m=>m.poll))sendMedia(c,null,'',{poll:{q:'Q',opts:[{id:'o0',t:'a'},{id:'o1',t:'b'}],multi:false,anon:false,votes:{}}});const m=c.msgs.find(x=>x.poll);votePoll(c,m,'o0');votePoll(c,m,'o1');mergePoll(m,{votes:{X:{s:['o0'],n:'x'}}});pollEl(c,m);closePoll(c,m);}`);
 await R('reactions',`{const c=store.chats.find(x=>x.id==='pc1');const m=c.msgs[0];reactTo(c,m,'👍');rxRow(c,m);openRx(c,m);applyRxE({route:{k:'peer',to:myId()},from:'LTW-CCCC-DDDD',rxe:{t:1,key:'🔥',rid:'LTW-CCCC-DDDD'}});}`);
 await R('people',`renderPeople();renderFeed();renderThemes();renderLangs();renderStories();renderPlug();renderMode();renderDev();renderPriv();renderProfile();srvUi();lanUi();drawSet&&drawSet();drawStk();drawRxM();drawWp&&drawWp();drawL&&0`);
 await R('catalog',`catalog().length`);
 await R('themes',`PRE.forEach(t=>{store.themeId=t.id;theme()});store.themeId='';theme();setTheme('p-lav');openThEd({id:'THM-1',name:'x',h:100,s:1,t:60,mode:'auto',oled:false,author:'a'});drawTE();`);
 await R('lang',`{const l={id:'LNG-X',name:'EN',d:{'Чаты':'Chats'},ver:1};(store.langs||(store.langs=[])).push(l);setLang('LNG-X');openLed(l);drawL();setLang('')}`);
 await R('wallpaper',`openWp(null);setWp({k:'aur'});applyWp(store.chats[0]);openWp(store.chats[0]);setWp({img:'data:x',dim:20});`);
 await R('sticker pack',`{const p={id:'STK-1',name:'n',author:'a',own:1,items:[]};store.stk=[p];sp='STK-1';drawStk();stickerEl({kind:'sticker',k:'std:1'});stickerEl({kind:'sticker',id:'m1'})}`);
 await R('file mode',`{const c=store.chats.find(x=>x.id==='pc1');fxC=c;openFx(c);const o={v:2,t:'p',a:'LTW-CCCC-DDDD',n:'Боб',b:myId(),k:0,m:[{t:5,a:'LTW-CCCC-DDDD',n:'Боб',x:'из файла'}],mb:{}};const txt=await packFx(o,null);const d=await unpackFx(txt);await importV2(d);const t2=await packFx(o,'pass1234');const d2=await unpackFx(t2,'pass1234');await importV2(d2);}`);
 await R('file export',`{fxC=store.chats.find(x=>x.id==='g9');$('fpw1').value='';$('fpw2').value='';await exportFx(false);await exportFx(true)}`);
 await R('plugins',`{const t='/* libretaw-plugin\\n{"id":"t.plug","name":"T","permissions":["commands","messages.send","storage","toast","theme","chats.read","profile","messages.read"]}\\n*/\\nvar x=1;';const pl=plugParse(t);plugAsk(pl);pl.enabled=true;(store.plugins||(store.plugins=[])).push(pl);plugStart(pl);plugRun[pl.id].f={contentWindow:{postMessage(){}},remove(){}};
   for(const [m,a] of [['ready',[]],['cmd.add',['hello','x']],['ui.toast',['hi']],['me',[]],['chat.list',[]],['storage.set',['k',1]],['storage.get',['k']],['theme.setVars',[{pri:'#f00',evil:'x'}]],['chat.send',['pc1','от плагина']],['log',['err']]])await plugCall(pl,m,a);
   plugCmd('/hello Вася',store.chats[0]);plugScan();renderPlug();plugStop(pl.id)}`);
 await R('server client',`{store.net='srv';srvCfg();srvUrl();srvQueue({to:'x',m:1});srvUi();srvModeChanged&&0}`);
 await R('lan',`{store.net='lan';lanSend({chat:'lan',m:{text:'x'}});lanApply();lanMode('join');lanMode('host');copyTxt('x');store.net='mesh';lanApply();lanTargets({gpost:'g'});store.net='bt';lanApply();store.net='vpn';lanApply();sdpVpn('a=candidate:1 1 udp 2 x.local 5 typ host\\r\\n','10.0.0.1')}`);
 await R('lanEnc',`{store.net='vpn';store.vpnIp='10.8.0.2';const c=await lanEnc('O','v=0\\r\\na=candidate:1 1 udp 2 x.local 5 typ host\\r\\n');const d=await lanDec(c);if(d.role!=='O')throw new Error('role')}`);
 await R('handleQR',`handleQR('libretaw:LTW-AAAA-BBBB');handleQR('garbage')`);
 await R('addPeer',`{pOnly=false;$('ci').value='LTW-ZZZZ-YYYY';tp='id';addPeer();$('ci').value='GR-ZZZZ-YYYY';addPeer();$('ci').value='CH-ZZZZ-YYYY';addPeer();$('ci').value='LNG-ZZZZ-YYYY';addPeer();$('ci').value='THM-ZZZZ-YYYY';addPeer();$('ci').value='STK-ZZZZ-YYYY';addPeer();$('ci').value='RXN-ZZZZ-YYYY';addPeer()}`);
 await R('create chats',`{setTp('group');$('cn').value='NG';$('cm').value='a,b';$('cok').onclick();setTp('ch');$('cn').value='NC';$('cd').value='x';$('cok').onclick();}`);
 await R('roles',`{const g=store.chats.find(x=>x.group&&x.own);openRoles(g);renderRoles(g);const c=store.chats.find(x=>x.ch&&x.own);renderRoles(c);infoX(c,c.chid,true)}`);
 await R('security',`{regDev();endSession&&0;kickDev('*');askKick('*');askOut();askDel(store.chats[0]);sysMsg('t');notifyLogin({name:'n',type:'t',os:'o',first:1})}`);
 await R('tabs',`[0,1,2,3].forEach(n=>tab(n));tab(0)`);
 await R('accounts',`syncAcc();openAccs()`);
 await R('story',`{openStory();$('stx').value='привет';drawSt();$('stOk').onclick&&$('stOk').onclick();renderStories();const k='u:'+myId();hasSt(k)&&openViewer(k);nextSt();closeViewer()}`);
 await R('purge',`purge();purgeSt();gcMedia&&0`);
 await R('drafts',`updComp();updFx();plugHint();`);
 await R('export acc',`{const t=await encAcc('secret1');const d=await decAcc(t,'secret1');if(!d.profile)throw new Error('acc')}`);
 await new Promise(r=>setTimeout(r,300));
 console.log('--- logs (non-empty):',logs.slice(0,10).join(' / '));
 console.log(errors.length?'ERRORS ('+errors.length+'):\n'+errors.join('\n'):'NO RUNTIME ERRORS');
 process.exit(0);
})();
