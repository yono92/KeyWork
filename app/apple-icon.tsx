import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 180,
                    height: 180,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1a1a2e",
                    borderRadius: 36,
                }}
            >
                {/* Keyboard icon rows */}
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 24,
                                height: 16,
                                background: "#333355",
                                border: "1px solid #5555aa",
                                borderRadius: 2,
                            }}
                        />
                    ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 28,
                                height: 16,
                                background: "#333355",
                                border: "1px solid #5555aa",
                                borderRadius: 2,
                            }}
                        />
                    ))}
                </div>
                <div
                    style={{
                        width: 80,
                        height: 14,
                        background: "#333355",
                        border: "1px solid #5555aa",
                        borderRadius: 2,
                        marginBottom: 12,
                    }}
                />
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 900,
                        fontFamily: "monospace",
                        color: "#00e5ff",
                        letterSpacing: 4,
                    }}
                >
                    KEYWORK
                </div>
            </div>
        ),
        size,
    );
}
