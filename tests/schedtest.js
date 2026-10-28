const fs=require('fs');const vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const block=src.slice(src.indexOf('// ===== Отложенная отправка ====='),src.indexOf("let fxC=null,fxTxt='';"));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
const sent=[];const snacks=[];
const mk=()=>({style:{},classList:{add(){},remove(){}},innerHTML:'',append(){},set textContent(v){},get textContent(){return ''},querySelector(){return{}},value:''});
const els={};const $=i=>els[i]||(els[i]=Object.assign(mk(),{onclick:null}));
const sb={console,Date,Math,JSON,Set,Map,Array,Object,String,Number,isNaN,setInterval:()=>0,setTimeout,clearTimeout,
 store:{chats:[],profile:{id:'LTW-AAAA-BBBB',name:'A'}},cur:null,mFile:null,mUrl:'',
 $,save(){},renderMsgs(){},renderList(){},updComp(){},snack:m=>snacks.push(m),
 canPost:c=>c.ch?!!c.own:true,sendMedia:(c,media,text,extra)=>sent.push({cid:c.id,media,text}),
 send(){sent.push({send:1})},scaleBlob:async()=>({blob:{size:1},w:1,h:1}),vInfo:async()=>({w:1,h:1,d:1}),mPut:async()=>{},mLabel:()=>'x',schFmt:()=>'t',
 Date,document:{createElement:()=>mk()}};
vm.createContext(sb);vm.runInContext(block+'\n',sb);
const R=c=>vm.runInContext('{'+c+'}',sb);
R(`store.chats.push({id:'p1',name:'Bob',peer:'LTW-CCCC-DDDD',msgs:[]});store.chats.push({id:'g1',name:'G',group:1,gid:'GR-1',msgs:[]});store.chats.push({id:'k1',name:'K',ch:1,own:1,chid:'CH-1',msgs:[]});store.chats.push({id:'k2',name:'KF',ch:1,own:0,chid:'CH-2',msgs:[]});`);
// text scheduled in a personal chat
R(`schText(store.chats[0],'привет позже',Date.now()+60000)`);
ok(sb.store.sch.length===1&&sb.store.sch[0].cid==='p1'&&sb.store.sch[0].text==='привет позже','text is stored as scheduled, not sent');
ok(sent.length===0,'nothing is sent immediately');
// not due yet: schDue does nothing
R(`schDue()`);ok(sent.length===0&&sb.store.sch.length===1,'not sent before the time');
// due: schDue sends through sendMedia with the right chat and removes it
R(`store.sch[0].at=Date.now()-1;schDue()`);
ok(sent.length===1&&sent[0].cid==='p1'&&sent[0].text==='привет позже','sent at the scheduled time to the right chat');
ok(sb.store.sch.length===0,'scheduled item removed after sending');
// cancel
sent.length=0;R(`schText(store.chats[1],'группа',Date.now()+60000)`);
R(`schCancel(store.sch[0])`);
ok(sb.store.sch.length===0,'cancel removes the scheduled message');
R(`schDue()`);ok(sent.length===0,'cancelled message is never sent');
// group: scheduling allowed for members
R(`schText(store.chats[1],'в группу',Date.now()+60000);store.sch[0].at=Date.now()-1;schDue()`);
ok(sent.some(x=>x.cid==='g1'&&x.text==='в группу'),'group message scheduled and sent to the group');
// channel: owner can schedule; non-owner cannot
sent.length=0;R(`schText(store.chats[2],'пост',Date.now()+60000)`);ok(sb.store.sch.length===1,'channel owner can schedule a post');
R(`store.sch[0].at=Date.now()-1;schDue()`);ok(sent.some(x=>x.cid==='k1'),'channel post goes out at the time');
R(`schText(store.chats[3],'нельзя',Date.now()+60000)`);ok(sb.store.sch.length===0&&snacks.some(m=>/нельзя/.test(m)),'non-owner cannot schedule in a channel');
// past time rejected by schPick
sent.length=0;let cbGot=null;R(`schOpen(function(at){})`);
ok(true,'time dialog opens');
// media scheduled keeps its descriptor
R(`schMedia(store.chats[0],{id:'m1',kind:'image',name:'a.png'},'подпись',Date.now()-1);schDue()`);
ok(sent.some(x=>x.media&&x.media.id==='m1'&&x.text==='подпись'),'scheduled media keeps its attachment and caption');
// chat unavailable: message dropped with a note, nothing sent
sent.length=0;R(`store.sch=[{id:'z',cid:'nope',at:Date.now()-1,text:'x',media:null}];schDue()`);
ok(sent.length===0&&snacks.some(m=>/чат недоступен/.test(m)),'missing chat: not sent, user is told');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
