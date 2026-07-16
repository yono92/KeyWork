"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useLocalScoreSubmit } from "@/hooks/useLocalScoreSubmit";
import { useTetrisEngine } from "@/hooks/useTetrisEngine";
import { PIECES, type PieceType } from "@/lib/tetrisCore";

const PIECE_CLASSES: Record<PieceType, string> = {
    I: "bg-cyan-400 border-cyan-200 border-r-cyan-700 border-b-cyan-700",
    O: "bg-amber-300 border-yellow-100 border-r-amber-700 border-b-amber-700",
    T: "bg-violet-500 border-violet-300 border-r-violet-900 border-b-violet-900",
    S: "bg-emerald-500 border-emerald-300 border-r-emerald-900 border-b-emerald-900",
    Z: "bg-rose-500 border-rose-300 border-r-rose-900 border-b-rose-900",
    J: "bg-blue-500 border-blue-300 border-r-blue-900 border-b-blue-900",
    L: "bg-orange-500 border-orange-300 border-r-orange-900 border-b-orange-900",
};

const panelClass = "border-2 border-t-slate-400 border-l-slate-400 border-r-slate-950 border-b-slate-950 bg-slate-800 p-2.5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.08)]";
const controlClass = "flex min-h-11 items-center justify-center border-2 border-t-slate-400 border-l-slate-400 border-r-slate-950 border-b-slate-950 bg-slate-700 text-slate-100 transition active:translate-y-px active:border-t-slate-950 active:border-l-slate-950 disabled:cursor-not-allowed disabled:opacity-35";

function PiecePreview({ type, label }: { type: PieceType | null; label: string }) {
    const occupied = useMemo(() => new Set(
        type ? PIECES[type][0].map(([x, y]) => `${x}-${y}`) : [],
    ), [type]);

    return (
        <div aria-label={`${label}: ${type ?? "없음"}`} className="grid aspect-square w-full max-w-24 grid-cols-4 grid-rows-4 gap-px border-2 border-t-slate-950 border-l-slate-950 border-r-slate-500 border-b-slate-500 bg-slate-950 p-2">
            {Array.from({ length: 16 }, (_, index) => {
                const x = index % 4;
                const y = Math.floor(index / 4);
                const filled = type && occupied.has(`${x}-${y}`);
                return <span key={index} className={filled ? `border ${PIECE_CLASSES[type]}` : "bg-slate-950"} />;
            })}
        </div>
    );
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
    return (
        <div className="border border-slate-600 bg-slate-950 px-2 py-1.5">
            <dt className="font-pixel text-[7px] tracking-wider text-slate-500">{label}</dt>
            <dd className={`mt-1 font-mono text-base font-black tabular-nums ${accent ? "text-amber-300" : "text-slate-100"}`}>{value}</dd>
        </div>
    );
}

export default function TetrisGame() {
    const { submitScore } = useLocalScoreSubmit();
    const scoreRecordedRef = useRef(false);
    const clearTimerRef = useRef<number | null>(null);
    const [clearLabel, setClearLabel] = useState<string | null>(null);

    const onLinesCleared = useCallback((lines: number, scoreGain: number) => {
        const labels = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"];
        setClearLabel(`${labels[lines]} +${scoreGain}`);
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = window.setTimeout(() => setClearLabel(null), 900);
    }, []);
    const onHardDrop = useCallback(() => {}, []);
    const onGameOver = useCallback(() => {}, []);
    const engine = useTetrisEngine({ onLinesCleared, onHardDrop, onGameOver });

    useEffect(() => () => {
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    }, []);

    useEffect(() => {
        if (!engine.gameOver) {
            scoreRecordedRef.current = false;
            return;
        }
        if (scoreRecordedRef.current || engine.score <= 0) return;
        scoreRecordedRef.current = true;
        submitScore({ game_mode: "tetris", score: engine.score });
    }, [engine.gameOver, engine.score, submitScore]);

    const activeCells = useMemo(() => new Map<string, PieceType>(
        engine.activePiece
            ? PIECES[engine.activePiece.type][engine.activePiece.rotation].map(([dx, dy]) => [
                `${engine.activePiece!.x + dx}-${engine.activePiece!.y + dy}`,
                engine.activePiece!.type,
            ])
            : [],
    ), [engine.activePiece]);

    const ghostCells = useMemo(() => new Set(
        engine.activePiece
            ? PIECES[engine.activePiece.type][engine.activePiece.rotation].map(([dx, dy]) =>
                `${engine.activePiece!.x + dx}-${engine.ghostY + dy}`,
            )
            : [],
    ), [engine.activePiece, engine.ghostY]);

    const controlsDisabled = !engine.running || engine.paused || engine.gameOver;
    const buttonLabel = engine.gameOver ? "다시 시작" : engine.running ? "게임 재시작" : "게임 시작";

    const board = (
        <div className="relative mx-auto aspect-[1/2] w-[min(78vw,310px)] border-[5px] border-t-slate-500 border-l-slate-500 border-r-slate-950 border-b-slate-950 bg-[#070a12] p-1 shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:w-[min(48vw,350px)]">
            <div className="grid h-full grid-cols-10 grid-rows-[repeat(20,minmax(0,1fr))] gap-px bg-slate-800/70" role="grid" aria-label="테트리스 게임 보드">
                {engine.board.flatMap((row, y) => row.map((lockedType, x) => {
                    const key = `${x}-${y}`;
                    const activeType = activeCells.get(key);
                    const type = activeType ?? lockedType;
                    const ghost = !type && ghostCells.has(key);
                    return (
                        <span
                            key={key}
                            role="gridcell"
                            className={type
                                ? `border-2 shadow-[inset_2px_2px_0_rgba(255,255,255,0.22)] ${PIECE_CLASSES[type]}`
                                : ghost
                                    ? "border-2 border-dashed border-slate-400/70 bg-slate-300/10"
                                    : "bg-[#090d18]"
                            }
                        />
                    );
                }))}
            </div>

            {clearLabel && (
                <div aria-live="polite" className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 border-y-2 border-amber-300 bg-slate-950/90 py-3 text-center font-pixel text-[11px] text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.45)]">
                    {clearLabel}
                </div>
            )}

            {(!engine.running || engine.paused || engine.gameOver) && (
                <div className="absolute inset-1 flex flex-col items-center justify-center bg-slate-950/88 px-5 text-center backdrop-blur-[1px]">
                    <p className="font-pixel text-[9px] tracking-widest text-cyan-300">
                        {engine.gameOver ? "GAME OVER" : engine.paused ? "PAUSED" : "READY?"}
                    </p>
                    <p className="mt-3 max-w-56 text-xs leading-5 text-slate-300">
                        {engine.gameOver
                            ? `최종 점수 ${engine.score.toLocaleString()}점`
                            : engine.paused
                                ? "P 키 또는 아래 버튼으로 계속하세요."
                                : "고스트를 따라 쌓고, C 키로 블록을 홀드하세요."}
                    </p>
                    {!engine.paused && (
                        <button type="button" onClick={engine.resetGame} className="mt-5 min-h-11 border-2 border-t-cyan-200 border-l-cyan-200 border-r-cyan-900 border-b-cyan-900 bg-cyan-600 px-5 font-pixel text-[8px] text-white active:translate-y-px">
                            {engine.gameOver ? "RETRY" : "START"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <section className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center overflow-x-hidden bg-[radial-gradient(circle_at_top,#243047_0%,#111827_46%,#070a12_100%)] px-2 py-3 text-slate-100 sm:px-4 sm:py-5">
            <header className="mb-3 text-center sm:mb-5">
                <p className="font-pixel text-[7px] tracking-[0.35em] text-cyan-300">KEYWORK ARCADE</p>
                <h1 className="mt-2 font-pixel text-sm tracking-[0.12em] text-white drop-shadow-[3px_3px_0_#155e75] sm:text-lg">RETRO TETRIS</h1>
            </header>

            <div className="mb-2 grid w-full max-w-[420px] grid-cols-3 gap-2 lg:hidden">
                <div className={`${panelClass} flex flex-col items-center`}>
                    <p className="mb-1 font-pixel text-[6px] text-slate-400">HOLD {engine.holdUsedThisTurn && "LOCK"}</p>
                    <PiecePreview type={engine.heldPieceType} label="홀드" />
                </div>
                <dl className={`${panelClass} grid content-center gap-1`}>
                    <Stat label="SCORE" value={engine.score.toLocaleString()} accent />
                    <Stat label="LINES" value={engine.lines} />
                </dl>
                <div className={`${panelClass} flex flex-col items-center`}>
                    <p className="mb-1 font-pixel text-[6px] text-slate-400">NEXT</p>
                    <PiecePreview type={engine.nextPieceTypes[0] ?? null} label="다음" />
                </div>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[150px_auto_150px]">
                <aside className={`${panelClass} hidden w-[150px] lg:block`}>
                    <div className="flex items-center justify-between">
                        <h2 className="font-pixel text-[8px] text-cyan-300">HOLD</h2>
                        <span className={`font-pixel text-[6px] ${engine.holdUsedThisTurn ? "text-rose-400" : "text-slate-500"}`}>
                            {engine.holdUsedThisTurn ? "LOCK" : "[C]"}
                        </span>
                    </div>
                    <div className="mt-3 flex justify-center"><PiecePreview type={engine.heldPieceType} label="홀드" /></div>
                    <p className="mt-4 text-[11px] leading-5 text-slate-400">한 블록당 한 번 교체할 수 있습니다.</p>
                </aside>

                {board}

                <aside className="hidden w-[150px] space-y-3 lg:block">
                    <div className={panelClass}>
                        <h2 className="font-pixel text-[8px] text-cyan-300">NEXT</h2>
                        <div className="mt-3 flex justify-center"><PiecePreview type={engine.nextPieceTypes[0] ?? null} label="다음" /></div>
                        <div className="mt-2 grid grid-cols-2 gap-1 opacity-65">
                            {engine.nextPieceTypes.slice(1).map((type, index) => <PiecePreview key={`${type}-${index}`} type={type} label={`${index + 2}번째 다음`} />)}
                        </div>
                    </div>
                    <dl className={`${panelClass} grid gap-2`}>
                        <Stat label="SCORE" value={engine.score.toLocaleString()} accent />
                        <Stat label="LINES" value={engine.lines} />
                        <Stat label="LEVEL" value={engine.level} />
                    </dl>
                </aside>
            </div>

            <div className="mt-3 grid w-full max-w-[420px] grid-cols-4 gap-1.5 lg:hidden" aria-label="모바일 게임 조작">
                <button type="button" aria-label="왼쪽 이동" onClick={() => engine.moveHorizontal(-1)} disabled={controlsDisabled} className={controlClass}><ArrowLeft aria-hidden="true" /></button>
                <button type="button" aria-label="시계 반대 방향 회전" onClick={() => engine.rotatePiece(-1)} disabled={controlsDisabled} className={controlClass}><RotateCcw aria-hidden="true" /></button>
                <button type="button" aria-label="시계 방향 회전" onClick={() => engine.rotatePiece(1)} disabled={controlsDisabled} className={controlClass}><RotateCw aria-hidden="true" /></button>
                <button type="button" aria-label="오른쪽 이동" onClick={() => engine.moveHorizontal(1)} disabled={controlsDisabled} className={controlClass}><ArrowRight aria-hidden="true" /></button>
                <button type="button" onClick={engine.holdPiece} disabled={controlsDisabled || engine.holdUsedThisTurn} className={`${controlClass} font-pixel text-[7px]`}>HOLD</button>
                <button type="button" aria-label="한 칸 내리기" onClick={engine.softDrop} disabled={controlsDisabled} className={controlClass}><ArrowDown aria-hidden="true" /></button>
                <button type="button" aria-label="바닥까지 내리기" onClick={engine.hardDrop} disabled={controlsDisabled} className={`${controlClass} bg-rose-800`}><ChevronsDown aria-hidden="true" /></button>
                <button type="button" aria-label={engine.paused ? "계속하기" : "일시정지"} onClick={() => engine.setPaused((paused) => !paused)} disabled={!engine.running || engine.gameOver} className={controlClass}>
                    {engine.paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                </button>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                <span>← → 이동</span><span>↑/X 회전</span><span>Z 역회전</span><span>Space 드롭</span><span>C 홀드</span><span>P 정지</span>
            </div>
            <button type="button" onClick={engine.resetGame} className="mt-3 text-[10px] text-slate-500 underline decoration-slate-600 underline-offset-4 hover:text-slate-300">
                {buttonLabel}
            </button>
        </section>
    );
}
