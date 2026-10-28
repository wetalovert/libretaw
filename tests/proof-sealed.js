// Доказательство: отправитель не виден серверу ни в кадрах, ни в очереди, ни на диске.
// Контроль: обычное (незапечатанное) сообщение от того же отправителя ID содержит — так проверяется, что поиск работает.
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');const crypto=require('crypto');
const SENDER='LTW-AAAA-BBBB', RECV='LTW-BBBB-CCCC', OFF='LTW-EEEE-FFFF';
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltwproof-'));const PORT=18170;
const SRV=process.env.LTW_SERVER||'/mnt/user-data/outputs/libretaw-src/server/libretaw-server.js';
const srv=spawn('node',[SRV],{env:{...process.env,PORT:String(PORT),LIBRETAW_TOKEN:'pw',LIBRETAW_DATA_KEY:'proof-passphrase-123',DATA_DIR:DATA,APP_FILE:'/x'}});
let srvLog='';srv.stdout.on('data',d=>srvLog+=d);srv.stderr.on('data',d=>srvLog+=d);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function pow(ct){for(let n=0;;n++){const h=crypto.createHash('sha256').update(ct+':'+n).digest();if(h[0]===0&&(h[1]&0xF0)===0)return String(n)}}
function conn(hello){return new Promise((res,rej)=>{const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');const c={ws,frames:[]};ws.onmessage=e=>c.frames.push(String(e.data));ws.onopen=()=>{ws.send(JSON.stringify(hello));setTimeout(()=>res(c),250)};ws.onerror=rej})}
const send=(c,o)=>c.ws.send(JSON.stringify(o));
const isMsg=f=>f.indexOf('"k":"ev"')>=0;               // кадр сообщения (не список онлайн)
const count=(frames,needle)=>frames.filter(f=>isMsg(f)&&f.includes(needle)).length;
const presenceHits=(frames,needle)=>frames.filter(f=>!isMsg(f)&&f.includes(needle)).length;
function diskHits(needle){let hits=0;const walk=d=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory())walk(p);else if(fs.readFileSync(p).toString('latin1').includes(needle))hits++}};walk(DATA);return hits}
(async()=>{
 await sleep(700);
 const B=await conn({k:'hello',id:RECV,sec:'s'.repeat(32),n:'Боб',token:'pw'});
 const A=await conn({k:'hello',id:SENDER,sec:'s'.repeat(32),n:'Аня',token:'pw'});
 const ANON=await conn({k:'hello',anon:1});
 await sleep(200);B.frames.length=0;
 const rows=[];
 // control: ordinary authenticated message (sender id is on the wire)
 send(A,{k:'ev',d:{from:SENDER,to:RECV,enc:{iv:'aXY=',ct:'Y29udHJvbA=='},t:1},mid:'ctl1'});
 await sleep(300);
 rows.push(['CONTROL ordinary message, frames to recipient', count(B.frames,SENDER)]);
 B.frames.length=0;
 // sealed message from anonymous connection
 const ct='c2VhbGVkLXByb29m';
 send(ANON,{k:'ev',d:{sv:1,eph:'ZXBo',iv:'aXY=',ct,pow:pow(ct),to:RECV},mid:'sv1'});
 await sleep(300);
 rows.push(['SEALED message, frames to recipient', count(B.frames,SENDER)]);
 rows.push(['SEALED message, frames delivered carry a recipient-visible sealed packet', B.frames.filter(f=>f.includes('"sv":1')).length]);
 // offline recipient: the sealed message waits in the queue
 const ct2='b2ZmbGluZS1wcm9vZg==';
 send(ANON,{k:'ev',d:{sv:1,eph:'ZXBo',iv:'aXY=',ct:ct2,pow:pow(ct2),to:OFF},mid:'sv2'});
 await sleep(300);
 const C=await conn({k:'hello',id:OFF,sec:'s'.repeat(32),n:'Ева',token:'pw'});await sleep(400);
 rows.push(['SEALED message in offline queue (delivered later), message frames', count(C.frames,SENDER)]);
 rows.push(['KNOWN LEAK (not closed): sender id in presence list (online users)', presenceHits(C.frames,SENDER)+presenceHits(B.frames,SENDER)]);
 // on disk (state is encrypted at rest): the sender id must not appear in readable form
 rows.push(['SEALED test: sender id on disk (files under data dir)', diskHits(SENDER)]);
 rows.push(['SEALED test: sender id in server log', (srvLog.match(new RegExp(SENDER,'g'))||[]).length]);
 console.log('| Проверка | Найдено | Ожидаемо |');console.log('|---|---|---|');
 
 let ok=true;rows.forEach((r,i)=>{const known=r[0].startsWith('KNOWN LEAK');const e=known?'не закрыто':r[0].startsWith('CONTROL')?'>0':r[0].includes('sealed packet')?'>0':'0';const pass=known?true:r[0].startsWith('CONTROL')?r[1]>0:r[0].includes('sealed packet')?r[1]>0:r[1]===0;ok=ok&&pass;console.log(`| ${r[0]} | ${r[1]} | ${e} | ${known?'известно':pass?'OK':'НЕТ'}`)});
 console.log(ok?'\nВЫВОД: отправитель не виден в запечатанных сообщениях; контроль подтверждает, что поиск работает.':'\nВЫВОД: есть расхождения, см. таблицу.');
 srv.kill('SIGTERM');process.exit(ok?0:1);
})().catch(e=>{console.log('ERR',e);srv.kill();process.exit(1)});
