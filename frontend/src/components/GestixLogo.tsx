import React from 'react';

interface GestixLogoProps {
  size?: number;
  variant?: 'color' | 'white';
}

/**
 * Logo GESTIX — "GT" géométrique en blocs
 * Lettres G et T construites en rectangles, style app-icon moderne
 */
const GestixLogo: React.FC<GestixLogoProps> = ({ size = 60, variant = 'color' }) => {
  const uid = `gx-${size}-${variant}`;

  /* ─── Géométrie des lettres (viewBox 60×60) ───────────────────
     G  : x 3-25, y 9-51  (largeur 22, hauteur 42)
     Gap: 5px
     T  : x 30-57, y 9-51 (largeur 27, hauteur 42)
  ─────────────────────────────────────────────────────────────── */
  const shapes = (fill: string, midFill: string) => (
    <>
      {/* ── G ── */}
      <rect x="3"  y="9"  width="22" height="7"  rx="2.5" fill={fill}/>    {/* haut */}
      <rect x="3"  y="9"  width="7"  height="35" rx="2.5" fill={fill}/>    {/* gauche */}
      <rect x="3"  y="44" width="22" height="7"  rx="2.5" fill={fill}/>    {/* bas */}
      <rect x="18" y="27" width="7"  height="24" rx="2.5" fill={fill}/>    {/* droite basse */}
      <rect x="12" y="27" width="13" height="7"  rx="2.5" fill={midFill}/> {/* bras central */}

      {/* ── T ── */}
      <rect x="30" y="9"  width="27" height="7"  rx="2.5" fill={fill}/>    {/* haut */}
      <rect x="40" y="9"  width="7"  height="42" rx="2.5" fill={fill}/>    {/* montant */}
    </>
  );

  if (variant === 'white') {
    return (
      <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        {shapes('white', 'rgba(255,255,255,0.72)')}
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#1A2F7A"/>
          <stop offset="100%" stopColor="#1565C0"/>
        </linearGradient>
        <radialGradient id={`${uid}-sh`} cx="28%" cy="22%" r="52%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.10"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="60" height="60" rx="13" fill={`url(#${uid})`}/>
      <rect width="60" height="60" rx="13" fill={`url(#${uid}-sh)`}/>
      {shapes('white', 'rgba(255,255,255,0.80)')}
    </svg>
  );
};

export default GestixLogo;
