import React from "react";

const Header: React.FC = () => {
    return (
        <header className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold">KeyWork</div>
            <div className="flex space-x-4">
                <a href="#" className="hover:underline">
                    Get Contents
                </a>
                <a href="#" className="hover:underline">
                    Upload
                </a>
                <a href="#" className="hover:underline">
                    Archive
                </a>
                <a href="#" className="hover:underline">
                    Account
                </a>
            </div>
        </header>
    );
};

export default Header;
