const fs=require('fs');
const source=JSON.parse(fs.readFileSync(__dirname+'/character-source-v38.json'));
const meshes=source.meshes.filter(m=>m.name!=='eyes');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function normals(m){
 const n=new Float32Array(m.p.length),groups=new Map();
 for(let t=0;t<m.index.length;t+=3){const a=m.index[t]*3,b=m.index[t+1]*3,c=m.index[t+2]*3;const u=[m.p[b]-m.p[a],m.p[b+1]-m.p[a+1],m.p[b+2]-m.p[a+2]],v=[m.p[c]-m.p[a],m.p[c+1]-m.p[a+1],m.p[c+2]-m.p[a+2]],q=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const i of [a,b,c])for(let k=0;k<3;k++)n[i+k]+=q[k];}
 for(let i=0;i<m.p.length;i+=3){const key=m.p.slice(i,i+3).map(v=>Math.round(v*1e5)).join(',');let g=groups.get(key);if(!g){g={n:[0,0,0],ids:[]};groups.set(key,g);}g.ids.push(i);for(let k=0;k<3;k++)g.n[k]+=n[i+k];}
 for(const g of groups.values()){const len=Math.hypot(...g.n)||1;for(const i of g.ids)for(let k=0;k<3;k++)n[i+k]=g.n[k]/len;}m.n=Array.from(n);
}
// Re-sculpt the face and give the outfit its own volume and compression folds.
for(const m of meshes){
 normals(m);
 for(let i=0;i<m.p.length;i+=3){let [x,y,z]=m.p.slice(i,i+3);
  if(m.name==='body'){
   const head=smooth(.59,.64,y);const jaw=Math.exp(-Math.pow((y-.645)/.025,2));
   x*=1-head*(jaw*.08+smooth(.73,.80,y)*.045);
   z+=head*.0025*Math.exp(-Math.pow((Math.abs(x)-.038)/.018,2)-Math.pow((y-.668)/.025,2));
   if(y<.42&&z>.32){x+=Math.sign(x)*.007*smooth(.32,.36,z);z+=.004*Math.sin(x*35);}
  }else if(m.name==='sweater'||m.name==='jeans'){
   const top=m.name==='sweater';
   const crease=(Math.sin(y*(top?126:155)+Math.abs(x)*24+z*21)*.65+Math.sin(y*73-x*45)*.35);
   const zone=top?(.3+.7*Math.exp(-Math.pow((y-.30)/.12,2)))*(1-smooth(.51,.58,y)):(.2+.8*Math.exp(-Math.pow((y-.43)/.09,2)));
   const off=(top?.008:.004)+crease*zone*(top?.0035:.0025);
   x+=m.n[i]*off;y+=m.n[i+1]*off;z+=m.n[i+2]*off;
  }
  m.p.splice(i,3,x,y,z);
 }
 normals(m);
}
function mesh(name,material){const m={name,material,p:[],n:[],uv:[],weights:[],joints:[],index:[]};meshes.push(m);return m;}
function vertex(m,p,uv=[0,0],joint=3){m.p.push(...p);m.uv.push(...uv);m.weights.push(1,0,0,0);m.joints.push(joint,0,0,0);return m.p.length/3-1;}
function sphere(m,c,r,cols=24,rows=16,joint=3){const start=m.p.length/3;for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const t=y/rows*Math.PI,a=x/cols*Math.PI*2;vertex(m,[c[0]+r[0]*Math.sin(t)*Math.cos(a),c[1]+r[1]*Math.cos(t),c[2]+r[2]*Math.sin(t)*Math.sin(a)],[x/cols,y/rows],joint);}for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=start+y*(cols+1)+x,b=a+cols+1;m.index.push(a,a+1,b,b,a+1,b+1);}}
function tube(m,points,radius,sides=5,joint=3){const start=m.p.length/3;for(let j=0;j<points.length;j++){const p=points[j],a=points[Math.max(0,j-1)],b=points[Math.min(points.length-1,j+1)],d=b.map((v,k)=>v-a[k]),len=Math.hypot(...d)||1;for(let k=0;k<3;k++)d[k]/=len;let n=[d[1],-d[0],0],nl=Math.hypot(...n);if(nl<.01){n=[1,0,0];nl=1;}n=n.map(v=>v/nl);const q=[d[1]*n[2]-d[2]*n[1],d[2]*n[0]-d[0]*n[2],d[0]*n[1]-d[1]*n[0]],r=typeof radius==='function'?radius(j/(points.length-1)):radius;for(let k=0;k<sides;k++){const angle=k/sides*Math.PI*2;vertex(m,p.map((v,c)=>v+r*(n[c]*Math.cos(angle)+q[c]*Math.sin(angle))),[k/sides,j/(points.length-1)],joint);if(j>0){const a=start+j*sides+k,b=start+j*sides+(k+1)%sides;m.index.push(a,b,a-sides,b,b-sides,a-sides);}}}}
const whites=mesh('eyes','eyes'),iris=mesh('irises','iris'),pupils=mesh('pupils','pupils'),brows=mesh('brows','hair');
for(const side of [-1,1]){
 sphere(whites,[side*.028,.6854,.3789],[.0135,.0115,.0138]);
 sphere(iris,[side*.028,.6857,.3920],[.0055,.0055,.0018],24,12);
 sphere(pupils,[side*.028,.6857,.3936],[.00245,.00265,.0007],18,10);
 const points=[];for(let j=0;j<=16;j++){const t=j/16;points.push([side*(.013+t*.033),.709+Math.sin(t*Math.PI)*.003-t*.002,.383-Math.pow(t,2)*.009]);}tube(brows,points,t=>.0015*Math.pow(Math.sin(t*Math.PI),.35)+.0001,5);
}
const hair=mesh('hair','hair'),highlight=mesh('hairHighlights','hairHighlights');
// Side-parted bob: continuous scalp plus broad, tapered locks; no transparent cards.
function hairPath(az,t,variation=0){const front=Math.max(0,Math.cos(az)),end=1.96-front*.94,p=Math.min(t/.62,1)*end,drop=Math.max(0,(t-.62)/.38)*smooth(.45,1.1,Math.abs(az));return [ .088*Math.sin(p)*Math.sin(az)-.018*(1-Math.sin(p))+.004*Math.sin(t*7+az)*drop, .713+.099*Math.cos(p)-drop*(.082+variation*.012), .300+.096*Math.sin(p)*Math.cos(az)-drop*.063];}
const cols=88,rows=20;for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertex(hair,hairPath(-Math.PI+x/cols*Math.PI*2,.008+y/rows*.92),[x/cols,y/rows]);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;hair.index.push(a,b,a+1,a+1,b,b+1);}
for(let k=0;k<128;k++){const az=-Math.PI+(k+.5)/128*Math.PI*2,points=[],max=Math.abs(az)<.45?.61:.88+.1*Math.sin(k*71)**2;for(let j=0;j<=14;j++)points.push(hairPath(az,.03+j/14*(max-.03),Math.sin(k*21)));tube(k%4===0?highlight:hair,points,t=>(.0016+.0005*Math.sin(k*4)**2)*(1-.85*smooth(.6,1,t)),4);}
// Swept fringe changes the silhouette and breaks the old helmet-like hairline.
const fringeStart=hair.p.length/3;
for(let k=0;k<54;k++){
 const u=k/53,points=[];
 const a=[-.045,.785-u*.018,.343+u*.027],b=[.012,.794-u*.016,.397+u*.009],c=[.076,.751-u*.026,.395-u*.008],d=[.079-u*.014,.704-u*.018,.355+u*.027];
 for(let j=0;j<=20;j++){const t=j/20,v=1-t;points.push(a.map((q,i)=>v*v*v*q+3*v*v*t*b[i]+3*v*t*t*c[i]+t*t*t*d[i]));}
 for(let j=0;j<points.length;j++)vertex(hair,points[j],[k/53,j/20]);
 if(k>0)for(let j=0;j<20;j++){const a=fringeStart+k*21+j,b=a-21;hair.index.push(a,b,a+1,a+1,b,b+1);}
}
const earring=mesh('earrings','gold');for(const side of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;pts.push([side*.079+Math.cos(a)*.004,.662+Math.sin(a)*.007,.314]);}tube(earring,pts,.00085,5);}
// Shoe soles and laces give the footwear a readable construction.
const laces=mesh('laces','laces');for(const side of [-1,1])for(let k=0;k<4;k++){const pts=[];for(let j=0;j<5;j++){const t=j/4;pts.push([side*.169+(t-.5)*.055,.077-k*.004+Math.sin(t*Math.PI)*.003,.421+k*.017]);}tube(laces,pts,.0015,4,0);}
for(const m of meshes)normals(m);
const materials=[
 {name:'body',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.64}},
 ...[['sweater',[.085,.19,.18,1],.93],['jeans',[.105,.145,.20,1],.9],['shoes',[.68,.63,.53,1],.77],['eyes',[.56,.53,.48,1],.25],['iris',[.11,.065,.027,1],.22],['pupils',[.005,.004,.003,1],.13],['hair',[.047,.023,.012,1],.64],['hairHighlights',[.073,.037,.019,1],.65],['gold',[.63,.36,.10,1],.29],['laces',[.8,.77,.67,1],.9]].map(([name,color,rough])=>({name,pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:rough,metallicFactor:name==='gold'?.75:0},doubleSided:name.startsWith('hair')}))
];
const json={asset:{version:'2.0',generator:'Meadow Character 3.8 — reshaped CC0 MakeHuman anatomy, rebuilt clothing and hair'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'MeadowCharacter38',children:[1],extras:{remadeCharacter:true}}],meshes:[],skins:[],accessors:[],bufferViews:[],buffers:[{}],materials,textures:[{source:0}],images:[{uri:'skin-diffuse.png'}]};
const chunks=[];let offset=0;
function attr(array,components,type=5126){const typed=type===5126?new Float32Array(array):type===5123?new Uint16Array(array):new Uint32Array(array),buf=Buffer.from(typed.buffer);const index=json.accessors.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:buf.length});const min=Array(components).fill(Infinity),max=Array(components).fill(-Infinity);for(let i=0;i<array.length;i++){min[i%components]=Math.min(min[i%components],array[i]);max[i%components]=Math.max(max[i%components],array[i]);}json.accessors.push({bufferView:json.bufferViews.length-1,componentType:type,count:array.length/components,type:({1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'})[components],...(components===3?{min,max}:{})});chunks.push(buf);offset+=buf.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}return index;}
const inverse=[];
for(let i=0;i<4;i++){const p=source.bonePos[i],par=i?source.bonePos[i-1]:[0,0,0];json.nodes.push({name:['hips','chest','neck','head'][i],translation:p.map((v,k)=>v-par[k]),...(i<3?{children:[i+2]}:{})});inverse.push(1,0,0,0,0,1,0,0,0,0,1,0,-p[0],-p[1],-p[2],1);}
json.skins.push({joints:[1,2,3,4],inverseBindMatrices:attr(inverse,16),skeleton:1});
for(const m of meshes){const attributes={POSITION:attr(m.p,3),NORMAL:attr(m.n,3),JOINTS_0:attr(m.joints,4,5123),WEIGHTS_0:attr(m.weights,4)};if(m.uv.length)attributes.TEXCOORD_0=attr(m.uv,2);json.meshes.push({name:m.name,primitives:[{attributes,indices:attr(m.index,1,5125),material:materials.findIndex(v=>v.name===(m.material||m.name))}]});json.nodes[0].children.push(json.nodes.length);json.nodes.push({name:m.name,mesh:json.meshes.length-1,skin:0});}
json.buffers[0].byteLength=offset;let j=Buffer.from(JSON.stringify(json));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);const bin=Buffer.concat(chunks),header=Buffer.alloc(20),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+bin.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(__dirname+'/../public/meadow-assets/person-remade.glb',Buffer.concat([header,j,bh,bin]));
console.log({vertices:meshes.reduce((a,m)=>a+m.p.length/3,0),triangles:meshes.reduce((a,m)=>a+m.index.length/3,0),bytes:28+j.length+bin.length});

