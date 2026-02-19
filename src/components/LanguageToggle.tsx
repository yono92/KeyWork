"use client";

import React from "react";
import { BsGlobe } from "react-icons/bs";
import { usePathname } from "next/navigation";
import useTypingStore from "../store/store";
import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
    className?: string;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = "" }) => {
    const pathname = usePathname();
    const language = useTypingStore((state) => state.language);
    const toggleLanguage = useTypingStore((state) => state.toggleLanguage);
    const isWordChain = pathname === "/word-chain";
    const isDisabled = isWordChain;

    return (
        <Button
            onClick={() => {
                if (isDisabled) return;
                toggleLanguage();
            }}
            disabled={isDisabled}
            variant="ghost"
            size="icon"
            className={`${className} text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label={
                isDisabled
                    ? "Language is fixed to Korean in Word Chain"
                    : language === "korean"
                    ? "Switch to English"
                    : "Switch to Korean"
            }
        >
            <BsGlobe size={16} />
        </Button>
    );
};

export default LanguageToggle;
