import React from "react";

const Footer: React.FC = () => {
    return (
        <footer className="text-slate-400 dark:text-slate-500 text-xs py-2.5">
            <div className="text-center">
                <p>&copy; {new Date().getFullYear()} KeyWork. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
