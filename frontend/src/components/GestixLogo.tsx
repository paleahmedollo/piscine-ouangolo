import React from 'react';

interface GestixLogoProps {
  /** Taille du logo en px (défaut: 60) */
  size?: number;
  /** Variante : 'color' = fond bleu + GT blanc | 'white' = contours blancs sur fond transparent */
  variant?: 'color' | 'white';
}

/**
 * Logo GESTIX — icône "GT" géométrique
 * Carré arrondi dégradé bleu profond avec lettres G et T en blocs blancs
 */
const GestixLogo: React.FC<GestixLogoProps> = ({ size = 60, variant = 'color' }) => {
  const uid = `gx-${size}-${variant}`;

  if (variant === 'white') {
    return (
      <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        {/* ── G ── x:4-25, y:12-48 */}
        <rect x="4"  y="12" width="19" height="6"  rx="1.5" fill="white"/>
        <rect x="4"  y="12" width="6"  height="30" rx="1.5" fill="white"/>
        <rect x="4"  y="36" width="19" height="6"  rx="1.5" fill="white"/>
        <rect x="17" y="24" width="6"  height="18" rx="1.5" fill="white"/>
        <rect x="11" y="24" width="12" height="6"  rx="1.5" fill="rgba(255,255,255,0.75)"/>
        {/* ── T ── x:31-55, y:12-42 */}
        <rect x="31" y="12" width="24" height="6"  rx="1.5" fill="white"/>
        <rect x="40" y="12" width="6"  height="30" rx="1.5" fill="white"/>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#1E3A8A"/>
          <stop offset="100%" stopColor="#1565C0"/>
        </linearGradient>
        <radialGradient id={`${uid}-light`} cx="25%" cy="25%" r="55%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Fond arrondi */}
      <rect width="60" height="60" rx="13" fill={`url(#${uid})`}/>
      <rect width="60" height="60" rx="13" fill={`url(#${uid}-light)`}/>

      {/* ── Lettre G ── x:4-23, y:12-42 */}
      {/* Barre du haut */}
      <rect x="4"  y="12" width="19" height="6"  rx="1.5" fill="white"/>
      {/* Barre gauche (pleine hauteur) */}
      <rect x="4"  y="12" width="6"  height="30" rx="1.5" fill="white"/>
      {/* Barre du bas */}
      <rect x="4"  y="36" width="19" height="6"  rx="1.5" fill="white"/>
      {/* Barre droite — moitié basse uniquement */}
      <rect x="17" y="24" width="6"  height="18" rx="1.5" fill="white"/>
      {/* Bras horizontal central */}
      <rect x="11" y="24" width="12" height="6"  rx="1.5" fill="rgba(255,255,255,0.82)"/>

      {/* ── Lettre T ── x:31-55, y:12-42 */}
      {/* Barre du haut */}
      <rect x="31" y="12" width="24" height="6"  rx="1.5" fill="white"/>
      {/* Barre verticale centrale */}
      <rect x="40" y="12" width="6"  height="30" rx="1.5" fill="white"/>
    </svg>
  );
};

export default GestixLogo;
