import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Christmas evening in an Alsatian village: indigo dusk, lamplight amber, holly red.
const { theme, problems } = makeColors({
  label: 'Alsace Christmas evening',
  only: 'dark',
  roles: { accent: '#f0b860', danger: '#e45a4f', success: '#5cc08a', warning: '#eea640', pro: '#b097e8' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#11162a',
        'surface-1': '#161c33',
        'surface-2': '#1b223b',
        'surface-3': '#1f2741',
        'text-primary': '#f6efe2',
        'text-secondary': '#d9d4cb',
        'text-muted': '#b0adb0',
      },
    },
  },
})

// Deterministic pseudo-random so the scene is identical every load.
let seed = 20261224
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const r1 = (n: number) => Math.round(n * 10) / 10

const W = 1600
const H = 1000
const GROUND = 905
const TIMBER = '#3a2417'

function stars(n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = r1(rnd() * W)
    const y = r1(rnd() * H * 0.45)
    const s = r1(0.5 + rnd() * 1.2)
    out += `<circle class="tw" cx="${x}" cy="${y}" r="${s}" style="animation-delay:-${r1(rnd() * 4)}s"/>`
  }
  return out
}

// One band of flakes, drawn twice (one band above) so a translate of H loops seamlessly.
function snowLayer(n: number, rMin: number, rMax: number, cls: string): string {
  let band = ''
  for (let i = 0; i < n; i++) {
    band += `<circle cx="${r1(rnd() * W)}" cy="${r1(rnd() * H)}" r="${r1(rMin + rnd() * (rMax - rMin))}"/>`
  }
  return `<g class="${cls}"><g class="sway">${band}<g transform="translate(0 -${H})">${band}</g></g></g>`
}

// Warm string lights strung across the top of the sky.
function skyLights(): string {
  const colors = ['#ffd27a', '#fff1c9', '#ffb35c', '#ff7a5c', '#fff1c9']
  const spans: [number, number, number, number][] = [
    [-20, 30, 400, 55],
    [400, 55, 800, 35],
    [800, 35, 1200, 60],
    [1200, 60, 1620, 30],
  ]
  let wire = ''
  let bulbs = ''
  let k = 0
  for (const [x0, y0, x1, y1] of spans) {
    const cx = (x0 + x1) / 2
    const cy = Math.max(y0, y1) + 60
    wire += `<path d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}"/>`
    for (let t = 0.08; t < 0.95; t += 0.125) {
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1
      const c = colors[k % colors.length] ?? '#ffd27a'
      const d = r1((k * 0.37) % 2.4)
      bulbs += `<g transform="translate(${r1(x)} ${r1(y)})"><circle class="glow" cy="9" r="13" fill="${c}" style="animation-delay:-${d}s"/><circle class="bulb" cy="8" r="4" fill="${c}" style="animation-delay:-${d}s"/></g>`
      k++
    }
  }
  return `<g fill="none" stroke="#141a2c" stroke-width="1.6">${wire}</g>${bulbs}`
}

function windowAt(cx: number, cy: number, w: number, h: number, shutter: string): string {
  const x = r1(cx - w / 2)
  const y = r1(cy - h / 2)
  const d = r1(rnd() * 6)
  return `<g>
<rect class="wglow" x="${r1(x - 8)}" y="${r1(y - 8)}" width="${r1(w + 16)}" height="${r1(h + 16)}" rx="6" style="animation-delay:-${d}s"/>
<rect x="${r1(x - w * 0.42)}" y="${y}" width="${r1(w * 0.4)}" height="${h}" fill="${shutter}" stroke="${TIMBER}" stroke-width="1.5"/>
<rect x="${r1(x + w * 1.02)}" y="${y}" width="${r1(w * 0.4)}" height="${h}" fill="${shutter}" stroke="${TIMBER}" stroke-width="1.5"/>
<rect class="win" x="${x}" y="${y}" width="${w}" height="${h}" style="animation-delay:-${d}s"/>
<path d="M${r1(cx)} ${y}V${r1(y + h)}M${x} ${r1(cy)}H${r1(x + w)}" stroke="${TIMBER}" stroke-width="2.5"/>
<rect x="${r1(x - 4)}" y="${r1(y + h)}" width="${r1(w + 8)}" height="6" fill="${TIMBER}"/>
<rect x="${r1(x - 5)}" y="${r1(y + h - 3)}" width="${r1(w + 10)}" height="5" rx="2.5" fill="#f4f7fb"/>
</g>`
}

type House = { x: number; w: number; wallH: number; roofH: number; wall: string; shutter: string; chimney?: boolean; garland?: boolean }

// Blend a color toward the evening blue, so walls sit in dusk and windows glow.
function dusk(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const to = [0x23, 0x26, 0x50]
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c, i) => Math.round(c + ((to[i] ?? 0) - c) * k))
  return '#' + ch.map(c => c.toString(16).padStart(2, '0')).join('')
}

function house(o: House): string {
  const { x, w, wallH, roofH } = o
  const wall = dusk(o.wall, 0.32)
  const shutter = dusk(o.shutter, 0.2)
  const top = GROUND - wallH
  const cx = x + w / 2
  const floors = Math.max(2, Math.round(wallH / 95))
  const fh = wallH / floors
  const cols = w > 190 ? 4 : 3
  const cw = w / cols
  let s = ''

  // Walls and the gable that faces the street.
  s += `<rect x="${x}" y="${top}" width="${w}" height="${wallH}" fill="${wall}"/>`
  s += `<polygon points="${x},${top} ${r1(cx)},${top - roofH} ${x + w},${top}" fill="${wall}"/>`

  // Half-timbering: sills, posts and braces, floor by floor.
  let beams = `M${x} ${top}H${x + w}M${x} ${GROUND}H${x + w}M${x} ${top}V${GROUND}M${x + w} ${top}V${GROUND}`
  let windows = ''
  for (let f = 0; f < floors; f++) {
    const yt = top + f * fh
    const yb = yt + fh
    beams += `M${x} ${r1(yb)}H${x + w}`
    for (let c = 0; c < cols; c++) {
      const xl = x + c * cw
      const xr = xl + cw
      beams += `M${r1(xr)} ${r1(yt)}V${r1(yb)}`
      const isDoor = f === floors - 1 && c === Math.floor(cols / 2)
      if (isDoor) {
        const dw = cw * 0.6
        const dx = xl + (cw - dw) / 2
        const dt = yt + fh * 0.22
        windows += `<path d="M${r1(dx)} ${r1(yb)}V${r1(dt + dw / 2)}A${r1(dw / 2)} ${r1(dw / 2)} 0 0 1 ${r1(dx + dw)} ${r1(dt + dw / 2)}V${r1(yb)}Z" fill="#4a2a1a" stroke="${TIMBER}" stroke-width="3"/>`
        windows += `<circle cx="${r1(dx + dw / 2)}" cy="${r1(dt + dw * 0.75)}" r="${r1(dw * 0.24)}" fill="none" stroke="#2f6b3d" stroke-width="${r1(dw * 0.12)}"/>`
        windows += `<circle cx="${r1(dx + dw / 2)}" cy="${r1(dt + dw * 0.75 + dw * 0.22)}" r="${r1(dw * 0.06)}" fill="#c8312b"/>`
      } else if ((c + f) % 2 === 0) {
        windows += windowAt(xl + cw / 2, yt + fh * 0.48, cw * 0.42, fh * 0.46, shutter)
      } else if (f % 2 === 0) {
        beams += `M${r1(xl)} ${r1(yt)}L${r1(xr)} ${r1(yb)}M${r1(xr)} ${r1(yt)}L${r1(xl)} ${r1(yb)}`
      } else {
        beams += `M${r1(xl)} ${r1(yb)}L${r1(xl + cw / 2)} ${r1(yt)}L${r1(xr)} ${r1(yb)}`
      }
    }
  }
  // Gable timbers and an attic window.
  beams += `M${r1(cx)} ${top}V${r1(top - roofH + 18)}M${r1(x + w * 0.2)} ${top}L${r1(cx)} ${r1(top - roofH * 0.55)}L${r1(x + w * 0.8)} ${top}`
  windows += windowAt(cx, top - roofH * 0.32, w * 0.12, roofH * 0.2, shutter)
  s += `<path d="${beams}" fill="none" stroke="${TIMBER}" stroke-width="6" stroke-linecap="square"/>`
  s += windows

  // Chimney and smoke.
  if (o.chimney) {
    const chx = r1(x + w * 0.72)
    const chy = r1(top - roofH * 0.62)
    s += `<rect x="${chx}" y="${r1(chy - 30)}" width="18" height="44" fill="#6b3a2c"/><rect x="${r1(chx - 3)}" y="${r1(chy - 36)}" width="24" height="8" rx="3" fill="#f4f7fb"/>`
    for (let i = 0; i < 3; i++) {
      s += `<circle class="smoke" cx="${r1(chx + 9)}" cy="${r1(chy - 44)}" r="9" style="animation-delay:-${i * 2}s"/>`
    }
  }

  // Roof edge, then its snow cap.
  const L = `${x - 16},${top + 6}`
  const A = `${r1(cx)},${top - roofH - 4}`
  const R = `${x + w + 16},${top + 6}`
  s += `<polyline points="${L} ${A} ${R}" fill="none" stroke="#6a2b22" stroke-width="18" stroke-linejoin="round"/>`
  s += `<polyline points="${x - 18},${top - 3} ${r1(cx)},${top - roofH - 14} ${x + w + 18},${top - 3}" fill="none" stroke="#f4f7fb" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>`

  // Fairy lights along the eaves.
  if (o.garland) {
    for (let t = 0.06; t < 0.97; t += 0.08) {
      const onLeft = t < 0.5
      const u = onLeft ? t * 2 : (t - 0.5) * 2
      const px = onLeft ? x - 12 + (cx - x + 12) * u : cx + (x + w + 12 - cx) * u
      const py = onLeft ? top + 14 - (roofH + 4) * u : top - roofH + 10 + (roofH + 4) * u
      s += `<circle class="bulb" cx="${r1(px)}" cy="${r1(py)}" r="3.2" fill="#ffd98a" style="animation-delay:-${r1(t * 7)}s"/>`
    }
  }
  return `<g>${s}</g>`
}

function lamp(x: number): string {
  const top = GROUND - 150
  return `<g>
<rect x="${x - 3}" y="${top}" width="6" height="150" fill="#1d1a22"/>
<circle class="lampglow" cx="${x}" cy="${top - 12}" r="46"/>
<path d="M${x - 13} ${top}L${x - 9} ${top - 26}H${x + 9}L${x + 13} ${top}Z" fill="#ffd27a" stroke="#1d1a22" stroke-width="3"/>
<path d="M${x - 16} ${top - 25}L${x} ${top - 40}L${x + 16} ${top - 25}Z" fill="#1d1a22"/>
<path d="M${x - 17} ${top - 27}L${x} ${top - 43}L${x + 17} ${top - 27}" fill="none" stroke="#f4f7fb" stroke-width="4" stroke-linecap="round"/>
</g>`
}

// ---- Christmas market ----------------------------------------------------

const MARKET = 932
const heart = (x: number, y: number) =>
  `<path d="M${r1(x)} ${r1(y + 5)}C${r1(x - 9)} ${r1(y - 2)} ${r1(x - 6)} ${r1(y - 12)} ${r1(x)} ${r1(y - 7)}C${r1(x + 6)} ${r1(y - 12)} ${r1(x + 9)} ${r1(y - 2)} ${r1(x)} ${r1(y + 5)}Z" fill="#a8682f" stroke="#f4efe2" stroke-width="1.2"/>`

function booth(x: number, label: string, kind: 'wine' | 'cookies' | 'ornaments' | 'candles', trim: string): string {
  const B = MARKET
  const w = 160
  const top = B - 118
  let s = `<rect class="wglow" x="${x + 2}" y="${top - 4}" width="${w - 4}" height="90" rx="10"/>`
  s += `<rect x="${x + 6}" y="${top}" width="${w - 12}" height="80" fill="#7a5232"/>`
  let planks = ''
  for (let px = x + 22; px < x + w - 8; px += 16) planks += `M${px} ${top}V${B - 40}`
  s += `<path d="${planks}" stroke="#5e3d24" stroke-width="2"/>`

  // Goods on show.
  if (kind === 'cookies') {
    for (let i = 0; i < 6; i++) {
      const hx = x + 22 + i * 23
      const hy = top + 20 + (i % 2) * 18
      s += `<path d="M${hx} ${top}V${hy - 8}" stroke="#f4efe2" stroke-width="1"/>${heart(hx, hy)}`
    }
  } else if (kind === 'ornaments') {
    const cs = ['#c8312b', '#e8c27b', '#3f8f63', '#4a7bd0', '#c6a2c3', '#e8c27b', '#c8312b']
    cs.forEach((c, i) => {
      const bx = x + 20 + i * 20
      const by = top + 18 + ((i * 7) % 3) * 12
      s += `<path d="M${bx} ${top}V${by - 6}" stroke="#d9d4cb" stroke-width="1"/><circle cx="${bx}" cy="${by}" r="6.5" fill="${c}"/><circle cx="${bx - 2}" cy="${by - 2}" r="1.8" fill="#fff" opacity=".7"/>`
    })
  } else if (kind === 'candles') {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 7; i++) {
        const cx = x + 22 + i * 19
        const by = top + 34 + row * 30
        const h = 10 + ((i + row) % 3) * 4
        const c = ['#f4efe2', '#c8312b', '#e8c27b'][(i + row) % 3] ?? '#f4efe2'
        s += `<rect x="${cx - 3}" y="${by - h}" width="6" height="${h}" fill="${c}"/><ellipse class="flame" cx="${cx}" cy="${by - h - 4}" rx="2" ry="3.6" style="animation-delay:-${r1(rnd())}s"/>`
      }
      s += `<rect x="${x + 10}" y="${top + 34 + row * 30}" width="${w - 20}" height="3" fill="#3a2417"/>`
    }
  }

  // The stallholder.
  const vx = x + (kind === 'wine' ? 112 : 80)
  s += `<path d="M${vx - 16} ${B - 40}Q${vx - 16} ${B - 62} ${vx} ${B - 64}Q${vx + 16} ${B - 62} ${vx + 16} ${B - 40}Z" fill="#8a2f2a"/><circle cx="${vx}" cy="${B - 72}" r="8" fill="#e8c3a0"/><path d="M${vx - 9} ${B - 73}Q${vx} ${B - 86} ${vx + 9} ${B - 73}Z" fill="#c8312b"/><circle cx="${vx}" cy="${B - 84}" r="3" fill="#f4f7fb"/>`

  // Counter and its front.
  s += `<rect x="${x - 6}" y="${B - 44}" width="${w + 12}" height="10" rx="2" fill="#4a2e1d"/>`
  s += `<rect x="${x}" y="${B - 34}" width="${w}" height="34" fill="${dusk(trim, 0.3)}"/>`
  let stripes = ''
  for (let px = x + 10; px < x + w; px += 20) stripes += `M${px} ${B - 34}V${B}`
  s += `<path d="${stripes}" stroke="${dusk('#f4efe2', 0.35)}" stroke-width="5" opacity=".55"/>`
  let garland = `M${x - 4} ${B - 33}`
  for (let px = x + 16; px <= x + w + 8; px += 20) garland += `Q${px - 10} ${B - 22} ${px} ${B - 33}`
  s += `<path d="${garland}" fill="none" stroke="#2f6b3d" stroke-width="5"/>`
  for (let px = x + 6; px < x + w; px += 20) s += `<circle cx="${px}" cy="${B - 27}" r="2.4" fill="#c8312b"/>`

  if (kind === 'wine') {
    s += `<path d="M${x + 22} ${B - 44}Q${x + 22} ${B - 70} ${x + 48} ${B - 70}Q${x + 74} ${B - 70} ${x + 74} ${B - 44}Z" fill="#2a2228"/><ellipse cx="${x + 48}" cy="${B - 70}" rx="26" ry="5" fill="#7a1f2e"/>`
    for (let i = 0; i < 3; i++) {
      s += `<circle class="steam" cx="${x + 42 + i * 6}" cy="${B - 78}" r="6" style="animation-delay:-${i * 1.3}s"/>`
    }
    s += `<rect x="${x + 128}" y="${B - 56}" width="11" height="12" rx="2" fill="#c8312b"/><rect x="${x + 142}" y="${B - 56}" width="11" height="12" rx="2" fill="#f4efe2"/>`
  }

  // Posts, roof, snow, lights and the sign.
  s += `<rect x="${x - 4}" y="${top - 4}" width="8" height="${B - top + 4}" fill="#4a2e1d"/><rect x="${x + w - 4}" y="${top - 4}" width="8" height="${B - top + 4}" fill="#4a2e1d"/>`
  s += `<polygon points="${x - 18},${top} ${x + w / 2},${top - 40} ${x + w + 18},${top}" fill="#6a2b22"/>`
  s += `<polyline points="${x - 20},${top - 4} ${x + w / 2},${top - 46} ${x + w + 20},${top - 4}" fill="none" stroke="#f4f7fb" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`
  for (let px = x - 8; px <= x + w + 8; px += 16) {
    s += `<circle class="bulb" cx="${px}" cy="${top + 5}" r="3" fill="#ffd98a" style="animation-delay:-${r1(rnd() * 2.4)}s"/>`
  }
  const sw = Math.max(76, Math.round(label.length * 6.4 + 16))
  s += `<rect x="${x + w / 2 - sw / 2}" y="${top - 30}" width="${sw}" height="19" rx="3" fill="#ebdcb8" stroke="#4a2e1d" stroke-width="2"/>`
  s += `<text x="${x + w / 2}" y="${top - 16.5}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="11.5" font-style="italic" fill="#4a2417">${label}</text>`
  return `<g>${s}</g>`
}

// ---- Passers-by, dogs and cats -------------------------------------------

const SKIN = ['#e8c3a0', '#c68e62', '#8d5a3b', '#f0d2b4']

type Look = { coat: string; hat: string; scarf: string; skin: number }

// A person, feet at (0, 0), facing right, about 88 tall.
function figure(l: Look): string {
  const coat = dusk(l.coat, 0.15)
  const skin = SKIN[l.skin] ?? '#e8c3a0'
  return `<g class="bob">
<rect class="leg" x="-6" y="-26" width="6" height="26" rx="2.5" fill="#262233"/>
<rect class="leg leg2" x="0" y="-26" width="6" height="26" rx="2.5" fill="#2e2a3d"/>
<rect class="arm arm2" x="-3" y="-58" width="6" height="27" rx="3" fill="${dusk(coat, 0.25)}"/>
<path d="M-11 -60Q0 -64 11 -60L14 -22H-14Z" fill="${coat}"/>
<rect class="arm" x="-3" y="-58" width="6" height="27" rx="3" fill="${coat}"/>
<rect x="-9" y="-65" width="18" height="6" rx="3" fill="${l.scarf}"/><rect x="-8" y="-61" width="5" height="14" rx="2" fill="${l.scarf}"/>
<circle cx="0" cy="-73" r="8" fill="${skin}"/>
<path d="M-8.6 -74Q0 -88 8.6 -74Z" fill="${l.hat}"/><rect x="-9.5" y="-76" width="19" height="4" rx="2" fill="${dusk(l.hat, 0.3)}"/>
<circle cx="0" cy="-86" r="3.2" fill="#f4f7fb"/>
</g>`
}

function dog(color: string, size: number): string {
  const ear = dusk(color, 0.4)
  return `<g transform="scale(${size})">
<path class="wag" d="M-14 -17Q-22 -24 -21 -32" stroke="${color}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<rect class="leg fast" x="-12" y="-13" width="4" height="13" rx="1.5" fill="${ear}"/>
<rect class="leg fast leg2" x="-7" y="-13" width="4" height="13" rx="1.5" fill="${color}"/>
<rect class="leg fast" x="7" y="-13" width="4" height="13" rx="1.5" fill="${ear}"/>
<rect class="leg fast leg2" x="11" y="-13" width="4" height="13" rx="1.5" fill="${color}"/>
<ellipse cx="0" cy="-17" rx="16" ry="7.5" fill="${color}"/>
<circle cx="16" cy="-25" r="6.5" fill="${color}"/><ellipse cx="22" cy="-23" rx="5.5" ry="3.6" fill="${color}"/>
<circle cx="27" cy="-24" r="1.7" fill="#141414"/><circle cx="17" cy="-27" r="1.1" fill="#141414"/>
<path d="M12 -30Q8 -24 12 -19Q15 -24 14 -30Z" fill="${ear}"/>
<rect x="10" y="-22" width="4" height="5" fill="#c8312b"/>
</g>`
}

function catSitting(x: number, y: number, color: string, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
<path class="tail" d="M7 -2Q20 -2 18 -14Q17 -20 21 -24" stroke="${color}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M-9 0Q-12 -14 -6 -21H6Q12 -14 9 0Z" fill="${color}"/>
<circle cx="0" cy="-26" r="7" fill="${color}"/>
<path d="M-6.5 -29L-6 -37L-1.5 -32ZM6.5 -29L6 -37L1.5 -32Z" fill="${color}"/>
<g class="blink"><circle cx="-2.7" cy="-27" r="1.4" fill="#ffd24a"/><circle cx="2.7" cy="-27" r="1.4" fill="#ffd24a"/></g>
</g>`
}

function catWalking(color: string): string {
  return `<g>
<path d="M-10 -13Q-17 -18 -15 -27" stroke="${color}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<rect class="leg fast" x="-9" y="-9" width="2.6" height="9" fill="${color}"/>
<rect class="leg fast leg2" x="-5" y="-9" width="2.6" height="9" fill="${color}"/>
<rect class="leg fast" x="5" y="-9" width="2.6" height="9" fill="${color}"/>
<rect class="leg fast leg2" x="8.5" y="-9" width="2.6" height="9" fill="${color}"/>
<ellipse cx="0" cy="-11" rx="12" ry="5.2" fill="${color}"/>
<circle cx="12" cy="-16" r="5" fill="${color}"/>
<path d="M9 -19L9.5 -25L12.5 -20ZM14 -19.5L15.5 -25L16.5 -18Z" fill="${color}"/>
<circle cx="14.5" cy="-16.5" r="1" fill="#ffd24a"/>
</g>`
}

type Walker = Look & {
  y: number
  s: number
  dur: number
  delay: number
  left?: boolean
  extra?: 'bag' | 'tree' | 'dog' | 'smalldog' | 'child' | 'cat'
  friend?: Look
  dogColor?: string
}

function walker(o: Walker): string {
  let inner = ''
  if (o.extra === 'cat') {
    inner = catWalking(o.coat)
  } else {
    if (o.friend) inner += `<g transform="translate(-24 -2) scale(.97)">${figure(o.friend)}</g>`
    inner += figure(o)
    if (o.extra === 'bag') {
      inner += `<path d="M6 -40Q10 -46 14 -40" stroke="#3a2417" stroke-width="1.5" fill="none"/><rect x="4" y="-40" width="12" height="13" rx="2" fill="#a8322c"/>`
    } else if (o.extra === 'tree') {
      inner += `<g transform="translate(-2 -60) rotate(-28)"><rect x="-26" y="-2" width="10" height="4" fill="#4a2e1d"/><polygon points="-18,-11 26,0 -18,11" fill="#1f5a3c"/><polygon points="-8,-8 20,0 -8,8" fill="#2a6e4a"/><path d="M-10 -6l2 4M2 -4l2 3M-4 4l2 -3" stroke="#f4f7fb" stroke-width="2"/></g>`
    } else if (o.extra === 'child') {
      inner += `<path d="M8 -34Q16 -30 20 -36" stroke="${dusk(o.coat, 0.15)}" stroke-width="4" fill="none" stroke-linecap="round"/>`
      inner += `<g transform="translate(24 0) scale(.62)">${figure({ coat: '#e3a66a', hat: '#3f8f63', scarf: '#c8312b', skin: o.skin })}</g>`
    } else if (o.extra === 'dog' || o.extra === 'smalldog') {
      const big = o.extra === 'dog'
      inner += `<path d="M9 -35Q26 -20 ${big ? 46 : 40} -${big ? 19 : 14}" stroke="#c8312b" stroke-width="1.3" fill="none"/>`
      inner += `<g transform="translate(${big ? 36 : 33} 0)">${dog(o.dogColor ?? '#7a5232', big ? 1 : 0.7)}</g>`
    }
  }
  const sx = o.left ? -o.s : o.s
  return `<g class="walk ${o.left ? 'walkL' : 'walkR'}" style="animation-duration:${o.dur}s;animation-delay:-${o.delay}s"><g transform="translate(0 ${o.y}) scale(${sx} ${o.s})">${inner}</g></g>`
}

const WALKERS: Walker[] = [
  { y: 944, s: 0.86, dur: 92, delay: 66, coat: '#3a3550', hat: '#c8312b', scarf: '#5cc08a', skin: 0, extra: 'tree' },
  { y: 948, s: 0.8, dur: 140, delay: 30, left: true, coat: '#2a2630', hat: '', scarf: '', skin: 0, extra: 'cat' },
  { y: 951, s: 0.9, dur: 76, delay: 6, left: true, coat: '#7a5a2e', hat: '#7a2a4a', scarf: '#ebdfc2', skin: 1, extra: 'bag' },
  { y: 957, s: 0.93, dur: 82, delay: 44, left: true, coat: '#2f4f74', hat: '#e3a66a', scarf: '#c8312b', skin: 3 },
  { y: 962, s: 0.98, dur: 70, delay: 12, coat: '#8a2f2a', hat: '#2f5d4a', scarf: '#e8c27b', skin: 0, friend: { coat: '#2d3d63', hat: '#c8312b', scarf: '#f4efe2', skin: 1 } },
  { y: 970, s: 1, dur: 64, delay: 38, coat: '#b04a3a', hat: '#f4efe2', scarf: '#2f4f74', skin: 2, extra: 'smalldog', dogColor: '#e9e4da' },
  { y: 977, s: 1.04, dur: 58, delay: 24, left: true, coat: '#3f5a3a', hat: '#e3a66a', scarf: '#c8312b', skin: 2, extra: 'dog', dogColor: '#7a5232' },
  { y: 986, s: 1.08, dur: 86, delay: 52, coat: '#5a3d6b', hat: '#e8c27b', scarf: '#a8c3ca', skin: 3, extra: 'child' },
]

const MARKET_SCENE =
  booth(36, 'Vin chaud', 'wine', '#8a2f2a') +
  booth(330, 'Bougies', 'candles', '#3f6f5a') +
  booth(1090, 'Bredele', 'cookies', '#2f4f74') +
  booth(1400, 'Boules de Noël', 'ornaments', '#8a2f2a')

const LIFE =
  catSitting(1170, MARKET - 158, '#2a2630', 0.9) +
  catSitting(650, 926, '#c9773a', 0.85) +
  WALKERS.map(walker).join('')

const HOUSES: House[] = [
  { x: -20, w: 240, wallH: 330, roofH: 200, wall: '#e8c27b', shutter: '#3f6f5a', chimney: true, garland: true },
  { x: 220, w: 200, wallH: 270, roofH: 165, wall: '#d98a78', shutter: '#2f4f74' },
  { x: 420, w: 205, wallH: 210, roofH: 135, wall: '#a8c3ca', shutter: '#8a3b2e', chimney: true, garland: true },
  { x: 625, w: 170, wallH: 155, roofH: 100, wall: '#ebdfc2', shutter: '#3f6f5a' },
  { x: 805, w: 175, wallH: 160, roofH: 105, wall: '#b8c99a', shutter: '#7a3a5a', garland: true },
  { x: 980, w: 210, wallH: 220, roofH: 140, wall: '#e3a66a', shutter: '#2f4f74', chimney: true },
  { x: 1190, w: 200, wallH: 280, roofH: 170, wall: '#c6a2c3', shutter: '#3f6f5a', garland: true },
  { x: 1390, w: 240, wallH: 340, roofH: 205, wall: '#e8c27b', shutter: '#8a3b2e', chimney: true },
]

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0a0f24"/><stop offset=".45" stop-color="#1b2150"/><stop offset=".75" stop-color="#3a2d5c"/><stop offset="1" stop-color="#7a4a52"/>
</linearGradient>
<radialGradient id="warm" cx=".5" cy="1" r=".7">
<stop offset="0" stop-color="#ffb860" stop-opacity=".35"/><stop offset="1" stop-color="#ffb860" stop-opacity="0"/>
</radialGradient>
</defs>
<style>
.tw{fill:#fffbe8;animation:tw 4s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.2}50%{opacity:.9}}
.snow{fill:#fff}
.s1{opacity:.45;animation:fall 38s linear infinite}
.s2{opacity:.7;animation:fall 24s linear infinite}
.s3{opacity:.9;animation:fall 15s linear infinite}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(${H}px)}}
.sway{animation:sway 7s ease-in-out infinite alternate}
.s2 .sway{animation-duration:5s}
.s3 .sway{animation-duration:3.6s}
@keyframes sway{from{transform:translateX(-14px)}to{transform:translateX(14px)}}
.bulb{animation:blink 2.4s ease-in-out infinite}
.glow{opacity:.35;filter:blur(5px);animation:glow 2.4s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes glow{0%,100%{opacity:.5}50%{opacity:.1}}
.win{fill:#ffcc6a;animation:flick 6s ease-in-out infinite}
.wglow{fill:#ffb347;opacity:.35;filter:blur(7px);animation:flick 6s ease-in-out infinite}
@keyframes flick{0%,100%{opacity:1}40%{opacity:.86}55%{opacity:.95}}
.lampglow{fill:#ffc56a;opacity:.3;filter:blur(10px);animation:flick 4s ease-in-out infinite}
.smoke{fill:#c9c6d6;opacity:0;animation:smoke 6s ease-out infinite}
@keyframes smoke{0%{opacity:0;transform:translate(0,0) scale(.6)}20%{opacity:.35}100%{opacity:0;transform:translate(26px,-110px) scale(2.2)}}
.smoke{transform-box:fill-box;transform-origin:center}
.leg,.arm,.wag,.tail,.blink,.steam,.flame{transform-box:fill-box}
.leg{transform-origin:50% 0;animation:swing .9s ease-in-out infinite alternate}
.leg2{animation-direction:alternate-reverse}
.fast{animation-duration:.42s}
@keyframes swing{from{transform:rotate(20deg)}to{transform:rotate(-20deg)}}
.arm{transform-origin:50% 8%;animation:swing2 .9s ease-in-out infinite alternate-reverse}
.arm2{animation-direction:alternate}
@keyframes swing2{from{transform:rotate(16deg)}to{transform:rotate(-16deg)}}
.bob{animation:bob .45s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(0)}to{transform:translateY(-1.6px)}}
.walk{animation-timing-function:linear;animation-iteration-count:infinite}
.walkR{animation-name:walkR}.walkL{animation-name:walkL}
@keyframes walkR{from{transform:translateX(-140px)}to{transform:translateX(1740px)}}
@keyframes walkL{from{transform:translateX(1740px)}to{transform:translateX(-140px)}}
.wag{transform-origin:100% 0;animation:wag .3s ease-in-out infinite alternate}
@keyframes wag{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}
.tail{transform-origin:0 100%;animation:swish 2.8s ease-in-out infinite alternate}
@keyframes swish{from{transform:rotate(-12deg)}to{transform:rotate(14deg)}}
.blink{transform-origin:center;animation:eye 5s infinite}
@keyframes eye{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.steam{fill:#e6e2ee;opacity:0;transform-origin:center;animation:steam 4s ease-out infinite}
@keyframes steam{0%{opacity:0;transform:translate(0,0) scale(.6)}25%{opacity:.4}100%{opacity:0;transform:translate(6px,-46px) scale(1.9)}}
.flame{fill:#ffcf6a;transform-origin:50% 100%;animation:fl .7s ease-in-out infinite alternate}
@keyframes fl{from{transform:scale(1,1)}to{transform:scale(.85,1.2)}}
@media (prefers-reduced-motion: reduce){*{animation-play-state:paused!important}}
</style>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g>${stars(110)}</g>
<rect y="500" width="${W}" height="500" fill="url(#warm)"/>
${skyLights()}
${HOUSES.map(house).join('')}
${lamp(612)}${lamp(988)}
<path d="M0 ${GROUND - 6} Q400 ${GROUND - 16} 800 ${GROUND - 4} T1600 ${GROUND - 8} V${H} H0Z" fill="#dfe7f0"/>
${MARKET_SCENE}
<path d="M0 ${GROUND + 30} Q500 ${GROUND + 15} 900 ${GROUND + 32} T1600 ${GROUND + 25} V${H} H0Z" fill="#f4f7fb"/>
<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#warm)" opacity=".5"/>
${LIFE}
<g class="snow">${snowLayer(70, 0.8, 1.6, 's1')}${snowLayer(45, 1.6, 2.6, 's2')}${snowLayer(22, 2.6, 4, 's3')}</g>
</svg>`

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'alsace-christmas', glass: { blur: 18, tint: '#11162a', opacity: 0.6 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={SCENE}
        alt="A snowy Alsatian village on Christmas evening: half-timbered houses, a Christmas market, people strolling with dogs, cats and falling snow"
        isInteractive
      />
    )
  })
}
