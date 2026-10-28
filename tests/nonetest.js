const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const mkStore=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v)},removeItem:k=>{delete o[k]}});
class BC{postMessage(){}set onmessage(f){this._h=f}get onmessage(){return this._h}}
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
const direct={to:'LTW-AAAA-BBBB',from:'LTW-CCCC-DDDD',fname:'Боб',uid:'other',m:{text:'привет',t:Date.now(),me:0}};
const reaction={uid:'other',from:'LTW-CCCC-DDDD',route:{k:'peer',to:'LTW-AAAA-BBBB'},rxe:{t:1,key:'👍',rid:'LTW-CCCC-DDDD'}};
const chatOf=(w,id)=>w.st.chats.find(c=>c.id===id);
for(const inc of ['all','contacts','none']){
 const w=world(inc,true);if(w.err){console.log('LOAD ERR',w.err);process.exit(1)}
 deliver(w,direct);
 const c=vm.runInContext('store',w.sb).chats.find(x=>x.peer==='LTW-CCCC-DDDD');
 const n=c?c.msgs.filter(m=>m.text==='привет').length:0;
 if(inc==='none')ok(n===0,'"Никто": direct message to an existing chat is dropped');
 else ok(n===1,'"'+inc+'": direct message delivered ('+n+')');
}
// new stranger, contacts vs none
for(const inc of ['all','contacts','none']){
 const w=world(inc,false);deliver(w,direct);
 const c=vm.runInContext('store',w.sb).chats.find(x=>x.peer==='LTW-CCCC-DDDD');
 const expect=inc==='all';
 ok(!!c===expect,'"'+inc+'": stranger can start a new chat: '+(!!c)+' (expected '+expect+')');
}
// reactions from a person under "none" do not change messages
{const w=world('none',true);const st=vm.runInContext('store',w.sb);const c=st.chats.find(x=>x.id==='p1');c.msgs.push({text:'мой',t:777,me:1,from:'Я'});
 deliver(w,{...reaction,rxe:{t:777,key:'👍',rid:'LTW-CCCC-DDDD'}});
 const m=c.msgs.find(x=>x.t===777);ok(!(m.rx&&m.rx['LTW-CCCC-DDDD']),'"Никто": reactions from people are ignored');}
{const w=world('all',true);const st=vm.runInContext('store',w.sb);const c=st.chats.find(x=>x.id==='p1');c.msgs.push({text:'мой',t:777,me:1,from:'Я'});
 deliver(w,{...reaction,rxe:{t:777,key:'👍',rid:'LTW-CCCC-DDDD'}});
 const m=c.msgs.find(x=>x.t===777);ok(!!(m.rx&&m.rx['LTW-CCCC-DDDD']),'"все": reactions still work');}
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
