import React, { useEffect, useRef } from "react";
import useTypingStore from "../store/store";

interface CoupangAdProps {
    className?: string;
    type: "script" | "image" | "iframe";
    id: string; // 광고 배너 ID
    trackingCode: string; // 트래킹 코드
    width: string;
    height: string;
    template?: string;
}

const CoupangAd: React.FC<CoupangAdProps> = ({
    className = "",
    type,
    id,
    trackingCode,
    width,
    height,
    template = "banner",
}) => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const containerRef = useRef<HTMLDivElement>(null);

    // 스크립트 로드 함수
    const loadCoupangScript = () => {
        return new Promise<void>((resolve) => {
            if (!document.getElementById("coupang-partners-script")) {
                const script = document.createElement("script");
                script.id = "coupang-partners-script";
                script.src = "https://ads-partners.coupang.com/g.js";
                script.async = true;
                script.onload = () => resolve();
                document.head.appendChild(script);
            } else {
                resolve(); // 이미 로드된 경우
            }
        });
    };

    // 광고 초기화 함수
    const initializeAd = () => {
        const partnersCoupang = (window as any).PartnersCoupang;
        if (partnersCoupang) {
            partnersCoupang.G({
                id: id,
                template: template,
                trackingCode: trackingCode,
                width: width,
                height: height,
            });
        }
    };

    // 스크립트 광고를 초기화합니다.
    useEffect(() => {
        if (type === "script") {
            loadCoupangScript().then(() => {
                const interval = setInterval(() => {
                    if ((window as any).PartnersCoupang) {
                        initializeAd();
                        clearInterval(interval);
                    }
                }, 100); // 100ms마다 확인
            });
        }
    }, [type, id, template, trackingCode, width, height]);

    // 이미지 광고 렌더링
    if (type === "image") {
        return (
            <div className={`flex justify-center ${className}`}>
                <a
                    href={`https://link.coupang.com/a/${trackingCode}`}
                    target="_blank"
                    referrerPolicy="unsafe-url"
                >
                    <img
                        src={`https://ads-partners.coupang.com/banners/${id}?subId=&traceId=V0-301-${id}&w=${width}&h=${height}`}
                        alt="Coupang Partner"
                        width={width}
                        height={height}
                    />
                </a>
            </div>
        );
    }

    // iframe 광고 렌더링
    if (type === "iframe") {
        return (
            <div className={`flex justify-center ${className}`}>
                <iframe
                    src={`https://ads-partners.coupang.com/widgets.html?id=${id}&template=${template}&trackingCode=${trackingCode}&width=${width}&height=${height}`}
                    width={width}
                    height={height}
                    referrerPolicy="unsafe-url"
                />
            </div>
        );
    }

    // 스크립트 광고의 컨테이너
    return (
        <div
            ref={containerRef}
            className={`flex justify-center ${
                darkMode ? "bg-gray-800" : "bg-white"
            } ${className}`}
        />
    );
};

export default CoupangAd;
