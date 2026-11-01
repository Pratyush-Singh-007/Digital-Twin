import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/** A short, always-visible plain-language explanation for a heading. */
export const HeadingNote: React.FC<Props> = ({ children, title, className = '' }) => (
  <p
    data-testid="heading-note"
    className={`mt-0.5 text-[10px] leading-snug font-sans font-normal normal-case tracking-normal text-zinc-500 ${className}`}
    title={title}
  >
    {children}
  </p>
);
