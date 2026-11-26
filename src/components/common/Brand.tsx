import React from 'react';

export default function Brand({ caption }: { caption?: string }) {
  return (
    <div className="koz-brand">
      <span className="koz-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M3 16s4.8-8 13-8 13 8 13 8-4.8 8-13 8S3 16 3 16Z" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="16" cy="16" r="4" fill="currentColor" />
          <path d="M16 3v2M16 27v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
      <div><span className="koz-brand-name">ko‘z<span>.</span></span>{caption && <span className="koz-brand-caption">{caption}</span>}</div>
    </div>
  );
}
