'use client';

import Lottie from 'lottie-react';
import animationData from '@/assets/Camada 1Logotipo.json';

interface LottieLogoProps {
  size?: number;
  className?: string;
}

export default function LottieLogo({ size = 120, className = "" }: LottieLogoProps) {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        initialSegment={[0, 100]}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
