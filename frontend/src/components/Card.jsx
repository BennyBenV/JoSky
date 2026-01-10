import React from 'react';

const Card = ({ value, visible, onClick, className = "", isSelected = false }) => {
    // Memphis Design Colors
    const getCardStyle = (val) => {
        if (val < 0) return "bg-violet-600 text-white border-black"; // Negative (-2, -1)
        if (val === 0) return "bg-pink-400 text-white border-black"; // Zero
        if (val > 0 && val <= 8) return "bg-cyan-500 text-white border-black"; // Pos Low (1-8)
        if (val > 8) return "bg-black text-yellow-400 border-black"; // Pos High (9-12)
        return "bg-gray-200 border-black";
    };

    // Base: Vertical Rectangle, Rounded-md, Border-2 Black, 3D Effect
    const baseStyle = "aspect-[2/3] w-full rounded-lg border-2 border-black border-b-[6px] border-r-[6px] flex items-center justify-center font-black cursor-pointer relative overflow-hidden select-none transition-transform active:border-b-2 active:border-r-2 active:translate-y-1 active:translate-x-1";

    const contentStyle = visible ? getCardStyle(value) : "bg-slate-900";
    const selectionStyle = isSelected ? "ring-4 ring-yellow-400 z-20 scale-105" : "";

    return (
        <div
            className={`${baseStyle} ${contentStyle} ${selectionStyle} ${className}`}
            onClick={onClick}
        >
            {visible ? (
                <div className="w-full h-full p-1">
                    <div className="w-full h-full border-2 border-black/20 rounded flex items-center justify-center relative">
                        {/* Huge Centered Number */}
                        <span className="text-4xl md:text-5xl z-10 drop-shadow-md">{value}</span>

                        {/* Geometric Decorations (Corners) */}
                        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-black/20"></div>
                        <div className="absolute bottom-1 right-1 w-2 h-2 bg-black/20"></div>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                    {/* Pattern for back: Diagonal Stripes high contrast */}
                    <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #1e293b 0, #1e293b 10px, #0f172a 10px, #0f172a 20px)' }}></div>

                    {/* Center Icon (Optional, maybe a small logo or shape) */}
                    <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-black z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                </div>
            )}
        </div>
    );
};

export default Card;
