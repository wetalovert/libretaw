const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const a=src.indexOf('async function devCount()'),b=src.indexOf("\n$('d13r').onclick=",a);
const code=src.slice(a,b);
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
class MS{constructor(){this.t=[]}addTrack(x){this.t.push(x)}getTracks(){return this.t}getVideoTracks(){return this.t.filter(x=>x.kind==='video')}getAudioTracks(){return this.t.filter(x=>x.kind==='audio')}}
function world({cam,mic,enumOk=true,denyV=false,denyA=false}){
 const calls=[],snacks=[];let perm=null,dtext={textContent:''};
 const err=n=>{const e=new Error(n);e.name=n;return e};
 const md={enumerateDevices:enumOk?async()=>[...Array(cam).fill({kind:'videoinput'}),...Array(mic).fill({kind:'audioinput'})]:undefined,
  getUserMedia:async c=>{calls.push(Object.keys(c).join('+'));
   if(c.video){if(denyV||!cam)throw err(denyV?'NotAllowedError':'NotFoundError');return {getVideoTracks:()=>[{kind:'video'}],getAudioTracks:()=>[]}}
   if(c.audio){if(denyA||!mic)throw err(denyA?'NotAllowedError':'NotFoundError');return {getVideoTracks:()=>[],getAudioTracks:()=>[{kind:'audio'}]}}}};
 if(!enumOk)delete md.enumerateDevices;
 const sb={navigator:{mediaDevices:md},MediaStream:MS,snack:m=>snacks.push(m),permDlg:(e,k)=>{perm={name:e&&e.name,k}},startRec(){},$:id=>id==='d13t'?dtext:{click(){}},console};
 vm.createContext(sb);vm.runInContext(code,sb);
 return {run:(c,k)=>vm.runInContext(`getMedia(${JSON.stringify(c)},${JSON.stringify(k)})`,sb),then:null,calls,snacks,perm:()=>perm,dtext};
}
const both={audio:true,video:{facingMode:{ideal:'user'}}};
(async()=>{
 let w=world({cam:1,mic:1});let s=await w.run(both,'round');
 ok(w.calls.length===2&&w.calls.includes('video')&&w.calls.includes('audio'),'camera and microphone found: two separate permission requests');
 ok(s&&s.getTracks().length===2,'both tracks are in the recording stream');
 w=world({cam:1,mic:0});s=await w.run(both,'round');
 ok(w.calls.length===1&&w.calls[0]==='video','no microphone found: only the camera is requested');
 ok(s&&s.getVideoTracks().length===1&&s.getAudioTracks().length===0,'recording is video only');
 ok(w.snacks.some(x=>/Микрофон не найден/.test(x)),'user is told there is no sound');
 w=world({cam:0,mic:1});s=await w.run(both,'round');
 ok(w.calls.length===1&&w.calls[0]==='audio'&&s&&s.getAudioTracks().length===1,'no camera found: only the microphone is requested');
 w=world({cam:0,mic:0});s=await w.run(both,'round');
 ok(s===null&&w.calls.length===0,'nothing found: no permission request at all');
 ok(w.perm()&&w.perm().name==='NotFoundError','NotFound dialog is shown');
 ok(/камер: 0, микрофонов: 0/.test(w.dtext.textContent),'dialog says exactly what the browser sees');
 w=world({cam:1,mic:1,denyV:true});s=await w.run(both,'round');
 ok(s&&s.getAudioTracks().length===1&&s.getVideoTracks().length===0,'camera permission denied: microphone still records');
 w=world({cam:1,mic:1,denyV:true,denyA:true});s=await w.run(both,'round');
 ok(s===null&&w.perm().name==='NotAllowedError','both denied: permission dialog, no crash');
 w=world({cam:1,mic:1,enumOk:false});s=await w.run(both,'round');
 ok(w.calls.length===2&&s&&s.getTracks().length===2,'browser cannot list devices: falls back to asking for both');
 w=world({cam:1,mic:0});s=await w.run({video:{facingMode:{ideal:'environment'}}},'qr');
 ok(s&&s.getVideoTracks().length===1,'QR on a PC: the camera is used');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
