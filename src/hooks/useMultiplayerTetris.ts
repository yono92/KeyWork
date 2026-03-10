"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Cell } from "./useTetrisEngine";
import { BOARD_WIDTH, BOARD_HEIGHT } from "./useTetrisEngine";

export interface OpponentState {
    board: number[][];
    score: number;
    lines: number;
    level: number;
    gameOver: boolean;
}

// Cell[][] → number[][] 직렬화 (PieceType → 1~7, null → 0)
const PIECE_MAP: Record<string, number> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };
const REVERSE_MAP = ["", "I", "O", "T", "S", "Z", "J", "L"];

export function serializeBoard(board: Cell[][]): number[][] {
    return board.map((row) => row.map((cell) => (cell ? PIECE_MAP[cell] ?? 0 : 0)));
}

export function deserializeBoard(data: number[][]): Cell[][] {
    return data.map((row) =>
        row.map((n) => (REVERSE_MAP[n] || null) as Cell),
    );
}

// 가비지 라인 생성
export function createGarbageLines(count: number): Cell[][] {
    const lines: Cell[][] = [];
    for (let i = 0; i < count; i++) {
        const line: Cell[] = Array(BOARD_WIDTH).fill("Z" as Cell); // 회색 대신 Z(빨강) 사용
        const gap = Math.floor(Math.random() * BOARD_WIDTH);
        line[gap] = null;
        lines.push(line);
    }
    return lines;
}

// 보드에 가비지 라인 추가 (아래에서 올라옴)
export function addGarbageToBoard(board: Cell[][], garbageLines: Cell[][]): Cell[][] {
    const newBoard = [...board.slice(garbageLines.length), ...garbageLines];
    return newBoard;
}

// 라인 클리어 → 가비지 전송 수 계산
export function getGarbageCount(linesCleared: number): number {
    if (linesCleared <= 1) return 0;
    if (linesCleared === 2) return 1;
    if (linesCleared === 3) return 2;
    return 4; // 4줄 = 테트리스
}

export function useMultiplayerTetris(
    getChannel: () => RealtimeChannel | null,
    isPlaying: boolean,
) {
    const [opponent, setOpponent] = useState<OpponentState>({
        board: Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0)),
        score: 0,
        lines: 0,
        level: 1,
        gameOver: false,
    });
    const [pendingGarbage, setPendingGarbage] = useState(0);
    const garbageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 상대 보드 수신
    useEffect(() => {
        const channel = getChannel();
        if (!channel || !isPlaying) return;

        const handleBoardState = ({ payload }: { payload: OpponentState }) => {
            setOpponent(payload);
        };

        const handleGarbage = ({ payload }: { payload: { lines: number } }) => {
            setPendingGarbage((prev) => prev + payload.lines);
        };

        channel.on("broadcast", { event: "board_state" }, handleBoardState);
        channel.on("broadcast", { event: "garbage" }, handleGarbage);

        return () => {
            // Cleanup handled by channel removal
        };
    }, [getChannel, isPlaying]);

    // 내 보드 브로드캐스트 (300ms 간격)
    const broadcastBoard = useCallback(
        (board: Cell[][], score: number, lines: number, level: number, gameOver: boolean) => {
            const channel = getChannel();
            if (!channel) return;
            channel.send({
                type: "broadcast",
                event: "board_state",
                payload: {
                    board: serializeBoard(board),
                    score,
                    lines,
                    level,
                    gameOver,
                },
            });
        },
        [getChannel],
    );

    // 가비지 전송
    const sendGarbage = useCallback(
        (linesCleared: number) => {
            const count = getGarbageCount(linesCleared);
            if (count <= 0) return;
            const channel = getChannel();
            if (!channel) return;
            channel.send({
                type: "broadcast",
                event: "garbage",
                payload: { lines: count },
            });
        },
        [getChannel],
    );

    // 가비지 수신 처리 (0.5초 딜레이)
    const consumeGarbage = useCallback((): Cell[][] | null => {
        if (pendingGarbage <= 0) return null;
        const lines = createGarbageLines(pendingGarbage);
        setPendingGarbage(0);
        return lines;
    }, [pendingGarbage]);

    useEffect(() => {
        const ref = garbageTimerRef;
        return () => {
            if (ref.current) clearTimeout(ref.current);
        };
    }, []);

    return {
        opponent,
        pendingGarbage,
        broadcastBoard,
        sendGarbage,
        consumeGarbage,
    };
}
