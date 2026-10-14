import { useEffect, useMemo, useRef, useState } from "react"

type TimeOpt = "morning" | "noon" | "night"
type ZodiacKey = "Capricorn"|"Aquarius"|"Pisces"|"Aries"|"Taurus"|"Gemini"|"Cancer"|"Leo"|"Virgo"|"Libra"|"Scorpio"|"Sagittarius"

interface InnerHue {
  zodiac: ZodiacKey
  code: number
  name: string
  emotion: string
  rgb: [number,number,number]
  daysAlive: number
}

interface OuterHue {
  month: number
  stone: string
  mainDeposit: string
  distanceKm: number
  code: number
  name: string
  emotion: string
  rgb: [number,number,number]
  opacity: number
}

interface SpectrumSwatch {
  pos: number
  code: number
  name: string
  emotion: string
  baseRgb: [number,number,number]
  finalRgb: [number,number,number]
  opacity?: number
  origin: "inner-core" | "inner-proj" | "middle-aura" | "outer-proj" | "outer-core"
  distanceFromInner: number
  distanceFromOuter: number
}

const ZODIAC_RANGES: {key:ZodiacKey, start:[number,number], end:[number,number]}[] = [
  {key:"Capricorn", start:[12,22], end:[1,19]},
  {key:"Aquarius", start:[1,20], end:[2,18]},
  {key:"Pisces", start:[2,19], end:[3,20]},
  {key:"Aries", start:[3,21], end:[4,19]},
  {key:"Taurus", start:[4,20], end:[5,20]},
  {key:"Gemini", start:[5,21], end:[6,20]},
  {key:"Cancer", start:[6,21], end:[7,22]},
  {key:"Leo", start:[7,23], end:[8,22]},
  {key:"Virgo", start:[8,23], end:[9,22]},
  {key:"Libra", start:[9,23], end:[10,22]},
  {key:"Scorpio", start:[10,23], end:[11,21]},
  {key:"Sagittarius", start:[11,22], end:[12,21]},
]

const INNER_MAP: Record<ZodiacKey, {code:number, name:string, emotion:string, rgb:[number,number,number]}> = {
  Aries:       {code:16744272, name:"Coral",      emotion:"urgency, initiation, ignition", rgb:[255,107,107]},
  Taurus:      {code:13840175, name:"Amber",     emotion:"steadfast warmth, accumulation", rgb:[244,164,96]},
  Gemini:      {code:11591910, name:"Periwinkle",emotion:"curiosity, duality, quicksilver", rgb:[171,178,255]},
  Cancer:      {code:10595839, name:"Sky Blue",  emotion:"tidal memory, shelter, undertow", rgb:[135,206,235]},
  Leo:         {code:8323101,   name:"Maroon",    emotion:"maturity, restraint, held heat", rgb:[128,32,48]},
  Virgo:       {code:9127187,   name:"Sage",      emotion:"discernment, tending, repair", rgb:[143,177,128]},
  Libra:       {code:1342144,   name:"Aqua",      emotion:"equilibrium, negotiation, breath", rgb:[64,224,208]},
  Scorpio:     {code:8388608,   name:"Garnet Deep",emotion:"intensity, transmutation, secrecy", rgb:[114,20,20]},
  Sagittarius: {code:12232020,  name:"Citrine",   emotion:"expansion, aim, optimistic reach", rgb:[228,194,74]},
  Capricorn:   {code:8323101,   name:"Maroon",    emotion:"maturity, restraint, endurance", rgb:[123,44,44]},
  Aquarius:    {code:1342144,   name:"Aqua",      emotion:"detachment, invention, current", rgb:[78,220,209]},
  Pisces:      {code:10595839,  name:"Sky Blue",  emotion:"dissolve, compassion, veil", rgb:[145,197,255]},
}

const OUTER_MAP: Record<number, {stone:string, deposit:string, dist:number, code:number, name:string, emotion:string, rgb:[number,number,number]}> = {
  1:  {stone:"Garnet",     deposit:"Rajasthan, IN",  dist:13200, code:8388608,  name:"Garnet",     emotion:"anchor, lineage, rooting", rgb:[155,28,28]},
  2:  {stone:"Amethyst",   deposit:"Minas Gerais, BR", dist:10400, code:10053273, name:"Amethyst",   emotion:"intuition, quieting, inward", rgb:[138,92,179]},
  3:  {stone:"Aquamarine", deposit:"Shigar, PK",     dist:11800, code:11394815, name:"Aquamarine", emotion:"clear channel, breath, tide", rgb:[127,205,205]},
  4:  {stone:"Diamond",    deposit:"Kimberley, ZA",  dist:16200, code:16382457, name:"Diamond",    emotion:"clarity, hardness, witness", rgb:[230,232,235]},
  5:  {stone:"Emerald",    deposit:"Muzo, CO",       dist:6200,  code:5145080,   name:"Emerald",    emotion:"regenerative, heart-led, canopy", rgb:[44,168,96]},
  6:  {stone:"Pearl",      deposit:"Bahrain Banks",  dist:12900, code:15987699, name:"Pearl",      emotion:"layered memory, luster, nacre", rgb:[235,225,210]},
  7:  {stone:"Ruby",       deposit:"Mogok, MM",      dist:12400, code:13041663, name:"Ruby",       emotion:"vital surge, courage, pulse", rgb:[190,28,48]},
  8:  {stone:"Peridot",    deposit:"San Carlos, AZ", dist:800,   code:11283840, name:"Peridot",    emotion:"new growth, lift, vernal", rgb:[173,204,57]},
  9:  {stone:"Sapphire",   deposit:"Kashmir, IN",    dist:11900, code:3166719,  name:"Sapphire",   emotion:"depth focus, wisdom, night sight", rgb:[48,84,155]},
  10: {stone:"Opal",       deposit:"Coober Pedy, AU",dist:12800, code:14540287, name:"Opal",       emotion:"diffraction, play, prism", rgb:[201,188,172]},
  11: {stone:"Citrine",    deposit:"Bahia, BR",      dist:10400, code:16761035, name:"Citrine",    emotion:"optimism, harvest, stored sun", rgb:[232,184,74]},
  12: {stone:"Turquoise",  deposit:"Nishapur, IR",   dist:12100, code:4822218,  name:"Turquoise",  emotion:"protection, passage, threshold", rgb:[64,180,171]},
}

// explicit 7-color projection logic as per spec

// ENTIRE SPECTRUM - 36 hues + neutrals for full aura wheel - explicit Codes no hex
const ENTIRE_SPECTRUM: {code:number, name:string, emotion:string, rgb:[number,number,number], family:string}[] = [
  {code:8388608, name:"Deep Garnet", emotion:"root, anchoring", rgb:[114,20,20], family:"Red"},
  {code:8323101, name:"Maroon", emotion:"maturity, restraint", rgb:[128,32,48], family:"Red"},
  {code:14423100, name:"Crimson", emotion:"devotion, intensity", rgb:[220,20,60], family:"Red"},
  {code:16729600, name:"Scarlet", emotion:"urgency, ignition", rgb:[255,36,0], family:"Red"},
  {code:16744272, name:"Coral", emotion:"warmth, kinetic", rgb:[255,107,107], family:"Orange"},
  {code:16747520, name:"Vermilion", emotion:"activation, signal", rgb:[255,95,31], family:"Orange"},
  {code:13840175, name:"Amber", emotion:"accumulation, glow", rgb:[244,164,96], family:"Orange"},
  {code:16761035, name:"Gold", emotion:"radiance, value", rgb:[255,215,0], family:"Yellow"},
  {code:16766720, name:"Yellow", emotion:"clarity, alertness", rgb:[255,255,0], family:"Yellow"},
  {code:12232020, name:"Citrine", emotion:"expansion, optimism", rgb:[228,194,74], family:"Yellow"},
  {code:11283840, name:"Peridot", emotion:"new growth, vernal", rgb:[173,204,57], family:"Lime"},
  {code:10702158, name:"Chartreuse", emotion:"novelty, edge", rgb:[163,200,60], family:"Lime"},
  {code:52428, name:"Emerald", emotion:"heart-led, canopy", rgb:[0,128,0], family:"Green"},
  {code:9127187, name:"Sage", emotion:"tending, discernment", rgb:[143,177,128], family:"Green"},
  {code:2097192, name:"Forest", emotion:"steadfast, rooted", rgb:[34,139,34], family:"Green"},
  {code:26118, name:"Jade", emotion:"balance, self-possession", rgb:[0,168,107], family:"Green"},
  {code:5145080, name:"Teal Deep", emotion:"depth, containment", rgb:[0,128,128], family:"Turquoise"},
  {code:4822218, name:"Turquoise", emotion:"protection, passage", rgb:[64,180,171], family:"Turquoise"},
  {code:1342144, name:"Aqua", emotion:"equilibrium, breath", rgb:[64,224,208], family:"Turquoise"},
  {code:11394815, name:"Aquamarine", emotion:"clear channel, tide", rgb:[127,205,205], family:"Light Blue"},
  {code:10595839, name:"Sky Blue", emotion:"expanse, trust", rgb:[135,206,235], family:"Light Blue"},
  {code:11591910, name:"Powder Blue", emotion:"innocence, serenity", rgb:[176,224,230], family:"Light Blue"},
  {code:28807, name:"Royal Blue", emotion:"confidence, authority", rgb:[65,105,225], family:"Blue"},
  {code:255, name:"Cobalt", emotion:"focus, loyalty", rgb:[0,71,171], family:"Blue"},
  {code:3166719, name:"Sapphire", emotion:"wisdom, night sight", rgb:[48,84,155], family:"Blue"},
  {code:1973801, name:"Midnight Blue", emotion:"gravity, mystery", rgb:[25,25,112], family:"Indigo"},
  {code:10053273, name:"Amethyst", emotion:"intuition, quieting", rgb:[138,92,179], family:"Violet"},
  {code:8388736, name:"Plum", emotion:"dignity, introspection", rgb:[142,69,133], family:"Violet"},
  {code:12576647, name:"Lilac", emotion:"dreamy, threshold", rgb:[200,162,200], family:"Violet"},
  {code:13041663, name:"Magenta", emotion:"boldness, nonconformance", rgb:[199,21,133], family:"Magenta"},
  {code:16711807, name:"Rose", emotion:"affection, tenderness", rgb:[255,102,128], family:"Pink"},
  {code:15987699, name:"Pearl", emotion:"layered memory, luster", rgb:[235,225,210], family:"White"},
  {code:16382457, name:"Diamond", emotion:"clarity, witness", rgb:[230,232,235], family:"White"},
  {code:14540287, name:"Opal", emotion:"diffraction, prism", rgb:[201,188,172], family:"Prism"},
  {code:8421504, name:"Taupe", emotion:"ground, neutrality", rgb:[72,60,50], family:"Brown"},
  {code:4144959, name:"Graphite", emotion:"structure, held", rgb:[64,64,64], family:"Gray"},
];


const PROJECTION_BASE: {pos:number, code:number, name:string, emotion:string, baseRgb:[number,number,number], origin:SpectrumSwatch["origin"]}[] = [
  {pos:1, code:8323101,   name:"Maroon",     emotion:"maturity, restraint, endurance", baseRgb:[128,32,48],     origin:"inner-core"},
  {pos:2, code:16744272,  name:"Coral",      emotion:"warmth, kinetic, ignition",      baseRgb:[255,107,107],   origin:"inner-proj"},
  {pos:3, code:13840175,  name:"Amber",      emotion:"accumulation, glow, projecting", baseRgb:[244,164,96],    origin:"inner-proj"},
  {pos:4, code:9127187,   name:"Sage",       emotion:"tending, discernment, new aura", baseRgb:[143,177,128],   origin:"middle-aura"},
  {pos:5, code:1342144,   name:"Aqua",       emotion:"flow, breath, threshold",        baseRgb:[64,224,208],    origin:"outer-proj"},
  {pos:6, code:11591910,  name:"Periwinkle", emotion:"liminal, perception, going left",baseRgb:[171,178,255],   origin:"outer-proj"},
  {pos:7, code:10595839,  name:"Sky Blue",   emotion:"expanse, trust, memory",         baseRgb:[135,206,235],   origin:"outer-core"},
]

function getZodiac(m:number,d:number):ZodiacKey{
  for(const r of ZODIAC_RANGES){
    const [sm,sd]=r.start; const [em,ed]=r.end;
    if(sm===12 && em===1){
      if((m===12 && d>=sd) || (m===1 && d<=ed)) return r.key
    } else {
      if(m===sm && d>=sd) {
        if(m===em && d<=ed) return r.key
        if(m!==em) return r.key
      }
      if(m>sm && m<em) return r.key
      if(m===em && d<=ed) return r.key
    }
  }
  const fallback: ZodiacKey[] = ["Capricorn","Aquarius","Pisces","Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius"]
  return fallback[Math.max(0,m-1)]
}

function daysAliveCalc(y:number,m:number,d:number){
  const birth = new Date(y,m-1,d).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now-birth)/(1000*60*60*24)))
}

function opacityFromDistance(dist:number){
  const max=16200
  let o = 0.97 - (dist / max) * 0.82
  if(o<0.15) o=0.15
  if(o>0.97) o=0.97
  return Number(o.toFixed(2))
}

function timeVariant(rgb:[number,number,number], time:TimeOpt):[number,number,number]{
  if(time==="night") return [Math.round(rgb[0]*0.58), Math.round(rgb[1]*0.58), Math.round(rgb[2]*0.72)] as [number,number,number]
  if(time==="morning") return [Math.min(255,Math.round(rgb[0]*1.18)), Math.min(255,Math.round(rgb[1]*1.15)), Math.min(255,Math.round(rgb[2]*1.08))] as [number,number,number]
  return rgb
}

function lerpRgb(a:[number,number,number], b:[number,number,number], t:number):[number,number,number]{
  return [
    Math.round(a[0] + (b[0]-a[0])*t),
    Math.round(a[1] + (b[1]-a[1])*t),
    Math.round(a[2] + (b[2]-a[2])*t),
  ]
}
function mixRgb(a:[number,number,number], b:[number,number,number], weightB:number):[number,number,number]{
  const w = Math.max(0, Math.min(1, weightB))
  return lerpRgb(a,b,w)
}

export default function App(){
  const [month,setMonth]=useState<number>(5)
  const [day,setDay]=useState<number>(14)
  const [year,setYear]=useState<number>(1996)
  const [time,setTime]=useState<TimeOpt>("noon")
  const [location,setLocation]=useState("Chico, CA 39.7, -121.8")
  const [revealed,setRevealed]=useState(false)
  const [step,setStep]=useState(0) // 0..7
  const containerRef = useRef<HTMLDivElement>(null)

  const inner: InnerHue | null = useMemo(()=>{
    if(!revealed) return null
    const zodiac = getZodiac(month,day)
    const base = INNER_MAP[zodiac]
    const dAlive = daysAliveCalc(year,month,day)
    return {
      zodiac,
      code: PROJECTION_BASE[0].code, // explicit 8323101 per spec, keep numeric code fixed
      name: base.name, // but name from zodiac for symbolic weight
      emotion: base.emotion,
      rgb: timeVariant(base.rgb, time),
      daysAlive: dAlive
    }
  },[revealed, month,day,year,time])

  const outer: OuterHue | null = useMemo(()=>{
    if(!revealed) return null
    const data = OUTER_MAP[month] ?? OUTER_MAP[1]
    return {
      month,
      stone: data.stone,
      mainDeposit: data.deposit,
      distanceKm: data.dist,
      code: PROJECTION_BASE[6].code, // explicit 10595839 per spec
      name: data.name,
      emotion: data.emotion,
      rgb: data.rgb,
      opacity: opacityFromDistance(data.dist)
    }
  },[revealed, month])

  // build 7 swatches with distance-based interpolation
  const spectrum: SpectrumSwatch[] | null = useMemo(()=>{
    if(!inner || !outer) return null
    const innerRgb = inner.rgb
    const outerRgb = outer.rgb

    // first pass finals for 0,1,2,4,5,6 excluding middle
    const prelim: ([number,number,number]|null)[] = new Array(7).fill(null)

    // core inner far left
    prelim[0] = innerRgb
    // inner projections 2,3
    prelim[1] = mixRgb(PROJECTION_BASE[1].baseRgb, lerpRgb(innerRgb, outerRgb, 1/6), 0.32)
    prelim[2] = mixRgb(PROJECTION_BASE[2].baseRgb, lerpRgb(innerRgb, outerRgb, 2/6), 0.38)
    // outer core far right
    prelim[6] = outerRgb
    // outer projections going left: pos6 (index5) and pos5 (index4)
    prelim[5] = mixRgb(PROJECTION_BASE[5].baseRgb, lerpRgb(innerRgb, outerRgb, 5/6), 0.34)
    prelim[4] = mixRgb(PROJECTION_BASE[4].baseRgb, lerpRgb(innerRgb, outerRgb, 4/6), 0.40)

    // average of 6 for middle aura composition
    const six = [prelim[0]!, prelim[1]!, prelim[2]!, prelim[4]!, prelim[5]!, prelim[6]!]
    const avgSix: [number,number,number] = [
      Math.round(six.reduce((s,c)=>s+c[0],0)/six.length),
      Math.round(six.reduce((s,c)=>s+c[1],0)/six.length),
      Math.round(six.reduce((s,c)=>s+c[2],0)/six.length),
    ]
    const centerSpectrum = lerpRgb(innerRgb, outerRgb, 0.5)
    // middle new aura: composed only when all 3 left + 3 right introduced and blended
    const middleBase = PROJECTION_BASE[3].baseRgb
    const middleMixed = mixRgb(mixRgb(middleBase, avgSix, 0.58), centerSpectrum, 0.28)
    prelim[3] = middleMixed

    // second pass: neighbor distance relevance — each color shifts slightly toward neighbor based on distance of 1 from 2 on spectrum
    // closer to inner = more red warmth, closer to outer = more blue trust already via lerp, now add 1->2 chain
    const finalRgs = prelim as [number,number,number][]
    // apply small neighbor pull to show spectrum relevance
    for(let i=1;i<7;i++){
      // pull current toward previous by inverse distance weight: nearer previous influences 18%
      finalRgs[i] = mixRgb(finalRgs[i], finalRgs[i-1], 0.12)
    }
    for(let i=5;i>=0;i--){
      finalRgs[i] = mixRgb(finalRgs[i], finalRgs[i+1], 0.10)
    }

    return PROJECTION_BASE.map((def,i)=>{
      const isMiddle = i===3
      const baseRgb = i===0 ? innerRgb : i===6 ? outerRgb : def.baseRgb
      return {
        pos: def.pos,
        code: def.code,
        name: i===0 ? inner.name : i===6 ? outer.name : def.name,
        emotion: def.emotion,
        baseRgb: baseRgb,
        finalRgb: finalRgs[i],
        origin: def.origin,
        distanceFromInner: i,
        distanceFromOuter: 6-i,
        opacity: i===6 ? outer.opacity : undefined
      }
    })
  },[inner, outer])

  const blendedMiddle = useMemo(()=>{
    if(!spectrum) return null
    const mid = spectrum[3]
    return mid
  },[spectrum])

  useEffect(()=>{
    if(!revealed) { setStep(0); return }
    setStep(0)
    const timers:number[] = []
    timers.push(window.setTimeout(()=>setStep(1), 420))   // 1 core inner far left
    timers.push(window.setTimeout(()=>setStep(2), 1150))  // 2 inner proj 2
    timers.push(window.setTimeout(()=>setStep(3), 1880))  // 3 inner proj 3 — pause left side 3 introduced
    timers.push(window.setTimeout(()=>setStep(4), 3350))  // 4 core outer far right
    timers.push(window.setTimeout(()=>setStep(5), 4100))  // 5 outer proj 2 (sixth pos) going left
    timers.push(window.setTimeout(()=>setStep(6), 4850))  // 6 outer proj 1 (fifth pos) going left — pause right side 3 introduced
    timers.push(window.setTimeout(()=>setStep(7), 6300))  // 7 middle new aura hue
    return ()=>timers.forEach(clearTimeout)
  },[revealed])

  const handleReveal=()=>{
    if(day<1||day>31||month<1||month>12||year<1900||year>2026) return
    setRevealed(true)
    setTimeout(()=>containerRef.current?.scrollIntoView({behavior:"smooth", block:"start"}), 120)
  }

  const reset=()=>{
    setRevealed(false)
    setStep(0)
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] relative overflow-clip" style={{paddingTop:"var(--safe-area-inset-top)", maxWidth:"100vw"}}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-[5%] w-[60%] max-w-[700px] h-[50%] rounded-full blur-[100px] opacity-[0.18]" style={{background:"radial-gradient(60% 60% at 50% 50%, rgb(255,138,91) 0%, transparent 70%)"}}/>
        <div className="absolute top-[20%] right-0 w-[50%] max-w-[500px] h-[40%] rounded-full blur-[100px] opacity-[0.12]" style={{background:"radial-gradient(60% 60% at 50% 50%, rgb(135,206,235) 0%, transparent 70%)"}}/>
        <div className="absolute bottom-0 left-[10%] w-[70%] max-w-[600px] h-[30%] rounded-full blur-[90px] opacity-[0.10]" style={{background:"radial-gradient(60% 60% at 50% 50%, rgb(143,177,128) 0%, transparent 70%)"}}/>
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6 border-b border-[var(--line)]/50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[var(--text)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[var(--bg)]"/>
          </div>
          <span className="mono text-[11px] tracking-[0.28em] text-[var(--muted)]">AURASPANSE • REVEAL</span>
        </div>
        <div className="mono text-[10px] text-[var(--muted)] hidden md:block">7-COLOR PROJECTION • DISTANCE RELEVANCE • NO HEX</div>
      </header>

      <main className="relative z-10 max-w-[1320px] mx-auto px-5 md:px-10 pb-24 w-full overflow-hidden">
        <section className="pt-10 md:pt-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-[680px]">
              <h1 className="text-[40px] md:text-[62px] leading-[0.9] tracking-[-0.03em] font-[400]">
                AuraSpanse <br/>
                <span className="italic font-[300] text-[var(--muted)]">Birthdate Reveal</span><br/>
                Sequence — 7 hues<br/>left to right.
              </h1>
              <p className="mono text-[12px] leading-5 text-[var(--muted)] mt-6 max-w-[500px]">
                Inner hue projects first 3 colors from it left to right. Outer hue starts from the right with its 3 dominant hues going left. Middle is new aura hue composed only when all 3 left and 3 right are introduced and blended. All 7 change on relevance of distance from core inner far left to core outer far right.
              </p>
            </div>
            <div className="lg:w-[380px] mono text-[11px] leading-5 text-[var(--muted)] border-l border-[var(--line)] pl-6">
              <div>Chico default: 39.7 N • -121.8 W • WGS84</div>
              <div className="mt-2 opacity-80">1 Maroon 8323101 • 2 Coral 16744272 • 3 Amber 13840175 • 4 Sage 9127187 middle aura • 5 Aqua 1342144 • 6 Periwinkle 11591910 • 7 Sky Blue 10595839. Distance relevance: closer to inner = more red warmth, closer to outer = more blue trust. Opacity fades with distance to main deposits 0.15–0.97.</div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-12 gap-3 md:gap-4 p-4 md:p-6 rounded-[18px] bg-[var(--surface)]/80 border border-[var(--line)] backdrop-blur-xl">
            <div className="col-span-6 md:col-span-2">
              <label className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">MONTH</label>
              <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="mt-2 w-full h-[48px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--line)] px-3 text-[22px] outline-none focus:border-[var(--text)]/30">
                {Array.from({length:12},(_,i)=>i+1).map(m=>(
                  <option key={m} value={m}>{new Date(0,m-1).toLocaleString('en',{month:'long'})}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">DAY</label>
              <input type="number" min={1} max={31} value={day} onChange={e=>setDay(Number(e.target.value))} className="mt-2 w-full h-[48px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--line)] px-3 text-[22px] outline-none"/>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">YEAR</label>
              <input type="number" min={1900} max={2026} value={year} onChange={e=>setYear(Number(e.target.value))} className="mt-2 w-full h-[48px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--line)] px-3 text-[22px] outline-none"/>
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">TIME</label>
              <select value={time} onChange={e=>setTime(e.target.value as TimeOpt)} className="mt-2 w-full h-[48px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--line)] px-3 text-[16px] outline-none">
                <option value="morning">morning • light</option>
                <option value="noon">noon • base</option>
                <option value="night">night • dark variant</option>
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">LOCATION</label>
              <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Chico, CA 39.7, -121.8" className="mt-2 w-full h-[48px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--line)] px-3 text-[13px] mono outline-none"/>
            </div>
            <div className="col-span-12 md:col-span-2 flex items-end">
              <button onClick={handleReveal} className="w-full h-[48px] rounded-[12px] bg-[var(--text)] text-[var(--bg)] mono text-[12px] tracking-[0.18em] hover:opacity-90 transition-opacity">
                REVEAL 7 HUES
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 mono text-[10px] text-[var(--muted)]">
            <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)]">INNER 1→3 LEFT→RIGHT</span>
            <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)]">OUTER 7→5 RIGHT→LEFT</span>
            <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)]">MIDDLE 4 BLENDS ALL • 6" MEETING</span>
            <span className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)]">DISTANCE RELEVANCE SPECTRUM</span>
            {revealed && <button onClick={reset} className="ml-auto underline">reset</button>}
          </div>
        </section>

        <div ref={containerRef} className="mt-12">
          {!revealed ? (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] h-[420px] flex flex-col items-center justify-center gap-3 bg-[var(--bg-2)]/50">
              <div className="w-12 h-12 rounded-full border border-[var(--line)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-pulse"/>
              </div>
              <div className="mono text-[11px] text-[var(--muted)]">Awaiting birthdate • 7 aura positions dormant • inner 1-3 left→right, outer 7-5 right→left</div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6 lg:gap-8">
              <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-8 self-start">
                <div className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-3 md:p-4 overflow-hidden">
                  <div className="relative w-full aspect-[4/5] rounded-[18px] overflow-hidden bg-[#0b0f1c]">
                    <AuraVisual spectrum={spectrum} inner={inner} outer={outer} step={step} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 mono text-[9px] tracking-wide">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background:`rgb(${inner?.rgb.join(",")})`}}/>
                      <span className="text-[var(--muted)]">CORE INNER 1 • 2" • {inner?.zodiac.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background:`rgb(${blendedMiddle?.finalRgb.join(",")})`}}/>
                      <span className="text-[var(--muted)]">MIDDLE 4 • 6" • SAGE {blendedMiddle?.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background:`rgb(${outer?.rgb.join(",")})`, opacity: outer?.opacity}}/>
                      <span className="text-[var(--muted)]">CORE OUTER 7 • 12" • {outer?.stone.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] bg-[var(--surface)] border border-[var(--line)] p-4">
                  <div className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">OPACITY FADING VISUALIZATION • DISTANCE TO DEPOSIT</div>
                  <div className="mt-3 h-[36px] rounded-[10px] overflow-hidden flex">
                    {Array.from({length:20},(_,i)=>{
                      const op = 0.97 - (i/19)*0.82
                      return <div key={i} className="flex-1" style={{background:`rgb(${outer?.rgb.join(",")})`, opacity: op}}/>
                    })}
                  </div>
                  <div className="mt-2 flex justify-between mono text-[9px] text-[var(--muted)]">
                    <span>0.15 • FAR • {outer?.distanceKm}km from {outer?.mainDeposit}</span>
                    <span>0.97 • NEAR • DEPOSIT</span>
                  </div>
                  <div className="mt-2 text-[11px] leading-4 text-[var(--muted)] mono">
                    Current outer opacity: <span className="text-[var(--text)]">{outer?.opacity}</span> — stronger closer. Inner time variant: <span className="text-[var(--text)]">{time}</span>. Days alive weight: <span className="text-[var(--text)]">{inner?.daysAlive}</span>.
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] bg-[var(--bg-2)] border border-[var(--line)] p-4">
                  <div className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">SPECTRUM DISTANCE RELEVANCE</div>
                  <div className="mt-3 h-[18px] rounded-full overflow-hidden flex border border-[var(--line)]">
                    {spectrum?.map(s=>(
                      <div key={s.pos} className="flex-1 relative" style={{background:`rgb(${s.finalRgb.join(",")})`}}>
                        {s.pos===1 && <div className="absolute -top-1 left-0 w-px h-[22px] bg-white/40"/>}
                        {s.pos===7 && <div className="absolute -top-1 right-0 w-px h-[22px] bg-white/40"/>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 mono text-[9px] text-[var(--muted)] flex justify-between">
                    <span>1 MAROON • WARMTH • RED</span>
                    <span>4 SAGE • BLEND • CENTER</span>
                    <span>7 SKY BLUE • TRUST • BLUE</span>
                  </div>
                  <div className="mt-3 mono text-[10px] leading-4 text-[var(--muted)]">
                    All 7 from left to right change on relevance of distance from each other — from core inner far left to core outer far right, colors in between shift accordingly to distance of 1 from 2 on spectrum.
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                {/* 7 swatches bar */}
                <div className="rounded-[22px] bg-[var(--surface)] border border-[var(--line)] p-5">
                  <div className="flex justify-between items-center">
                    <div className="mono text-[11px] tracking-[0.22em]">7 SWATCHES LEFT TO RIGHT NUMBERED 1-7</div>
                    <div className="mono text-[9px] text-[var(--muted)]">{step===0?"awaiting": step<4?`inner phase ${step}/3 • left side introducing`: step<7?`outer phase ${step-3}/3 • right side introducing`: "middle aura blended • all 7 active"}</div>
                  </div>

                  <div className="mt-5 grid grid-cols-7 gap-2 md:gap-3">
                    {spectrum?.map((s)=>{
                      const visible =
                        (s.pos===1 && step>=1) ||
                        (s.pos===2 && step>=2) ||
                        (s.pos===3 && step>=3) ||
                        (s.pos===7 && step>=4) ||
                        (s.pos===6 && step>=5) ||
                        (s.pos===5 && step>=6) ||
                        (s.pos===4 && step>=7)
                      const projecting =
                        (s.pos<=3 && step>=s.pos && step<=3) ||
                        (s.pos>=5 && step>= (10-s.pos) && step<=6) // 7->4,6->5,5->6 mapping
                      return (
                        <div key={s.pos} className={`group transition-all duration-700 ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90"}`}>
                          <div className={`aspect-[3/4.2] rounded-[14px] border overflow-hidden relative flex flex-col justify-between p-2.5 ${s.pos===4 && step>=7 ? "animate-[pulse_2.4s_ease-in-out_infinite]" : ""}`} style={{
                            background:`rgb(${s.finalRgb.join(",")})`,
                            borderColor: visible ? `rgba(${s.finalRgb.join(",")},0.5)` : "var(--line)",
                            boxShadow: visible ? `0 8px 24px rgba(${s.finalRgb.join(",")},0.28), inset 0 1px 0 rgba(255,255,255,0.2)` : undefined,
                            transform: projecting ? (s.pos<=3 ? "translateX(4px)" : "translateX(-4px)") : undefined
                          }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent pointer-events-none"/>
                            <div className="relative flex justify-between items-start">
                              <span className="mono text-[11px] font-bold text-white drop-shadow">{s.pos}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${visible?"bg-white animate-pulse":"bg-white/30"}`}/>
                            </div>
                            <div className="relative">
                              <div className="mono text-[8px] leading-none text-white/90">{s.origin==="inner-core"?"INNER CORE": s.origin==="outer-core"?"OUTER CORE": s.pos===4?"NEW AURA":"PROJ"}</div>
                              <div className="mt-1 mono text-[7px] text-white/70 leading-tight">{s.pos<=3?"→ RIGHT": s.pos>=5?"← LEFT":"◉ BLEND"}</div>
                            </div>
                            {s.pos===1 && <div className="absolute -right-2 top-1/2 w-3 h-px bg-white/40 hidden md:block"/>}
                            {s.pos===7 && <div className="absolute -left-2 top-1/2 w-3 h-px bg-white/40 hidden md:block"/>}
                          </div>
                          <div className="mt-2 mono text-[9px] leading-tight">
                            <div className="text-[var(--text)] font-[600] truncate">{s.name}</div>
                            <div className="text-[var(--muted)]">{s.code}</div>
                            <div className="mt-1 text-[8px] text-[var(--muted)] leading-3">d{s.distanceFromInner} from 1 • d{s.distanceFromOuter} from 7</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 h-[10px] rounded-full overflow-hidden flex border border-[var(--line)]">
                    {spectrum?.map(s=>{
                      const active =
                        (s.pos===1 && step>=1) ||
                        (s.pos===2 && step>=2) ||
                        (s.pos===3 && step>=3) ||
                        (s.pos===7 && step>=4) ||
                        (s.pos===6 && step>=5) ||
                        (s.pos===5 && step>=6) ||
                        (s.pos===4 && step>=7)
                      return <div key={s.pos} className={`flex-1 transition-all duration-700 ${active?"opacity-100":"opacity-20"}`} style={{background:`rgb(${s.finalRgb.join(",")})`}}/>
                    })}
                  </div>
                  <div className="mt-2 flex justify-between mono text-[8px] text-[var(--muted)]">
                    <span>LEFT • INNER CORE 8323101 • projecting →</span>
                    <span className="hidden md:inline">DISTANCE 1→2 RELEVANCE: CLOSER = MORE INFLUENCE</span>
                    <span>← projecting • OUTER CORE 10595839 • RIGHT</span>
                  </div>
                </div>

                <StepCard
                  active={step>=1}
                  index={1}
                  title="INNER — first 3 colors left to right"
                  subtitle={`CORE INNER FAR LEFT 1 MAROON 8323101 • ZODIAC ${inner?.zodiac} • TIME ${time} • ${inner?.daysAlive} days alive weight • projecting right`}
                  glowRgb={spectrum?.[0].finalRgb}
                >
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-7">
                      <div className="mono text-[10px] text-[var(--muted)] tracking-[0.2em]">SEQUENCE 1→3 • PAUSE LEFT SIDE INTRODUCED</div>
                      <div className="mt-3 space-y-3">
                        {spectrum?.slice(0,3).map(s=>{
                          const isActive = step>=s.pos
                          return (
                            <div key={s.pos} className={`flex gap-3 p-3 rounded-[12px] border transition-all duration-500 ${isActive?"bg-[var(--bg-2)] border-[var(--line)] opacity-100":"border-dashed opacity-50"}`}>
                              <div className="w-12 h-12 rounded-[10px] border border-[var(--line)] shrink-0" style={{background:`rgb(${s.finalRgb.join(",")})`, boxShadow: isActive?`0 0 20px rgba(${s.finalRgb.join(",")},0.5)`:"none"}}/>
                              <div className="mono text-[11px] leading-4">
                                <div className="flex gap-2"><span className="text-[var(--text)] font-bold">{s.pos} {s.name.toUpperCase()}</span><span className="text-[var(--muted)]">CODE {s.code}</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${isActive?"bg-white text-black":"bg-[var(--surface-2)]"}`}>{isActive?"PROJECTING →":"await"}</span></div>
                                <div className="text-[var(--muted)] mt-1">{s.emotion} • final rgb({s.finalRgb.join(", ")}) • base rgb({s.baseRgb.join(", ")}) • distance from 1 = {s.distanceFromInner} • shift toward neighbor by 12% • {s.pos===1?"far left core, 2 inches":"projecting right, more red warmth when closer to 1"}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {step>=3 && step<4 && <div className="mt-4 mono text-[10px] px-3 py-2 rounded-full bg-[var(--text)] text-[var(--bg)] inline-block animate-pulse">PAUSE — LEFT SIDE 3 INTRODUCED • AWAITING RIGHT SIDE</div>}
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <div className="w-full aspect-square rounded-[16px] border border-[var(--line)] overflow-hidden relative p-3" style={{background:`radial-gradient(70% 70% at 50% 30%, rgba(${spectrum?.[0].finalRgb.join(",")},0.5) 0%, rgba(${spectrum?.[0].finalRgb.join(",")},0.15) 45%, transparent 75%)`}}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[38%] h-[38%] rounded-full border border-white/10" style={{background:`rgb(${spectrum?.[0].finalRgb.join(",")})`, boxShadow:`0 0 30px rgba(${spectrum?.[0].finalRgb.join(",")},0.7)`}}/>
                          <div className="absolute w-[56%] h-[56%] rounded-full border border-dashed border-white/10" style={{borderColor:`rgba(${spectrum?.[1]?.finalRgb.join(",")},0.5)`}}/>
                          <div className="absolute w-[72%] h-[72%] rounded-full border border-dashed border-white/10" style={{borderColor:`rgba(${spectrum?.[2]?.finalRgb.join(",")},0.35)`}}/>
                        </div>
                        <div className="absolute bottom-2 left-2 mono text-[9px] px-2 py-1 rounded-full bg-black/40 text-white/80 border border-white/10">1→3 LEFT→RIGHT PROJECTION</div>
                      </div>
                      <div className="mt-3 mono text-[10px] text-[var(--muted)] leading-4">Inner projects first 3 colors from it left to right. Core inner far left Code 8323101 Maroon — zodiac {inner?.zodiac} + time {time} + daysAlive {inner?.daysAlive} weight — show first at far left of gradient. Inner proj 2 Coral 16744272 second from left, proj 3 Amber 13840175 third from left projecting right.</div>
                    </div>
                  </div>
                </StepCard>

                <StepCard active={step>=4} index={2} title="OUTER — 3 dominant hues right to left" subtitle={`CORE OUTER FAR RIGHT 7 SKY BLUE 10595839 • ${outer?.stone} • ${outer?.mainDeposit} • ${outer?.distanceKm}km • opacity ${outer?.opacity} • projecting left`} glowRgb={spectrum?.[6].finalRgb}>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-7">
                      <div className="mono text-[10px] text-[var(--muted)] tracking-[0.2em]">SEQUENCE 7→5 • PAUSE RIGHT SIDE INTRODUCED</div>
                      <div className="mt-3 space-y-3">
                        {spectrum?.slice(4,7).reverse().map(s=>{
                          const orderMap:Record<number,number> = {7:4,6:5,5:6}
                          const needStep = orderMap[s.pos]
                          const isActive = step>=needStep
                          return (
                            <div key={s.pos} className={`flex gap-3 p-3 rounded-[12px] border transition-all duration-500 ${isActive?"bg-[var(--bg-2)] border-[var(--line)] opacity-100":"border-dashed opacity-50"}`}>
                              <div className="w-12 h-12 rounded-[10px] border border-[var(--line)] shrink-0" style={{background:`rgb(${s.finalRgb.join(",")})`, opacity: s.pos===7 ? outer?.opacity : 1, boxShadow: isActive?`0 0 20px rgba(${s.finalRgb.join(",")},0.5)`:"none"}}/>
                              <div className="mono text-[11px] leading-4">
                                <div className="flex gap-2 flex-wrap"><span className="text-[var(--text)] font-bold">{s.pos} {s.name.toUpperCase()}</span><span className="text-[var(--muted)]">CODE {s.code}</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${isActive?"bg-white text-black":"bg-[var(--surface-2)]"}`}>{isActive?"PROJECTING ←":"await"}</span>{s.pos===7 && <span className="text-[var(--muted)]">op {outer?.opacity}</span>}</div>
                                <div className="text-[var(--muted)] mt-1">{s.emotion} • final rgb({s.finalRgb.join(", ")}) • distance from 7 = {s.distanceFromOuter} • {s.pos===7?"far right core, 12 inches, opacity fading":"going left, more blue trust when closer to 7"}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {step>=6 && step<7 && <div className="mt-4 mono text-[10px] px-3 py-2 rounded-full bg-[var(--text)] text-[var(--bg)] inline-block animate-pulse">PAUSE — RIGHT SIDE 3 INTRODUCED • READY TO BLEND MIDDLE</div>}
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <div className="w-full aspect-square rounded-[16px] border border-[var(--line)] overflow-hidden relative p-3" style={{background:`radial-gradient(70% 70% at 50% 30%, rgba(${outer?.rgb.join(",")},${outer?.opacity}) 0%, rgba(${outer?.rgb.join(",")},0.12) 55%, transparent 80%)`}}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[88%] h-[88%] rounded-full border" style={{borderColor:`rgba(${spectrum?.[6].finalRgb.join(",")},${outer?.opacity})`, boxShadow:`0 0 40px rgba(${spectrum?.[6].finalRgb.join(",")},${outer?.opacity})`}}/>
                          <div className="absolute w-[68%] h-[68%] rounded-full border border-dashed" style={{borderColor:`rgba(${spectrum?.[5].finalRgb.join(",")},0.5)`}}/>
                          <div className="absolute w-[52%] h-[52%] rounded-full border border-dashed border-white/10" style={{borderColor:`rgba(${spectrum?.[4].finalRgb.join(",")},0.4)`}}/>
                        </div>
                        <div className="absolute bottom-2 left-2 mono text-[9px] px-2 py-1 rounded-full bg-black/40 text-white/80 border border-white/10">7→5 RIGHT→LEFT • {outer?.opacity}</div>
                      </div>
                      <div className="mt-3 mono text-[10px] text-[var(--muted)] leading-4">Outer hue starts from the right with its 3 dominant hues going to the left. Core outer far right Code 10595839 Sky Blue — birthstone proximity opacity + location — show first at far right. Outer proj 2 Periwinkle 11591910 sixth position going left, outer proj 1 Aqua 1342144 fifth position going left.</div>
                    </div>
                  </div>
                </StepCard>

                <StepCard active={step>=7} index={3} title="MIDDLE — new aura hue composed when all introduced" subtitle="4 SAGE CODE 9127187 • CENTER • FINAL AURA • ALL 7 SHIFT BY DISTANCE RELEVANCE FROM CORE INNER FAR LEFT TO CORE OUTER FAR RIGHT" glowRgb={spectrum?.[3].finalRgb}>
                  <div>
                    <div className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">7 COLORS LEFT TO RIGHT • DISTANCE OF 1 FROM 2 ON SPECTRUM</div>
                    <div className="mt-4 grid grid-cols-12 gap-4 items-center p-4 rounded-[16px] bg-[var(--bg-2)] border border-[var(--line)]">
                      <div className="col-span-12 md:col-span-8">
                        <div className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">FINAL BLENDED MIDDLE AURA — COMPOSED ONLY WHEN 3 LEFT + 3 RIGHT INTRODUCED</div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-3">
                          <span className="text-[36px] leading-none tracking-[-0.02em]">{blendedMiddle?.code}</span>
                          <span className="text-[22px]">{blendedMiddle?.name} — <span className="italic">{blendedMiddle?.emotion}</span></span>
                        </div>
                        <div className="mt-3 mono text-[11px] text-[var(--muted)] leading-5">
                          Calculation: avg of 6 surrounding finals + Sage base 9127187 + center spectrum lerp. Closer to inner = more red warmth, closer to outer = more blue trust. Distance relevance: colors in between shift accordingly to distance of 1 from 2 on spectrum — 2 influenced 12% by 1, 3 by 2, etc, and reverse 10% from right.
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 mono text-[10px]">
                          <div className="p-2 rounded-[10px] bg-[var(--surface)] border border-[var(--line)]">BASE RGB: {blendedMiddle?.baseRgb.join(", ")}</div>
                          <div className="p-2 rounded-[10px] bg-[var(--surface)] border border-[var(--line)]">FINAL RGB: {blendedMiddle?.finalRgb.join(", ")} • SPECTRUM SHIFTED</div>
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <div className="w-full aspect-square rounded-[22px] border border-[var(--line)] flex items-center justify-center relative overflow-hidden" style={{background:`radial-gradient(60% 60% at 50% 50%, rgb(${blendedMiddle?.finalRgb.join(",")}) 0%, rgba(${blendedMiddle?.finalRgb.join(",")},0.25) 60%, transparent 100%)`}}>
                          <div className="w-[62%] h-[62%] rounded-full animate-[pulse_2s_ease-in-out_infinite]" style={{background:`rgb(${blendedMiddle?.finalRgb.join(",")})`, boxShadow:`0 0 50px rgba(${blendedMiddle?.finalRgb.join(",")},0.9)`}}/>
                          <div className="absolute w-[84%] h-[84%] rounded-full border border-dashed border-white/10 animate-[spin_18s_linear_infinite]"/>
                          <div className="absolute bottom-2 left-2 mono text-[8px] px-2 py-1 rounded-full bg-black/50 text-white/80 border border-white/10">6" MIDDLE • {blendedMiddle?.code}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="mono text-[10px] text-[var(--muted)] tracking-[0.2em]">FULL SPECTRUM GRADIENT BAR • LEFT TO RIGHT SHIFT</div>
                      <div className="mt-3 h-[28px] rounded-full overflow-hidden flex border border-[var(--line)] p-1 bg-[var(--bg-2)]">
                        {spectrum?.map(s=>(
                          <div key={s.pos} className="flex-1 rounded-full mx-0.5 transition-all duration-1000" style={{background:`rgb(${s.finalRgb.join(",")})`, opacity: s.pos===7 ? s.opacity : 1}}/>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1 mono text-[8px] text-[var(--muted)]">
                        {spectrum?.map(s=>(
                          <div key={s.pos} className="text-center truncate">{s.pos} {s.code}</div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 mono text-[10px] leading-5 text-[var(--muted)] border-t border-[var(--line)] pt-4">
                      Implementation: Reveal sequence after birthdate entry: 1 core inner far left Code 8323101 Maroon — zodiac {inner?.zodiac} + time {time} + daysAlive {inner?.daysAlive} weight — show first at far left of gradient • 2 inner projection 2 Coral Code 16744272 second from left • 3 inner projection 3 Amber Code 13840175 third from left projecting right • Pause left side 3 introduced • 4 core outer far right Code 10595839 Sky Blue — birthstone {outer?.stone} proximity opacity {outer?.opacity} + location {outer?.mainDeposit} — show first at far right • 5 outer projection 2 Periwinkle Code 11591910 sixth position going left • 6 outer projection 1 Aqua Code 1342144 fifth position going left • Pause right side 3 introduced • 7 middle new aura hue Code 9127187 Sage composed only when all 3 left and 3 right introduced and blended — show in center as final Aura. All 7 from left to right change on relevance of distance on spectrum from each other — from core inner far left to core outer far right colors in between change accordingly to distance of 1 from 2 on spectrum.
                    </div>
                  </div>
                </StepCard>

                <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)]/60 p-4 mono text-[10px] leading-5 text-[var(--muted)]">
                  <span className="text-[var(--text)]">Note:</span> symbolic lexicon, not medical. Mapping: zodiac→inner hue algorithm = month/day lookup + time dark/light variant + daysAlive weight modulates finalRgb. Outer proximity opacity = 0.97 - (distance/max 16200km)*0.82 clamped 0.15-0.97. Middle = Sage 9127187 base blended with avg of surrounding 6 + center spectrum. No hex codes displayed — only explicit Code numbers. Dark background with glowing arcs at 2", 6", 12". Inner 1-3 project left→right, outer 7-5 project right→left, middle 4 pulsing.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-[var(--line)]/50 mt-8 py-6 px-6 md:px-10 flex justify-between mono text-[10px] text-[var(--muted)]">
        <span>AURASPANSE • BIRTHDATE REVEAL SEQUENCE • 7 HUES 1-7</span>
        <span className="hidden md:inline">2" • 6" • 12" concentric arcs • distance relevance • side profile</span>
      </footer>
    </div>
  )
}

function StepCard({active,index,title,subtitle,children, glowRgb}:{active:boolean,index:number,title:string,subtitle:string,children:React.ReactNode, glowRgb?:[number,number,number]}){
  return (
    <div className={`rounded-[22px] border bg-[var(--surface)]/90 backdrop-blur-xl transition-all duration-700 ease-out ${active ? "border-[var(--text)]/20 opacity-100 translate-y-0" : "border-[var(--line)] opacity-0 translate-y-8 pointer-events-none"} `} style={{boxShadow: active && glowRgb ? `0 0 0 1px rgba(${glowRgb.join(",")},0.15), 0 20px 60px rgba(${glowRgb.join(",")},0.12)` : undefined}}>
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-2)] border border-[var(--line)] flex items-center justify-center mono text-[11px]">{index}</div>
            <div className="max-w-[520px]">
              <div className="mono text-[11px] tracking-[0.20em] leading-4">{title}</div>
              <div className="mono text-[9px] text-[var(--muted)] mt-1 leading-4">{subtitle}</div>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{background: glowRgb ? `rgb(${glowRgb.join(",")})` : "var(--line)", boxShadow: glowRgb ? `0 0 10px rgb(${glowRgb.join(",")})` : undefined, opacity: active?1:0}}/>
        </div>
        <div className={`mt-6 transition-all duration-700 delay-200 ${active ? "opacity-100" : "opacity-0"}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

function AuraVisual({spectrum, inner, outer, step}:{spectrum:SpectrumSwatch[]|null, inner:InnerHue|null, outer:OuterHue|null, step:number}){
  const cx = 145
  const cy = 130
  // radii for 7 positions: inner smallest to outer largest
  const radii = [42, 66, 90, 128, 166, 194, 230]
  const getVisible = (pos:number)=>{
    if(pos===1) return step>=1
    if(pos===2) return step>=2
    if(pos===3) return step>=3
    if(pos===7) return step>=4
    if(pos===6) return step>=5
    if(pos===5) return step>=6
    if(pos===4) return step>=7
    return false
  }
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 400 560" className="w-full h-full">
        <defs>
          <filter id="glow1"><feGaussianBlur stdDeviation="10" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow2"><feGaussianBlur stdDeviation="18" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow3"><feGaussianBlur stdDeviation="26" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect width="400" height="560" fill="#0b0f1c"/>
        <g transform="translate(20, 60)">
          <path d="M 60 20 C 90 15, 125 30, 128 70 C 130 90, 122 110, 115 125 C 118 135, 110 150, 95 155 C 85 158, 75 150, 70 140 C 55 130, 45 110, 42 90 C 38 60, 40 30, 60 20 Z" fill="#121727" stroke="#1e263d" strokeWidth="1.2"/>
          <path d="M 128 70 L 142 85 L 130 92" fill="none" stroke="#1e263d" strokeWidth="1" opacity="0.8"/>
          <path d="M 70 140 C 60 170, 55 210, 70 260 L 50 260 C 35 210, 40 160, 58 135 Z" fill="#121727" stroke="#1e263d" strokeWidth="1"/>
          <path d="M 50 260 C 80 270, 130 280, 180 285" fill="none" stroke="#1e263d" strokeWidth="1" opacity="0.6"/>
        </g>

        {spectrum?.map((s,i)=>{
          const r = radii[i]
          const visible = getVisible(s.pos)
          const isInner = s.pos<=3
          const isOuter = s.pos>=5
          const isMiddle = s.pos===4
          const stroke = isMiddle ? `rgb(${s.finalRgb.join(",")})` : isOuter && s.pos===7 ? `rgba(${s.finalRgb.join(",")},${s.opacity ?? 0.9})` : `rgb(${s.finalRgb.join(",")})`
          const width = isMiddle ? 3.2 : isInner ? (s.pos===1?3.4:2.2) : (s.pos===7?2.6:1.8)
          const dash = isMiddle ? "0" : isOuter ? "5 7" : "0"
          return (
            <g key={s.pos} opacity={visible?1:0} className="transition-opacity duration-1000">
              {/* top arc */}
              <path d={`M ${cx+r} ${cy} A ${r} ${r} 0 0 0 ${cx+8} ${cy - r + 8}`} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash} filter={isMiddle || s.pos===1 || s.pos===7 ? "url(#glow1)" : undefined} opacity={isMiddle?1: isInner?0.9 : 0.75}/>
              {/* bottom arc fainter */}
              <path d={`M ${cx+r} ${cy} A ${r} ${r} 0 0 1 ${cx+8} ${cy + r - 8}`} fill="none" stroke={stroke} strokeWidth={width*0.6} opacity={isMiddle?0.5:0.35}/>
              {/* glow fill for outer */}
              {s.pos===7 && <path d={`M ${cx} ${cy} L ${cx+r} ${cy} A ${r} ${r} 0 0 0 ${cx+8} ${cy - r + 8} Z`} fill={`rgba(${s.finalRgb.join(",")},0.05)`}/>}
              {isMiddle && step>=7 && <circle cx={cx+r} cy={cy} r={3.5} fill={stroke} filter="url(#glow2)" className="animate-[pulse_1.6s_ease-in-out_infinite]"/>}
              {s.pos===1 && <circle cx={cx+r} cy={cy} r={3} fill={stroke} filter="url(#glow1)"/>}
            </g>
          )
        })}

        {/* projection arrows */}
        {step>=1 && step<=3 && (
          <g opacity="0.5">
            <path d={`M ${cx+radii[0]} ${cy} L ${cx+radii[2]+12} ${cy}`} stroke="white" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4"/>
            <text x={cx+radii[1]} y={cy-8} fontSize="7" fill="white" opacity="0.6" className="mono">→ projecting right</text>
          </g>
        )}
        {step>=4 && step<=6 && (
          <g opacity="0.5">
            <path d={`M ${cx+radii[6]} ${cy} L ${cx+radii[4]-10} ${cy}`} stroke="white" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4"/>
            <text x={cx+radii[5]-30} y={cy+18} fontSize="7" fill="white" opacity="0.6" className="mono">← going left</text>
          </g>
        )}

        <g className="mono" fontSize="8.5" fill="#8c8fa1">
          {step>=1 && <text x={cx+radii[0]+8} y={cy-34} fill={`rgb(${spectrum?.[0].finalRgb.join(",")})`}>2" • 1 MAROON {spectrum?.[0].code}</text>}
          {step>=7 && <text x={cx+radii[3]+10} y={cy-52} fill={`rgb(${spectrum?.[3].finalRgb.join(",")})`}>6" • 4 SAGE {spectrum?.[3].code} • NEW AURA</text>}
          {step>=4 && <text x={cx+radii[6]-10} y={cy-74} fill={`rgba(${spectrum?.[6].finalRgb.join(",")},0.9)`}>12" • 7 SKY {spectrum?.[6].code} • {outer?.opacity}</text>}
        </g>
      </svg>

      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/40 transition-all duration-500 ${step>=1?"opacity-100":"opacity-0"}`} style={{borderColor:`rgba(${spectrum?.[0].finalRgb.join(",")},0.35)`, color:`rgb(${spectrum?.[0].finalRgb.join(",")})`}}>1 INNER CORE {spectrum?.[0].code} MAROON</div>
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/40 transition-all duration-700 ${step>=2?"opacity-100":"opacity-0"}`} style={{borderColor:`rgba(${spectrum?.[1].finalRgb.join(",")},0.35)`, color:`rgb(${spectrum?.[1].finalRgb.join(",")})`}}>2 CORAL {spectrum?.[1].code} → RIGHT</div>
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/40 transition-all duration-700 ${step>=3?"opacity-100":"opacity-0"}`} style={{borderColor:`rgba(${spectrum?.[2].finalRgb.join(",")},0.35)`, color:`rgb(${spectrum?.[2].finalRgb.join(",")})`}}>3 AMBER {spectrum?.[2].code} → RIGHT • PAUSE LEFT 3</div>
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/40 transition-all duration-700 ${step>=4?"opacity-100":"opacity-0"}`} style={{borderColor:`rgba(${spectrum?.[6].finalRgb.join(",")},0.35)`, color:`rgb(${spectrum?.[6].finalRgb.join(",")})`}}>7 OUTER CORE {spectrum?.[6].code} SKY BLUE • OP {outer?.opacity}</div>
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/40 transition-all duration-700 ${step>=5?"opacity-100":"opacity-0"}`} style={{borderColor:`rgba(${spectrum?.[5].finalRgb.join(",")},0.35)`, color:`rgb(${spectrum?.[5].finalRgb.join(",")})`}}>6 PERIWINKLE {spectrum?.[5].code} ← LEFT</div>
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/40 transition-all duration-700 ${step>=6?"opacity-100":"opacity-0"}`} style={{borderColor:`rgba(${spectrum?.[4].finalRgb.join(",")},0.35)`, color:`rgb(${spectrum?.[4].finalRgb.join(",")})`}}>5 AQUA {spectrum?.[4].code} ← LEFT • PAUSE RIGHT 3</div>
        <div className={`mono text-[9px] px-2.5 py-1 rounded-full border backdrop-blur bg-black/50 transition-all duration-700 ${step>=7?"opacity-100":"opacity-0"} animate-[pulse_2s_ease-in-out_infinite]`} style={{borderColor:`rgba(${spectrum?.[3].finalRgb.join(",")},0.5)`, color:`rgb(${spectrum?.[3].finalRgb.join(",")})`}}>4 SAGE {spectrum?.[3].code} • NEW AURA BLENDED • CENTER PULSE</div>
      </div>

      <div className="absolute bottom-3 left-3 right-3">
        <div className="h-[6px] rounded-full overflow-hidden flex bg-black/40 border border-white/10 p-0.5">
          {spectrum?.map(s=>{
            const vis = (s.pos===1&&step>=1)||(s.pos===2&&step>=2)||(s.pos===3&&step>=3)||(s.pos===7&&step>=4)||(s.pos===6&&step>=5)||(s.pos===5&&step>=6)||(s.pos===4&&step>=7)
            return <div key={s.pos} className={`flex-1 mx-0.5 rounded-full transition-all duration-700 ${vis?"opacity-100":"opacity-20"}`} style={{background:`rgb(${s.finalRgb.join(",")})`}}/>
          })}
        </div>
      </div>
    </div>
  )
}
