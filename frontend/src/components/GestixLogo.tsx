import React from 'react';

interface OllentraLogoProps {
  size?: number;
  variant?: 'color' | 'white';
}

/**
 * Logo OLLENTRA — Bouclier avec coche + flèche montante
 * Shield shape with white check-arrow icon inside
 */
const OllentraLogo: React.FC<OllentraLogoProps> = ({ size = 60, variant = 'color' }) => {
  const uid = `gx-${size}-${variant}`;

  // Shield path in 60×60 viewBox
  const shieldPath = 'M30,3 L56,13 L56,34 C56,48 44,56 30,59 C16,56 4,48 4,34 L4,13 Z';

  // Check+arrow icon: checkmark whose right arm ends with an arrowhead pointing up-right
  const CheckArrow = ({ color }: { color: string }) => (
    <>
      {/* Checkmark body: left dip then rising right arm */}
      <polyline
        points="13,30 22,39 46,13"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrowhead at top-right (46,13): horizontal and vertical bars */}
      <polyline
        points="34,13 46,13 46,25"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );

  if (variant === 'white') {
    return (
      <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d={shieldPath} fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <CheckArrow color="white" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Main gradient: dark navy → bright blue */}
        <linearGradient id={uid} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#1A2F7A" />
          <stop offset="100%" stopColor="#1565C0" />
        </linearGradient>
        {/* Shine overlay */}
        <radialGradient id={`${uid}-sh`} cx="35%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Shield body */}
      <path d={shieldPath} fill={`url(#${uid})`} />
      {/* Shine */}
      <path d={shieldPath} fill={`url(#${uid}-sh)`} />
      {/* Icon */}
      <CheckArrow color="white" />
    </svg>
  );
};

export default OllentraLogo;
