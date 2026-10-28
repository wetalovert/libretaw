// Запечатанные сообщения на настоящем сервере: отправитель не виден, поддельные и анонимные обычные сообщения отбрасываются.
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');const crypto=require('crypto');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltwsv-'));const PORT=18160;
const SRV=process.env.LTW_SERVER||'/mnt/user-data/outputs/libretaw-src/server/libretaw-server.js';
const srv=spawn('node',[SRV],{env:{...process.env,PORT:String(PORT),LIBRETAW_TOKEN:'pw',LIBRETAW_DATA_KEY:'test-passphrase-123',DATA_DIR:DATA,APP_FILE:'/x'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function pow(ct){for(let n=0;;n++){const h=crypto.createHash('sha256').update(ct+':'+n).digest();if(h[0]===0&&(h[1]&0xF0)===0)return String(n)}}
function conn(hello){return new Promise((res,rej)=>{const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');const c={ws,msgs:[]};ws.onmessage=e=>c.msgs.push(String(e.data));ws.onopen=()=>{ws.send(JSON.stringify(hello));setTimeout(()=>res(c),250)};ws.onerror=rej})}
const send=(c,o)=>c.ws.send(JSON.stringify(o));
const evs=c=>c.msgs.map(m=>{try{return JSON.parse(m)}catch(e){return {}}}).filter(m=>m.k==='ev');
(async()=>{
 await sleep(700);
 const B=await conn({k:'hello',id:'LTW-BBBB-CCCC',sec:'s'.repeat(32),n:'Боб',token:'pw'});
 const A=await conn({k:'hello',id:'LTW-AAAA-BBBB',sec:'s'.repeat(32),n:'Аня',token:'pw'});
 const ANON=await conn({k:'hello',anon:1});
 // 1. sealed message from an anonymous connection reaches the recipient, without any sender identity
 const ct='c2VhbGVkLXRleHQtZm9yLWJvYg==';
 const pkt={sv:1,eph:'ZXBo',iv:'aXY=',ct,pow:pow(ct)};
 send(ANON,{k:'ev',d:{...pkt,to:'LTW-BBBB-CCCC'},mid:'m1'});await sleep(300);
 const got=evs(B).find(e=>e.d&&e.d.sv===1);
 ok(!!got,'recipient receives the sealed message');
 ok(got&&!('from' in got.d)&&!('to' in got.d),'the delivered packet has no sender and no recipient field');
 ok(got&&got.src===''&&!JSON.stringify(got).includes('LTW-AAAA-BBBB'),'the sender identity appears nowhere in the delivered frame');
 // 2. a sealed message with a wrong work proof is dropped
 const bad={sv:1,eph:'ZXBo',iv:'aXY=',ct:'YmFk',pow:'0'};
 const before=evs(B).length;
 send(ANON,{k:'ev',d:{...bad,to:'LTW-BBBB-CCCC'},mid:'m2'});await sleep(300);
 ok(evs(B).length===before,'a sealed message without the work proof is dropped');
 // 3. an anonymous connection cannot send ordinary (non-sealed) messages
 const b2=evs(B).length;
 send(ANON,{k:'ev',d:{from:'LTW-AAAA-BBBB',to:'LTW-BBBB-CCCC',enc:{iv:'aXY=',ct:'eA=='},t:1},mid:'m3'});await sleep(300);
 ok(evs(B).length===b2,'an anonymous connection cannot send an ordinary message');
 // 4. the authenticated sender still cannot spoof another sender
 const b3=evs(B).length;
 send(A,{k:'ev',d:{from:'LTW-CCCC-DDDD',to:'LTW-BBBB-CCCC',enc:{iv:'aXY=',ct:'eA=='},t:2},mid:'m4'});await sleep(300);
 ok(evs(B).length===b3,'spoofing the sender on an authenticated connection is still refused');
 // 5. offline recipient: the sealed message is queued without the sender, and delivered later
 const ct2='b2ZmbGluZS1zZWFsZWQ=';
 send(ANON,{k:'ev',d:{sv:1,eph:'ZXBo',iv:'aXY=',ct:ct2,pow:pow(ct2),to:'LTW-EEEE-FFFF'},mid:'m5'});await sleep(300);
 const C=await conn({k:'hello',id:'LTW-EEEE-FFFF',sec:'s'.repeat(32),n:'Ева',token:'pw'});await sleep(400);
 const later=evs(C).find(e=>e.d&&e.d.ct===ct2);
 ok(!!later&&later.src==='','a queued sealed message is delivered later without a sender');
 ok(!JSON.stringify(later||{}).includes('LTW-AAAA-BBBB'),'the sender is not stored in the offline queue');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);srv.kill('SIGTERM');process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);srv.kill();process.exit(1)});
