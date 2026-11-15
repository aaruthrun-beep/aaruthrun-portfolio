const fs = require('fs');
const zlib = require('zlib');

const W = 1280, H = 720;
const buf = Buffer.alloc(W * H * 4);

function put(x,y,r,g,b,a){
  x = Math.round(x); y = Math.round(y);
  if (x<0||y<0||x>=W||y>=H) return;
  const i = (y*W + x)*4;
  const fa = a/255, fb = buf[i+3]/255;
  const outA = fb + fa*(1-fb);
  if (outA<=0) return;
  buf[i]   = (fa*buf[i]   + (1-fa)*r) / outA;
  buf[i+1] = (fa*buf[i+1] + (1-fa)*g) / outA;
  buf[i+2] = (fa*buf[i+2] + (1-fa)*b) / outA;
  buf[i+3] = outA * 255;
}
function fillRect(x,y,w,h,r,g,b,a){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  for (let yy=y; yy<y+h; yy++)
    for (let xx=x; xx<x+w; xx++)
      put(xx,yy,r,g,b,a);
}
function lerp(a,b,t){return a+(b-a)*t;}
function gradientStops(stops){
  // stops: [{pos,color:[r,g,b,a]}] across full canvas
  for (let y=0;y<H;y++){
    for (let x=0;x<W;x++){
      const t = x/W;
      let c = stops[stops.length-1].color.slice();
      for (let i=0;i<stops.length-1;i++){
        if (t>=stops[i].pos && t<=stops[i+1].pos){
          const lt = (t-stops[i].pos)/(stops[i+1].pos-stops[i].pos);
          c = [lerp(stops[i].color[0],stops[i+1].color[0],lt),
               lerp(stops[i].color[1],stops[i+1].color[1],lt),
               lerp(stops[i].color[2],stops[i+1].color[2],lt),
               lerp(stops[i].color[3],stops[i+1].color[3],lt)];
          break;
        }
      }
      put(x,y,c[0]*255,c[1]*255,c[2]*255,c[3]*255);
    }
  }
}
function pointInPolygon(px,py,d){
  let inside=false, firstX=+d[0][1], firstY=+d[0][2];
  let pxPrev=firstX, pyPrev=firstY;
  for (let i=1;i<d.length;i++){
    const cmd=d[i][0];
    if (cmd==='M'){pxPrev=+d[i][1];pyPrev=+d[i][2];continue;}
    if (cmd==='L'){
      const x1=pxPrev,y1=pyPrev,x2=+d[i][1],y2=+d[i][2];
      if ((y1>py)!==(y2>py) && px < (x2-x1)*(py-y1)/(y2-y1)+x1) inside=!inside;
      pxPrev=x2;pyPrev=y2;
    } else if (cmd==='Z'){
      const x1=pxPrev,y1=pyPrev,x2=firstX,y2=firstY;
      if ((y1>py)!==(y2>py) && px < (x2-x1)*(py-y1)/(y2-y1)+x1) inside=!inside;
      break;
    }
  }
  return inside;
}
function distPtSeg(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if (l2===0) return Math.hypot(px-x1,py-y1);
  let t=((px-x1)*dx+(py-y1)*dy)/l2;
  t=Math.max(0,Math.min(1,t));
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function minDistToPath(px,py,d){
  let best=Infinity;
  for (let i=0;i<d.length;i++){
    const cmd=d[i][0];
    if (cmd==='M') best=Math.min(best,Math.hypot(px-d[i][1],py-d[i][2]));
    else if (cmd==='L'){
      const x0=d[i-1][1],y0=d[i-1][2],x1=d[i][1],y1=d[i][2];
      best=Math.min(best,distPtSeg(px,py,x0,y0,x1,y1));
    } else if (cmd==='A'){
      const sx=d[i-1][1],sy=d[i-1][2],ex=d[i][6],ey=d[i][7];
      best=Math.min(best,distPtSeg(px,py,sx,sy,ex,ey));
    } else if (cmd==='Z'){
      best=Math.min(best,distPtSeg(px,py,d[i-1][1],d[i-1][2],d[0][1],d[0][2]));
    }
  }
  return best;
}
function drawPath(d,fillR,fillG,fillB,fillA,strokeR,strokeG,strokeB,strokeA,sw){
  if (fillA>0){
    const step=2;
    for (let y=0;y<H;y+=step)
      for (let x=0;x<W;x+=step)
        if (pointInPolygon(x+0.5,y+0.5,d))
          for (let yy=y; yy<y+step && yy<H; yy++)
            for (let xx=x; xx<x+step && xx<W; xx++)
              put(xx,yy,fillR,fillG,fillB,fillA);
  }
  if (strokeA>0 && sw>0){
    const half=sw/2;
    for (let y=0;y<H;y+=1)
      for (let x=0;x<W;x+=1)
        if (minDistToPath(x,y,d) <= half)
          put(x,y,strokeR,strokeG,strokeB,strokeA);
  }
}
function roundRectPath(x,y,w,h,r){
  return [
    ['M', x+r, y],
    ['L', x+w-r, y],
    ['A', r, r, 0, 0, 1, x+w, y+r],
    ['L', x+w, y+h-r],
    ['A', r, r, 0, 0, 1, x+w-r, y+h],
    ['L', x+r, y+h],
    ['A', r, r, 0, 0, 1, x, y+h-r],
    ['L', x, y+r],
    ['A', r, r, 0, 0, 1, x+r, y],
    ['Z']
  ];
}
function drawStar(cx,cy,r){
  const pts=[];
  for (let i=0;i<5;i++){
    const a=-Math.PI/2+i*2*Math.PI/5, a2=a+Math.PI/5;
    pts.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]);
    pts.push([cx+Math.cos(a2)*r*0.382, cy+Math.sin(a2)*r*0.382]);
  }
  const d=[['M',pts[0][0],pts[0][1]]];
  for (let i=1;i<pts.length;i++) d.push(['L',pts[i][0],pts[i][1]]);
  d.push(['Z']);
  drawPath(d, 184,137,58,255, 184,137,58,255, 1.2);
}
function drawMiniRobot(x,y,s,left, rr,rg,rb,ra, dr,dg,db,da, mr,mg,mb,ma){
  fillRect(x-26*s, y+30*s, 52*s, 10*s, 32,37,34,70);
  drawPath([
    ['M', x-18*s, y+26*s],['L', x+18*s, y+26*s],
    ['L', x+20*s, y+14*s],['L', x-20*s, y+14*s],['Z']
  ], dr,dg,db,da, mr,mg,mb,ma, 0);
  for (let i=-1;i<=1;i+=2){
    fillRect(x+i*14*s-5*s, y+22*s-4*s, 10*s, 8*s, 32,37,34,255);
    fillRect(x+i*14*s-2*s, y+22*s-2*s, 4*s, 4*s, rr,rg,rb,ra);
  }
  drawPath([
    ['M', x-16*s, y+12*s],['L', x+16*s, y+12*s],
    ['L', x+18*s, y+2*s],['L', x-18*s, y+2*s],['Z']
  ], rr,rg,rb,ra, 255,255,255,255, 1);
  fillRect(x-14*s, y-6*s, 28*s, 14*s, rr,rg,rb,ra);
  drawPath([
    ['M', x-13*s, y-5*s],['L', x+13*s, y-5*s],
    ['L', x+13*s, y+7*s],['L', x-13*s, y+7*s],['Z']
  ], 255,255,255,255, 255,255,255,0, 1);
  fillRect(x-12*s, y-18*s, 24*s, 14*s, rr,rg,rb,ra);
  drawPath([
    ['M', x-11*s, y-17*s],['L', x+11*s, y-17*s],
    ['L', x+11*s, y-3*s],['L', x-11*s, y-3*s],['Z']
  ], 255,255,255,255, 255,255,255,0, 1);
  drawPath([
    ['M', x-10*s, y-14*s],['L', x+10*s, y-14*s],
    ['A', 6,6,0,0,1, x+10*s, y-8*s],
    ['L', x-10*s, y-8*s],['A', 6,6,0,0,1, x-10*s, y-14*s],['Z']
  ], 17,19,15,255, 0,0,0,0,0);
  drawPath([
    ['M', x-9*s, y-13*s],['L', x+9*s, y-13*s],['Z']
  ], mr,mg,mb,ma, 0,0,0,0,0);
  drawPath([
    ['M', x, y-18*s],['L', x, y-24*s],['Z']
  ], 0,0,0,0, mr,mg,mb,ma, 1.5);
  fillRect(x-2*s, y-25*s, 4*s, 4*s, rr,rg,rb,ra);
  fillRect(x-1*s, y-25*s, 2*s, 2*s, mr,mg,mb,ma);
}

// ─── Composition ────────────────────────────────────────────────────────────
gradientStops([
  {pos:0.0,color:[245,243,235,1]},
  {pos:0.55,color:[240,239,233,1]},
  {pos:1.0,color:[232,230,222,1]}
]);
// dot grid
for (let x=40;x<W;x+=16){ for (let y=40;y<H;y+=16){ put(x,y,115,123,120,18); } }
for (let x=120;x<W;x+=16){ for (let y=120;y<H;y+=16){ put(x,y,32,37,34,22); } }

const cx=W/2, cy=H/2;

// drop shadow
fillRect(cx-120, cy+120, 240, 16, 32,37,34,40);

// shield fan
drawPath(roundRectPath(cx-150, cy-220, 300, 300, 40), 184,137,58,255, 32,37,34,255, 0);

// scarf
drawPath([
  ['M', cx-120, cy-40],['L', cx+60, cy-40],
  ['L', cx+80, cy-180],['L', cx-100, cy-160],['Z']
], 166,42,42,255, 32,37,34,255, 2);

// scallops
for (let i=0;i<10;i++){
  const bx=cx-110+i*17, by=(i%2===0?-30:-22);
  drawPath([['M',bx,by-6],['A',6,6,0,0,1,bx+12,by-6],['L',bx+12,by],['Z']],
    184,26,26,255, 0,0,0,0,0);
}

// tree
fillRect(cx-70-6, cy-90, 12, 50, 90,60,30,255);
for (let i=0;i<7;i++){
  const sx=cx-70-30+i*10, sy=cy-120-(i%2===0?22:10);
  drawPath([['M',sx,sy+14],['A',10,10,0,0,1,sx+16,sy+4],['L',sx+16,sy+18],['Z']],
    58,98,44,255, 0,0,0,0,0);
}

// taco arcs
drawPath([
  ['M', cx-18, cy-10],['A', 18,18,0,0,1, cx+18, cy-10],
  ['M', cx+18, cy+6],['A', 16,16,0,0,0, cx-18, cy+6]
], 0,0,0,0, 32,37,34,255, 4);

// 13 glory stars along upper-left arc
const startA=-Math.PI*0.45;
for (let i=0;i<13;i++){
  const a=startA+(i/13)*Math.PI*1.0;
  const sx=cx+Math.cos(a)*120, sy=cy+Math.sin(a)*120-40;
  drawStar(sx,sy,4.2);
}
// pride arc right side
drawPath([['M', cx+70, cy-60],['A', 40,40,0,0,1, cx+70, cy-20]],
  0,0,0,0, 32,37,34,255, 2);

// mini robots
drawMiniRobot(cx-220, cy+80, 0.7,  true,  230,226,216,255, 181,188,160,255, 32,37,34,255);
drawMiniRobot(cx+230, cy+90, 0.78, false, 220,214,198,255, 158,146,136,255, 32,37,34,255);

// flowing ribbon with cherub faces
drawPath([
  ['M', cx-120, cy-240],
  ['C', cx-60, cy-290, cx+60, cy-270, cx+120, cy-240],
  ['L', cx+120, cy-232],
  ['C', cx+60, cy-282, cx-60, cy-262, cx-120, cy-232],
  ['Z']
], 177,42,42,255, 32,37,34,255, 1.5);
fillRect(cx-50, cy-256, 24, 24, 244,168,168,255);
fillRect(cx+26, cy-250, 24, 24, 244,168,168,255);
fillRect(cx-42, cy-250, 6, 6, 120,40,40,255);
fillRect(cx-30, cy-250, 6, 6, 120,40,40,255);
fillRect(cx+34, cy-244, 6, 6, 120,40,40,255);
fillRect(cx+46, cy-244, 6, 6, 120,40,40,255);

// outer ring
drawPath([
  ['M', cx-160, cy-30],['A', 160,160,0,0,1, cx+160, cy+30]
], 0,0,0,0, 32,37,34,255, 6);

// frame
drawPath(roundRectPath(18,18,W-36,H-36,26), 0,0,0,0, 216,218,212,255, 3);
drawPath(roundRectPath(24,24,W-48,H-48,22), 0,0,0,0, 32,37,34,255, 1.2);

// ─── PNG writer ─────────────────────────────────────────────────────────────
function crc32(b){
  let c=0xFFFFFFFF;
  const t=new Int32Array(256);
  for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++) c=(c>>>1)^(c&1?0xEDB88320:0); t[n]=c>>>0;}
  for (let i=0;i<b.length;i++) c=t[(c^b[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,'ascii');
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crc]);
}
function packU32(v){const b=Buffer.alloc(4);b.writeUInt32BE(v,0);return b;}

function concatBuffers(items){
  const chunks = [];
  let totalLen = 0;
  for (let i=0;i<items.length;i++){
    const item = items[i];
    if (item instanceof Buffer) chunks.push(item);
    else if (typeof item === 'number') { const b = Buffer.alloc(1); b.writeUInt8(item,0); chunks.push(b); }
    else if (ArrayBuffer.isView(item)) chunks.push(Buffer.from(item.buffer, item.byteOffset, item.byteLength));
    else if (typeof item === 'string') chunks.push(Buffer.from(item,'utf8'));
    else if (item instanceof Uint8Array) chunks.push(Buffer.from(item));
    else throw new Error('unsupported type '+typeof item);
    totalLen += (typeof item==='number'?1:item.byteLength||item.length||0);
  }
  return Buffer.concat(chunks, totalLen);
}

const signature = concatBuffers([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const raw = [];
for (let y=0;y<H;y++){
  raw.push(Buffer.from([0])); // filter none
  for (let x=0;x<W;x++){
    const i=(y*W+x)*4;
    raw.push(buf[i+2]); // R (buf is BGRA)
    raw.push(buf[i+1]); // G
    raw.push(buf[i+0]); // B
    raw.push(buf[i+3]); // A
  }
}
const compressed = zlib.deflateRawSync(concatBuffers(raw));
const IHDR = chunk('IHDR', concatBuffers([packU32(W), packU32(H), 8, 2, 0, 0, 0]));
const IDAT = chunk('IDAT', compressed);
const IEND = chunk('IEND', Buffer.alloc(0));
const png = concatBuffers([signature, IHDR, IDAT, IEND]);
fs.writeFileSync('images/og-image.webp', png);
console.log('Wrote images/og-image.webp: ' + png.length + ' bytes, ' + W + 'x' + H + ' px, PNG format');
