"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilLine, Plus, Trash2, X } from "lucide-react";
import type { CustomText } from "@/lib/supabase/types";

interface Props {
    texts: CustomText[];
    loading: boolean;
    ko: boolean;
    rounded: boolean;
    onAdd: (title: string, content: string) => Promise<CustomText | null>;
    onUpdate: (id: number, title: string, content: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onClose: () => void;
}

const CustomTextManager: React.FC<Props> = ({
    texts,
    loading,
    ko,
    rounded,
    onAdd,
    onUpdate,
    onDelete,
    onClose,
}) => {
    const [mode, setMode] = useState<"list" | "add" | "edit">("list");
    const [editId, setEditId] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const resetForm = () => {
        setTitle("");
        setContent("");
        setEditId(null);
        setMode("list");
    };

    const startEdit = (t: CustomText) => {
        setTitle(t.title);
        setContent(t.content);
        setEditId(t.id);
        setMode("edit");
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            if (mode === "edit" && editId != null) {
                await onUpdate(editId, title, content);
            } else {
                await onAdd(title, content);
            }
            resetForm();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        await onDelete(id);
        setDeleteConfirm(null);
    };

    const rnd = rounded ? "rounded-lg" : "rounded-none";

    // 폼 화면 (추가/수정)
    if (mode === "add" || mode === "edit") {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--retro-text)]">
                        {mode === "add"
                            ? ko ? "텍스트 추가" : "Add Text"
                            : ko ? "텍스트 수정" : "Edit Text"}
                    </h3>
                    <button onClick={resetForm} className="text-[var(--retro-text)]/50 hover:text-[var(--retro-text)]">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[var(--retro-text)]/60">
                        {ko ? "제목" : "Title"} ({title.length}/50)
                    </label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={50}
                        placeholder={ko ? "예: 뉴스 기사, 소설 첫 문장..." : "e.g. News article, Novel excerpt..."}
                        className={`h-9 text-sm ${rnd}`}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[var(--retro-text)]/60">
                        {ko ? "내용" : "Content"} ({content.length}/2000)
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={2000}
                        rows={5}
                        placeholder={ko ? "연습할 텍스트를 입력하세요..." : "Enter text to practice..."}
                        className={`w-full resize-none border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] px-3 py-2 text-sm text-[var(--retro-field-text)] placeholder:text-[var(--retro-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--retro-accent)] ${rnd}`}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => void handleSave()}
                        disabled={saving || !title.trim() || !content.trim()}
                        className={`text-sm ${rnd}`}
                    >
                        {saving ? "..." : ko ? "저장" : "Save"}
                    </Button>
                    <Button variant="outline" onClick={resetForm} className={`text-sm ${rnd}`}>
                        {ko ? "취소" : "Cancel"}
                    </Button>
                </div>
            </div>
        );
    }

    // 목록 화면
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--retro-text)]">
                    {ko ? "내 텍스트 관리" : "Manage Texts"}
                    <span className="ml-1.5 text-[var(--retro-text)]/40">({texts.length})</span>
                </h3>
                <div className="flex gap-1.5">
                    <Button
                        size="sm"
                        onClick={() => setMode("add")}
                        className={`h-7 gap-1 px-2 text-[11px] ${rnd}`}
                    >
                        <Plus className="h-3 w-3" />
                        {ko ? "추가" : "Add"}
                    </Button>
                    <button onClick={onClose} className="text-[var(--retro-text)]/50 hover:text-[var(--retro-text)]">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="py-4 text-center text-xs text-[var(--retro-text)]/50">
                    {ko ? "불러오는 중..." : "Loading..."}
                </p>
            ) : texts.length === 0 ? (
                <div className={`border-2 border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-4 text-center ${rnd}`}>
                    <p className="text-sm font-semibold text-[var(--retro-text)]/50">
                        {ko ? "등록된 텍스트가 없습니다" : "No custom texts yet"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--retro-text)]/40">
                        {ko ? "위의 '추가' 버튼으로 연습할 텍스트를 등록하세요" : "Click 'Add' above to create your first practice text"}
                    </p>
                </div>
            ) : (
                <div className="max-h-[240px] space-y-1.5 overflow-y-auto">
                    {texts.map((t) => (
                        <div
                            key={t.id}
                            className={`flex items-center gap-2 border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2 ${rnd}`}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[var(--retro-text)]">
                                    {t.title}
                                </p>
                                <p className="truncate text-[11px] text-[var(--retro-text)]/50">
                                    {t.content.slice(0, 60)}...
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <button
                                    onClick={() => startEdit(t)}
                                    className="rounded p-1 text-[var(--retro-text)]/40 hover:bg-[var(--retro-surface-alt)] hover:text-[var(--retro-text)]"
                                >
                                    <PencilLine className="h-3.5 w-3.5" />
                                </button>
                                {deleteConfirm === t.id ? (
                                    <button
                                        onClick={() => void handleDelete(t.id)}
                                        className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500"
                                    >
                                        {ko ? "확인" : "OK"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirm(t.id)}
                                        className="rounded p-1 text-[var(--retro-text)]/40 hover:bg-red-500/10 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomTextManager;
