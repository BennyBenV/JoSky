import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import GameBoard from './components/GameBoard';
import RulesModal from './components/RulesModal';
import ChatBox from './components/ChatBox';

// Initialize socket outside component to prevent multiple connections
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
const socket = io(SOCKET_URL);

// Helper for stable ID
const getUserId = () => {
  let id = sessionStorage.getItem("josky_userId");
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("josky_userId", id);
  }
  return id;
};

function App() {
  const [phase, setPhase] = useState('LOGIN'); // LOGIN, LOBBY, GAME
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(getUserId()); // Init with storage
  const [pseudo, setPseudo] = useState(sessionStorage.getItem("josky_pseudo") || '');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showRoundSummary, setShowRoundSummary] = useState(true); // Default visible when round ends
  const [showGameOverSummary, setShowGameOverSummary] = useState(true);

  const [gameLimit, setGameLimit] = useState(100); // 100, 50, or '1_ROUND'

  useEffect(() => {
    // Console log removed per request
    document.title = "JoSky - RETRO 90s";

    // Auto-reconnect
    const savedRoomId = sessionStorage.getItem("josky_roomId");
    if (savedRoomId && playerId) {
      socket.emit("rejoin_game", { roomId: savedRoomId, userId: playerId });
    }
  }, []); // Run once

  useEffect(() => {
    socket.on('connect', () => {
      // Don't overwrite playerId from socket.id anymore! We use stable ID.
    });

    socket.on('room_created', ({ roomId, playerId }) => {
      // setPlayerId(playerId); // Already have it
      sessionStorage.setItem("josky_roomId", roomId);
      setRoom({ id: roomId, players: [] });
      setPhase('LOBBY');
    });

    socket.on('room_joined', ({ roomId, playerId }) => {
      sessionStorage.setItem("josky_roomId", roomId);
      setRoom({ id: roomId, players: [] });
      setPhase('LOBBY');
    });

    socket.on('game_rejoined', ({ room, playerId }) => {
      setRoom(room);
      setPhase(room.gameState === 'LOBBY' ? 'LOBBY' : 'GAME');
      setPlayerId(playerId);
      sessionStorage.setItem("josky_roomId", room.id);
    });

    socket.on('player_list_update', (players) => {
      setRoom(prev => prev ? { ...prev, players } : { id: '???', players });
    });

    socket.on('game_started', (roomData) => {
      setRoom(roomData);
      setPhase('GAME');
    });

    socket.on('game_update', (newRoomState) => {
      setRoom(newRoomState);
      if (newRoomState && newRoomState.gameState === 'LOBBY') {
        setPhase('LOBBY');
        // Reset local states potentially?
      }
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('game_rejoined');
      socket.off('player_list_update');
      socket.off('game_started');
      socket.off('game_update');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    if (room?.gameState === 'ROUND_FINISHED') {
      setShowRoundSummary(true);
    }
  }, [room?.gameState]);

  const handleCreateRoom = () => {
    if (!pseudo) return setError("Pseudo requis !");
    sessionStorage.setItem("josky_pseudo", pseudo);
    socket.emit('create_room', { pseudo, userId: playerId });
  };

  const handleJoinRoom = () => {
    if (!pseudo || !targetRoomId) return setError("Pseudo et Code Room requis");
    sessionStorage.setItem("josky_pseudo", pseudo);
    socket.emit('join_room', { roomId: targetRoomId.toUpperCase(), pseudo, userId: playerId });
  };

  const handleStartGame = () => {
    if (!room) return;
    socket.emit('start_game', { roomId: room.id || targetRoomId, settings: { limit: gameLimit } });
  };

  const handleGameAction = (action, payload) => {
    if (!room) return;
    socket.emit('action', { roomId: room.id, action, payload });
  };

  const handleNextRound = () => {
    if (!room) return;
    socket.emit('next_round', { roomId: room.id });
  };

  return (
    <div className="min-h-screen bg-yellow-50 font-sans text-slate-900 selection:bg-pink-400 selection:text-white relative">
      {phase === 'LOBBY' && (
        <button
          onClick={() => setShowRules(true)}
          className="fixed bottom-4 left-4 bg-white border-2 border-black px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 z-50 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        >
          📖 RÈGLES
        </button>
      )}

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 font-bold">
          {error}
        </div>
      )}

      {/* LOGIN SCREEN */}
      {phase === 'LOGIN' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 pattern-grid-lg">
          <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full transform rotate-1 transition-transform hover:rotate-0">
            <h1 className="text-5xl md:text-6xl font-black text-center mb-8 tracking-tighter text-black" style={{ textShadow: '4px 4px 0px #f472b6' }}>
              JOSKY
            </h1>

            <div className="mb-6">
              <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">Pseudo</label>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                className="w-full bg-white border-2 border-black px-4 py-3 text-black font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-400"
                placeholder="VOTRE BLAZE"
              />
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={handleCreateRoom}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black border-2 border-black font-black py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                CRÉER UNE ROOM
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t-2 border-black"></div>
                <span className="flex-shrink mx-4 text-black font-bold">OU</span>
                <div className="flex-grow border-t-2 border-black"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value.toUpperCase())}
                  className="w-2/3 bg-white border-2 border-black px-4 py-3 text-black font-mono font-bold uppercase focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder-gray-400"
                  placeholder="CODE"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-1/3 bg-pink-400 hover:bg-pink-300 text-black border-2 border-black font-black py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  GO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY SCREEN */}
      {phase === 'LOBBY' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 pattern-dots-md text-slate-900 bg-yellow-50">
          <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md w-full relative overflow-hidden">

            {/* Header Decoration */}
            <div className="absolute top-0 left-0 w-full h-4 bg-cyan-400 border-b-4 border-black"></div>

            <div className="relative mb-8 text-center mt-4">
              <h2 className="text-5xl md:text-6xl font-black text-black uppercase tracking-tighter transform -rotate-2 inline-block bg-yellow-400 border-4 border-black px-4 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 relative">
                Lobby
              </h2>
              <div className="absolute top-1/2 left-0 w-full h-1 bg-black -z-0"></div>
            </div>

            {/* Room Code Ticket */}
            <div className="mb-8 relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-black text-yellow-400 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-white transform -rotate-1 shadow-sm inline-block">
                  Ticket d'entrée
                </span>
              </div>

              <div
                className="w-full bg-cyan-100 border-4 border-dashed border-black p-4 pt-6 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:bg-cyan-200 transition-colors relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"
                onClick={() => {
                  navigator.clipboard.writeText(room?.id || targetRoomId);
                  const el = document.getElementById('copy-toast');
                  if (el) { el.classList.remove('translate-y-full', 'opacity-0'); setTimeout(() => el.classList.add('translate-y-full', 'opacity-0'), 2000); }
                }}
              >
                <div className="absolute inset-x-0 bottom-0 h-2 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>

                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] font-bold uppercase text-cyan-800 tracking-widest mb-1">Code Room</span>
                  <span className="text-4xl md:text-5xl font-mono font-black text-black tracking-wider" style={{ textShadow: '2px 2px 0px #fff' }}>
                    {room?.id || targetRoomId || '...'}
                  </span>
                </div>

                <button className="bg-pink-500 hover:bg-pink-400 text-white border-2 border-black p-3 rounded-lg shadow-sm group-active:scale-95 transition-transform z-10 flex-shrink-0">
                  <span className="text-xl">📋</span>
                </button>
              </div>

              {/* Toast */}
              <div id="copy-toast" className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-md transform translate-y-full opacity-0 transition-all duration-300 z-50 whitespace-nowrap border-2 border-white pointer-events-none">
                ✅ CODE COPIÉ !
              </div>
            </div>

            {/* Game Options (Host Only) */}
            {room?.players?.[0]?.id === playerId ? (
              <div className="mb-8 border-b-4 border-black border-double pb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-black uppercase bg-black text-white px-2 py-0.5 transform -rotate-1">Objectif :</label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 50, '1_ROUND'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        // setGameLimit(opt); // Redundant if we sync, but good for instant reaction? 
                        // Actually better to just emit
                        socket.emit('update_settings', { roomId: room.id, settings: { limit: opt } });
                      }}
                      className={`py-2 px-1 font-black border-2 border-black text-[10px] md:text-xs uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]
                                ${(room?.limit || 100) === opt ? 'bg-orange-400 text-white transform -rotate-1 scale-105 z-10' : 'bg-white text-black hover:bg-gray-50'}
                            `}
                    >
                      {opt === '1_ROUND' ? '1 Manche' : `${opt} Pts`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-8 border-b-4 border-black border-double pb-6 text-center">
                <div className="inline-block bg-gray-200 border-2 border-black px-4 py-2 transform rotate-1">
                  <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Mode de jeu</div>
                  <div className="font-black text-xl">{room.limit === '1_ROUND' ? 'MORT SUBITE (1 Manche)' : `PREMIER À ${room.limit || 100} PTS`}</div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-end mb-2 border-b-2 border-black pb-1">
                <span className="text-sm font-black uppercase">Joueurs</span>
                <span className="text-xs font-bold bg-black text-white px-2 rounded-full">{room?.players?.length || 0} / 8</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {room?.players?.map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 transition-transform">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center border-2 border-black font-black text-white ${i === 0 ? 'bg-yellow-400' : 'bg-purple-500'}`}>
                        {p.pseudo.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold leading-none text-sm">{p.pseudo} {p.id === playerId && <span className="text-[10px] text-gray-500">(Toi)</span>}</span>
                        {i === 0 && <span className="text-[9px] font-bold text-yellow-600 uppercase">Chef de room</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-green-100 text-green-700 border border-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">PRÊT</span>
                  </div>
                ))}
                {(!room?.players || room.players.length === 0) && <div className="text-gray-400 italic text-center py-4">En attente de copains...</div>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {room?.players?.[0]?.id === playerId ? (
                <button
                  onClick={handleStartGame}
                  disabled={!room || room.players.length < 2}
                  className={`w-full font-black py-4 border-2 border-black text-lg transition-all uppercase tracking-widest ${(!room || room.players.length < 2)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-green-400 hover:bg-green-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none animate-pulse hover:animate-none'
                    }`}
                >
                  {(!room || room.players.length < 2) ? 'Attente joueurs...' : '🚀 LANCER LA PARTIE !'}
                </button>
              ) : (
                <div className="w-full font-black py-4 border-2 border-black bg-gray-100 text-gray-400 text-center uppercase tracking-widest cursor-wait">
                  En attente du chef... ☕
                </div>
              )}

              <button
                onClick={() => {
                  if (room) {
                    socket.emit('leave_room', { roomId: room.id, userId: playerId });
                    setRoom(null);
                    setPhase('LOGIN');
                    sessionStorage.removeItem("josky_roomId");
                  }
                }}
                className="w-full bg-transparent hover:bg-red-50 text-red-500 border-2 border-transparent hover:border-red-500 font-bold py-2 text-xs transition-all uppercase"
              >
                Quitter la room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME SCREEN */}
      {phase === 'GAME' && (
        <div className="relative">
          {/* Rules Button is global now */}

          {/* ROUND FINISHED OVERLAY */}
          {room?.gameState === 'ROUND_FINISHED' && (
            <>
              {showRoundSummary ? (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full text-center relative">
                    <button
                      onClick={() => setShowRoundSummary(false)}
                      className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-black font-bold p-2 rounded-full w-8 h-8 flex items-center justify-center border-2 border-black"
                      title="Masquer pour voir le plateau"
                    >
                      👁️
                    </button>

                    <h2 className="text-4xl font-black uppercase mb-6 bg-yellow-400 inline-block px-4 border-2 border-black transform -rotate-2">Fin de Manche !</h2>

                    <div className="space-y-4 mb-8">
                      {room.players.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-50 border-2 border-black p-3">
                          <div className="flex flex-col text-left">
                            <span className="font-black text-lg">{p.pseudo}</span>
                            {p.penaltyApplied && <span className="text-xs font-bold text-red-500 uppercase">⚠️ Pénalité ("Risque Tout")</span>}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black">{p.score} pts</div>
                            <div className="text-xs font-bold text-gray-500">Total: {p.totalScore}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={handleNextRound} className="w-full bg-cyan-400 hover:bg-cyan-300 text-black border-2 border-black font-black py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
                      MANCHE SUIVANTE ➡️
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRoundSummary(true)}
                  className="fixed bottom-4 left-4 z-50 bg-yellow-400 border-2 border-black px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce"
                >
                  📊 VOIR RÉSULTATS
                </button>
              )}
            </>
          )}

          {/* GAME OVER OVERLAY */}
          {room?.gameState === 'GAME_OVER' && (
            <>
              {showGameOverSummary ? (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                  <div className="bg-yellow-400 border-4 border-black p-6 md:p-8 shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] max-w-lg w-full text-center relative max-h-[90vh] overflow-y-auto">

                    {/* TOGGLE VIEW BOARD BUTTON */}
                    <button
                      onClick={() => setShowGameOverSummary(false)}
                      className="absolute top-2 right-2 bg-white hover:bg-gray-100 text-black font-bold p-2 rounded-full w-8 h-8 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5"
                      title="Voir le plateau"
                    >
                      👁️
                    </button>

                    <h1 className="text-4xl md:text-6xl font-black uppercase mb-6 text-black tracking-tighter transform -rotate-2" style={{ textShadow: '2px 2px 0px #fff' }}>GAME OVER</h1>

                    <div className="mb-6">
                      <div className="text-lg md:text-xl font-bold uppercase mb-4">🏆 LE CHAMPION 🏆</div>
                      {(() => {
                        // Find winner (lowest score)
                        const winner = room.players.reduce((prev, curr) => (prev.totalScore < curr.totalScore) ? prev : curr);
                        return (
                          <div className="inline-block bg-white border-4 border-black p-4 md:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-2 animate-bounce">
                            <div className="text-2xl md:text-4xl font-black uppercase mb-1">{winner.pseudo}</div>
                            <div className="text-sm md:text-lg font-bold bg-green-200 inline-block px-2 border border-black rounded-full">
                              Score Final: {winner.totalScore} pts
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-3 mb-8 text-left bg-white p-4 border-2 border-black">
                      <h3 className="font-black uppercase border-b-2 border-black pb-2 mb-2 text-center">Classement Final</h3>
                      {room.players
                        .sort((a, b) => a.totalScore - b.totalScore)
                        .map((p, index) => (
                          <div key={p.id} className="flex justify-between items-center border-b border-gray-200 last:border-0 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xl w-6">{index + 1}.</span>
                              <span className="font-bold">{p.pseudo}</span>
                            </div>
                            <span className="font-mono font-bold text-lg">{p.totalScore} pts</span>
                          </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          if (room) socket.emit('restart_game', { roomId: room.id });
                        }}
                        className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black font-black py-3 px-6 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-none"
                      >
                        REJOUER 🔄
                      </button>

                      <button
                        onClick={() => {
                          if (room) {
                            socket.emit('leave_room', { roomId: room.id, userId: playerId });
                            setRoom(null);
                            setPhase('LOGIN');
                            sessionStorage.removeItem("josky_roomId");
                          }
                        }}
                        className="w-full bg-transparent hover:bg-red-50 text-red-600 border-2 border-transparent hover:border-red-600 font-bold py-2 text-sm transition-all"
                      >
                        QUITTER LA ROOM 🚪
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowGameOverSummary(true)}
                  className="fixed bottom-4 left-4 z-50 bg-black text-white border-2 border-white px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce"
                >
                  🏆 VOIR PODIUM
                </button>
              )}
            </>
          )}

          {/* Actual Game Board */}
          <GameBoard room={room} playerId={playerId} onAction={handleGameAction} />
        </div>
      )}

      {/* GLOBAL CHAT (Visible in Lobby & Game) */}
      {room && (
        <ChatBox room={room} socket={socket} playerId={playerId} />
      )}

    </div>
  );
}

export default App;
