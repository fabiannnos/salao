import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColorClass?: string;
  variant?: 'light' | 'dark';
}

export default function GestaoModelloLogo({ 
  className = "w-16 h-16", 
  showText = false, 
  textColorClass = "text-gray-900",
  variant = 'light'
}: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${showText ? 'space-y-2' : ''}`}>
      <svg 
        viewBox="0 0 500 420" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
        <defs>
          {/* Gradients to perfectly replicate the purple/pink/rose metallic shine of the Gestão Modello logo */}
          <linearGradient id="modelloPurpleLeft" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
            <stop offset="0%" stopColor="#7c2d12" stopOpacity="0" />
            <stop offset="10%" stopColor="#6b21a8" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          
          <linearGradient id="modelloPurpleRight" x1="0.8" y1="0.1" x2="0.2" y2="0.9">
            <stop offset="15%" stopColor="#db2777" />
            <stop offset="60%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#701a75" />
          </linearGradient>

          <linearGradient id="centerGradient" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="50%" stopColor="#db2777" />
            <stop offset="100%" stopColor="#701a75" />
          </linearGradient>

          <linearGradient id="outerRightGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#be185d" />
            <stop offset="100%" stopColor="#831843" />
          </linearGradient>
          
          <linearGradient id="outerLeftGrad" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>

        {/* Elegant Logo Mark Symbol of Gestão Modello (based on attached logo mark) */}
        <g id="Symbol" transform="translate(0, 5)">
          {/* 1. Left wing/arm of the 'M' Lotus structure */}
          <path
            d="M 178 126 C 140 180 135 240 178 300 L 178 375 C 178 382 173 388 165 388 C 150 388 135 340 135 300 C 135 235 150 160 178 126 Z"
            fill="url(#outerLeftGrad)"
          />

          {/* 2. Right wing/arm of the 'M' Lotus structure */}
          <path
            d="M 322 126 C 360 180 365 240 322 300 L 322 375 C 322 382 327 388 335 388 C 350 388 365 340 365 300 C 365 235 350 160 322 126 Z"
            fill="url(#outerRightGrad)"
          />

          {/* 3. Left sweeping inner curve connecting center to side column */}
          <path
            d="M 250 375 C 235 375 178 340 178 260 C 178 190 220 180 250 250 C 270 290 255 350 250 375 Z"
            fill="url(#modelloPurpleLeft)"
          />

          {/* 4. Right sweeping inner curve connecting center to side column */}
          <path
            d="M 250 375 C 265 375 322 340 322 260 C 322 190 280 180 250 250 C 230 290 245 350 250 375 Z"
            fill="url(#modelloPurpleRight)"
          />

          {/* 5. Center majestic teardrop/lotus petal standing tall */}
          <path
            d="M 250 82 C 220 152 215 224 250 288 C 285 224 280 152 250 82 Z"
            fill="url(#centerGradient)"
            stroke={variant === 'dark' ? '#18181b' : '#FCF9F2'}
            strokeWidth="6"
          />

          {/* 6. Subtle glowing focal overlay at the bottom crossing */}
          <circle cx="250" cy="372" r="8" fill="#ec4899" opacity="0.85" filter="drop-shadow(0px 0px 4px #d946ef)" />
        </g>
      </svg>
      
      {showText && (
        <div className="text-center">
          <span className="block text-xs uppercase tracking-[0.25em] font-sans font-medium text-stone-500">Gestão</span>
          <h2 className={`text-2xl font-serif font-black tracking-widest ${variant === 'dark' ? 'text-white' : 'text-purple-950'} leading-none`}>
            MODELLO
          </h2>
          <span className="block text-[10px] lowercase tracking-wider font-mono text-stone-400 mt-0.5">.com.br</span>
        </div>
      )}
    </div>
  );
}
