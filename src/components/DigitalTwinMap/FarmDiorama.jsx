/**
 * KrishiSarth Digital Twin v17 — Full Enhanced Diorama
 * Features:
 *  - Tank at corner (back-right), beside it solar-powered windmill with full rotation animation
 *  - Zones added horizontally, one after another
 *  - Zone 1 = Polyhouse
 *  - Animated crops: wheat waves, tomato sways, sugarcane bends
 *  - Soil sensors in every zone
 *  - Accurate pipelines from tank → every zone
 *  - Sprinklers + drip emitters per zone
 *  - Water flow animation (animated droplets/particles) when pump ON
 *  - Solar panel + windmill spinning animation
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Eye, Shield, Droplets, Zap, Wind } from 'lucide-react';

import { getCropMeta } from '../../data/appContent.js';
import { useModeStore } from '../../store/modeStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { localize } from '../../utils/formatters.js';
import TwinObjectHud from './TwinObjectHud.jsx';
import TwinSidePanel from './TwinSidePanel.jsx';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const ZONE_SPACING = 75;      // horizontal spacing between zones
const ZONE_BASE_Z  = 0;       // all zones on same Z row
const TANK_X       = 20;      // tank relative X within its corner group
const TANK_Z       = -10;
const INFRA_WORLD  = { x: 0, z: -140 }; // world pos of tank+windmill corner (top-right)

const ZONE_COLORS = [
  '#3b82f6','#22c55e','#eab308','#f97316','#a855f7',
  '#ef4444','#06b6d4','#ec4899','#84cc16',
];

function getZoneColor(i) { return ZONE_COLORS[i % ZONE_COLORS.length]; }

/* ─────────────────────────────────────────────
   SHARED TEXTURES
───────────────────────────────────────────── */
const _texCache = {};
function makeTex(key, fn) {
  if (_texCache[key]) return _texCache[key];
  const t = fn(); _texCache[key] = t; return t;
}

function getBrickTex() {
  return makeTex('brick', () => {
    const c = document.createElement('canvas'); c.width=256; c.height=64;
    const ctx = c.getContext('2d');
    ctx.fillStyle='#92400e'; ctx.fillRect(0,0,256,64);
    for(let row=0;row<4;row++){
      const off=row%2===0?0:20;
      for(let col=-1;col<7;col++){
        const l=32+Math.random()*12;
        ctx.fillStyle=`hsl(${18+Math.random()*12},68%,${l}%)`;
        ctx.fillRect(col*40+off+2,row*16+2,36,12);
      }
    }
    const t=new THREE.CanvasTexture(c);
    t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(4,1); return t;
  });
}

function getGrassTex() {
  return makeTex('grass', () => {
    const c=document.createElement('canvas'); c.width=256; c.height=256;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#14532d'; ctx.fillRect(0,0,256,256);
    for(let i=0;i<800;i++){
      const l=15+Math.random()*20;
      ctx.fillStyle=`hsl(${130+Math.random()*20},50%,${l}%)`;
      ctx.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*4,2+Math.random()*4);
    }
    const t=new THREE.CanvasTexture(c);
    t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(10,10); return t;
  });
}

function getSoilTex(accent='#10b981') {
  const c=document.createElement('canvas'); c.width=256; c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#2d1505'; ctx.fillRect(0,0,256,256);
  for(let d=0;d<600;d++){
    const l=10+Math.random()*18;
    ctx.fillStyle=`hsl(${18+Math.random()*15},45%,${l}%)`;
    ctx.beginPath();
    ctx.arc(Math.random()*256,Math.random()*256,0.5+Math.random()*3,0,Math.PI*2);
    ctx.fill();
  }
  ctx.strokeStyle=accent; ctx.lineWidth=3; ctx.globalAlpha=0.4;
  for(let row=1;row<7;row++){
    ctx.beginPath(); ctx.moveTo(10,row*36); ctx.lineTo(246,row*36); ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c); return t;
}

/* ─────────────────────────────────────────────
   BRICK RAISED BED
───────────────────────────────────────────── */
function createBrickBed() {
  const g=new THREE.Group();
  const brickMat=new THREE.MeshStandardMaterial({map:getBrickTex(),roughness:0.9});
  // floor slab
  const slab=new THREE.Mesh(new THREE.BoxGeometry(60,4,60),brickMat);
  slab.position.y=-12; slab.receiveShadow=true; slab.castShadow=true; g.add(slab);
  // walls
  [[60,8,4,[0,-8,32]],[60,8,4,[0,-8,-32]],[4,8,60,[32,-8,0]],[4,8,60,[-32,-8,0]]].forEach(([w,h,d,p])=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),brickMat);
    m.position.set(...p); m.castShadow=true; g.add(m);
  });
  return g;
}

/* ─────────────────────────────────────────────
   ANIMATED CROPS
───────────────────────────────────────────── */
function createAnimatedCrops(cropType) {
  const field = new THREE.Group();
  const isMobile = typeof window !== 'undefined' && (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768);
  const rF = isMobile ? 0.35 : 1; // row factor
  const cF = isMobile ? 0.4 : 1;  // col factor

  const defs = {
    wheat:    { rows:Math.max(2, Math.floor(6*rF)), cols:Math.max(3, Math.floor(9*cF)), style:'grain',    leafC:0x84cc16, stalkC:0xc4a035, h:6 },
    tomato:   { rows:Math.max(2, Math.floor(5*rF)), cols:Math.max(3, Math.floor(8*cF)), style:'bush',     leafC:0x16a34a, stalkC:0x4d7c0f, h:7 },
    sugarcane:{ rows:Math.max(2, Math.floor(5*rF)), cols:Math.max(3, Math.floor(7*cF)), style:'cane',     leafC:0x4ade80, stalkC:0x65a30d, h:14 },
    onion:    { rows:Math.max(2, Math.floor(6*rF)), cols:Math.max(4, Math.floor(10*cF)),style:'thin',     leafC:0x4ade80, stalkC:0x86efac, h:4 },
    potato:   { rows:Math.max(2, Math.floor(5*rF)), cols:Math.max(3, Math.floor(9*cF)), style:'low',      leafC:0x22c55e, stalkC:0x15803d, h:3.5 },
    cotton:   { rows:Math.max(2, Math.floor(5*rF)), cols:Math.max(3, Math.floor(8*cF)), style:'bush',     leafC:0x86efac, stalkC:0x4d7c0f, h:6 },
    default:  { rows:Math.max(2, Math.floor(5*rF)), cols:Math.max(3, Math.floor(8*cF)), style:'bush',     leafC:0x22c55e, stalkC:0x15803d, h:5 },
  };
  const p = defs[cropType] || defs.default;
  const stalkMat = new THREE.MeshStandardMaterial({color:p.stalkC, roughness:0.85});
  const leafMat  = new THREE.MeshStandardMaterial({color:p.leafC,  roughness:0.75});

  const plants = [];

  for(let row=0;row<p.rows;row++){
    for(let col=0;col<p.cols;col++){
      const x = -22 + col*(44/(p.cols-1));
      const z = -20 + row*(40/(p.rows-1));
      const h = p.h + Math.random()*1.5;
      const plantGroup = new THREE.Group();
      plantGroup.position.set(x, 0, z);
      // store phase for wind
      plantGroup.userData.windPhase = Math.random()*Math.PI*2;
      plantGroup.userData.windSpeed = 0.8 + Math.random()*0.4;

      if(p.style==='grain'){
        const stalk=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,h,5),stalkMat);
        stalk.position.y=h/2-2.5; stalk.castShadow=true; plantGroup.add(stalk);
        const head=new THREE.Mesh(new THREE.SphereGeometry(0.35,6,6),leafMat);
        head.position.y=h-2; head.scale.set(1.8,0.6,1.8); plantGroup.add(head);
      } else if(p.style==='cane'){
        // sugarcane — tall segmented stalk
        const segments=5;
        for(let s=0;s<segments;s++){
          const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.22-s*0.02,0.25-s*0.02,h/segments,6),
            s%2===0?stalkMat:leafMat);
          seg.position.y=(s+0.5)*(h/segments)-2.5; plantGroup.add(seg);
        }
        // leaves at top
        for(let l=0;l<4;l++){
          const leaf=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,4,4),leafMat);
          leaf.position.set(Math.sin(l*1.57)*1.5,h-1,Math.cos(l*1.57)*1.5);
          leaf.rotation.z=0.6; plantGroup.add(leaf);
        }
      } else if(p.style==='thin'){
        const blade=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.12,h,4),leafMat);
        blade.position.y=h/2-2.5; plantGroup.add(blade);
      } else if(p.style==='low'){
        const mound=new THREE.Mesh(new THREE.SphereGeometry(1.2,8,8),leafMat);
        mound.position.y=-1.5; mound.scale.set(1,0.5,1); plantGroup.add(mound);
      } else {
        const stalk=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.22,h*0.55,5),stalkMat);
        stalk.position.y=h*0.28-2.5; stalk.castShadow=true; plantGroup.add(stalk);
        const canopy=new THREE.Mesh(new THREE.SphereGeometry(1.1+Math.random()*0.4,8,8),leafMat);
        canopy.position.y=h*0.65-1.5; canopy.scale.set(1.1,0.85,1.1); canopy.castShadow=true;
        plantGroup.add(canopy);
        // tomato fruits
        if(cropType==='tomato'){
          for(let f=0;f<3;f++){
            const fruit=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,8),
              new THREE.MeshStandardMaterial({color:0xef4444,emissive:0x991b1b,emissiveIntensity:0.2}));
            fruit.position.set(
              Math.sin(f*2.1)*1.2, h*0.55-1.5, Math.cos(f*2.1)*1.2
            ); plantGroup.add(fruit);
          }
        }
      }
      field.add(plantGroup);
      plants.push(plantGroup);
    }
  }
  field.userData.plants = plants;
  return field;
}

/* ─────────────────────────────────────────────
   POLYHOUSE (Zone 0)
───────────────────────────────────────────── */
function createPolyhouse(group) {
  const frameMat=new THREE.MeshStandardMaterial({color:0xcc2200,metalness:0.65,roughness:0.35});
  const filmMat=new THREE.MeshPhysicalMaterial({
    color:0xdbeafe,transparent:true,opacity:0.25,roughness:0.04,
    side:THREE.DoubleSide,transmission:0.85,thickness:0.3,
  });
  const radius=22, length=48, SEGS=6;
  // ribs
  for(let i=0;i<=8;i++){
    const rib=new THREE.Mesh(new THREE.TorusGeometry(radius,0.55,4,SEGS,Math.PI),frameMat);
    rib.position.set(0,0,-length/2+i*(length/8));
    rib.castShadow=true; group.add(rib);
  }
  // skin
  const tunnel=new THREE.Mesh(
    new THREE.CylinderGeometry(radius,radius,length,SEGS,1,true,0,Math.PI),filmMat);
  tunnel.rotation.set(Math.PI/2,0,Math.PI/2); group.add(tunnel);
  // gable ends
  [-length/2,length/2].forEach(zp=>{
    const shape=new THREE.Shape();
    shape.moveTo(-radius,0); shape.lineTo(radius,0);
    for(let s=0;s<=SEGS;s++){
      const a=(Math.PI/SEGS)*s;
      shape.lineTo(radius*Math.cos(Math.PI-a),radius*Math.sin(Math.PI-a));
    }
    shape.closePath();
    const gable=new THREE.Mesh(new THREE.ShapeGeometry(shape),filmMat);
    gable.position.set(0,0,zp); group.add(gable);
    const botBar=new THREE.Mesh(new THREE.BoxGeometry(radius*2,0.8,0.8),frameMat);
    botBar.position.set(0,0.4,zp); group.add(botBar);
  });
  // ridge
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,length+2),frameMat);
  ridge.position.set(0,radius,0); group.add(ridge);
  // sill rails
  [-radius+1,radius-1].forEach(x=>{
    const sill=new THREE.Mesh(new THREE.BoxGeometry(0.6,3,length),frameMat);
    sill.position.set(x,1.5,0); group.add(sill);
  });
}

/* ─────────────────────────────────────────────
   SOIL SENSOR
───────────────────────────────────────────── */
function createSoilSensor(zoneIdx, zoneId, interactives) {
  const g=new THREE.Group();
  g.position.set(-24,-2,-22);
  const probeMat=new THREE.MeshStandardMaterial({color:0x94a3b8,metalness:0.7,roughness:0.35});
  const probe=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.55,9,8),probeMat);
  probe.position.y=0.5; probe.castShadow=true;
  probe.userData={partType:'soil_sensor',zoneIdx,zoneId};
  g.add(probe); interactives.push(probe);
  const pcb=new THREE.Mesh(new THREE.BoxGeometry(3.2,2.2,1),
    new THREE.MeshStandardMaterial({color:0x0f172a,roughness:0.5}));
  pcb.position.set(0,5.2,0); pcb.userData={partType:'soil_sensor',zoneIdx,zoneId};
  g.add(pcb); interactives.push(pcb);
  const led=new THREE.Mesh(new THREE.SphereGeometry(0.45,8,8),
    new THREE.MeshStandardMaterial({color:0x22c55e,emissive:0x22c55e,emissiveIntensity:1.2}));
  led.position.set(0,6.4,0.55); led.userData={partType:'soil_sensor',zoneIdx,zoneId};
  g.add(led); interactives.push(led);
  // pulse ring
  const ringMat=new THREE.MeshStandardMaterial({color:0x22d3ee,emissive:0x22d3ee,emissiveIntensity:0.5,transparent:true,opacity:0.8});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,0.12,8,32),ringMat);
  ring.rotation.x=Math.PI/2; ring.position.y=0.1;
  g.add(ring); g.userData.led=led; g.userData.ring=ring;
  return g;
}

function createDht11Sensor(zoneIdx, zoneId, interactives) {
  const g=new THREE.Group();
  g.position.set(-18,-2,22);
  const bodyMat=new THREE.MeshStandardMaterial({color:0x1d4ed8,roughness:0.45,metalness:0.05});
  const faceMat=new THREE.MeshStandardMaterial({color:0xbfdbfe,roughness:0.35});
  const body=new THREE.Mesh(new THREE.BoxGeometry(4.5,5.5,1.4),bodyMat);
  body.position.y=4;
  body.castShadow=true;
  tagMesh(body,'dht11',zoneIdx,zoneId);
  g.add(body); interactives.push(body);

  const face=new THREE.Mesh(new THREE.BoxGeometry(3.4,3.9,0.18),faceMat);
  face.position.set(0,4,0.82);
  tagMesh(face,'dht11',zoneIdx,zoneId);
  g.add(face); interactives.push(face);

  for(let row=0;row<3;row++){
    for(let col=0;col<4;col++){
      const hole=new THREE.Mesh(
        new THREE.SphereGeometry(0.18,8,8),
        new THREE.MeshStandardMaterial({color:0x0f172a,roughness:0.6})
      );
      hole.position.set(-1.25+col*0.85,3.25+row*0.65,0.96);
      tagMesh(hole,'dht11',zoneIdx,zoneId);
      g.add(hole); interactives.push(hole);
    }
  }

  const stem=new THREE.Mesh(
    new THREE.CylinderGeometry(0.18,0.18,6,8),
    new THREE.MeshStandardMaterial({color:0x64748b,metalness:0.3})
  );
  stem.position.y=0.6;
  tagMesh(stem,'dht11',zoneIdx,zoneId);
  g.add(stem); interactives.push(stem);

  return g;
}

/* ─────────────────────────────────────────────
   PUMP UNIT
───────────────────────────────────────────── */
function createPump(zoneIdx, zoneId, interactives) {
  const g=new THREE.Group();
  g.position.set(24,-2,22);
  const body=new THREE.Mesh(new THREE.BoxGeometry(7,5,5),
    new THREE.MeshStandardMaterial({color:0xea580c,metalness:0.3,roughness:0.6}));
  body.position.y=1.5; body.castShadow=true;
  body.userData={partType:'pump',zoneIdx,zoneId};
  g.add(body); interactives.push(body);
  const motor=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,4.5,16),
    new THREE.MeshStandardMaterial({color:0x1e293b,metalness:0.6}));
  motor.position.set(0,4.8,0);
  motor.userData={partType:'pump',zoneIdx,zoneId};
  g.add(motor); interactives.push(motor);
  // indicator LED
  const led=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8),
    new THREE.MeshStandardMaterial({color:0xef4444,emissive:0xef4444,emissiveIntensity:0.3}));
  led.position.set(2,4.8,2.5); g.add(led); g.userData.pumpLed=led;
  return g;
}

/* ─────────────────────────────────────────────
   SPRINKLER
───────────────────────────────────────────── */
function createSprinkler(x, z) {
  const g=new THREE.Group();
  g.position.set(x,0,z);
  const poleMat=new THREE.MeshStandardMaterial({color:0x64748b,metalness:0.5});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,6,8),poleMat);
  pole.position.y=3; g.add(pole);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.6,8,8),
    new THREE.MeshStandardMaterial({color:0x0ea5e9,metalness:0.6}));
  head.position.y=6.3; g.add(head);
  // spray arms
  for(let a=0;a<4;a++){
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.5,4),poleMat);
    arm.position.set(Math.sin(a*1.57)*0.9,6.3,Math.cos(a*1.57)*0.9);
    arm.rotation.z=0.5; g.add(arm);
  }
  g.userData.type='sprinkler';
  return g;
}

/* ─────────────────────────────────────────────
   DRIP EMITTERS
───────────────────────────────────────────── */
function createDripLine(zoneColor) {
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x1e293b,roughness:0.8});
  // horizontal drip pipe across bed
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,48,8),mat);
  pipe.rotation.z=Math.PI/2; pipe.position.set(0,-1,0); g.add(pipe);
  // emitters along pipe
  for(let i=0;i<7;i++){
    const em=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,6),
      new THREE.MeshStandardMaterial({color:0x0ea5e9,emissive:0x0369a1,emissiveIntensity:0.3}));
    em.position.set(-22+i*7.3,-1,0); g.add(em);
  }
  g.userData.type='drip';
  return g;
}

/* ─────────────────────────────────────────────
   WATER FLOW PARTICLES (per zone pipe)
───────────────────────────────────────────── */
function createWaterFlowParticles(scene, startWorld, endWorld) {
  const count=18;
  const positions=new Float32Array(count*3);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const mat=new THREE.PointsMaterial({
    color:0x38bdf8,size:1.4,transparent:true,opacity:0.85,
    depthWrite:false,sizeAttenuation:true,
  });
  const pts=new THREE.Points(geo,mat);
  pts.userData={
    start:startWorld.clone(), end:endWorld.clone(),
    offsets:Array.from({length:count},(_,i)=>i/count),
    count, visible:false,
  };
  pts.visible=false;
  scene.add(pts);
  return pts;
}

function updateWaterFlow(pts, t, pumpOn) {
  if(!pts) return;
  pts.visible=pumpOn;
  if(!pumpOn) return;
  const {start,end,offsets,count}=pts.userData;
  const pos=pts.geometry.attributes.position;
  const dir=new THREE.Vector3().subVectors(end,start);
  for(let i=0;i<count;i++){
    const frac=((offsets[i]+t*0.4)%1);
    pos.setXYZ(i,
      start.x+dir.x*frac,
      start.y+dir.y*frac + Math.sin(t*4+i)*0.5,
      start.z+dir.z*frac
    );
  }
  pos.needsUpdate=true;
}

/* ─────────────────────────────────────────────
   PIPELINE from tank to each zone
───────────────────────────────────────────── */
function buildPipeline(scene, tankWorldPos, zoneWorldPositions) {
  const pipeMat=new THREE.MeshStandardMaterial({color:0x0ea5e9,metalness:0.4,roughness:0.4});
  const pipes=[];
  // main header pipe along Z (from tank to row of zones)
  const rowZ=ZONE_BASE_Z;
  const headerLen=Math.abs(tankWorldPos.z - rowZ)+20;
  const headerPipe=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,headerLen,8),pipeMat);
  headerPipe.rotation.x=Math.PI/2;
  headerPipe.position.set(tankWorldPos.x, 3, (tankWorldPos.z+rowZ)/2);
  scene.add(headerPipe); pipes.push(headerPipe);

  zoneWorldPositions.forEach(zp=>{
    // lateral pipe from header intercept to zone
    const ix={x:tankWorldPos.x, z:zp.z};
    const latLen=Math.abs(zp.x - ix.x)+5;
    const lat=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,latLen,8),pipeMat);
    lat.rotation.z=Math.PI/2;
    lat.position.set((zp.x+ix.x)/2, 3, zp.z);
    scene.add(lat); pipes.push(lat);

    // riser down into zone
    const riser=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,8,8),pipeMat);
    riser.position.set(zp.x,0,zp.z);
    scene.add(riser); pipes.push(riser);

    // elbow sphere
    const elbow=new THREE.Mesh(new THREE.SphereGeometry(0.6,8,8),pipeMat);
    elbow.position.set(zp.x,3,zp.z);
    scene.add(elbow); pipes.push(elbow);
  });
  return pipes;
}

/* ─────────────────────────────────────────────
   TANK (corner)
───────────────────────────────────────────── */
function createTank(scene, interactives) {
  const g=new THREE.Group();
  // platform
  const platMat=new THREE.MeshStandardMaterial({color:0x94a3b8,roughness:0.85});
  const plat=new THREE.Mesh(new THREE.BoxGeometry(26,2,26),platMat);
  plat.position.y=-1; plat.receiveShadow=true; g.add(plat);
  // legs
  const legMat=new THREE.MeshStandardMaterial({color:0x475569,metalness:0.6,roughness:0.4});
  [[-6,-6],[6,-6],[-6,6],[6,6]].forEach(([lx,lz])=>{
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,13,8),legMat);
    leg.position.set(lx,5.5,lz); leg.castShadow=true; g.add(leg);
  });
  // shell
  const shellMat=new THREE.MeshStandardMaterial({color:0xe2e8f0,metalness:0.3,roughness:0.35});
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(9,10,22,32),shellMat);
  shell.position.y=23; shell.castShadow=true;
  shell.userData.partType='central_tank';
  g.add(shell); interactives.push(shell);
  // dome
  const cap=new THREE.Mesh(new THREE.SphereGeometry(9.2,32,16,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshStandardMaterial({color:0x64748b,metalness:0.55}));
  cap.position.y=34; g.add(cap);
  // water
  const waterMat=new THREE.MeshStandardMaterial({color:0x0ea5e9,transparent:true,opacity:0.88,emissive:0x0369a1,emissiveIntensity:0.3});
  const water=new THREE.Mesh(new THREE.CylinderGeometry(8.5,8.5,1,32),waterMat);
  water.position.y=13; g.add(water); g.userData.waterFill=water;
  // bands
  const bandMat=new THREE.MeshStandardMaterial({color:0xcc2200,metalness:0.7});
  [18,24,30].forEach(y=>{
    const band=new THREE.Mesh(new THREE.TorusGeometry(9.5,0.4,8,32),bandMat);
    band.rotation.x=Math.PI/2; band.position.y=y; g.add(band);
  });
  // glow ring
  const glowMat=new THREE.MeshStandardMaterial({color:0x22d3ee,emissive:0x22d3ee,emissiveIntensity:0.8,transparent:true,opacity:0.7});
  const glow=new THREE.Mesh(new THREE.TorusGeometry(11,0.25,8,32),glowMat);
  glow.rotation.x=Math.PI/2; glow.position.y=0.2;
  g.userData.glowRing=glow; g.add(glow);
  // CSS2D label
  const el=document.createElement('div');
  el.style.cssText=`padding:5px 12px;border-radius:999px;font:700 10px/1.3 ui-monospace,monospace;color:#e2e8f0;background:rgba(6,12,20,0.92);border:1.5px solid #cc220088;box-shadow:0 0 16px #cc220044;pointer-events:none;white-space:nowrap;`;
  el.textContent='🛢 WATER TANK';
  const lbl=new CSS2DObject(el); lbl.position.set(0,40,0); lbl.center.set(0.5,1); g.add(lbl);
  scene.add(g);
  return g;
}

/* ─────────────────────────────────────────────
   SOLAR-POWERED WINDMILL
───────────────────────────────────────────── */
function createWindmill(scene) {
  const g=new THREE.Group();
  const metalMat=new THREE.MeshStandardMaterial({color:0xcc2200,metalness:0.7,roughness:0.3});
  const darkMat=new THREE.MeshStandardMaterial({color:0x1e293b,metalness:0.5});

  // tower (tapered)
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.2,2.2,36,8),
    new THREE.MeshStandardMaterial({color:0xb0b8c1,metalness:0.4,roughness:0.6}));
  tower.position.y=18; tower.castShadow=true; g.add(tower);

  // nacelle (housing)
  const nacelle=new THREE.Mesh(new THREE.BoxGeometry(5,3.5,8),
    new THREE.MeshStandardMaterial({color:0xdde3ea,metalness:0.3}));
  nacelle.position.y=37; g.add(nacelle);

  // ROTOR HUB
  const hub=new THREE.Mesh(new THREE.SphereGeometry(1.8,16,16),metalMat);
  hub.position.set(0,37,5); g.add(hub);

  // BLADES (3 blades as a rotating group)
  const rotorGroup=new THREE.Group();
  rotorGroup.position.set(0,37,5);
  for(let i=0;i<3;i++){
    const bladeShape=new THREE.Shape();
    bladeShape.moveTo(0,0); bladeShape.lineTo(0.8,1.5);
    bladeShape.lineTo(0.4,16); bladeShape.lineTo(-0.4,16);
    bladeShape.lineTo(-0.5,1.5); bladeShape.closePath();
    const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{depth:0.25,bevelEnabled:false});
    const blade=new THREE.Mesh(bladeGeo,
      new THREE.MeshStandardMaterial({color:0xf1f5f9,metalness:0.2,roughness:0.4}));
    blade.rotation.z=(i*Math.PI*2)/3;
    blade.position.set(0,0,0.2);
    rotorGroup.add(blade);
  }
  g.add(rotorGroup);
  g.userData.rotorGroup=rotorGroup; // for animation

  // SOLAR PANEL beside the tower
  const panelGroup=new THREE.Group();
  panelGroup.position.set(-14,22,0);
  // panel frame
  const frame=new THREE.Mesh(new THREE.BoxGeometry(14,0.5,10),
    new THREE.MeshStandardMaterial({color:0xcc2200,metalness:0.7}));
  panelGroup.add(frame);
  // panel cells (4x3 grid)
  for(let row=0;row<3;row++){
    for(let col=0;col<4;col++){
      const cell=new THREE.Mesh(new THREE.BoxGeometry(3,0.3,3),
        new THREE.MeshStandardMaterial({color:0x1e40af,metalness:0.8,roughness:0.1,
          emissive:0x1d4ed8,emissiveIntensity:0.15}));
      cell.position.set(-4.5+col*3, 0.4, -3+row*3);
      panelGroup.add(cell);
    }
  }
  // support pole
  const spole=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,22,8),
    new THREE.MeshStandardMaterial({color:0x94a3b8}));
  spole.position.set(0,-11,0); panelGroup.add(spole);
  panelGroup.rotation.x=-Math.PI/6; // tilt toward sun
  g.add(panelGroup);
  g.userData.panelGroup=panelGroup;

  // lightning bolt energy cable
  const cableMat=new THREE.MeshStandardMaterial({color:0xfacc15,metalness:0.3});
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,14,4),cableMat);
  cable.position.set(-7,29.5,0); cable.rotation.z=0.3; g.add(cable);

  // CSS2D label
  const el=document.createElement('div');
  el.style.cssText=`padding:5px 12px;border-radius:999px;font:700 10px/1.3 ui-monospace,monospace;color:#fde68a;background:rgba(6,12,20,0.92);border:1.5px solid #fbbf2488;pointer-events:none;white-space:nowrap;`;
  el.textContent='☀️ SOLAR WINDMILL';
  const lbl=new CSS2DObject(el); lbl.position.set(0,48,0); lbl.center.set(0.5,1); g.add(lbl);

  scene.add(g);
  return g;
}

/* ─────────────────────────────────────────────
   GROUND + PATHS
───────────────────────────────────────────── */
function createGround(scene) {
  const grassMat=new THREE.MeshStandardMaterial({map:getGrassTex(),roughness:0.95,color:0x15803d});
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(1200,600,32,32),grassMat);
  gnd.rotation.x=-Math.PI/2; gnd.position.y=-6; gnd.receiveShadow=true; scene.add(gnd);
  const border=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),
    new THREE.MeshStandardMaterial({color:0x052e16,roughness:1}));
  border.rotation.x=-Math.PI/2; border.position.y=-16; scene.add(border);
}

function createPaths(scene, zonePositions) {
  const pathMat=new THREE.MeshStandardMaterial({color:0x78716c,roughness:0.95});
  // main road parallel to zone row
  const totalW = zonePositions.length>0
    ? Math.abs(zonePositions[zonePositions.length-1].x - zonePositions[0].x)+80
    : 200;
  const midX = zonePositions.length>0
    ? (zonePositions[0].x + zonePositions[zonePositions.length-1].x)/2
    : 0;
  const road=new THREE.Mesh(new THREE.BoxGeometry(totalW,0.5,12),pathMat);
  road.position.set(midX,-5.5,ZONE_BASE_Z+50); road.receiveShadow=true; scene.add(road);
  // perpendicular access paths to each zone
  zonePositions.forEach(zp=>{
    const accessLen=60;
    const acc=new THREE.Mesh(new THREE.BoxGeometry(10,0.5,accessLen),pathMat);
    acc.position.set(zp.x,-5.5,zp.z-accessLen/2+15); acc.receiveShadow=true; scene.add(acc);
  });
}

/* ─────────────────────────────────────────────
   AMBIENT PARTICLES
───────────────────────────────────────────── */
function createParticles(scene) {
  const count=250;
  const pos=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-0.5)*600;
    pos[i*3+1]=Math.random()*60+5;
    pos[i*3+2]=(Math.random()-0.5)*300;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({
    color:0x38bdf8,size:0.5,transparent:true,opacity:0.35,depthWrite:false,
  }));
  scene.add(pts); return pts;
}

/* ─────────────────────────────────────────────
   SUN & CLOUDS
───────────────────────────────────────────── */
function createSkyAndClouds(scene) {
  const g = new THREE.Group();
  
  // Sun
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffde7 });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(15, 32, 32), sunMat);
  sun.position.set(150, 200, -200);
  
  // Sun Glow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 32), glowMat);
  sun.add(sunGlow);
  g.add(sun);

  // Clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
  const clouds = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const cloud = new THREE.Group();
    // 3-4 puffs per cloud
    const puffs = 3 + Math.floor(Math.random() * 2);
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(15 + Math.random() * 10, 12, 12), cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20
      );
      cloud.add(puff);
    }
    // Scatter in sky
    cloud.position.set(
      (Math.random() - 0.5) * 800,
      120 + Math.random() * 60,
      -150 - Math.random() * 200
    );
    // flattened shape
    cloud.scale.set(1.5, 0.6, 1);
    cloud.userData.speed = 0.05 + Math.random() * 0.08;
    clouds.add(cloud);
  }
  g.add(clouds);
  scene.add(g);
  return clouds;
}

/* ─────────────────────────────────────────────
   RAIN SYSTEM
───────────────────────────────────────────── */
function createRainSystem(scene) {
  const count = 1500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 800; // x
    positions[i * 3 + 1] = Math.random() * 400; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 500; // z
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0x94a3b8,
    size: 0.8,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  
  const rain = new THREE.Points(geometry, material);
  rain.visible = false;
  scene.add(rain);
  return rain;
}

/* ─────────────────────────────────────────────
   RESOLVE HIT
───────────────────────────────────────────── */
function resolvePartFromHit(obj) {
  let n=obj;
  while(n){ if(n.userData?.partType) return {partType:n.userData.partType,zoneIdx:n.userData.zoneIdx,zoneId:n.userData.zoneId}; n=n.parent; }
  return null;
}
const PART_PRIORITY={soil_sensor:0,dht11:1,central_tank:2,pump:3,valve:4,crop_bed:5};

function tagMesh(m,pt,zi,zid){ m.userData.partType=pt; m.userData.zoneIdx=zi; m.userData.zoneId=zid; return m; }

function tagInteractiveTree(root, partType, zoneIdx, zoneId, interactives) {
  root.traverse((node) => {
    if (!node.isMesh || node.userData?.partType) return;
    tagMesh(node, partType, zoneIdx, zoneId);
    interactives.push(node);
  });
}

/* ─────────────────────────────────────────────
   TELEMETRY
───────────────────────────────────────────── */
function zoneToTelemetry(zone) {
  if(!zone) return {};
  const crop=getCropMeta?.(zone.cropType) ?? {};
  return {
    zone_id:zone.id, moisture_pct:zone.moisture,
    pump_status:zone.pumpOn?'on':'off',
    fertigation_status:zone.fertigationOn?'active':'idle',
    irrigating:zone.pumpOn, fertigating:zone.fertigationOn,
    N:zone.nitrogen, P:zone.phosphorus, K:zone.potassium,
    ml_crop_data:{prediction:crop.name?.en||zone.cropType, rationale:crop.subtitle?.en||'Compatible with field conditions.'},
    ml_fertility:{label:zone.moisture<30?'Dry':zone.moisture>75?'Saturated':'Fertile'},
  };
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function FarmDiorama({ language='en', onPumpStart, onPumpStop, isRaining=false }) {
  const containerRef=useRef(null);
  const loadingRef=useRef(null);
  const rendererRef=useRef(null);
  const frameRef=useRef(null);

  const zones=useZoneStore(s=>s.zones);
  const mode=useModeStore(s=>s.mode);
  const setMode=useModeStore(s=>s.setMode);

  const [selectedZoneId,setSelectedZoneId]=useState(null);
  const [selectedPart,setSelectedPart]=useState(null);
  const [hudScreenPos,setHudScreenPos]=useState(null);
  const [panelOpen,setPanelOpen]=useState(false);
  const [loadPct,setLoadPct]=useState(0);
  const [webglFailed,setWebglFailed]=useState(false);

  const sceneRef=useRef({
    zoneModels:[],allInteractives:[],zoneStates:{},
    selectedIdx:-1,isNavigating:false,
    hoveredMesh:null,selectedMesh:null,
    labelRenderer:null,cleanup:null,
    tank:null,windmill:null,particles:null,
    waterFlowPts:[],
  });

  const zoneList=Object.values(zones);
  const zoneKey=zoneList
    .map((zone)=>`${zone.id}:${zone.name}:${zone.cropType}:${zone.zoneType}`)
    .sort()
    .join('|');
  const selectedZone=selectedZoneId ? zones[selectedZoneId] || null : null;

  const panelTelemetry=useMemo(()=>{
    if(!selectedZone) return {};
    const live=zones[selectedZone.id]||selectedZone;
    const cached=sceneRef.current.zoneStates[selectedZone.id];
    return {...zoneToTelemetry(live),...cached,moisture_pct:live.moisture??cached?.moisture_pct};
  },[selectedZone,zones,panelOpen]);

  const hidePanel=useCallback(()=>{
    setPanelOpen(false); setSelectedZoneId(null); setSelectedPart(null); setHudScreenPos(null);
    sceneRef.current.selectedIdx=-1; sceneRef.current.selectedMesh=null;
  },[]);

  const clearPartHud=useCallback(()=>{
    setSelectedPart(null); setHudScreenPos(null); sceneRef.current.selectedMesh=null;
  },[]);

  const openPanelForZone=useCallback((zoneId,idx)=>{
    setSelectedPart(null);
    setHudScreenPos(null);
    setSelectedZoneId(zoneId); sceneRef.current.selectedIdx=idx; setPanelOpen(true);
  },[]);

  const applyHardwareDetail=useCallback((detail)=>{
    const zm=sceneRef.current.zoneModels.find(m=>m.zone.id===detail.zone_id);
    if(!zm) return;
    const idx=sceneRef.current.zoneModels.indexOf(zm);
    sceneRef.current.zoneStates[zm.zone.id]={...sceneRef.current.zoneStates[zm.zone.id],...detail};
    if(sceneRef.current.selectedIdx===idx&&detail.zone_id===selectedZoneId) setPanelOpen(true);
  },[selectedZoneId]);

  useEffect(()=>{
    const onHw=e=>applyHardwareDetail(e.detail);
    document.addEventListener('hardware-update',onHw);
    return()=>document.removeEventListener('hardware-update',onHw);
  },[applyHardwareDetail]);

  useEffect(()=>{
    zoneList.forEach(z=>{
      const d=zoneToTelemetry(z);
      sceneRef.current.zoneStates[z.id]={...sceneRef.current.zoneStates[z.id],...d};
      document.dispatchEvent(new CustomEvent('hardware-update',{detail:d}));
    });
  },[zones,zoneKey]);

  /* ─── THREE.JS SETUP ─── */
  useEffect(()=>{
    const container=containerRef.current;
    if(!container||rendererRef.current||zoneList.length===0) return;
    const isMobile=/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.innerWidth<768;
    let renderer;
    try{
      // Use powerPreference high-performance and a balanced pixel ratio for mobile (1.5) to avoid 240p look without lagging
      renderer=new THREE.WebGLRenderer({antialias:!isMobile,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled=!isMobile;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.5;
      renderer.setClearColor(0x87ceeb); // Sky blue
    } catch(e){ setWebglFailed(true); return; }

    const w=container.clientWidth||320, h=container.clientHeight||480;
    renderer.setSize(w,h);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText='width:100%;height:100%;display:block;';
    rendererRef.current=renderer;

    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x87ceeb, 0.0005);
    sceneRef.current.scene = scene;

    const camera=new THREE.PerspectiveCamera(38,w/h,0.1,10000);
    // position to see horizontal zone layout nicely
    camera.position.set(0,180,280);

    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true; controls.dampingFactor=0.06;
    controls.maxPolarAngle=Math.PI/2.05;
    controls.minDistance=60; controls.maxDistance=800;
    controls.target.set(0,2,0);
    const onNavStart=()=>{sceneRef.current.isNavigating=true;};
    const onNavEnd=()=>{sceneRef.current.isNavigating=false;};
    controls.addEventListener('start',onNavStart);
    controls.addEventListener('end',onNavEnd);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xfff5e0,1.1));
    const sun=new THREE.DirectionalLight(0xfff8dc,2.8);
    sun.position.set(80,180,60); sun.castShadow=true;
    sun.shadow.mapSize.width=sun.shadow.mapSize.height=2048;
    sun.shadow.camera.left=-400; sun.shadow.camera.right=400;
    sun.shadow.camera.top=400; sun.shadow.camera.bottom=-400;
    sun.shadow.camera.far=1000;
    scene.add(sun);
    const skyLight = new THREE.DirectionalLight(0xffffff, 0.5);
    skyLight.position.set(-60, 40, -60);
    scene.add(skyLight);

    const cropGlow = new THREE.PointLight(0x22c55e, 0.4, 400);
    cropGlow.position.set(0, 5, 0);
    scene.add(cropGlow);

    /* Sky and Clouds */
    sceneRef.current.clouds = createSkyAndClouds(scene);
    
    /* Rain */
    sceneRef.current.rain = createRainSystem(scene);

    /* Ground */
    createGround(scene);

    /* Label renderer */
    const labelRenderer=new CSS2DRenderer();
    labelRenderer.setSize(w,h);
    labelRenderer.domElement.style.cssText='position:absolute;inset:0;pointer-events:none;';
    container.appendChild(labelRenderer.domElement);
    sceneRef.current.labelRenderer=labelRenderer;

    /* Raycaster */
    const raycaster=new THREE.Raycaster();
    const pointer=new THREE.Vector2();
    const projectToScreen=(obj)=>{
      const v=new THREE.Vector3(); obj.getWorldPosition(v); v.project(camera);
      const rect=renderer.domElement.getBoundingClientRect();
      return{x:rect.left+((v.x+1)/2)*rect.width, y:rect.top+((-v.y+1)/2)*rect.height};
    };

    const setHighlight=(mesh,on)=>{
      if(!mesh?.material) return;
      const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      mats.forEach(mat=>{
        if(!mat.emissive) return;
        if(!mat.userData.twinBase){ mat.userData.twinBase=mat.emissive.clone(); mat.userData.twinBaseI=mat.emissiveIntensity??0; }
        if(on){mat.emissive.set(0x22d3ee);mat.emissiveIntensity=0.55;}
        else{mat.emissive.copy(mat.userData.twinBase);mat.emissiveIntensity=mat.userData.twinBaseI;}
      });
    };

    /* ── COMPUTE ZONE WORLD POSITIONS (horizontal row) ── */
    const totalWidth=(zoneList.length-1)*ZONE_SPACING;
    const startX=-totalWidth/2;
    const zoneWorldPos=zoneList.map((_,i)=>new THREE.Vector3(startX+i*ZONE_SPACING,0,ZONE_BASE_Z));

    /* ── PATHS ── */
    createPaths(scene, zoneWorldPos.map(v=>({x:v.x,z:v.z})));

    /* ── INFRASTRUCTURE: TANK + WINDMILL at top-right corner ── */
    // Place them relative to rightmost zone
    const rightMostX = zoneWorldPos.length>0 ? zoneWorldPos[zoneWorldPos.length-1].x+80 : 120;
    const infraZ=-130;

    const tank=createTank(scene, sceneRef.current.allInteractives);
    tank.position.set(rightMostX, 0, infraZ);
    sceneRef.current.tank=tank;

    const windmill=createWindmill(scene);
    windmill.position.set(rightMostX-50, 0, infraZ);
    sceneRef.current.windmill=windmill;

    /* ── PIPELINE ── */
    buildPipeline(scene,
      new THREE.Vector3(rightMostX,0,infraZ),
      zoneWorldPos.map(v=>({x:v.x,z:v.z}))
    );

    /* ── WATER FLOW PARTICLES per zone ── */
    const tankWorldVec=new THREE.Vector3(rightMostX,4,infraZ);
    sceneRef.current.waterFlowPts=zoneWorldPos.map(zp=>{
      return createWaterFlowParticles(scene, tankWorldVec, new THREE.Vector3(zp.x,4,zp.z));
    });

    /* ── BUILD ZONES ── */
    sceneRef.current.zoneModels=[];
    sceneRef.current.allInteractives=[];
    // re-push tank shell
    tank.traverse(n=>{ if(n.userData?.partType) sceneRef.current.allInteractives.push(n); });

    zoneList.forEach((z,i)=>{
      const group=new THREE.Group();
      const wp=zoneWorldPos[i];
      group.position.copy(wp);
      const zColor=getZoneColor(i);

      // Raised brick bed
      const brickBed = createBrickBed();
      tagInteractiveTree(brickBed, 'crop_bed', i, z.id, sceneRef.current.allInteractives);
      group.add(brickBed);

      // Soil
      const soilMesh=new THREE.Mesh(
        new THREE.PlaneGeometry(50,50),
        new THREE.MeshStandardMaterial({map:getSoilTex(zColor),roughness:0.98})
      );
      soilMesh.rotation.x=-Math.PI/2; soilMesh.position.y=-3; soilMesh.receiveShadow=true;
      tagMesh(soilMesh,'crop_bed',i,z.id);
      group.add(soilMesh); sceneRef.current.allInteractives.push(soilMesh);

      // Animated crops
      const cropType=z.cropType||['wheat','tomato','sugarcane','onion','potato'][i%5];
      const crops=createAnimatedCrops(cropType);
      tagInteractiveTree(crops, 'crop_bed', i, z.id, sceneRef.current.allInteractives);
      group.add(crops);

      // Polyhouse on zone 0
      if(i===0){
        createPolyhouse(group);
        tagInteractiveTree(group, 'crop_bed', i, z.id, sceneRef.current.allInteractives);
      }

      // Soil moisture sensor
      const sensor=createSoilSensor(i,z.id,sceneRef.current.allInteractives);
      group.add(sensor);

      // DHT11 air temperature / humidity sensor
      const dht11=createDht11Sensor(i,z.id,sceneRef.current.allInteractives);
      group.add(dht11);

      // Pump
      const pump=createPump(i,z.id,sceneRef.current.allInteractives);
      group.add(pump);

      // Sprinklers (2 per zone)
      const sp1=createSprinkler(-10,-10); group.add(sp1);
      const sp2=createSprinkler(10, 10);  group.add(sp2);

      // Drip line
      const drip=createDripLine(zColor);
      drip.position.set(0,-2,5);
      group.add(drip);

      // Corner trees
      const treeMat=new THREE.MeshStandardMaterial({color:i%2===0?0x166534:0x14532d,roughness:0.85});
      const trunkMat=new THREE.MeshStandardMaterial({color:0x713f12,roughness:0.9});
      [[26,26],[-26,26]].forEach(([tx,tz])=>{
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.7,1,8,8),trunkMat);
        trunk.position.set(tx,1,tz); group.add(trunk);
        const foliage=new THREE.Mesh(new THREE.SphereGeometry(5,12,10),treeMat);
        foliage.position.set(tx,11,tz); group.add(foliage);
      });

      // Zone CSS2D label
      const labelEl=document.createElement('div');
      labelEl.style.cssText=`padding:4px 10px;border-radius:999px;font:700 10px/1.3 ui-monospace,monospace;color:#e2e8f0;background:rgba(6,12,20,0.9);border:1.5px solid ${zColor}88;box-shadow:0 0 12px ${zColor}44;pointer-events:none;white-space:nowrap;`;
      labelEl.textContent=`Z${i+1} · ${(z.cropType||cropType).toUpperCase()}`;
      const lbl2d=new CSS2DObject(labelEl);
      lbl2d.position.set(0,40,0); lbl2d.center.set(0.5,1); group.add(lbl2d);

      // Status sprites
      const makeSprite=(emoji)=>{
        const cv=document.createElement('canvas'); cv.width=128; cv.height=128;
        const cx=cv.getContext('2d'); cx.font='80px sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(emoji,64,64);
        const tex=new THREE.CanvasTexture(cv); tex.generateMipmaps=false; tex.minFilter=THREE.LinearFilter;
        const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}));
        sp.scale.set(8,8,1); sp.renderOrder=900; sp.frustumCulled=false; return sp;
      };
      const droplet=makeSprite('💧'); droplet.position.set(-10,44,0); droplet.visible=false; group.add(droplet);
      const vial=makeSprite('🧪');   vial.position.set(10,44,0);  vial.visible=false;   group.add(vial);

      sceneRef.current.zoneStates[z.id]={...zoneToTelemetry(z),irrigating:false,fertigating:false};
      sceneRef.current.zoneModels.push({group,zone:z,crops,sensor,dht11,pump,droplet,vial,soil:soilMesh,sprinklers:[sp1,sp2],drip});
      scene.add(group);
    });

    /* ── Ambient particles ── */
    sceneRef.current.particles=createParticles(scene);

    setLoadPct(100);
    if(loadingRef.current) loadingRef.current.style.display='none';

    /* ── Resize ── */
    const onResize=()=>{
      if(!container) return;
      const cw=container.clientWidth||320, ch=container.clientHeight||480;
      camera.aspect=cw/ch; camera.updateProjectionMatrix();
      renderer.setSize(cw,ch); labelRenderer.setSize(cw,ch);
    };
    onResize();
    window.addEventListener('resize',onResize);
    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(onResize):null;
    ro?.observe(container);

    /* ── Interaction ── */
    const pickFromEvent=(e)=>{
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer,camera);
      return raycaster.intersectObjects(sceneRef.current.allInteractives,true);
    };

    const onClick=(e)=>{
      const hits=pickFromEvent(e);
      if(hits.length===0){ clearPartHud(); if(useModeStore.getState().mode==='act') hidePanel(); return; }
      hits.sort((a,b)=>(PART_PRIORITY[a.object.userData.partType]??99)-(PART_PRIORITY[b.object.userData.partType]??99));
      const part=resolvePartFromHit(hits[0].object);
      if(!part) return;
      if(sceneRef.current.selectedMesh) setHighlight(sceneRef.current.selectedMesh,false);
      sceneRef.current.selectedMesh=hits[0].object;
      setHighlight(sceneRef.current.selectedMesh,true);
      if(part.partType==='crop_bed'&&part.zoneId){
        clearPartHud(); openPanelForZone(part.zoneId,part.zoneIdx); return;
      }
      setPanelOpen(false);
      setSelectedPart({partType:part.partType,zoneId:part.zoneId,zoneIdx:part.zoneIdx});
      setHudScreenPos(projectToScreen(hits[0].object));
    };

    const onPointerMove=(e)=>{
      const hits=pickFromEvent(e);
      if(sceneRef.current.hoveredMesh){setHighlight(sceneRef.current.hoveredMesh,false);sceneRef.current.hoveredMesh=null;}
      if(hits.length>0){
        const part=resolvePartFromHit(hits[0].object);
        if(part?.partType&&hits[0].object!==sceneRef.current.selectedMesh){
          sceneRef.current.hoveredMesh=hits[0].object;
          setHighlight(sceneRef.current.hoveredMesh,true);
          renderer.domElement.style.cursor='pointer'; return;
        }
      }
      renderer.domElement.style.cursor='grab';
    };

    renderer.domElement.addEventListener('click',onClick);
    renderer.domElement.addEventListener('pointermove',onPointerMove);

    /* ── ANIMATION LOOP ── */
    const clock=new THREE.Clock();

    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);
      const t=clock.getElapsedTime();
      controls.update();

      const liveZones=useZoneStore.getState().zones;

      /* Windmill rotor spin */
      if(sceneRef.current.windmill?.userData?.rotorGroup){
        sceneRef.current.windmill.userData.rotorGroup.rotation.z=t*1.8;
      }
      /* Solar panel slight shimmer */
      if(sceneRef.current.windmill?.userData?.panelGroup){
        sceneRef.current.windmill.userData.panelGroup.traverse(n=>{
          if(n.isMesh&&n.material?.emissive&&n.material.color?.r<0.1){
            n.material.emissiveIntensity=0.1+Math.sin(t*0.5)*0.08;
          }
        });
      }

      /* Tank glow ring + water level */
      if(sceneRef.current.tank?.userData?.glowRing){
        const gr=sceneRef.current.tank.userData.glowRing;
        gr.material.emissiveIntensity=0.5+Math.sin(t*2)*0.3;
        gr.rotation.y=t*0.3;
      }
      if(sceneRef.current.tank?.userData?.waterFill){
        const wf=sceneRef.current.tank.userData.waterFill;
        const avgM=zoneList.reduce((s,z)=>s+(z.moisture||50),0)/Math.max(zoneList.length,1);
        const targetY=Math.max(0.5,avgM/100*20);
        wf.scale.y+=(targetY-wf.scale.y)*0.02;
        wf.position.y=13+wf.scale.y*0.5;
      }

      /* Smoothly transition sky and fog color based on weather */
      if (sceneRef.current.scene && rendererRef.current) {
        const targetColor = new THREE.Color(isRaining ? 0x334155 : 0x87ceeb);
        sceneRef.current.scene.fog.color.lerp(targetColor, 0.05);
        rendererRef.current.setClearColor(sceneRef.current.scene.fog.color);
      }

      /* Ambient particles float */
      if(sceneRef.current.particles){
        const pos=sceneRef.current.particles.geometry.attributes.position;
        for(let i=0;i<pos.count;i++){
          pos.setY(i,pos.getY(i)+0.012);
          if(pos.getY(i)>70) pos.setY(i,5);
        }
        pos.needsUpdate=true;
      }

      /* Clouds floating */
      if(sceneRef.current.clouds) {
        sceneRef.current.clouds.children.forEach(cloud => {
          cloud.position.x += cloud.userData.speed * (isRaining ? 3 : 1); // faster clouds in rain
          if (cloud.position.x > 800) cloud.position.x = -800;
        });
      }

      /* Rain Simulation */
      if(sceneRef.current.rain) {
        sceneRef.current.rain.visible = isRaining;
        if(isRaining) {
          const pos = sceneRef.current.rain.geometry.attributes.position;
          for(let i=0;i<pos.count;i++) {
            pos.setY(i, pos.getY(i) - 6);
            pos.setX(i, pos.getX(i) - 2); // wind
            if (pos.getY(i) < 0) {
              pos.setY(i, 400);
              pos.setX(i, (Math.random() - 0.5) * 800);
            }
          }
          pos.needsUpdate = true;
        }
      }

      /* Zone animations */
      sceneRef.current.zoneModels.forEach((zm,i)=>{
        const z=liveZones[zm.zone.id]||zm.zone;
        const st={...sceneRef.current.zoneStates[zm.zone.id],...zoneToTelemetry(z)};
        sceneRef.current.zoneStates[zm.zone.id]=st;

        const moisture=st.moisture_pct??0;
        const pumpOn=st.pump_status==='on';
        const isSelected=i===sceneRef.current.selectedIdx;
        const emissiveColor=new THREE.Color(moisture>75?0x3b82f6:moisture>40?0x10b981:0xf59e0b);

        /* Crop wind sway */
        if(zm.crops?.userData?.plants){
          zm.crops.userData.plants.forEach(plant=>{
            const phase=plant.userData.windPhase||0;
            const spd=plant.userData.windSpeed||1;
            const sway=Math.sin(t*spd+phase)*0.035;
            plant.rotation.x=sway;
            plant.rotation.z=Math.cos(t*spd*0.7+phase)*0.025;
          });
        }

        /* Crop emissive */
        zm.crops?.traverse(n=>{
          if(n.isMesh&&n.material){
            const mats=Array.isArray(n.material)?n.material:[n.material];
            mats.forEach(mat=>{
              mat.emissive=emissiveColor;
              mat.emissiveIntensity=pumpOn||isSelected?0.08+Math.sin(t*4)*0.04:0.015;
            });
          }
        });

        /* Sensor LED pulse */
        if(zm.sensor?.userData?.led){
          zm.sensor.userData.led.material.emissiveIntensity=0.8+Math.sin(t*3)*0.4;
        }
        if(zm.sensor?.userData?.ring){
          zm.sensor.userData.ring.material.opacity=0.4+Math.sin(t*2+i)*0.3;
        }

        /* Pump LED */
        if(zm.pump?.userData?.pumpLed){
          const pl=zm.pump.userData.pumpLed;
          pl.material.color.set(pumpOn?0x22c55e:0xef4444);
          pl.material.emissive.set(pumpOn?0x22c55e:0xef4444);
          pl.material.emissiveIntensity=pumpOn?0.8+Math.sin(t*6)*0.4:0.2;
        }

        /* Water flow particles */
        const wfp=sceneRef.current.waterFlowPts[i];
        updateWaterFlow(wfp,t,pumpOn);

        /* Sprinkler spray (visible when pump on) */
        zm.sprinklers?.forEach((sp,si)=>{
          if(pumpOn){
            sp.traverse(n=>{
              if(n.isMesh&&n.material?.color?.r<0.5){
                n.material.emissiveIntensity=0.5+Math.sin(t*5+si)*0.3;
              }
            });
          }
        });

        /* Status sprites */
        const nav=sceneRef.current.isNavigating;
        zm.droplet.visible=!nav&&pumpOn;
        zm.vial.visible=!nav&&(st.fertigation_status==='active');
        if(zm.droplet.visible) zm.droplet.position.y=44+Math.sin(t*4)*1.5;
        if(zm.vial.visible)    zm.vial.position.y=44+Math.cos(t*4)*1.5;
      });

      renderer.render(scene,camera);
      labelRenderer.render(scene,camera);
    };
    animate();

    sceneRef.current.cleanup=()=>{
      controls.removeEventListener('start',onNavStart);
      controls.removeEventListener('end',onNavEnd);
      ro?.disconnect();
      window.removeEventListener('resize',onResize);
      renderer.domElement.removeEventListener('click',onClick);
      renderer.domElement.removeEventListener('pointermove',onPointerMove);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if(container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if(labelRenderer.domElement.parentNode) labelRenderer.domElement.remove();
    };

    return()=>{
      if(sceneRef.current.cleanup) sceneRef.current.cleanup();
      rendererRef.current=null;
      sceneRef.current.zoneModels=[];
      sceneRef.current.allInteractives=[];
      sceneRef.current.waterFlowPts=[];
    };
  },[zoneKey,hidePanel,language,openPanelForZone]);

  if(webglFailed){
    return(
      <div className="flex h-full flex-col items-center justify-center bg-[#0a0f12] p-8 text-center text-white">
        <p className="text-xl font-black uppercase tracking-wide">3D Engine Unavailable</p>
        <p className="mt-3 max-w-sm text-sm text-slate-400">Enable WebGL or use a device with GPU support to view the Digital Twin.</p>
      </div>
    );
  }

  return(
    <div className="relative h-full w-full overflow-hidden bg-[#0a0f12]">
      <style>{`
        @keyframes twin-spin{to{transform:rotate(360deg)}}
        @keyframes twin-pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes flow-dash{to{stroke-dashoffset:-20}}
      `}</style>

      <div ref={containerRef} className="absolute inset-0"/>

      {/* Loading overlay */}
      <div ref={loadingRef} className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[#0a0f12]">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-500" style={{animation:'twin-spin 1s linear infinite'}}/>
          <div className="absolute inset-4 rounded-full border-2 border-red-500/20 border-b-red-500" style={{animation:'twin-spin 1.5s linear infinite reverse'}}/>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-emerald-500" style={{animation:'twin-pulse 2s ease-in-out infinite'}}>
            Initializing Digital Twin… {loadPct}%
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-red-500/60">
            KrishiSarth Farm Diorama v17 Enhanced
          </p>
        </div>
      </div>

      {/* UI Overlay */}
      <div className="pointer-events-none absolute inset-0 z-50">
        {/* Mode controls */}
        <div className="pointer-events-auto absolute left-3 top-3 sm:left-4 sm:top-4">
          <div className="flex w-fit flex-col gap-2 rounded-2xl border border-white/5 bg-[rgba(10,15,20,0.85)] p-2 backdrop-blur-xl">
            <button type="button" title="View Mode"
              onClick={()=>{setMode('view');hidePanel();}}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border ${mode==='view'?'border-emerald-500/20 bg-emerald-500/10 text-emerald-400':'border-transparent text-slate-500'}`}>
              <Eye size={20}/>
            </button>
            <button type="button" title="Act Mode"
              onClick={()=>setMode('act')}
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${mode==='act'?'bg-red-500/10 text-red-400 border border-red-500/20':'text-slate-500 border border-transparent'}`}>
              <Shield size={20}/>
            </button>
          </div>
          <p className="mt-2 rounded-xl border border-white/5 bg-[rgba(10,15,20,0.92)] px-3 py-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400">
            {mode==='view'?'VIEW MODE':localize({hi:'ACT — सेंसर/पंप टैप करें',mr:'ACT — सेन्सर/पंप टॅप करा',en:'ACT — Tap sensor or pump'},language)}
          </p>
        </div>

        {/* Deterministic zone selector */}
        <div className="pointer-events-auto absolute left-3 right-3 flex gap-2 overflow-x-auto pb-1 sm:left-24 sm:right-24 sm:justify-center" style={{ top: '100px' }}>
          {zoneList.map((zone, index) => {
            const crop = getCropMeta(zone.cropType);
            const active = selectedZoneId === zone.id && panelOpen;

            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => openPanelForZone(zone.id, index)}
                className={`shrink-0 rounded-2xl border px-3 py-2 text-left backdrop-blur-xl transition ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/20 text-white'
                    : 'border-white/10 bg-[rgba(10,15,20,0.82)] text-slate-300 hover:border-emerald-400/50 hover:text-white'
                }`}
              >
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  {zone.name || zone.id}
                </p>
                <p className="mt-0.5 text-xs font-black">{localize(crop.name, language)}</p>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pointer-events-none absolute right-3 flex flex-col gap-1.5 rounded-xl border border-white/5 bg-[rgba(10,15,20,0.85)] p-3 backdrop-blur-xl text-[9px] font-mono text-slate-400" style={{ top: '70px' }}>
          <div className="flex items-center gap-2"><Wind size={10} className="text-yellow-400"/><span>Solar Windmill</span></div>
          <div className="flex items-center gap-2"><Droplets size={10} className="text-blue-400"/><span>Water Pipeline</span></div>
          <div className="flex items-center gap-2"><Zap size={10} className="text-orange-400"/><span>Pump Active</span></div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"/>
            <span>Z1 = Polyhouse</span>
          </div>
        </div>

        <TwinObjectHud
          open={Boolean(selectedPart)}
          part={selectedPart}
          language={language}
          screenPos={hudScreenPos}
          onClose={clearPartHud}
          onOpenZonePanel={()=>{if(!selectedPart)return;clearPartHud();openPanelForZone(selectedPart.zoneId,selectedPart.zoneIdx);}}
        />

        <TwinSidePanel
          open={panelOpen&&!selectedPart}
          zone={selectedZone}
          telemetry={panelTelemetry}
          mode={mode}
          language={language}
          onClose={hidePanel}
          onIrrigate={()=>{if(selectedZone&&onPumpStart)onPumpStart(selectedZone.id);}}
          onStop={()=>{if(selectedZone&&onPumpStop)onPumpStop(selectedZone.id);}}
        />
      </div>
    </div>
  );
}
