"use client";

import { useEffect, useRef, useMemo } from "react";
import type { AvatarConfig } from "@/lib/supabase/types";
import {
  BASE_PALETTE,
  SKIN_COLORS,
  HAIR_COLORS,
  SKIN_PARTS,
  HAIR_PARTS,
  EYE_PARTS,
  MOUTH_PARTS,
  HAT_PARTS,
  ACCESSORY_PARTS,
} from "@/data/avatar-parts";
import type { Pixel } from "@/data/avatar-parts";

const SIZE_MAP = { sm: 24, md: 32, lg: 48, xl: 64 } as const;
const GRID = 32; // 32x32 픽셀 그리드

interface PixelAvatarProps {
  config: AvatarConfig | null;
  nickname: string;
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

function buildPalette(config: AvatarConfig): string[] {
  const palette = [...BASE_PALETTE];
  const skin = SKIN_COLORS[config.skin] ?? SKIN_COLORS[0];
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[0];
  palette[2] = skin[0]; palette[3] = skin[1]; palette[4] = skin[2];
  palette[5] = hair[0]; palette[6] = hair[1]; palette[7] = hair[2];
  return palette;
}

function collectPixels(config: AvatarConfig): Pixel[] {
  const pixels: Pixel[] = [];

  // 레이어 순서: 피부 → 헤어 → 눈 → 입 → 모자 → 악세서리
  const skin = SKIN_PARTS[0];
  if (skin) pixels.push(...skin.pixels);

  const hair = HAIR_PARTS[config.hair];
  if (hair) pixels.push(...hair.pixels);

  const eyes = EYE_PARTS[config.eyes];
  if (eyes) pixels.push(...eyes.pixels);

  const mouth = MOUTH_PARTS[config.mouth];
  if (mouth) pixels.push(...mouth.pixels);

  if (config.hat >= 0) {
    const hat = HAT_PARTS[config.hat];
    if (hat) pixels.push(...hat.pixels);
  }

  if (config.accessory >= 0) {
    const acc = ACCESSORY_PARTS[config.accessory];
    if (acc) pixels.push(...acc.pixels);
  }

  return pixels;
}

export default function PixelAvatar({ config, nickname, size = "md", className }: PixelAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displaySize = SIZE_MAP[size];

  const renderData = useMemo(() => {
    if (!config) return null;
    return { palette: buildPalette(config), pixels: collectPixels(config) };
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, GRID, GRID);

    for (const [x, y, pi] of renderData.pixels) {
      if (pi === 0 || x < 0 || x >= GRID || y < 0 || y >= GRID) continue;
      ctx.fillStyle = renderData.palette[pi] ?? "transparent";
      ctx.fillRect(x, y, 1, 1);
    }
  }, [renderData]);

  // 폴백: config가 없으면 닉네임 첫 글자
  if (!config) {
    return (
      <div
        className={className}
        style={{
          width: displaySize,
          height: displaySize,
          background: "var(--retro-accent)",
          color: "var(--retro-text-inverse)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: displaySize * 0.5,
          fontWeight: 900,
          lineHeight: 1,
          border: "2px solid var(--retro-border-dark)",
        }}
      >
        {(nickname || "?").charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={GRID}
      height={GRID}
      className={className}
      style={{
        width: displaySize,
        height: displaySize,
        imageRendering: "pixelated",
        border: "2px solid var(--retro-border-dark)",
      }}
    />
  );
}
