const fs=require('fs');const vm=require('vm');
const s=fs.readFileSync('/tmp/main.js','utf8');
const block=s.slice(s.indexOf('// ===== Комментарии к постам канала ====='),s.indexOf('// ===== Polls ====='));
const posted=[];
const canPostStub=c=>!!c&&(c.own||(c.admins||[]).some(a=>a.k===c.__me));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
const els={};const $=i=>els[i]||(els[i]={value:'',style:{},classList:{add(){},remove(){},toggle(){}},innerHTML:'',append(){}});
function mk(me,own,admin){const sb={store:{profile:{id:me,name:me==='OWN'?'Владелец':'Админ'},priv:{blocked:[]},chats:[]},cur:'ch1',$,save(){},renderMsgs(){},renderList(){},fmtDT:()=>'t',rEl:()=>({}),myId:()=>me,uid:'u-'+me,bc:{postMessage:d=>posted.push(d)},lanSend(){},snack(){},Math,Date,JSON,Object,Array,String,Number};
 sb.canPost=c=>!!c&&(!!c.own||(c.admins||[]).some(a=>a.k===me));sb.store.chats.push({id:'ch1',name:'Канал',ch:1,chid:'CH-AAAA-BBBB',own:own?1:0,ownerId:own?undefined:'OWN',admins:admin?[{k:me,name:'Админ'}]:[],comments:false,sigs:false,msgs:[]});
 vm.createContext(sb);vm.runInContext(block,sb);return sb}
const R=(sb,c)=>vm.runInContext(c,sb);
const owner=mk('OWN',true,false),adm=mk('ADM',false,true),sub=mk('SUB',false,false);
// owner turns signatures on and tells subscribers
R(owner,"store.chats[0].sigs=true;chCfgSend(store.chats[0])");const sw=posted.pop();
ok(sw.pcfg&&sw.pcfg.s===1,'owner switch carries the signature setting');
R(adm,"applyCm("+JSON.stringify(sw)+")");R(sub,"applyCm("+JSON.stringify(sw)+")");
ok(R(adm,"store.chats[0].sigs")===true&&R(sub,"store.chats[0].sigs")===true,'admins and subscribers learn it from the owner');
// admin cannot change the switch
R(adm,"applyCm({pcfg:{c:0,s:0},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'ADM'})");
ok(R(adm,"store.chats[0].sigs")===true,'an admin cannot turn signatures off');
// admin posts: the post carries the admin's name
const post=R(adm,"sigOf(store.chats[0])");
ok(post&&post.sig==='Админ','admin post is signed with the admin name');
// subscriber receives the signed post
R(sub,"store.chats[0].sigs=true");
// owner post also signed
const op=R(owner,"sigOf(store.chats[0])");
ok(op&&op.sig==='Владелец','owner post is signed as well');
// owner turns signatures off: no signature on new posts
R(owner,"store.chats[0].sigs=false");const off=R(owner,"sigOf(store.chats[0])");
ok(!off.sig,'after switching off, new posts have no signature');
// subscriber receives off
R(sub,"applyCm({pcfg:{o:'OWN',c:0,s:0},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'OWN'})");
ok(R(sub,"store.chats[0].sigs")===false,'subscribers follow the owner switching it off');
// non-owner cannot switch on
R(sub,"applyCm({pcfg:{c:0,s:1},route:{k:'ch',id:'CH-AAAA-BBBB'},from:'SUB'})");
ok(R(sub,"store.chats[0].sigs")===false,'a subscriber cannot switch signatures on');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
