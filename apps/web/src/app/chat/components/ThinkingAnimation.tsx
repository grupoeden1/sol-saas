'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

export default function ThinkingAnimation() {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    fetch('/animations/sol-logo.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[70%]">
        <div className="rounded-lg p-4 bg-background-secondary border border-solar-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0">
              {animationData ? (
                <Lottie
                  animationData={animationData}
                  loop
                  autoplay
                  initialSegment={[0, 100]}
                  style={{ width: 40, height: 40 }}
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center">
                  <span className="text-xl">☀️</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-solar-300">SOL</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground-muted">Pensando</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
