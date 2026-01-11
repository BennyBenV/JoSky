import React, { useState, useEffect, useRef } from 'react';

const ChatBox = ({ room, socket, playerId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [hasUnread, setHasUnread] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial load from room (if any)
    useEffect(() => {
        if (room && room.messages) {
            setMessages(room.messages);
        }
    }, [room]);

    // Listen for updates
    useEffect(() => {
        if (!socket) return;

        const handleChatUpdate = (newMessages) => {
            setMessages(newMessages);
            if (!isOpen) {
                setHasUnread(true);
            }
        };

        socket.on('chat_update', handleChatUpdate);
        return () => {
            socket.off('chat_update', handleChatUpdate);
        };
    }, [socket, isOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    // Clear unread when opening
    useEffect(() => {
        if (isOpen) {
            setHasUnread(false);
        }
    }, [isOpen]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        socket.emit('send_message', {
            roomId: room.id,
            text: inputText
        });
        setInputText("");
    };

    return (
        <>
            {/* FLOATING BUTTON (Always visible) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    fixed bottom-4 right-4 z-[90] w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-all active:translate-y-1 active:shadow-none
                    ${isOpen ? 'bg-red-500 rotate-90' : 'bg-blue-400 hover:bg-blue-300'}
                `}
            >
                {isOpen ? (
                    <span className="text-xl md:text-2xl">❌</span>
                ) : (
                    <span className="text-xl md:text-2xl">💬</span>
                )}

                {/* Notification Badge */}
                {!isOpen && hasUnread && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-black"></span>
                    </span>
                )}
            </button>

            {/* CHAT WINDOW (Drawer/Popover) */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 w-80 max-w-[calc(100vw-32px)] h-96 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-[90] flex flex-col p-2 animate-in slide-in-from-bottom-10 fade-in duration-200 rounded-lg">

                    {/* Header */}
                    <div className="bg-blue-400 border-2 border-black p-2 font-black text-center uppercase text-sm mb-2 shadow-sm">
                        Chat de la Room
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-2 bg-gray-50 border-2 border-black flex flex-col gap-2 mb-2">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-400 text-xs italic mt-4">
                                Pas de messages... lancez la discussion !
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === playerId;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] px-3 py-1.5 rounded-lg border-2 border-black text-xs font-bold break-words shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] ${isMe ? 'bg-yellow-200 text-black' : 'bg-white text-black'}`}>
                                            {!isMe && <span className="text-[9px] text-gray-500 block mb-0.5 uppercase tracking-wide">{msg.sender}</span>}
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ton message..."
                            className="flex-1 border-2 border-black px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                            maxLength={200}
                        />
                        <button
                            type="submit"
                            className="bg-green-400 border-2 border-black px-3 font-black text-sm active:translate-y-0.5 hover:bg-green-300"
                        >
                            SEND
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default ChatBox;
