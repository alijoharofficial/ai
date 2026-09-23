export interface Dino {
  id: string;
  name: string;
  svg: string;
}

const G = '#22c55e';   // main green
const D = '#15803d';   // dark green (shadows)
const K = '#052e16';   // darkest (eye)
const H = '#86efac';   // highlight

export const dinos: Dino[] = [
  {
    id: 'trex',
    name: 'T-Rex',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M28 62 Q14 68 10 80 Q14 84 20 80 Q24 74 30 68Z" fill="${D}"/>
      <ellipse cx="50" cy="63" rx="25" ry="19" fill="${G}"/>
      <path d="M62 44 Q68 36 72 36 Q76 38 76 48 Q76 58 70 60 Q66 60 64 58Z" fill="${G}"/>
      <ellipse cx="78" cy="30" rx="14" ry="11" fill="${G}"/>
      <path d="M66 36 Q78 44 90 36 Q88 41 82 43 Q74 43 68 40Z" fill="${D}"/>
      <path d="M69 36 L70 41 M74 35 L75 40 M79 35 L80 40" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="83" cy="24" r="3.5" fill="${K}"/>
      <circle cx="84.2" cy="22.8" r="1.4" fill="white"/>
      <path d="M62 54 L54 62 L58 65 L64 57Z" fill="${D}"/>
      <path d="M54 62 L50 67 M58 65 L55 70" stroke="${D}" stroke-width="2" stroke-linecap="round"/>
      <rect x="36" y="79" width="11" height="17" rx="5" fill="${D}"/>
      <rect x="52" y="79" width="11" height="17" rx="5" fill="${D}"/>
      <ellipse cx="44" cy="55" rx="9" ry="6" fill="${H}" opacity="0.45"/>
    </svg>`,
  },
  {
    id: 'stego',
    name: 'Stegosaurus',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="36,40 32,20 42,38" fill="${D}"/>
      <polygon points="48,34 45,14 55,32" fill="${D}"/>
      <polygon points="60,35 59,15 68,33" fill="${D}"/>
      <polygon points="70,38 72,20 78,36" fill="${D}"/>
      <path d="M22 70 L12 65 L16 76Z" fill="${D}"/>
      <path d="M18 79 L8 75 L14 86Z" fill="${D}"/>
      <path d="M28 66 Q16 68 12 78 Q16 84 22 80 Q26 74 32 70Z" fill="${G}"/>
      <ellipse cx="54" cy="64" rx="28" ry="20" fill="${G}"/>
      <path d="M72 46 Q78 44 82 50 Q82 58 78 62 Q74 62 72 58 Q72 52 72 46Z" fill="${G}"/>
      <ellipse cx="82" cy="41" rx="11" ry="8" fill="${G}"/>
      <path d="M75 46 Q82 50 88 46" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="86" cy="37" r="2.8" fill="${K}"/>
      <circle cx="87" cy="36" r="1.1" fill="white"/>
      <rect x="38" y="80" width="10" height="16" rx="4" fill="${D}"/>
      <rect x="56" y="80" width="10" height="16" rx="4" fill="${D}"/>
      <rect x="68" y="77" width="9" height="14" rx="3" fill="${D}"/>
      <ellipse cx="48" cy="58" rx="10" ry="7" fill="${H}" opacity="0.4"/>
    </svg>`,
  },
  {
    id: 'bronto',
    name: 'Brontosaurus',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M24 68 Q10 72 8 82 Q12 86 20 82 Q24 76 28 72Z" fill="${D}"/>
      <ellipse cx="52" cy="68" rx="26" ry="18" fill="${G}"/>
      <path d="M68 54 Q70 42 66 30 Q64 18 68 12 Q74 10 78 16 Q82 26 78 40 Q76 50 74 58Z" fill="${G}"/>
      <ellipse cx="76" cy="11" rx="9" ry="7" fill="${G}"/>
      <circle cx="82" cy="10" r="1.8" fill="${D}"/>
      <circle cx="79" cy="7" r="2.5" fill="${K}"/>
      <circle cx="80" cy="6" r="1" fill="white"/>
      <path d="M72 14 Q76 18 82 15" stroke="${D}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <rect x="34" y="82" width="10" height="15" rx="4" fill="${D}"/>
      <rect x="50" y="82" width="10" height="15" rx="4" fill="${D}"/>
      <ellipse cx="46" cy="62" rx="10" ry="7" fill="${H}" opacity="0.4"/>
    </svg>`,
  },
  {
    id: 'trice',
    name: 'Triceratops',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M24 70 Q12 66 10 76 Q14 80 22 76 Q24 72 26 70Z" fill="${D}"/>
      <ellipse cx="48" cy="67" rx="25" ry="18" fill="${G}"/>
      <path d="M64 56 Q66 50 68 48 Q72 56 72 64 Q68 66 64 62Z" fill="${G}"/>
      <ellipse cx="72" cy="34" rx="20" ry="12" fill="${D}" opacity="0.75"/>
      <ellipse cx="72" cy="35" rx="16" ry="9" fill="${G}"/>
      <ellipse cx="76" cy="46" rx="18" ry="16" fill="${G}"/>
      <path d="M60 36 Q56 22 62 18 Q67 24 65 36Z" fill="${D}"/>
      <path d="M86 36 Q90 22 86 18 Q81 24 83 36Z" fill="${D}"/>
      <path d="M73 36 Q72 24 76 21 Q79 26 77 36Z" fill="${D}"/>
      <circle cx="68" cy="46" r="3" fill="${K}"/>
      <circle cx="69" cy="45" r="1.2" fill="white"/>
      <circle cx="84" cy="46" r="3" fill="${K}"/>
      <circle cx="85" cy="45" r="1.2" fill="white"/>
      <path d="M68 56 Q76 61 84 56" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="34" y="81" width="10" height="15" rx="4" fill="${D}"/>
      <rect x="50" y="81" width="10" height="15" rx="4" fill="${D}"/>
      <rect x="64" y="77" width="9" height="13" rx="3" fill="${D}"/>
      <ellipse cx="44" cy="62" rx="9" ry="6" fill="${H}" opacity="0.4"/>
    </svg>`,
  },
];

export function svgToDataUrl(svg: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svg.trim())));
  return `data:image/svg+xml;base64,${encoded}`;
}
