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


const w=world('all',false);const R=c=>vm.runInContext(c,w.sb);
R("store.chats.push({id:'a1',name:'Аня',peer:'LTW-CCCC-DDDD',sys:'x',msgs:[]});store.chats.push({id:'g1',name:'Группа',group:1,gid:'GR-1',sys:'g',msgs:[]});store.chats.push({id:'a2',name:'Коля',peer:'LTW-EEEE-FFFF',sys:'y',msgs:[]});");
R("store.folders=[{id:'f1',name:'Работа',ids:['g1']},{id:'f2',name:'Семья',ids:['a1','a2']}]");
ok(R("folderHas('f2','a2')")===true&&R("folderHas('f1','a1')")===false,'folder membership');
ok(R("folderHas('nope','a1')")===false,'unknown folder has nothing');
R("filter='f:f2'");
const visible=R("store.chats.filter(c=>match(c)).map(c=>c.id).join(',')");
ok(visible==='a1,a2','folder filter shows only its chats: '+visible);
R("filter='f:f1'");ok(R("store.chats.filter(c=>match(c)).map(c=>c.id).join(',')")==='g1','second folder shows its own chat');
R("filter='all'");ok(R("store.chats.filter(c=>match(c)).length")===R("store.chats.length"),'"Все" still shows everything');
// reorder
R("fdMove(1,-1)");
ok(R("store.folders.map(f=>f.id).join(',')")==='f2,f1','move up swaps folder order');
R("fdMove(0,-1)");ok(R("store.folders.map(f=>f.id).join(',')")==='f2,f1','cannot move the first folder further up');
R("fdMove(1,1)");ok(R("store.folders.map(f=>f.id).join(',')")==='f2,f1','cannot move the last folder further down');
// deleting a chat leaves a harmless stale id that is ignored
R("store.chats=store.chats.filter(c=>c.id!=='a2')");
ok(R("folderHas('f2','a1')")===true,'other members keep working after a chat is removed');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
