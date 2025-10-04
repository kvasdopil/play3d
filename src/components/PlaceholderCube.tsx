'use client';
import { useMemo } from 'react';
import type { Transform } from '../services/types';
import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  NearestFilter,
} from 'three';

const DEFAULT_TRANSFORM: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
};

export function PlaceholderCube({ transform }: { transform?: Transform }) {
  const t = transform || DEFAULT_TRANSFORM;
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillRect(1, 1, 1, 1);
      ctx.fillStyle = '#c30000';
      ctx.fillRect(1, 0, 1, 1);
      ctx.fillRect(0, 1, 1, 1);
    }
    const tex = new CanvasTexture(canvas);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.colorSpace = SRGBColorSpace;
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.anisotropy = 1;
    return tex;
  }, []);

  return (
    <mesh position={t.position} rotation={t.rotation} scale={t.scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        map={texture}
        roughness={1}
        metalness={0}
        opacity={0.5}
        transparent
      />
    </mesh>
  );
}
