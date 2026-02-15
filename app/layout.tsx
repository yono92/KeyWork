import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
    title: "KeyWork",
    description: "Korean and English typing practice games",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')}catch(e){}`,
                    }}
                />
                {children}
            </body>
        </html>
    );
}
