"use client";

import React from 'react';
import { CopyButton } from '../button/CopyButton';

interface CodeBlockCopyProps {
  language?: string;
  children: string;
}

export const CodeBlockCopy: React.FC<CodeBlockCopyProps> = ({
  language,
  children,
}) => {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <CopyButton 
          text={children} 
          size="sm" 
          variant="subtle"
          className="shadow-md"
        />
      </div>
      <pre className={language ? `language-${language}` : ''}>
        <code>{children}</code>
      </pre>
    </div>
  );
}; 