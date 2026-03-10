import type { ReactNode } from "react";
import AppFrame from "../../src/components/AppFrame";
import { AuthProvider } from "@/components/auth/AuthProvider";

interface GameLayoutProps {
    children: ReactNode;
}

export default function GameLayout({ children }: GameLayoutProps) {
    return (
        <AuthProvider>
            <AppFrame>{children}</AppFrame>
        </AuthProvider>
    );
}
