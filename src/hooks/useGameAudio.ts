import { useCallback, useRef } from "react";
import useTypingStore from "../store/store";

export type SoundType =
    | "match"
    | "wrong"
    | "lifeLost"
    | "gameOver"
    | "item"
    | "aiTurn"
    | "countdown"
    | "go"
    | "hit"
    | "combo"
    | "destroy"
    | "lose"
    | "levelUp"
    | "win"
    | "bossHit"
    | "roundComplete"
    | "perfect";

interface SingleNote {
    type: OscillatorType;
    freqStart: number;
    freqEnd: number;
    duration: number;
    gain: number;
}

interface MultiNote {
    notes: {
        type: OscillatorType;
        freq: number;
        offset: number;
        duration: number;
        gain: number;
    }[];
}

type SoundDef = SingleNote | MultiNote;

function isMultiNote(def: SoundDef): def is MultiNote {
    return "notes" in def;
}

const SOUND_PRESETS: Record<SoundType, SoundDef> = {
    match:    { type: "sine",     freqStart: 660,  freqEnd: 880,  duration: 0.08, gain: 0.15 },
    wrong:    { type: "sawtooth", freqStart: 200,  freqEnd: 200,  duration: 0.15, gain: 0.1  },
    lifeLost: { type: "sawtooth", freqStart: 220,  freqEnd: 110,  duration: 0.2,  gain: 0.15 },
    gameOver: { type: "sine",     freqStart: 440,  freqEnd: 110,  duration: 0.5,  gain: 0.15 },
    item:     { type: "triangle", freqStart: 520,  freqEnd: 780,  duration: 0.12, gain: 0.15 },
    aiTurn:   { type: "triangle", freqStart: 440,  freqEnd: 550,  duration: 0.1,  gain: 0.12 },
    countdown:{ type: "sine",     freqStart: 440,  freqEnd: 440,  duration: 0.15, gain: 0.2  },
    go:       { type: "sine",     freqStart: 880,  freqEnd: 880,  duration: 0.2,  gain: 0.2  },
    hit:      { type: "sine",     freqStart: 800,  freqEnd: 800,  duration: 0.03, gain: 0.2  },
    combo:    { type: "sine",     freqStart: 880,  freqEnd: 1100, duration: 0.1,  gain: 0.15 },
    destroy:  { type: "sine",     freqStart: 880,  freqEnd: 1200, duration: 0.1,  gain: 0.15 },
    lose:     { type: "sine",     freqStart: 440,  freqEnd: 220,  duration: 0.4,  gain: 0.15 },

    levelUp: {
        notes: [0, 1, 2].map((i) => ({
            type: "sine" as OscillatorType,
            freq: 440 + i * 220,
            offset: i * 0.1,
            duration: 0.1,
            gain: 0.15,
        })),
    },
    win: {
        notes: [0, 1, 2, 3].map((i) => ({
            type: "sine" as OscillatorType,
            freq: 523 + i * 130,
            offset: i * 0.12,
            duration: 0.12,
            gain: 0.15,
        })),
    },
    bossHit: {
        notes: [0, 1].map((i) => ({
            type: "square" as OscillatorType,
            freq: 330 + i * 110,
            offset: i * 0.06,
            duration: 0.08,
            gain: 0.1,
        })),
    },
    roundComplete: {
        notes: [0, 1, 2].map((i) => ({
            type: "sine" as OscillatorType,
            freq: 440 + i * 220,
            offset: i * 0.08,
            duration: 0.08,
            gain: 0.12,
        })),
    },
    perfect: {
        notes: [0, 1, 2].map((i) => ({
            type: "sine" as OscillatorType,
            freq: 523 + i * 130,
            offset: i * 0.1,
            duration: 0.1,
            gain: 0.15,
        })),
    },
};

export function useGameAudio() {
    const isMuted = useTypingStore((s) => s.isMuted);
    const audioContextRef = useRef<AudioContext | null>(null);

    const playSound = useCallback((type: SoundType) => {
        if (isMuted) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") ctx.resume();

            const now = ctx.currentTime;
            const def = SOUND_PRESETS[type];

            if (isMultiNote(def)) {
                for (const note of def.notes) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = note.type;
                    osc.frequency.setValueAtTime(note.freq, now + note.offset);
                    gain.gain.setValueAtTime(note.gain, now + note.offset);
                    gain.gain.linearRampToValueAtTime(0, now + note.offset + note.duration);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(now + note.offset);
                    osc.stop(now + note.offset + note.duration);
                }
            } else {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = def.type;
                osc.frequency.setValueAtTime(def.freqStart, now);
                osc.frequency.linearRampToValueAtTime(def.freqEnd, now + def.duration);
                gain.gain.setValueAtTime(def.gain, now);
                gain.gain.linearRampToValueAtTime(0, now + def.duration);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now);
                osc.stop(now + def.duration);
            }
        } catch {
            // AudioContext 생성 실패 시 무시
        }
    }, [isMuted]);

    return { playSound };
}
