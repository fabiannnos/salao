import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColorClass?: string;
  variant?: 'light' | 'dark';
}

export default function GestaoModelloLogo({
  className = 'w-16 h-16',
  showText = false,
  textColorClass = 'text-gray-900',
  variant = 'light',
}: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${showText ? 'space-y-1.5' : ''}`}>
      <img
        src="/logo.jpg"
        alt="Gestão Modello"
        className={`object-contain ${className} ${variant === 'dark' ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] brightness-110' : ''}`}
        style={{ aspectRatio: '1 / 1' }}
      />
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
