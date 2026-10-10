export const projects=[
 {title:'Dream State',lines:['DREAM','STATE'],category:'MOTION / IMMERSIVE DESIGN',filter:'motion',color:['#759daa','#ab7994'],description:'An imagined audiovisual world between waking and dreaming. Sculptural landscapes, drifting atmospheres, and slow, responsive motion create an identity that behaves like a place you can enter.',tags:'ART DIRECTION / 3D / REALTIME / MOTION'},
 {title:'Paper Ritual',lines:['PAPER','RITUAL'],category:'BRAND / GRAPHIC SYSTEM',filter:'brand',color:['#bda69a','#8d7478'],description:'An editorial identity for an imagined culture journal. The tactility of folded paper becomes a graphic system: unexpected compositions, expressive typography, and print details that carry through to moving media.',tags:'STRATEGY / IDENTITY / EDITORIAL / PRINT'},
 {title:'Soft Signal',lines:['SOFT','SIGNAL'],category:'SOUND / SONIC IDENTITY',filter:'sound',color:['#8baa9b','#8593b1'],description:'A sonic identity study about recognition without a screen. An original sound signature informs a living visual language, translating its rhythm, harmonics, and texture into motion and form.',tags:'SONIC BRANDING / SOUND DESIGN / GENERATIVE ART'},
 {title:'Common Ground',lines:['COMMON','GROUND'],category:'DIGITAL / UX & UI',filter:'digital',color:['#859eaa','#727f9c'],description:'A product experience concept about making complex choices feel natural. Research-led journeys, a clear interface system, and tactile microinteractions bring a calm human rhythm to the digital experience.',tags:'UX RESEARCH / INTERFACE DESIGN / DESIGN SYSTEM'},
 {title:'After Hours',lines:['AFTER','HOURS'],category:'MOTION / TYPE EXPERIMENT',filter:'motion',color:['#c79394','#89749c'],description:'An exploration of the impression a moving image leaves behind. Kinetic type, metallic folds, and layered trails form a flexible visual identity for an imagined late-night cultural programme.',tags:'MOTION DIRECTION / KINETIC TYPE / 3D'},
 {title:'Field Notes',lines:['FIELD','NOTES'],category:'BRAND / DIGITAL EXPERIENCE',filter:'brand',color:['#9fab97','#6c958f'],description:'A visual identity and digital concept for an imagined independent research collective. Modular typography, maps, and living textures connect a thoughtful brand system with an exploratory website.',tags:'BRAND SYSTEM / ART DIRECTION / DIGITAL'}
];
export function createArtwork(){
 return projects.map((p,idx)=>{
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=750;const c=canvas.getContext('2d');
  const g=c.createLinearGradient(0,0,1200,750);g.addColorStop(0,p.color[0]);g.addColorStop(1,p.color[1]);c.fillStyle=g;c.fillRect(0,0,1200,750);
  let seed=91+idx*1041;const rnd=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  if(idx===0){
   for(let k=5;k>=0;k--){c.beginPath();c.moveTo(0,750);for(let x=0;x<=1200;x+=7){const y=310+k*57+Math.sin(x*.005+k*1.4)*90+Math.sin(x*.014+k)*22;c.lineTo(x,y);}c.lineTo(1200,750);c.closePath();c.fillStyle=['#9daaaa','#8b9da2','#7b949f','#698998','#5b7b8c','#3c657b'][k];c.fill();}
   c.fillStyle='rgba(229,231,212,.6)';c.beginPath();c.ellipse(845,230,94,170,.2,0,Math.PI*2);c.fill();c.fillStyle=p.color[0];c.beginPath();c.ellipse(845,250,62,135,.2,0,Math.PI*2);c.fill();
  }else if(idx===1){for(let k=0;k<16;k++){c.save();c.translate(600,390);c.rotate(-.5+k*.045);c.fillStyle=`rgba(236,223,207,${.08+k*.02})`;c.fillRect(-370+k*7,-250+k*5,700-k*12,490-k*8);c.restore();}}
  else if(idx===2){c.save();c.translate(600,385);for(let k=0;k<80;k++){c.strokeStyle=`rgba(213,234,218,${.12+k/210})`;c.lineWidth=1.4;c.beginPath();c.ellipse(0,Math.sin(k*.16)*15,90+k*4,210+Math.cos(k*.13)*40,k*.015,0,Math.PI*2);c.stroke();}c.restore();}
  else if(idx===3){for(let k=0;k<8;k++){c.save();c.translate(610+k*20,350+k*14);c.rotate(-.4);c.fillStyle=`rgba(210,229,234,${.07+k*.025})`;c.strokeStyle='rgba(229,233,240,.3)';c.beginPath();c.roundRect(-330,-185,590,400,26);c.fill();c.stroke();for(let j=0;j<5;j++){c.fillStyle='rgba(40,65,86,.13)';c.fillRect(-285+j*102,-135,80,235);}c.restore();}}
  else if(idx===4){c.save();c.translate(610,385);for(let k=0;k<30;k++){c.rotate(.16);c.strokeStyle='rgba(229,194,200,.42)';c.lineWidth=2;c.beginPath();c.ellipse(0,0,75+k*8,190+k*5,0,0,Math.PI*2);c.stroke();}c.restore();}
  else{for(let k=0;k<70;k++){c.beginPath();for(let x=0;x<1210;x+=10){let y=80+k*9+Math.sin(x*.011+k*.17)*60+Math.sin(x*.025+k*.12)*15;x===0?c.moveTo(x,y):c.lineTo(x,y);}c.strokeStyle='rgba(209,233,215,.25)';c.lineWidth=1;c.stroke();}}
  for(let i=0;i<21000;i++){c.fillStyle=rnd()>.5?'rgba(246,236,230,.05)':'rgba(12,24,35,.05)';c.fillRect(rnd()*1200,rnd()*750,1.7,1.7);}
  // Keep typography separate so the glass shader can refract the artwork without erasing readable titles.
  const labels=document.createElement('canvas');labels.width=1200;labels.height=750;const l=labels.getContext('2d');l.fillStyle='#f3f0eb';l.textAlign='center';l.font='15px Mono, monospace';l.fillText('RED STUDIO / CONCEPT '+String(idx+1).padStart(2,'0'),600,90);
  l.font=`400 ${idx===3?84:105}px Space, Arial`;l.fillText(p.lines[0],600,355);l.fillText(p.lines[1],600,460);l.font='13px Mono, monospace';l.fillStyle='#dedfe2';l.fillText(p.category,600,645);
  const preview=document.createElement('canvas');preview.width=1200;preview.height=750;const pc=preview.getContext('2d');pc.drawImage(canvas,0,0);pc.drawImage(labels,0,0);
  return {art:canvas,label:labels,preview:preview.toDataURL('image/webp',.9)};
 });
}
