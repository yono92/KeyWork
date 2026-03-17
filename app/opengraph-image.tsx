import { ImageResponse } from "next/og";

export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "64px 72px",
                    background: "#1a1a2e",
                    fontFamily: "monospace",
                }}
            >
                {/* CRT scanline overlay */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage:
                            "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
                    }}
                />

                {/* Bezel border */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 6,
                        background: "#d4d4d4",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 6,
                        background: "#2f2f2f",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: 6,
                        background: "#d4d4d4",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: 6,
                        background: "#2f2f2f",
                    }}
                />

                {/* Keyboard icon */}
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 48,
                                height: 32,
                                background: "#333355",
                                border: "2px solid #5555aa",
                                borderRadius: 4,
                            }}
                        />
                    ))}
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 52,
                                height: 32,
                                background: "#333355",
                                border: "2px solid #5555aa",
                                borderRadius: 4,
                            }}
                        />
                    ))}
                </div>
                <div
                    style={{
                        width: 180,
                        height: 28,
                        background: "#333355",
                        border: "2px solid #5555aa",
                        borderRadius: 4,
                        marginBottom: 40,
                    }}
                />

                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 900,
                        color: "#00e5ff",
                        letterSpacing: 8,
                        textShadow:
                            "0 0 20px rgba(0,229,255,0.5), 0 0 40px rgba(0,229,255,0.2)",
                    }}
                >
                    KEYWORK
                </div>
                <div
                    style={{
                        marginTop: 16,
                        fontSize: 28,
                        fontWeight: 600,
                        color: "#888899",
                        letterSpacing: 6,
                    }}
                >
                    TYPING STATION
                </div>
                <div
                    style={{
                        marginTop: 28,
                        fontSize: 22,
                        color: "#5555aa",
                        letterSpacing: 2,
                    }}
                >
                    7 GAME MODES • 한/영 • RETRO STYLE
                </div>
            </div>
        ),
        size,
    );
}
