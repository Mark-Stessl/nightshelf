// Regal-Welten: fünf kleine, im Code gezeichnete Szenen (keine Bilder zum Laden)
window.Scenes = (() => {
const stars=(n,s=1)=>{let o='',k=s*97;for(let i=0;i<n;i++){k=(k*16807)%2147483647;const x=k%300;k=(k*16807)%2147483647;const y=k%200;o+=`<circle class="tw" style="animation-delay:-${i%5}s" cx="${x}" cy="${y}" r="${(i%3)*.4+.5}" fill="#fff" opacity=".7"/>`}return o};
const LIST=[
{k:'game',sub:'Konsolen, Controller, Platin',sky:'linear-gradient(180deg,#120B26,#2A1450 70%,#3B1A5C)',glow:'rgba(233,190,88,.25)',layers:[
 [0,`<svg viewBox="0 0 260 380">${stars(40,1)}<circle cx="200" cy="70" r="26" fill="#F5E6B8" opacity=".9"/><circle cx="210" cy="64" r="22" fill="#2A1450"/></svg>`],
 [6,`<svg viewBox="0 0 260 380"><rect x="0" y="250" width="260" height="130" fill="#1A1030"/><rect x="20" y="236" width="220" height="16" rx="4" fill="#3B2A5E"/>
   <rect x="60" y="140" width="140" height="98" rx="10" fill="#0E0B16" stroke="#4B3C78" stroke-width="5"/><rect x="70" y="150" width="120" height="78" rx="4" fill="#22D3EE" opacity=".18" class="fk"/>
   <text x="130" y="195" text-anchor="middle" font-family="monospace" font-size="15" fill="#7FF3FF" class="fk">PRESS START</text></svg>`],
 [14,`<svg viewBox="0 0 260 380"><rect x="40" y="200" width="48" height="36" rx="6" fill="#EDEFF5"/><rect x="44" y="204" width="40" height="5" fill="#2A6BF2"/>
   <g class="fl" style="transform-origin:150px 225px"><path d="M118 222c-14 0-20 20-12 26s14-4 20-6h48c6 2 12 12 20 6s2-26-12-26z" fill="#2B2440" stroke="#6E5AA8" stroke-width="2"/>
   <circle cx="182" cy="230" r="3" fill="#22D3EE"/><circle cx="190" cy="236" r="3" fill="#F472B6"/><rect x="124" y="232" width="12" height="4" rx="2" fill="#A79BC9"/><rect x="128" y="228" width="4" height="12" rx="2" fill="#A79BC9"/></g>
   <path d="M200 230l6-16 10 0-4 16z" fill="#E9BE58"/><rect x="196" y="230" width="20" height="6" rx="2" fill="#C99A3A"/></svg>`]]},
{k:'series',sub:'Couch, Fernseher, nächste Folge',sky:'linear-gradient(180deg,#0B1424,#13243F 60%,#1B2E4F)',glow:'rgba(34,211,238,.25)',layers:[
 [0,`<svg viewBox="0 0 260 380"><rect width="260" height="380" fill="#101A2C"/><rect x="150" y="40" width="80" height="110" rx="4" fill="#0A1222" stroke="#2A3F5F" stroke-width="4"/>${stars(10,2).replace(/cx="(\d+)"/g,(m,a)=>`cx="${155+(+a%70)}"`).replace(/cy="(\d+)"/g,(m,a)=>`cy="${45+(+a%100)}"`)}<line x1="190" y1="40" x2="190" y2="150" stroke="#2A3F5F" stroke-width="3"/></svg>`],
 [6,`<svg viewBox="0 0 260 380"><path d="M70 90 L130 180 L190 90" fill="none"/><rect x="40" y="110" width="140" height="86" rx="6" fill="#05080F" stroke="#3A4A68" stroke-width="4"/>
   <rect x="46" y="116" width="128" height="74" fill="#22D3EE" opacity=".22" class="fk"/><polygon points="40,196 180,196 260,300 0,300" fill="#22D3EE" opacity=".06" class="bm"/><rect x="100" y="196" width="20" height="14" fill="#2A3F5F"/><rect x="70" y="208" width="80" height="6" rx="3" fill="#2A3F5F"/></svg>`],
 [14,`<svg viewBox="0 0 260 380"><rect x="0" y="290" width="260" height="90" fill="#0B1220"/><rect x="10" y="250" width="240" height="50" rx="16" fill="#5B3C8F"/><rect x="18" y="226" width="224" height="40" rx="14" fill="#6E4BA8"/>
   <rect x="24" y="234" width="64" height="30" rx="10" fill="#8B5CF6" opacity=".55"/><rect x="200" y="276" width="10" height="26" fill="#3B2A5E"/><rect x="50" y="276" width="10" height="26" fill="#3B2A5E"/>
   <rect x="140" y="214" width="30" height="20" rx="4" fill="#F5E6B8" transform="rotate(-8 155 224)"/><path d="M150 205q4-8 0-14M160 207q4-8 0-14" stroke="#fff" stroke-opacity=".4" fill="none" class="fl"/></svg>`]]},
{k:'anime',sub:'Kirschblüten, Laternen, Mond',sky:'linear-gradient(180deg,#1A0E2E,#3B1E5A 55%,#7A3B6E)',glow:'rgba(139,92,246,.3)',layers:[
 [0,`<svg viewBox="0 0 260 380">${stars(35,3)}<circle cx="130" cy="120" r="58" fill="#FFE3F1" opacity=".95"/><circle cx="130" cy="120" r="80" fill="#FFB8DA" opacity=".12"/></svg>`],
 [6,`<svg viewBox="0 0 260 380"><path d="M0 250 L40 210 L70 230 L110 190 L150 230 L190 200 L260 245 V380 H0z" fill="#2A1640"/>
   <g fill="#C8324A"><rect x="70" y="160" width="120" height="10" rx="3"/><rect x="62" y="152" width="136" height="8" rx="3" fill="#E04A60"/><rect x="84" y="170" width="9" height="90"/><rect x="167" y="170" width="9" height="90"/><rect x="80" y="186" width="100" height="6"/></g></svg>`],
 [14,`<svg viewBox="0 0 260 380"><path d="M0 300 Q130 270 260 300 V380 H0z" fill="#1A0E2A"/><g><circle cx="30" cy="230" r="34" fill="#F7A8C8" opacity=".85"/><circle cx="58" cy="214" r="26" fill="#FFC2DA" opacity=".8"/><rect x="34" y="240" width="6" height="64" fill="#3B1E3A"/></g>
   <g class="fl"><rect x="200" y="240" width="20" height="28" rx="8" fill="#FF9F5A"/><rect x="200" y="250" width="20" height="8" fill="#FFD08A" class="fk"/><line x1="210" y1="226" x2="210" y2="240" stroke="#3B1E3A" stroke-width="2"/></g>
   ${Array.from({length:9},(_,i)=>`<ellipse class="petal" style="animation-duration:${6+i%4}s;animation-delay:-${i*1.3}s" cx="${20+i*28}" cy="-10" rx="4" ry="2.5" fill="#FFC2DA"/>`).join('')}</svg>`]]},
{k:'manga',sub:'Bände, Leselampe, Tusche',sky:'linear-gradient(180deg,#1C1424,#2E2236 60%,#3A2A3A)',glow:'rgba(196,181,253,.25)',layers:[
 [0,`<svg viewBox="0 0 260 380"><rect width="260" height="380" fill="#1E1626"/>${Array.from({length:6},(_,i)=>`<rect x="${18+i*40}" y="40" width="${30}" height="120" rx="3" fill="hsl(${260+i*18},30%,${22+i%3*5}%)"/>`).join('')}<rect x="0" y="160" width="260" height="8" fill="#3A2A3A"/></svg>`],
 [6,`<svg viewBox="0 0 260 380"><path d="M150 120 L190 70 L200 76 L168 126z" fill="#4B3C70"/><path d="M180 64 L230 88 L210 104z" fill="#6E5AA8"/><ellipse cx="200" cy="110" rx="70" ry="120" fill="#FFE9B0" opacity=".08" class="bm"/><rect x="0" y="250" width="260" height="130" fill="#2A1E30"/><rect x="140" y="240" width="60" height="12" rx="3" fill="#4B3C70"/></svg>`],
 [14,`<svg viewBox="0 0 260 380">${[0,1,2,3,4].map(i=>`<rect x="${30+i*3}" y="${270-i*16}" width="110" height="15" rx="2" fill="${['#C4B5FD','#F472B6','#22D3EE','#E9BE58','#8B5CF6'][i]}"/><rect x="${36+i*3}" y="${274-i*16}" width="60" height="3" fill="#fff" opacity=".5"/>`).join('')}
   <g transform="rotate(-6 190 270)"><rect x="150" y="250" width="90" height="50" rx="3" fill="#F4F1FA"/><line x1="195" y1="252" x2="195" y2="298" stroke="#bbb"/><rect x="158" y="258" width="30" height="16" fill="#2A2140" opacity=".7"/><rect x="202" y="260" width="30" height="30" fill="#2A2140" opacity=".5"/></g></svg>`]]},
{k:'movie',sub:'Kinosaal, Projektor, Popcorn',sky:'linear-gradient(180deg,#160A10,#2A0F1C 60%,#3A1222)',glow:'rgba(244,114,182,.25)',layers:[
 [0,`<svg viewBox="0 0 260 380"><rect width="260" height="380" fill="#1A0A12"/><path d="M0 30 Q30 120 0 220z M260 30 Q230 120 260 220z" fill="#7A1630"/><rect x="40" y="60" width="180" height="110" rx="4" fill="#F4F1FA" opacity=".9"/><rect x="40" y="60" width="180" height="110" fill="#8B5CF6" opacity=".25" class="fk"/></svg>`],
 [6,`<svg viewBox="0 0 260 380"><polygon points="230,40 40,60 40,170 230,58" fill="#FFF3D6" opacity=".08" class="bm"/><circle cx="234" cy="46" r="7" fill="#FFF3D6" class="fk"/>
   ${[0,1,2].map(r=>Array.from({length:7},(_,i)=>`<rect x="${14+i*34}" y="${210+r*36}" width="28" height="26" rx="7" fill="${r==2?'#B0244A':'#8A1C3A'}"/>`).join('')).join('')}</svg>`],
 [14,`<svg viewBox="0 0 260 380"><rect x="0" y="320" width="260" height="60" fill="#12060C"/><g class="fl"><path d="M170 300 L176 360 H214 L220 300z" fill="#F4F1FA"/><path d="M170 300 L176 360 H184 L180 300z M190 300 V360 H198 V300z M206 300 L204 360 H212 L216 300z" fill="#E04A60"/>
   ${[0,1,2,3,4,5].map(i=>`<circle cx="${176+i*7}" cy="${296-(i%2)*6}" r="7" fill="#FFF3D6"/>`).join('')}</g></svg>`]]},
];
  const byType = Object.fromEntries(LIST.map(s => [s.k, s]));
  return { byType };
})();
