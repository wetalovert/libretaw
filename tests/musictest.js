const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const mkStore=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v)},removeItem:k=>{delete o[k]}});
const posted=[];class BC{postMessage(d){posted.push(d)}set onmessage(f){this._h=f}get onmessage(){return this._h}}
const el=()=>new Proxy(function(){},{get:(t,k)=>k==='style'?{setProperty(){},removeProperty(){}}:k==='setProperty'?(()=>{}):k==='classList'?{add(){},remove(){},toggle(){},contains(){return false}}:k==='children'?[]:k==='value'?'':k==='textContent'?'':()=>el(),set:()=>true,apply:()=>el()});
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function world(inc,withChat){
 const ls={};
 const st={profile:{id:'LTW-AAAA-BBBB',name:'Я',emoji:'😀',hue:260},nick:'Я',hue:260,mode:'auto',net:'lan',
   chats:[{id:'fav',name:'Избранное',sys:'x',msgs:[]}].concat(withChat?[{id:'p1',name:'Боб',peer:'LTW-CCCC-DDDD',sys:'x',msgs:[]}]:[]),
   priv:{pin:'',lockHide:false,prev:false,blur:false,ttl:0,inc,blocked:[]}};
 ls.libretaw=JSON.stringify(st);
 const sb={console:{log(){},error(){},warn(){}},localStorage:mkStore(ls),sessionStorage:mkStore({}),navigator:{userAgent:'Mozilla/5.0 Chrome/120',language:'ru',clipboard:{writeText(){}}},
  location:{protocol:'http:',hostname:'localhost',reload(){}},screen:{width:1280,height:720},devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),
  BroadcastChannel:BC,MutationObserver:class{observe(){}},NodeFilter:{SHOW_TEXT:4},
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  crypto:globalThis.crypto,TextEncoder,TextDecoder,Blob,URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},Image:class{},FileReader:class{},
  WebSocket:class{},Intl,Uint8Array,Promise,JSON,Math,Date,Set,Map,WeakMap,WeakSet,Array,Object,String,Number,Error,Symbol,btoa,atob,parseInt,parseFloat,isFinite,Response,CompressionStream,DecompressionStream,encodeURIComponent,decodeURIComponent,
  addEventListener(){},removeEventListener(){},indexedDB:undefined,claude:undefined,performance:{now:()=>0},innerWidth:1200};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.document0=null;
 const doc={documentElement:Object.assign(el(),{style:{setProperty(){}}}),getElementById:()=>el(),createElement:()=>el(),createTextNode:t=>({nodeValue:t}),body:el(),documentElement:el(),querySelectorAll:()=>[],querySelector:()=>el(),addEventListener(){},createTreeWalker:()=>({nextNode:()=>null}),hidden:false};
 sb.document=doc;vm.createContext(sb);
 try{vm.runInContext(src,sb)}catch(e){return {err:e.message}}
 return {sb,st};
}
function deliver(w,data){vm.runInContext('lanH',w.sb)({data});}


const ME='LTW-AAAA-BBBB',PEER='LTW-CCCC-DDDD',STR='LTW-EEEE-FFFF';
const w=world('all',false);const R=c=>vm.runInContext(c,w.sb);
R(`store.profile={id:'${ME}',name:'Аня',emoji:'x',hue:1};store.chats.push({id:'p1',name:'Боб',peer:'${PEER}',sys:'x',msgs:[]});`);
R(`store.profile.music={id:'mu1',name:'Трек',dur:200,size:1000,mime:'audio/mpeg'};`);
const sent=()=>{const v=posted.splice(0);return v};
const music=d=>d.prof&&d.prof.music;
// 1. contacts (default)
R("store.priv.mvis='contacts';store.musicVis='none'");sent();R("musicSync()");
let ev=sent();
ok(!ev.some(d=>!d.to&&d.prof&&d.prof.music),'"Контактам": nothing is broadcast to strangers');
ok(ev.some(d=>d.to===PEER&&music(d)&&music(d).id==='mu1'),'"Контактам": the contact gets the track');
// 2. everyone
R("store.priv.mvis='all'");sent();R("musicSync()");ev=sent();
ok(ev.some(d=>!d.to&&music(d)&&music(d).id==='mu1'),'"Всем": broadcast to everyone online');
// 3. back to contacts: strangers are told it is withdrawn
R("store.priv.mvis='contacts'");sent();R("musicSync()");ev=sent();
ok(ev.some(d=>!d.to&&d.prof.vis==='none'&&d.prof.music===null),'"Всем" → "Контактам": withdrawal is broadcast');
// 4. nobody
R("store.priv.mvis='none'");sent();R("musicSync()");ev=sent();
ok(ev.filter(d=>d.to===PEER&&d.prof).every(d=>d.prof.music===null),'"Никто": contacts are told there is no music');
ok(!ev.some(d=>!d.to&&music(d)),'"Никто": nothing with music is broadcast');
// 5. receiving side: stranger with "контактам" is ignored, contact is stored
const dv=d=>R('lanH')({data:d});
R("store.pm={}");
dv({from:STR,fname:'Вова',uid:'x',prof:{vis:'contacts',music:{id:'mu9',name:'Чужой',dur:1,size:1,mime:'a'}}});
ok(!R("store.pm['"+STR+"']"),'stranger with "контактам" is not stored');
dv({from:PEER,fname:'Боб',uid:'x',prof:{vis:'contacts',music:{id:'mu2',name:'Боба',dur:90,size:5,mime:'audio/mpeg'}}});
ok(R("store.pm['"+PEER+"']").id==='mu2','contact music is stored and shown in Люди');
dv({from:STR,fname:'Вова',uid:'x',prof:{vis:'all',music:{id:'mu3',name:'Всем',dur:1,size:1,mime:'a'}}});
ok(R("store.pm['"+STR+"']")&&R("store.pm['"+STR+"']").id==='mu3','"Всем" from a stranger is stored');
dv({from:PEER,fname:'Боб',uid:'x',prof:{vis:'none',music:null}});
ok(!R("store.pm['"+PEER+"']"),'withdrawal removes it');
dv({from:PEER,fname:'Боб',uid:'x',prof:{vis:'contacts',music:{id:'mu2',name:'Боба',dur:90,size:5,mime:'audio/mpeg'}}});
dv({from:PEER,fname:'Боб',uid:'x',prof:{vis:'none',music:{id:'mu2',name:'Боба',dur:90,size:5,mime:'audio/mpeg'}}});
ok(!R("store.pm['"+PEER+"']"),'a contact that now says "none" is not kept even if music is included');
// 6. media fetch and cleanup keep music
ok(R("mediaIds({prof:{music:{id:'muX'}}})").includes('muX'),'music id is fetched like a media file');
R("store.pm={'"+PEER+"':{id:'muR',name:'r'}}");
ok(R("[...usedMediaIds()]").includes('mu1')&&R("[...usedMediaIds()]").includes('muR'),'own and received music are never purged as unused');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
