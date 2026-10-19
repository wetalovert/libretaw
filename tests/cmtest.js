const fs=require('fs');const vm=require('vm');
const s=fs.readFileSync('/tmp/main.js','utf8');
const block=s.slice(s.indexOf('// ===== Комментарии к постам канала ====='),s.indexOf('// ===== Polls ====='));
const posted=[];
const el=()=>new Proxy(function(){},{get:(t,k)=>k==='style'?{}:k==='classList'?{add(){},remove(){},toggle(){}}:k==='value'?'':k==='textContent'?'':()=>{},set:()=>true,apply:()=>undefined});
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function mk(me,own){const els={};const $=i=>els[i]||(els[i]={value:'',style:{},classList:{add(){},remove(){},toggle(){}},innerHTML:'',append(){}});
 const sb={store:{profile:{id:me,name:me==='OWN'?'Владелец':'Подписчик'},priv:{blocked:[]},chats:[]},cur:'ch1',$,save(){},renderMsgs(){},renderList(){},
 fmtDT:()=>'t',rEl:(t,c,x)=>({append(){},textContent:x}),myId:()=>me,bc:{postMessage:d=>posted.push(d)},lanSend(){},snack(){},setTimeout,Math,Date,JSON,Object,Array,String,Number};
 sb.store.chats.push({id:'ch1',name:'Канал',ch:1,chid:'CH-AAAA-BBBB',own:own?1:0,ownerId:own?undefined:'OWN',comments:false,msgs:[{text:'пост',t:100,me:own?1:0,from:'Владелец'}]});
 sb.cmT=null;sb.uid='u-'+me;vm.createContext(sb);vm.runInContext(block,sb);return sb}
const R=(sb,c)=>vm.runInContext(c,sb);
const owner=mk('OWN',true),sub=mk('SUB',false);
// owner turns comments on
R(owner,"store.chats[0].comments=true;chCfgSend(store.chats[0])");
const cfg=posted.pop();
ok(cfg&&cfg.pcfg&&cfg.pcfg.c===1&&cfg.route.k==='ch','owner switch is sent to the channel');
// subscriber receives the switch
R(sub,"applyCm("+JSON.stringify(cfg)+")");
ok(R(sub,"store.chats[0].comments")===true&&R(sub,"store.chats[0].ownerId")==='OWN','subscriber learns that comments are on and who the owner is');
// a fake owner (not the owner) cannot change the switch
R(sub,"applyCm({pcfg:{c:0},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'FAKE'})");
ok(R(sub,"store.chats[0].comments")===true,'someone else cannot switch comments off');
// subscriber writes a comment
R(sub,"store.cur='ch1';openCm(store.chats[0],store.chats[0].msgs[0]);$('cmT').value='привет';cmSend()");
const sent=posted.pop();
ok(sent&&sent.pcm&&sent.pcm.c.text==='привет','comment is sent to the channel');
// owner receives it
R(owner,"applyCm("+JSON.stringify(sent)+")");
ok(R(owner,"store.chats[0].msgs[0].cm.length")===1,'owner stores the comment on the post');
// owner deletes it: subscriber follows
const cid=R(owner,"store.chats[0].msgs[0].cm[0].id");
R(owner,"cmDelete(store.chats[0],store.chats[0].msgs[0],'"+cid+"')");
const del=posted.pop();
R(sub,"applyCm("+JSON.stringify(del)+")");
ok(R(sub,"store.chats[0].msgs[0].cm.length")===1-1,'subscriber removes it when the owner deletes it');
// a subscriber cannot delete other people's comments
R(sub,"store.chats[0].msgs[0].cm=[{id:'x1',n:'a',text:'t',t:1}]");
R(sub,"applyCm({pcmdel:{t:100,id:'x1'},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'SUB'})");
ok(R(sub,"store.chats[0].msgs[0].cm.length")===1,'a subscriber cannot delete a comment (not the owner)');
// comments off: new comments are refused on both sides
R(owner,"store.chats[0].comments=false");
R(owner,"applyCm({pcm:{t:100,c:{id:'z',t:1,text:'нет'}},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'SUB'})");
ok(R(owner,"store.chats[0].msgs[0].cm.length")===0,'owner with comments off refuses incoming comments');
// a blocked person's comment is ignored; the same comment is not kept twice
R(owner,"store.chats[0].comments=true;store.priv.blocked=[{id:'BAD'}]");
R(owner,"applyCm({pcm:{t:100,c:{id:'b1',t:1,text:'x'}},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'BAD'})");
ok(R(owner,"(store.chats[0].msgs[0].cm||[]).length")===0,'blocked person cannot comment');
R(owner,"applyCm({pcm:{t:100,c:{id:'d1',t:1,text:'ok'}},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'SUB'});applyCm({pcm:{t:100,c:{id:'d1',t:1,text:'ok'}},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'SUB'})");
ok(R(owner,"store.chats[0].msgs[0].cm.length")===1,'same comment received twice is kept once');
// long text refused
R(owner,"applyCm({pcm:{t:100,c:{id:'l1',t:1,text:'x'.repeat(501)}},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'SUB'})");
ok(R(owner,"store.chats[0].msgs[0].cm.length")===1,'comment over 500 characters is refused');
// posts carry the owner and setting for new subscribers
const post=R(owner,"cfgOf(store.chats[0])");
ok(post.cfg&&post.cfg.o==='OWN','channel posts carry the owner and the switch');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
