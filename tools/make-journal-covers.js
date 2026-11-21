/**
 * Generates the Field Notes technical cover plates and the FOC loop diagram.
 * Run from the project root: node tools/make-journal-covers.js
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'images', 'field-notes');
fs.mkdirSync(outDir, { recursive: true });

const serif = "Georgia, 'Times New Roman', serif";
const mono = "'JetBrains Mono', Consolas, 'Courier New', monospace";

function plate(config) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <title>${config.project} — ${config.category} field note cover</title>
  <rect width="1600" height="900" fill="#EDEAE4"/>
  <rect x="32" y="32" width="1536" height="836" fill="none" stroke="#D8DAD4" stroke-width="1"/>
  <text x="80" y="94" fill="#315C9B" font-family="${mono}" font-size="17" letter-spacing="4">FIELD NOTES / ${config.number}</text>
  <text x="1520" y="94" text-anchor="end" fill="#646B67" font-family="${mono}" font-size="15" letter-spacing="3">${config.category}</text>
  <text x="80" y="270" fill="#202522" font-family="${serif}" font-size="112" letter-spacing="-4">${config.title1}</text>
  <text x="80" y="368" fill="#202522" font-family="${serif}" font-size="90" font-style="italic" letter-spacing="-3">${config.title2}</text>
  <text x="80" y="432" fill="#315C9B" font-family="${mono}" font-size="18" letter-spacing="3">${config.project}</text>
  <line x1="80" y1="466" x2="196" y2="466" stroke="#315C9B" stroke-width="3"/>
  ${config.specs.map((spec, i) => `<text x="80" y="${522 + i * 34}" fill="#58605C" font-family="${mono}" font-size="19" letter-spacing="1">${spec}</text>`).join('\n  ')}
  <line x1="980" y1="150" x2="980" y2="750" stroke="#D8DAD4" stroke-width="1"/>
  <g transform="translate(1060 180)">${config.diagram}</g>
  <text x="80" y="824" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">FIELD NOTE ${config.number} / ${config.date}</text>
  <text x="1520" y="824" text-anchor="end" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">AARUTHRUN / ENGINEERING ARCHIVE</text>
</svg>
`;
}

const diagrams = {
  foc: `
    <g fill="none" stroke="#315C9B" stroke-width="2.5">
      <circle cx="230" cy="235" r="170"/>
      <circle cx="230" cy="235" r="78"/>
      <line x1="230" y1="65" x2="230" y2="157"/>
      <line x1="82" y1="320" x2="173" y2="270"/>
      <line x1="378" y1="320" x2="287" y2="270"/>
      <path d="M 75 235 A 155 155 0 0 1 385 235" stroke-dasharray="4 11"/>
      <path d="M 385 235 A 155 155 0 0 1 75 235" stroke-dasharray="4 11" opacity=".55"/>
      <line x1="230" y1="235" x2="286" y2="180"/>
    </g>
    <text x="230" y="440" text-anchor="middle" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">ROTOR / Id Iq</text>
    <text x="230" y="25" text-anchor="middle" fill="#315C9B" font-family="${mono}" font-size="13" letter-spacing="2">25 kHz</text>`,
  mars: `
    <g fill="none" stroke="#315C9B" stroke-width="2.5">
      <polygon points="230,55 385,145 385,325 230,415 75,325 75,145"/>
      <line x1="230" y1="235" x2="230" y2="55" stroke-dasharray="4 10"/>
      <line x1="230" y1="235" x2="385" y2="145" stroke-dasharray="4 10"/>
      <line x1="230" y1="235" x2="385" y2="325" stroke-dasharray="4 10"/>
      <line x1="230" y1="235" x2="230" y2="415" stroke-dasharray="4 10"/>
      <line x1="230" y1="235" x2="75" y2="325" stroke-dasharray="4 10"/>
      <line x1="230" y1="235" x2="75" y2="145" stroke-dasharray="4 10"/>
      <rect x="188" y="193" width="84" height="84"/>
      <circle cx="230" cy="235" r="20" fill="#315C9B" stroke="none"/>
    </g>
    <g fill="#315C9B">
      <circle cx="230" cy="55" r="8"/><circle cx="385" cy="145" r="8"/><circle cx="385" cy="325" r="8"/>
      <circle cx="230" cy="415" r="8"/><circle cx="75" cy="325" r="8"/><circle cx="75" cy="145" r="8"/>
    </g>
    <text x="230" y="458" text-anchor="middle" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">6 × IR / 60°</text>`,
  ffb: `
    <g fill="none" stroke="#315C9B" stroke-width="2.5">
      <circle cx="230" cy="235" r="168"/>
      <circle cx="230" cy="235" r="104" opacity=".45"/>
      <line x1="230" y1="235" x2="230" y2="67"/>
      <line x1="230" y1="235" x2="91" y2="327"/>
      <line x1="230" y1="235" x2="369" y2="327"/>
      <path d="M 60 180 C 95 120 160 92 230 92" stroke-width="5"/>
      <path d="M 400 180 C 365 120 300 92 230 92" stroke-width="5"/>
    </g>
    <g stroke="#202522" stroke-width="2">
      <line x1="230" y1="235" x2="230" y2="405"/>
      <polygon points="230,420 220,397 240,397" fill="#202522" stroke="none"/>
      <line x1="230" y1="235" x2="352" y2="298"/>
      <polygon points="365,305 342,295 349,315" fill="#202522" stroke="none"/>
    </g>
    <text x="230" y="458" text-anchor="middle" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">RACK FORCE / TIRE Mz</text>`,
  esp32: `
    <g fill="none" stroke="#315C9B" stroke-width="2.5">
      <line x1="55" y1="380" x2="405" y2="380"/>
      <circle cx="110" cy="380" r="34"/>
      <circle cx="350" cy="380" r="34"/>
      <rect x="168" y="286" width="124" height="94"/>
      <line x1="230" y1="286" x2="230" y2="105"/>
      <line x1="230" y1="105" x2="262" y2="205" stroke-dasharray="4 8"/>
      <circle cx="230" cy="105" r="14" fill="#315C9B" stroke="none"/>
      <path d="M 230 286 A 120 120 0 0 0 190 190" stroke-dasharray="3 8" opacity=".6"/>
    </g>
    <text x="230" y="445" text-anchor="middle" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">θ / 200 Hz</text>`,
  titan: `
    <g fill="none" stroke="#315C9B" stroke-width="2.5">
      <rect x="55" y="75" width="390" height="330"/>
      <line x1="55" y1="75" x2="445" y2="405"/>
      <line x1="445" y1="75" x2="55" y2="405"/>
      <rect x="202" y="192" width="96" height="96" fill="#EDEAE4"/>
      <line x1="55" y1="240" x2="445" y2="240" stroke-dasharray="4 10" opacity=".5"/>
      <line x1="250" y1="75" x2="250" y2="405" stroke-dasharray="4 10" opacity=".5"/>
    </g>
    <g fill="#315C9B">
      <circle cx="55" cy="75" r="7"/><circle cx="445" cy="75" r="7"/>
      <circle cx="55" cy="405" r="7"/><circle cx="445" cy="405" r="7"/>
    </g>
    <text x="230" y="458" text-anchor="middle" fill="#646B67" font-family="${mono}" font-size="14" letter-spacing="3">X / Y CROSSED BELTS</text>`
};

const covers = [
  {
    file: 'foc-cover.svg',
    number: '02',
    date: '19 OCT 2026',
    category: 'MOTOR CONTROL',
    project: 'BLDC FOC ACTUATOR',
    title1: '25 kHz',
    title2: 'current loop',
    specs: ['4310 KV100 / 14 POLE PAIRS', 'AS5047P / SVPWM / INA240'],
    diagram: diagrams.foc
  },
  {
    file: 'mars-cover.svg',
    number: '03',
    date: '27 SEP 2026',
    category: 'PCB DEVELOPMENT',
    project: 'MARS 369',
    title1: '18.5 N',
    title2: 'zero-power latch',
    specs: ['3× ELECTRO-PERMANENT COUPLERS', '6 × 38 kHz IR / ESP32-S3'],
    diagram: diagrams.mars
  },
  {
    file: 'titan-cover.svg',
    number: '06',
    date: '02 AUG 2026',
    category: 'ENGINEERING NOTES',
    project: 'TITAN-KLIPPER COREXY',
    title1: '500 mm/s',
    title2: 'CoreXY gantry',
    specs: ['MGN12H / PA-CF / 65°C CHAMBER', '25,000 mm/s² / INPUT SHAPING'],
    diagram: diagrams.titan
  },
  {
    file: 'esp32-cover.svg',
    number: '07',
    date: '14 JUL 2026',
    category: 'EMBEDDED SYSTEMS',
    project: 'ESP32-S3 MICRO-ROBOT',
    title1: '200 Hz',
    title2: 'balance loop',
    specs: ['MPU6050 / OV2640 / FREERTOS', 'CASCADED PID / 95 ms VIDEO'],
    diagram: diagrams.esp32
  },
  {
    file: 'ffb-cover.svg',
    number: '08',
    date: '26 JUN 2026',
    category: 'ELECTRONICS',
    project: 'FFB STEER-BY-WIRE',
    title1: '4.8 ms',
    title2: 'steering feel',
    specs: ['TIE-ROD LOAD CELLS / CAN 2.0', '4.2 Nm DIRECT-DRIVE HAPTICS'],
    diagram: diagrams.ffb
  }
];

covers.forEach((cover) => {
  fs.writeFileSync(path.join(outDir, cover.file), plate(cover));
  console.log(cover.file);
});

const loopDiagram = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <title>BLDC FOC cascaded control-loop diagram</title>
  <rect width="1600" height="900" fill="#EDEAE4"/>
  <text x="80" y="86" fill="#315C9B" font-family="${mono}" font-size="16" letter-spacing="4">CONTROL ARCHITECTURE / BLDC FOC ACTUATOR</text>
  <line x1="80" y1="112" x2="1520" y2="112" stroke="#D8DAD4"/>
  <g font-family="${mono}" font-size="16" letter-spacing="1">
    <g>
      <rect x="80" y="225" width="220" height="118" fill="#FAFAF7" stroke="#D8DAD4"/>
      <rect x="80" y="225" width="220" height="3" fill="#315C9B"/>
      <text x="104" y="266" fill="#646B67" font-size="12" letter-spacing="3">OUTER LOOP</text>
      <text x="104" y="300" fill="#202522" font-size="20">POSITION</text>
      <text x="104" y="326" fill="#315C9B" font-size="13">1 kHz</text>
    </g>
    <g>
      <rect x="390" y="225" width="220" height="118" fill="#FAFAF7" stroke="#D8DAD4"/>
      <rect x="390" y="225" width="220" height="3" fill="#315C9B"/>
      <text x="414" y="266" fill="#646B67" font-size="12" letter-spacing="3">MIDDLE LOOP</text>
      <text x="414" y="300" fill="#202522" font-size="20">VELOCITY</text>
      <text x="414" y="326" fill="#315C9B" font-size="13">5 kHz</text>
    </g>
    <g>
      <rect x="700" y="225" width="220" height="118" fill="#FAFAF7" stroke="#D8DAD4"/>
      <rect x="700" y="225" width="220" height="3" fill="#315C9B"/>
      <text x="724" y="266" fill="#646B67" font-size="12" letter-spacing="3">INNER LOOP</text>
      <text x="724" y="300" fill="#202522" font-size="20">CURRENT / Iq Id</text>
      <text x="724" y="326" fill="#315C9B" font-size="13">25 kHz</text>
    </g>
    <g>
      <rect x="1010" y="225" width="220" height="118" fill="#FAFAF7" stroke="#D8DAD4"/>
      <rect x="1010" y="225" width="220" height="3" fill="#315C9B"/>
      <text x="1034" y="266" fill="#646B67" font-size="12" letter-spacing="3">MODULATION</text>
      <text x="1034" y="300" fill="#202522" font-size="20">SVPWM</text>
      <text x="1034" y="326" fill="#315C9B" font-size="13">25 kHz</text>
    </g>
    <g>
      <rect x="1320" y="225" width="200" height="118" fill="#FAFAF7" stroke="#D8DAD4"/>
      <rect x="1320" y="225" width="200" height="3" fill="#315C9B"/>
      <text x="1344" y="266" fill="#646B67" font-size="12" letter-spacing="3">PLANT</text>
      <text x="1344" y="300" fill="#202522" font-size="20">MOTOR</text>
      <text x="1344" y="326" fill="#315C9B" font-size="13">4310 / 14 PP</text>
    </g>
  </g>
  <g stroke="#315C9B" stroke-width="2.5" fill="none">
    <line x1="300" y1="284" x2="380" y2="284"/><polygon points="390,284 374,277 374,291" fill="#315C9B" stroke="none"/>
    <line x1="610" y1="284" x2="690" y2="284"/><polygon points="700,284 684,277 684,291" fill="#315C9B" stroke="none"/>
    <line x1="920" y1="284" x2="1000" y2="284"/><polygon points="1010,284 994,277 994,291" fill="#315C9B" stroke="none"/>
    <line x1="1230" y1="284" x2="1310" y2="284"/><polygon points="1320,284 1304,277 1304,291" fill="#315C9B" stroke="none"/>
  </g>
  <g stroke="#646B67" stroke-width="1.5" fill="none" stroke-dasharray="5 8">
    <path d="M1420 343 L1420 650 L920 650"/>
    <path d="M810 343 L810 560 L250 560 L250 343"/>
  </g>
  <g font-family="${mono}" font-size="13" fill="#646B67" letter-spacing="2">
    <text x="1180" y="690">ENCODER / θe</text>
    <text x="420" y="600">CURRENT SENSE / Ia Ib Ic</text>
    <text x="1430" y="495">AS5047P</text>
    <text x="140" y="495">TORQUE COMMAND</text>
  </g>
  <g stroke="#315C9B" stroke-width="2" fill="none">
    <line x1="250" y1="560" x2="250" y2="485"/><polygon points="250,475 243,491 257,491" fill="#315C9B" stroke="none"/>
    <line x1="1420" y1="650" x2="1420" y2="515"/><polygon points="1420,505 1413,521 1427,521" fill="#315C9B" stroke="none"/>
  </g>
  <text x="80" y="824" fill="#646B67" font-family="${mono}" font-size="13" letter-spacing="3">FIGURE / CASCADED CONTROL LOOPS</text>
  <text x="1520" y="824" text-anchor="end" fill="#646B67" font-family="${mono}" font-size="13" letter-spacing="3">FIELD NOTES / 02</text>
</svg>
`;
fs.writeFileSync(path.join(outDir, 'foc-loop.svg'), loopDiagram);
console.log('foc-loop.svg');
