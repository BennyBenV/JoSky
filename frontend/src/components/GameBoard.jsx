import React, { useState } from 'react';
import Card from './Card';

const GameBoard = ({ room, playerId, onAction }) => {
    const [actionState, setActionState] = React.useState(null); // null, 'SELECT_TO_SWAP_DISCARD', 'SELECT_TO_FLIP_FOR_DISCARD'
    const [showOpponents, setShowOpponents] = React.useState(false); // Toggle for opponents view

    if (!room) return <div className="text-white">Loading Room...</div>;

    const player = room.players.find(p => p.id === playerId);
    const opponents = room.players.filter(p => p.id !== playerId);

    if (!player) return <div className="text-red-500">Error: Player missing</div>;

    const isMyTurn = room.players[room.currentTurnPlayerIndex]?.id === playerId;
    const turnState = room.turnState; // CHOOSING, PLACING
    const drawnCard = room.drawnCard;
    const activePlayer = room.players[room.currentTurnPlayerIndex];

    const handleGridClick = (index) => {
        if (room.gameState === 'SETUP') {
            if (player.revealedCount < 2 && !player.grid[index].visible) {
                onAction('SETUP_REVEAL', { gridIndex: index });
            }
            return;
        }

        if (!isMyTurn) return;

        const card = player.grid[index];

        if (actionState === 'SELECT_TO_SWAP_DISCARD') {
            onAction('DRAW_DISCARD', { gridIndex: index });
            setActionState(null);
        }
        else if (actionState === 'SELECT_TO_FLIP_FOR_DISCARD') {
            if (card.visible || card.cleared) {
                alert("Révélez une carte cachée !");
                return;
            }
            onAction('DISCARD_DRAWN', { gridIndex: index });
            setActionState(null);
        }
        else if (turnState === 'PLACING') {
            onAction('REPLACE_DRAWN', { gridIndex: index });
        }
    };

    const isGridInteractable = (index, card) => {
        if (room.gameState === 'SETUP' && !card.visible && player.revealedCount < 2) return true;
        if (!isMyTurn) return false;
        if (actionState) return true;
        if (turnState === 'PLACING') return true;
        return false;
    };

    // Calculate next player for visual feedback
    const nextPlayerIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;
    const nextPlayerId = room.players[nextPlayerIndex]?.id;

    return (
        <div className="w-full min-h-[100dvh] bg-yellow-50 flex flex-col overflow-y-auto font-sans text-slate-900 relative pb-10">

            {/* --- TOP BAR: INFO & TOGGLE --- */}
            <div className="flex-shrink-0 h-14 bg-white border-b-2 border-black flex justify-between items-center px-4 shadow-sm z-20 sticky top-0">
                {/* Left: Turn Info */}
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Tour de</span>
                    <span className={`text-sm font-black uppercase ${isMyTurn ? 'text-green-600 animate-pulse' : 'text-black'}`}>
                        {isMyTurn ? "C'EST À TOI !" : activePlayer?.pseudo}
                    </span>
                </div>

                {/* Center: Setup status if needed */}
                {room.gameState === 'SETUP' && (
                    <div className="absolute left-1/2 -translate-x-1/2 bg-yellow-400 px-3 py-1 border-2 border-black font-black text-xs animate-bounce whitespace-nowrap">
                        SETUP ({player.revealedCount}/2)
                    </div>
                )}

                {/* Right: Opponents Toggle */}
                {opponents.length > 0 && (
                    <button
                        onClick={() => setShowOpponents(!showOpponents)}
                        className={`flex items-center gap-2 px-3 py-1 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-bold transition-all ${showOpponents ? 'bg-black text-white' : 'bg-white text-black active:translate-y-0.5 active:shadow-none'}`}
                    >
                        👥 {showOpponents ? 'FERMER' : 'ADVERSAIRES'}
                    </button>
                )}
            </div>

            {/* --- OPPONENTS OVERLAY (MODAL) --- */}
            {showOpponents && (
                <div className="fixed top-14 left-0 w-full bg-white/95 backdrop-blur-sm border-b-4 border-black z-30 p-4 shadow-xl animate-in slide-in-from-top-4 duration-200">
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {opponents.map(opp => {
                            const isNext = opp.id === nextPlayerId;
                            return (
                                <div key={opp.id} className={`flex-shrink-0 bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center w-32 relative ${isNext ? 'ring-4 ring-orange-400' : ''}`}>
                                    {isNext && (
                                        <div className="absolute -top-3 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10 animate-bounce shadow-sm border border-black">
                                            PROCHAIN
                                        </div>
                                    )}
                                    <span className="text-xs font-black uppercase truncate w-full text-center mb-1">{opp.pseudo}</span>
                                    <div className="grid grid-cols-4 gap-1 w-full mb-1">
                                        {opp.grid.map((c, i) => (
                                            <div key={i} className={`aspect-[2/3] border border-black/50 flex items-center justify-center text-[8px] font-bold rounded-sm ${c.cleared ? 'opacity-0' : (c.visible ? (c.value < 0 ? 'bg-violet-600 text-white' : (c.value === 0 ? 'bg-pink-400 text-white' : (c.value > 8 ? 'bg-black text-yellow-400' : 'bg-cyan-500 text-white'))) : 'bg-slate-800')}`}>
                                                {c.visible && !c.cleared && c.value}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500">Score: {opp.score}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- MAIN GAME AREA --- */}
            <div className="flex-1 flex flex-col items-center justify-start w-full max-w-md mx-auto h-full pb-6">

                {/* 1. ACTION ZONE (Deck/Discard) - Takes ~35-40% */}
                <div className="h-48 w-full flex-shrink-0 flex flex-col items-center justify-center relative mt-2">

                    {/* Status Banner */}
                    <div className={`mb-4 px-4 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isMyTurn ? 'bg-green-400 text-black animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                        {isMyTurn ? (turnState === 'CHOOSING' ? "PIOCHE OU DÉFAUSSE" : "POSE TA CARTE") : `ATTENTE DE ${activePlayer?.pseudo}...`}
                    </div>

                    <div className="flex items-center gap-6 md:gap-10 h-32 md:h-40 relative">
                        {/* DECK */}
                        <div
                            onClick={() => isMyTurn && turnState === 'CHOOSING' && onAction('DRAW_DECK')}
                            className={`
                                h-full aspect-[2/3] rounded-lg border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all
                                ${isMyTurn && turnState === 'CHOOSING' ? 'cursor-pointer bg-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-200 opacity-60 cursor-default'}
                            `}
                        >
                            <span className="text-sm font-black -rotate-6 select-none">PIOCHE</span>
                        </div>

                        {/* DISCARD */}
                        <div className="relative h-full aspect-[2/3]">
                            <div
                                onClick={() => isMyTurn && turnState === 'CHOOSING' && setActionState('SELECT_TO_SWAP_DISCARD')}
                                className={`
                                    w-full h-full rounded-lg border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all
                                    ${isMyTurn && turnState === 'CHOOSING' ? 'cursor-pointer ring-4 ring-pink-400 bg-pink-50 hover:-translate-y-1' : 'bg-white'}
                                `}
                            >
                                {room.discardPile.length > 0 ? (
                                    <Card value={room.discardPile[room.discardPile.length - 1].value} visible={true} className="w-full h-full scale-90 pointer-events-none" />
                                ) : (
                                    <span className="text-xs font-bold text-gray-300 select-none">VIDE</span>
                                )}
                            </div>
                            {isMyTurn && turnState === 'CHOOSING' && (
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-pink-400 text-black border-2 border-black px-2 py-0.5 text-[9px] font-black shadow-sm whitespace-nowrap z-10">
                                    PRENDRE
                                </div>
                            )}
                        </div>

                        {/* DRAWN CARD STATUS (Floating Overlay) */}
                        {drawnCard && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                                <div className="pointer-events-auto bg-white p-3 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center animate-in zoom-in duration-200">
                                    <div className="text-[10px] font-black uppercase mb-2 bg-yellow-400 px-2 border border-black">Carte Piochée</div>
                                    <div className="h-32 aspect-[2/3] mb-2">
                                        <Card value={drawnCard.value} visible={true} className="w-full h-full shadow-md" />
                                    </div>

                                    {turnState === 'PLACING' && (
                                        <button
                                            onClick={() => setActionState('SELECT_TO_FLIP_FOR_DISCARD')}
                                            className="w-full bg-red-500 text-white font-black text-[10px] py-2 px-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none hover:bg-red-400"
                                        >
                                            JETER & RÉVÉLER
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. PLAYER GRID (Bottom) - Takes Remaining Space with SCROLL */}
                <div className="flex-1 w-full bg-white border-t-2 border-black relative min-h-[350px]">
                    {/* Interaction Hint */}
                    {(actionState === 'SELECT_TO_SWAP_DISCARD' || turnState === 'PLACING') && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 text-[10px] font-bold rounded-full animate-bounce z-10 border border-white shadow-lg">
                            👇 CHOISIS OÙ PLACER TA CARTE 👇
                        </div>
                    )}

                    <div className="w-full h-full p-4 flex items-start justify-center overflow-y-auto">
                        <div className="grid grid-cols-4 gap-3 w-full max-w-[500px] place-items-center mb-8">
                            {player.grid.map((card, index) => (
                                <div key={index} className="w-full aspect-[2/3] flex items-center justify-center relative">
                                    {card.cleared ? (
                                        <div className="w-[90%] h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center opacity-40">
                                            <span className="text-gray-400 text-xl font-black">X</span>
                                        </div>
                                    ) : (
                                        <Card
                                            value={card.value}
                                            visible={card.visible}
                                            onClick={() => handleGridClick(index)}
                                            className={`
                                                w-[90%] h-full object-contain shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                                ${isGridInteractable(index, card) ? 'cursor-pointer hover:scale-105 hover:ring-4 hover:ring-yellow-400 z-10' : ''}
                                                ${actionState === 'SELECT_TO_FLIP_FOR_DISCARD' && !card.visible ? 'ring-4 ring-red-500 animate-pulse' : ''}
                                                ${room.gameState === 'SETUP' && !card.visible && player.revealedCount < 2 ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                                            `}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Credit */}
            <div className="text-center py-2 text-[8px] font-bold text-gray-400 opacity-50">
                JOSKY FOCUS UI
            </div>
        </div>
    );
};

export default GameBoard;
