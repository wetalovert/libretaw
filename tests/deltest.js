const fs=require('fs');const vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('no '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(d===0)return src.slice(i,k+1)}}}
const block=src.slice(src.indexOf('// ===== Отложенное удаление ====='),src.indexOf('// ===== Уведомления ====='));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
const sent=[];
const $=()=>({style:{},classList:{add(){},remove(){}},innerHTML:'',append(){},set textContent(v){this._t=v},get textContent(){return this._t},querySelector(){return{}}});
const sb={console,Date,Math,JSON,Set,Map,Array,Object,String,Number,setInterval:()=>0,setTimeout,clearTimeout,
 store:{chats:[],profile:{id:'LTW-AAAA-BBBB',name:'A'},priv:{inc:'all'}},cur:null,bc:{postMessage:d=>sent.push(d)},uid:'U1',
 $,save(){},renderMsgs(){},renderList(){},refreshRx(){},snack(){},myId:()=>'LTW-AAAA-BBBB',
 rxRoute:c=>c.peer?{k:'peer',to:c.peer}:c.ch?{k:'ch',id:c.chid}:(c.group&&c.gid)?{k:'gr',id:c.gid}:c.bc?{k:'bc',id:c.id}:null};
vm.createContext(sb);vm.runInContext(block+'\n'+fn('applyDelE')+'\n',sb);
const run=c=>vm.runInContext("{"+c+"}",sb);
// ---- sender side (personal chat)
run(`store.chats.push({id:'p1',name:'Bob',peer:'LTW-CCCC-DDDD',msgs:[]});store.chats.push({id:'g1',name:'G',group:1,gid:'GR-1',msgs:[]});store.chats.push({id:'k1',name:'K',ch:1,own:1,chid:'CH-1',msgs:[]});store.chats.push({id:'b1',name:'LAN',bc:1,msgs:[]});`);
run(`const c=store.chats[0];c.msgs.push({text:'мой',t:1000,me:1,from:'A'});c.msgs.push({text:'чужое',t:1001,me:0,from:'Bob'});`);
// schedule for 1 min, then check scheduling is marked and broadcast carries route
run(`const c=store.chats[0];const m=c.msgs[0];scheduleDel(c,m,Date.now()+60000)`);
const m0=sb.store.chats[0].msgs[0];
ok(m0.del>Date.now()+50000,'own message is marked for deletion in 1 min');
ok(sent.some(d=>d.dele&&d.dele.at===m0.del&&d.route.k==='peer'&&d.route.to==='LTW-CCCC-DDDD'),'deletion sent only to the chat peer (route peer)');
// cancel
run(`cancelDel(store.chats[0],store.chats[0].msgs[0])`);
ok(sb.store.chats[0].msgs[0].del===0,'cancel clears the schedule');
ok(sent.filter(d=>d.dele).pop().dele.at===0,'cancel is broadcast to the peer');
// immediate deletion removes it right away
run(`scheduleDel(store.chats[0],store.chats[0].msgs[0],Date.now())`);
ok(sb.store.chats[0].msgs.length===1,'"delete now" removes the message at once');
// ---- receiver side: a message from Bob, Bob schedules deletion of it
run(`store.chats[0].msgs.push({text:'от Боба',t:2000,me:0,from:'Bob'})`);
run(`applyDelE({route:{k:'peer',to:'LTW-AAAA-BBBB'},from:'LTW-CCCC-DDDD',dele:{t:2000,at:Date.now()+60000,v:1}})`);
const bobMsg=sb.store.chats[0].msgs.find(x=>x.t===2000);
ok(bobMsg&&bobMsg.del>Date.now(),'receiver marks Bob message for deletion');
// time comes: delTick removes it
run(`store.chats[0].msgs.find(x=>x.t===2000).del=Date.now()-1;delTick()`);
ok(!sb.store.chats[0].msgs.some(x=>x.t===2000),'receiver removes it when the time comes');
// a stale (older version) deletion must not override a newer one
run(`store.chats[0].msgs.push({text:'x',t:3000,me:0,from:'Bob'})`);
run(`applyDelE({route:{k:'peer',to:'LTW-AAAA-BBBB'},from:'LTW-CCCC-DDDD',dele:{t:3000,at:Date.now()+60000,v:5}})`);
run(`applyDelE({route:{k:'peer',to:'LTW-AAAA-BBBB'},from:'LTW-CCCC-DDDD',dele:{t:3000,at:0,v:4}})`);
ok(sb.store.chats[0].msgs.find(x=>x.t===3000).del>Date.now(),'older cancel (v=4) does not override newer schedule (v=5)');
// someone else cannot delete my message: wrong from
run(`store.chats[0].msgs.push({text:'мой2',t:4000,me:1,from:'A'})`);
run(`applyDelE({route:{k:'peer',to:'LTW-AAAA-BBBB'},from:'LTW-ZZZZ-ZZZZ',dele:{t:4000,at:Date.now(),v:1}})`);
ok(sb.store.chats[0].msgs.some(x=>x.t===4000),'deletion from a non-peer does not touch the chat');
// ---- group: only the group route, not a personal chat with the same time
run(`store.chats[1].msgs.push({text:'g',t:5000,me:0,from:'Аня'});store.chats[0].msgs.push({text:'p',t:5000,me:0,from:'Bob'})`);
run(`applyDelE({route:{k:'gr',id:'GR-1'},from:'LTW-GGGG-HHHH',dele:{t:5000,at:Date.now(),v:1}})`);
ok(!sb.store.chats[1].msgs.some(x=>x.t===5000)&&sb.store.chats[0].msgs.some(x=>x.t===5000),'group deletion affects only the group');
// ---- channel: deletion of a post by owner
run(`store.chats[2].msgs.push({text:'пост',t:6000,me:0,from:'K'})`);
run(`applyDelE({route:{k:'ch',id:'CH-1'},from:'LTW-OOOO-PPPP',dele:{t:6000,at:Date.now(),v:1}})`);
ok(!sb.store.chats[2].msgs.some(x=>x.t===6000),'channel post deletion works by route');
// ---- fan-out: deletion for a personal chat is NOT sent with a broadcast room route
sent.length=0;run(`scheduleDel(store.chats[1],{t:7000,me:1,from:'A',msgs:[]},Date.now()+1)`);
ok(sent.length===1&&sent[0].route.k==='gr','group message deletion routed only to the group');
{const now=Date.now();
 run(`store.chats[0].msgs.push({text:'own',t:8000,me:1,from:'A'});delCustom(store.chats[0],store.chats[0].msgs.find(x=>x.t===8000),Date.now()+2*86400000)`);
 const cm=sb.store.chats[0].msgs.find(x=>x.t===8000);
 ok(cm.del>now+2*86400000-5000&&cm.del<now+2*86400000+5000,'custom duration of 2 days is applied');
 run(`delCustom(store.chats[0],store.chats[0].msgs.find(x=>x.t===8000),Date.now()+5000)`);
 ok(cm.del>now+2*86400000-5000,'too-short custom time (5 s) is rejected, previous value kept');
 run(`delCustom(store.chats[0],store.chats[0].msgs.find(x=>x.t===8000),Date.now()-1000)`);
 ok(cm.del>now+2*86400000-5000,'past time is rejected');
 run(`delCustom(store.chats[0],store.chats[0].msgs.find(x=>x.t===8000),Date.now()+11*365*86400000)`);
 ok(cm.del>now+2*86400000-5000,'more than 10 years is rejected');
 run(`delCustom(store.chats[0],store.chats[0].msgs.find(x=>x.t===8000),Date.now()+1000*3600000)`);
 ok(cm.del>now+1000*3600000-5000&&cm.del<now+1000*3600000+5000,'a custom term of 1000 hours is applied');
}
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
