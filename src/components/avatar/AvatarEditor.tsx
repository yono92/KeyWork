"use client";

import React, { useState } from "react";
import type { AvatarConfig } from "@/lib/supabase/types";
import {
  DEFAULT_AVATAR_CONFIG,
  SKIN_COLORS,
  HAIR_COLORS,
  HAIR_PARTS,
  EYE_PARTS,
  MOUTH_PARTS,
  HAT_PARTS,
  ACCESSORY_PARTS,
  CATEGORY_LABELS,
} from "@/data/avatar-parts";
import PixelAvatar from "./PixelAvatar";
import { Button } from "@/components/ui/button";
import useTypingStore from "@/store/store";

type Category = "skin" | "hairColor" | "hair" | "eyes" | "mouth" | "hat" | "accessory";

const CATEGORIES: Category[] = ["skin", "hairColor", "hair", "eyes", "mouth", "hat", "accessory"];

interface AvatarEditorProps {
  initial: AvatarConfig | null;
  nickname: string;
  onSave: (config: AvatarConfig) => Promise<void>;
  onCancel: () => void;
}

export default function AvatarEditor({ initial, nickname, onSave, onCancel }: AvatarEditorProps) {
  const [config, setConfig] = useState<AvatarConfig>(initial ?? DEFAULT_AVATAR_CONFIG);
  const [activeTab, setActiveTab] = useState<Category>("hair");
  const [saving, setSaving] = useState(false);
  const language = useTypingStore((s) => s.language);
  const retroTheme = useTypingStore((s) => s.retroTheme);
  const ko = language === "korean";
  const rounded = retroTheme === "mac-classic";

  const update = (key: keyof AvatarConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
    } finally {
      setSaving(false);
    }
  };

  const renderSwatches = (colors: [string, string, string][], activeIdx: number, key: "skin" | "hairColor") => (
    <div className="flex flex-wrap gap-2">
      {colors.map((c, i) => (
        <button
          key={i}
          onClick={() => update(key, i)}
          className={`w-8 h-8 border-2 ${activeIdx === i ? "border-[var(--retro-accent)] ring-2 ring-[var(--retro-accent)]/40" : "border-[var(--retro-border-mid)]"} ${rounded ? "rounded-md" : ""}`}
          style={{ background: c[1] }}
          title={`${key} ${i}`}
        />
      ))}
    </div>
  );

  const renderPartGrid = (parts: { id: number; label: string }[], activeId: number, key: keyof AvatarConfig, allowNone: boolean) => (
    <div className="flex flex-wrap gap-2">
      {allowNone && (
        <button
          onClick={() => update(key, -1)}
          className={`w-10 h-10 text-xs border-2 flex items-center justify-center ${activeId === -1 ? "border-[var(--retro-accent)] bg-[var(--retro-accent)]/10" : "border-[var(--retro-border-mid)]"} ${rounded ? "rounded-md" : ""}`}
        >
          {ko ? "X" : "X"}
        </button>
      )}
      {parts.map((p) => (
        <button
          key={p.id}
          onClick={() => update(key, p.id)}
          className={`w-10 h-10 border-2 flex items-center justify-center ${activeId === p.id ? "border-[var(--retro-accent)] bg-[var(--retro-accent)]/10" : "border-[var(--retro-border-mid)]"} ${rounded ? "rounded-md" : ""}`}
        >
          <PixelAvatar
            config={{ ...config, [key]: p.id }}
            nickname={nickname}
            size="sm"
          />
        </button>
      ))}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "skin":
        return renderSwatches(SKIN_COLORS, config.skin, "skin");
      case "hairColor":
        return renderSwatches(HAIR_COLORS, config.hairColor, "hairColor");
      case "hair":
        return renderPartGrid(HAIR_PARTS, config.hair, "hair", false);
      case "eyes":
        return renderPartGrid(EYE_PARTS, config.eyes, "eyes", false);
      case "mouth":
        return renderPartGrid(MOUTH_PARTS, config.mouth, "mouth", false);
      case "hat":
        return renderPartGrid(HAT_PARTS, config.hat, "hat", true);
      case "accessory":
        return renderPartGrid(ACCESSORY_PARTS, config.accessory, "accessory", true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 프리뷰 */}
      <div className="flex justify-center">
        <PixelAvatar config={config} nickname={nickname} size="xl" />
      </div>

      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-2 py-1 text-xs font-semibold border-2 transition-colors
              ${activeTab === cat
                ? "border-[var(--retro-accent)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                : "border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]"
              } ${rounded ? "rounded-md" : ""}`}
          >
            {CATEGORY_LABELS[cat][ko ? "ko" : "en"]}
          </button>
        ))}
      </div>

      {/* 파츠 선택 영역 */}
      <div className="min-h-[60px] p-3 border-2 border-[var(--retro-border-mid)] bg-[var(--retro-field-bg)]"
        style={{ borderTopColor: "var(--retro-border-dark)", borderLeftColor: "var(--retro-border-dark)" }}
      >
        {renderTabContent()}
      </div>

      {/* 저장/취소 */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          className={`text-xs ${rounded ? "rounded-md" : "rounded-none"}`}
        >
          {ko ? "취소" : "Cancel"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`text-xs font-semibold ${rounded ? "rounded-md" : "rounded-none"}`}
        >
          {saving ? "..." : ko ? "저장" : "Save"}
        </Button>
      </div>
    </div>
  );
}
