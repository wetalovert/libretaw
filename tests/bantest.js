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

const A_ID='LTW-AAAA-BBBB',B_ID='LTW-CCCC-DDDD';
const worldFor=(id,name,inc,peer)=>{const w=world(inc,false);const st=vm.runInContext('store',w.sb);st.profile={id,name,emoji:'x',hue:1};st.chats.push({id:'p_'+peer,name:peer===A_ID?'Аня':'Боб',peer,sys:peer,msgs:[]});return w};
const deliverCtl=(w,from,fname,v)=>vm.runInContext('lanH',w.sb)({data:{to:w.st?w.st:null,from,fname,uid:'other',ctl:'inc',v}});
// B (recipient) sets "никто" and announces
const B=worldFor(B_ID,'Боб','none',A_ID);
posted.length=0;vm.runInContext('announceInc()',B.sb);
const ann=posted.find(d=>d.ctl==='inc');
ok(!!ann&&ann.v==='none'&&ann.to===A_ID&&ann.from===B_ID,'recipient announces "none" to the sender');
// A (sender) receives it
const A=worldFor(A_ID,'Аня','all',B_ID);
vm.runInContext('lanH',A.sb)({data:ann});
const chatA=vm.runInContext('store',A.sb).chats.find(c=>c.peer===B_ID);
ok(chatA.theirInc==='none','sender stores that the other person refuses messages');
ok(vm.runInContext(`canPost(store.chats.find(c=>c.peer==='${B_ID}'))`,A.sb)===false,'sender cannot compose');
ok(vm.runInContext(`roText(store.chats.find(c=>c.peer==='${B_ID}'))`,A.sb)==='Пользователь запретил писать','notice text is exactly "Пользователь запретил писать"');
// the sender's own text is refused even if forced
ok(vm.runInContext(`sendMedia(store.chats.find(c=>c.peer==='${B_ID}'),null,'x',null);store.chats.find(c=>c.peer==='${B_ID}').msgs.length`,A.sb)===0,'nothing is added to the chat');
// other chats are unaffected
const other=worldFor(A_ID,'Аня','all',B_ID);
ok(vm.runInContext(`canPost(store.chats.find(c=>c.id==='fav'))`,A.sb)===true,'Избранное stays writable');
// recipient changes back to "все": notice disappears
const Bback=worldFor(B_ID,'Боб','all',A_ID);vm.runInContext('store.priv.inc="all";announceInc()',Bback.sb);
posted.length=0;vm.runInContext('store.priv.inc="all";announceInc()',Bback.sb);
const ann2=posted.find(d=>d.ctl==='inc');
vm.runInContext('lanH',A.sb)({data:ann2});
ok(vm.runInContext(`canPost(store.chats.find(c=>c.peer==='${B_ID}'))`,A.sb)===true,'after "все" the composer is back');
// a recipient on "никто" still accepts the control messages from others
const Bn=worldFor(B_ID,'Боб','none',A_ID);
vm.runInContext('lanH',Bn.sb)({data:{to:B_ID,from:A_ID,fname:'Аня',uid:'x',ctl:'inc',v:'all'}});
const chatB=vm.runInContext('store',Bn.sb).chats.find(c=>c.peer===A_ID);
ok(chatB.theirInc==='all','a "никто" user still receives other people\'s settings (control bypasses the filter)');
// and a real message is still blocked for them
vm.runInContext('lanH',Bn.sb)({data:{to:B_ID,from:A_ID,fname:'Аня',uid:'x',m:{text:'спам',t:Date.now(),me:0}}});
ok(!chatB.msgs.some(m=>m.text==='спам'),'the "никто" user still rejects real messages');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
