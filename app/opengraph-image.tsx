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
                    padding: "64px 72px",
                    background:
                        "linear-gradient(135deg, #0e7490 0%, #155e75 45%, #0f172a 100%)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>
                    KeyWork
                </div>
                <div style={{ marginTop: 20, fontSize: 36, fontWeight: 600 }}>
                    한/영 타이핑 연습 + 미니게임
                </div>
                <div style={{ marginTop: 24, fontSize: 28, opacity: 0.9 }}>
                    Practice • Falling Words • Word Chain • Runner 외 7개 모드
                </div>
            </div>
        ),
        size
    );
}

