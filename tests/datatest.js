const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const block=src.slice(src.indexOf('// ===== Данные и память ====='),src.indexOf('// ===== Polls ====='));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
// ---- palette extraction on synthetic pixels
function pixelsOf(fn){const S=72,a=new Uint8ClampedArray(S*S*4);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const [r,g,b]=fn(x,y);const i=(y*S+x)*4;a[i]=r;a[i+1]=g;a[i+2]=b;a[i+3]=255}return a}
function fakeImg(px){return {width:72,height:72}}
const mkCanvas=px=>({width:0,height:0,getContext:()=>({drawImage(){},getImageData:()=>({data:px})})});
const sb={document:{createElement:()=>mkCanvas(null)},Math,Array,Date,Set,Map,Object,JSON,String,Number,console,
 store:{chats:[],priv:{},stk:[],rxp:[],sch:[],srvOut:[]},setInterval:()=>0,document:{querySelectorAll:()=>[]},accs:()=>[],ACT:'a0',localStorage:{length:0,key(){return null},getItem(){return null}},
 $:()=>({style:{},textContent:'',value:'',classList:{toggle(){}},innerHTML:'',append(){},children:[]}),snack(){},save(){},renderMsgs(){},renderList(){},setTheme(){},cur:null,
 idb:null,mUrls:{},URL:{revokeObjectURL(){}},navigator:{},setTimeout,pickImg(){}};
vm.createContext(sb);vm.runInContext(block,sb);
const run=(px)=>{sb.document.createElement=()=>mkCanvas(px);return vm.runInContext('extractPalette({width:72,height:72})',sb)};
const blue=pixelsOf(()=>[30,90,220]);const pb=run(blue);
ok(pb&&pb.h>=205&&pb.h<=230,'blue wallpaper gives a blue hue: '+(pb&&pb.h));
const red=pixelsOf(()=>[220,40,50]);const pr=run(red);ok(pr&&(pr.h<=15||pr.h>=345),'red wallpaper gives a red hue: '+(pr&&pr.h));
const gray=pixelsOf(()=>[128,128,128]);ok(run(gray)===null,'pure grey image: no palette (user is asked for a coloured one)');
const mix=pixelsOf((x,y)=>x<36?[40,160,70]:[230,190,40]);const pm=run(mix);
ok(pm&&pm.h>=40&&pm.h<=55,'green + more vivid yellow: the most vivid colour (yellow) is the main hue: '+(pm&&pm.h));
ok(pm&&pm.t>=80&&pm.t<=95,'the other colour (green, ~135°) becomes the offset: t='+(pm&&pm.t));
ok(pm&&pm.s>0.5&&pm.s<=1.4,'saturation multiplier stays in range: s='+(pm&&pm.s));
const dull=pixelsOf(()=>[120,110,112]);const pd=run(dull);ok(pd===null||pd.s<=0.8,'almost grey image gives a muted theme, not a loud one');
// ---- media purge on a fake IndexedDB
const recs=new Map([['m1',{id:'m1',blob:{size:100}}],['m2',{id:'m2',blob:{size:200}}],['m3',{id:'m3',blob:{size:400}}],['s1',{id:'s1',blob:{size:50}}]]);
const deleted=[];
const fakeDb={transaction(name,mode){const tx={objectStore(){return {openCursor(){const req={};const keys=[...recs.keys()];let i=0;setTimeout(()=>{const step=()=>{if(i<keys.length){req.result={value:recs.get(keys[i]),continue(){i++;setTimeout(step,0)}}}else req.result=null;req.onsuccess&&req.onsuccess()};step()},0);return req},delete(id){deleted.push(id);recs.delete(id)}}},oncomplete:null,onerror:null};setTimeout(()=>tx.oncomplete&&tx.oncomplete(),5);return tx}};
sb.idb=()=>Promise.resolve(fakeDb);
sb.store.chats=[{id:'c1',name:'A',msgs:[{text:'x',t:1,me:1,media:{id:'m1'}}]}];
sb.store.stk=[{id:'S',items:[{id:'s1'}]}];
(async()=>{
 const used=vm.runInContext('[...usedMediaIds()].sort()',sb);
 ok(JSON.stringify(used)===JSON.stringify(['m1','pm1','s1']),'used set: chat media, its local copy and sticker pack, nothing else');
 const r=await vm.runInContext('purgeOrphans()',sb);
 ok(r.n===2&&r.b===600,'purge removes unused files (m2, m3), reports 2 files and 600 bytes');
 ok(deleted.sort().join()==='m2,m3'&&recs.has('m1')&&recs.has('s1'),'used media (m1) and sticker (s1) are kept');
 // scheduled media counts as used
 recs.set('m9',{id:'m9',blob:{size:9}});sb.store.sch=[{media:{id:'m9'}}];
 const u2=vm.runInContext('[...usedMediaIds()]',sb);ok(u2.includes('m9'),'scheduled attachment is not purged');
 // clearing history keeps system messages, purge then frees the media
 sb.store.chats=[{id:'c2',name:'B',msgs:[{text:'a',t:1,me:1,media:{id:'m5'}},{sys:1,text:'служ',t:2}]}];recs.set('m5',{id:'m5',blob:{size:70}});
 const st=await vm.runInContext('dataStats()',sb);ok(st.orpN>=1,'stats count unused files');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e.stack);process.exit(1)});
