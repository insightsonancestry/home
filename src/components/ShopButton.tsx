"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const ShopButton = () => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/signup')}
      className="relative inline-flex items-center gap-2 px-6 py-2.5 font-bold text-xs uppercase tracking-[2px] cursor-pointer group border transition-all duration-300 ml-auto"
      style={{
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
    >
      <span>Login/Sign Up</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </button>
  );
};

export default ShopButton;
