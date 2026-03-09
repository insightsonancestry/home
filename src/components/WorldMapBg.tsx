"use client";

export const WorldMapBg = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 1200 600"
        className="w-[140vw] h-auto opacity-[0.09]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified world map outline — continents as minimal paths */}
        <g stroke="var(--accent)" strokeWidth="1.2" fill="none">
          {/* North America */}
          <path d="M150,120 L180,100 L220,95 L260,105 L280,120 L300,110 L320,130 L310,160 L290,180 L270,200 L250,230 L230,260 L210,250 L200,220 L180,200 L160,190 L140,170 L130,150 Z" />
          {/* Central America */}
          <path d="M230,260 L240,275 L250,290 L245,305 L235,310 L230,300 L225,285 Z" />
          {/* South America */}
          <path d="M250,310 L270,300 L300,310 L320,340 L330,380 L325,420 L310,450 L290,470 L270,460 L260,430 L250,400 L240,370 L235,340 Z" />
          {/* Europe */}
          <path d="M480,100 L500,90 L530,85 L560,90 L580,100 L590,120 L580,140 L560,150 L540,145 L520,150 L500,140 L490,125 Z" />
          {/* UK */}
          <path d="M465,95 L475,88 L480,100 L470,108 Z" />
          {/* Africa */}
          <path d="M500,180 L530,170 L560,175 L590,190 L600,220 L605,260 L600,300 L590,340 L570,370 L550,390 L530,380 L510,360 L500,330 L490,290 L485,250 L490,220 Z" />
          {/* Asia */}
          <path d="M590,80 L640,70 L700,65 L760,70 L820,80 L870,100 L900,120 L910,150 L890,170 L860,180 L820,185 L780,175 L740,170 L700,165 L660,155 L630,140 L610,120 L600,100 Z" />
          {/* India */}
          <path d="M720,180 L740,190 L750,220 L745,250 L730,270 L715,260 L710,230 L705,200 Z" />
          {/* Southeast Asia */}
          <path d="M800,190 L830,200 L850,220 L840,240 L820,235 L805,215 Z" />
          {/* Australia */}
          <path d="M850,350 L890,340 L930,350 L950,370 L945,400 L920,420 L890,425 L860,410 L845,390 L840,370 Z" />
          {/* Japan/Korea */}
          <path d="M900,110 L910,100 L920,110 L915,125 L905,120 Z" />
          {/* Middle East */}
          <path d="M600,160 L630,155 L650,165 L640,185 L620,190 L605,180 Z" />
        </g>

        {/* Migration arcs */}
        <g stroke="var(--accent)" strokeWidth="0.8" fill="none" strokeDasharray="4 4" opacity="0.6">
          {/* Africa to Europe */}
          <path d="M530,250 Q540,180 530,130" />
          {/* Africa to Middle East */}
          <path d="M560,220 Q590,190 620,175" />
          {/* Middle East to Asia */}
          <path d="M640,170 Q700,140 780,130" />
          {/* Asia to Americas (Bering) */}
          <path d="M870,90 Q920,60 300,110" />
          {/* Europe to Americas */}
          <path d="M480,110 Q380,80 280,120" />
          {/* Asia to Australia */}
          <path d="M830,220 Q850,280 870,340" />
          {/* Africa to South America */}
          <path d="M500,300 Q400,320 300,330" />
        </g>

        {/* Migration origin/destination dots */}
        <g fill="var(--accent)" opacity="0.5">
          <circle cx="530" cy="250" r="3" /> {/* East Africa */}
          <circle cx="530" cy="130" r="2.5" /> {/* Europe */}
          <circle cx="620" cy="175" r="2.5" /> {/* Middle East */}
          <circle cx="780" cy="130" r="2.5" /> {/* East Asia */}
          <circle cx="280" cy="120" r="2.5" /> {/* North America */}
          <circle cx="870" cy="340" r="2.5" /> {/* Australia */}
          <circle cx="300" cy="330" r="2.5" /> {/* South America */}
        </g>
      </svg>
    </div>
  );
};
