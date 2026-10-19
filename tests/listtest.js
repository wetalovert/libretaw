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

const A_ID='LTW-AAAA-BBBB',B_ID='LTW-CCCC-DDDD',C_ID='LTW-EEEE-FFFF';
const mk=(id,name,peer)=>{const w=world('all',false);const st=vm.runInContext('store',w.sb);st.profile={id,name,emoji:'x',hue:1};st.chats.unshift({id:'p_'+peer,name:'chat',peer,sys:peer,msgs:[{text:'',t:500,me:id===A_ID,from:'Аня',list:{title:'Задачи',by:'Аня',items:[{id:'i0',t:'Купить хлеб'},{id:'i1',t:'Позвонить'}],checks:{}}}]});return w};

const A=mk(A_ID,'Аня',B_ID),B=mk(B_ID,'Боб',A_ID),C=mk(C_ID,'Вова',A_ID);
const msgOf=w=>vm.runInContext('store',w.sb).chats.find(c=>c.peer&&c.msgs.length)?.msgs[0];
const chatOf=w=>vm.runInContext('store',w.sb).chats[0];
// A checks item 0
posted.length=0;
vm.runInContext("listCheck(store.chats[0],store.chats[0].msgs[0],'i0')",A.sb);
const ev=posted.find(d=>d.lve);
ok(!!ev&&ev.lve.item==='i0'&&ev.lve.rec.on===true&&ev.lve.t===500,'checking an item is sent to the peer');
ok(msgOf(A).list.checks.i0.on===true,'the checker sees the mark at once');
// B receives it
vm.runInContext('lanH',B.sb)({data:ev});
ok(msgOf(B).list.checks.i0&&msgOf(B).list.checks.i0.on===true,'the other person sees the mark');
ok(msgOf(B).list.checks.i0.k===A_ID,'mark is attributed to the sender');
// unchecking by A: later timestamp wins
vm.runInContext("listCheck(store.chats[0],store.chats[0].msgs[0],'i0')",A.sb);
const ev2=posted.filter(d=>d.lve).pop();
vm.runInContext('lanH',B.sb)({data:ev2});
ok(msgOf(B).list.checks.i0.on===false,'unchecking propagates');
// an older update must not override a newer one
vm.runInContext('lanH',B.sb)({data:{lve:{t:500,item:'i0',rec:{on:true,t:1}},route:{k:'peer',to:B_ID},from:A_ID,uid:'x'}});
ok(msgOf(B).list.checks.i0.on===false,'stale update (older timestamp) is ignored');
// spoofing: C tries to mark as A
vm.runInContext('lanH',B.sb)({data:{lve:{t:500,item:'i1',rec:{on:true,k:A_ID,n:'Аня',t:Date.now()+1000}},route:{k:'peer',to:B_ID},from:C_ID,uid:'x'}});
ok(!msgOf(B).list.checks.i1,'a forged mark claiming to be Аня from Вова is not recorded (no chat with Вова, event dropped)');
// unknown item ids are ignored
vm.runInContext('lanH',B.sb)({data:{lve:{t:500,item:'nope',rec:{on:true,t:Date.now()}},route:{k:'peer',to:B_ID},from:A_ID,uid:'x'}});
ok(!msgOf(B).list.checks.nope,'unknown item is ignored');
// group route: only group members get it
const G=mk(A_ID,'Аня',B_ID);
// merging a full copy keeps the newest marks from everyone, never overwrites own
vm.runInContext("mergeList(store.chats[0].msgs[0],{checks:{i0:{on:true,k:'LTW-XXXX-YYYY',n:'z',t:Date.now()+5000},i1:{on:true,k:"+"'"+A_ID+"'"+",n:'me',t:Date.now()+9000}}})",A.sb);
ok(msgOf(A).list.checks.i0.k==='LTW-XXXX-YYYY','merge brings newer marks from others');
ok(msgOf(A).list.checks.i1===undefined||msgOf(A).list.checks.i1.k!==A_ID,'merge does not take back own entries');
// the list renders
ok(typeof vm.runInContext("listEl(store.chats[0],store.chats[0].msgs[0])",A.sb)!=='undefined','list renders without error');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
