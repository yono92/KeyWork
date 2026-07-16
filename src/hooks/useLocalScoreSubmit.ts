"use client";

import { useCallback } from "react";
import { appendLocalScore } from "@/lib/localData";
import type { LocalScoreInput } from "@/types/domain";

export function useLocalScoreSubmit() {
    const submitScore = useCallback((score: LocalScoreInput) => appendLocalScore(score), []);
    return { submitScore };
}
