import React from "react";

interface LoadingDotsProps {
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ className = "" }) => {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="animate-[loading-dot_1.4s_ease-in-out_infinite]">.</span>
      <span className="animate-[loading-dot_1.4s_ease-in-out_0.2s_infinite]">.</span>
      <span className="animate-[loading-dot_1.4s_ease-in-out_0.4s_infinite]">.</span>
    </span>
  );
};