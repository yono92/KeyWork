import React, { useEffect, useState } from "react";
import useTypingStore from "../store/store";
import CoupangAd from "./CoupangAd";

interface AdSizeType {
    width: string;
    height: string;
}

const ResponsiveCoupangAd: React.FC = () => {
    const darkMode = useTypingStore((state) => state.darkMode);
    const [adSize, setAdSize] = useState<AdSizeType>({
        width: "250",
        height: "300",
    });

    useEffect(() => {
        const updateAdSize = () => {
            const width = window.innerWidth;
            if (width >= 1536) {
                setAdSize({ width: "300", height: "1050" });
            } else if (width >= 1280) {
                setAdSize({ width: "200", height: "900" });
            } else if (width >= 768) {
                setAdSize({ width: "336", height: "280" });
            } else {
                setAdSize({ width: "320", height: "150" });
            }
        };

        updateAdSize();
        window.addEventListener("resize", updateAdSize);
        return () => window.removeEventListener("resize", updateAdSize);
    }, []);

    return (
        <div
            className={`transition-all duration-200 rounded-lg shadow-lg overflow-hidden ${
                darkMode ? "bg-gray-800" : "bg-white"
            }`}
            style={{ paddingBottom: "16px" }}
        >
            <CoupangAd
                type="image"
                id="816810"
                trackingCode="AF5436002"
                width={adSize.width}
                height={adSize.height}
            />
            <p
                className={`mt-4 text-xs text-center px-2 ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                }`}
            >
                이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의
                수수료를 제공받습니다.
            </p>
        </div>
    );
};

export default ResponsiveCoupangAd;
