"use client";

import { useEffect } from "react";
import useTypingStore from "../store/store";

export default function HtmlLangSync() {
    const language = useTypingStore((s) => s.language);

    useEffect(() => {
        document.documentElement.lang = language === "korean" ? "ko" : "en";
    }, [language]);

    return null;
}
