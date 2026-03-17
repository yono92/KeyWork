"use client";

import React, { createContext, useCallback, useContext, useState, useRef } from "react";

export type ToastType = "level-up" | "achievement" | "high-score";

interface Toast {
    id: number;
    type: ToastType;
    title: string;
    subtitle?: string;
    icon?: string;
    duration?: number;
}

interface ToastContextValue {
    push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => {} });

export function useToastQueue() {
    return useContext(ToastContext);
}

export function ToastQueueProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const push = useCallback((toast: Omit<Toast, "id">) => {
        const id = ++idRef.current;
        const duration = toast.duration ?? 3000;
        setToasts((prev) => [...prev, { ...toast, id }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[9998] flex flex-col-reverse gap-2 pointer-events-none">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className="pointer-events-auto animate-chat-bubble retro-panel bg-[var(--retro-surface)] px-4 py-3 min-w-[200px] max-w-[320px]"
                        >
                            <div className="flex items-center gap-2">
                                {toast.icon && <span className="text-lg">{toast.icon}</span>}
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--retro-text)] truncate font-pixel" style={{ fontSize: 8, lineHeight: 1.6 }}>
                                        {toast.title}
                                    </p>
                                    {toast.subtitle && (
                                        <p className="text-[10px] text-[var(--retro-text)]/60 truncate">
                                            {toast.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}
