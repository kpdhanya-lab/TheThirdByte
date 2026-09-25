import React from 'react';

interface TickerRibbonProps {
  customText?: string;
}

export const TickerRibbon: React.FC<TickerRibbonProps> = ({ customText }) => {
  const defaultTickerItems = [
    'SMART PHARMACY',
    '■',
    'LIVE QUEUE ACTIVE',
    '■',
    'COUNTER 03 OPEN',
    '■',
    'AI OPTICAL READER ACTIVE',
    '■',
    'LICENSED APOTHECARY CARE',
    '■',
    'EST. WAIT ~8 MINS',
    '■',
    'BOUTIQUE DISPENSARY',
    '■',
    '100% VERIFIED MEDS',
  ];

  return (
    <div className="w-full bg-[#f3eedf] border-y border-[#164529]/10 overflow-hidden py-1.5 select-none">
      <div className="animate-marquee items-center text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#164529]">
        {defaultTickerItems.map((item, idx) => (
          <span
            key={`a-${idx}`}
            className={`mx-3 whitespace-nowrap ${item === '■' ? 'text-[#7a545e] text-[8px]' : ''}`}
          >
            {item}
          </span>
        ))}
        {defaultTickerItems.map((item, idx) => (
          <span
            key={`b-${idx}`}
            className={`mx-3 whitespace-nowrap ${item === '■' ? 'text-[#7a545e] text-[8px]' : ''}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};
