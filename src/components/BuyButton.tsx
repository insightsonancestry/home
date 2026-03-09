"use client";

import React from 'react';

const BuyButton = () => {
  const handleClick = () => {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLScrGzrfjaIx19WvPnHWvTJAxRfDJnmEeQ7O09SdLM09bE5rEA/viewform', '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex items-center gap-2 px-8 py-3 font-bold text-sm uppercase tracking-[2px] cursor-pointer group border-2 transition-all duration-300"
      style={{
        borderColor: 'var(--accent)',
        color: 'var(--accent)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--accent)';
        e.currentTarget.style.color = 'var(--bg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--accent)';
      }}
    >
      <span>Buy now</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </button>
  );
};

export default BuyButton;
