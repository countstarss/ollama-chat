declare module 'react-syntax-highlighter' {
  import React from 'react';
  
  export interface SyntaxHighlighterProps {
    language?: string;
    style?: any;
    children?: string;
    className?: string;
    PreTag?: React.ElementType;
    [key: string]: any;
  }

  export const Prism: React.FC<SyntaxHighlighterProps>;
  export const Light: React.FC<SyntaxHighlighterProps>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const coldarkDark: any;
  export const coldarkCold: any;
  export const coy: any;
  export const darcula: any;
  export const dark: any;
  export const duotoneDark: any;
  export const duotoneEarth: any;
  export const duotoneForest: any;
  export const duotoneLight: any;
  export const duotoneSea: any;
  export const duotoneSpace: any;
  export const funky: any;
  export const ghcolors: any;
  export const hopscotch: any;
  export const okaidia: any;
  export const pojoaque: any;
  export const prism: any;
  export const solarizedlight: any;
  export const tomorrow: any;
  export const twilight: any;
  export const vs: any;
  export const vscDarkPlus: any;
  export const xonokai: any;
} 