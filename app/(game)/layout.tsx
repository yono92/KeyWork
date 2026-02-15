import type { ReactNode } from "react";
import AppFrame from "../../src/components/AppFrame";

interface GameLayoutProps {
    children: ReactNode;
}

export default function GameLayout({ children }: GameLayoutProps) {
    return <AppFrame>{children}</AppFrame>;
}
