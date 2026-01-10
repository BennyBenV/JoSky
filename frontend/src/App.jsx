import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import GameBoard from './components/GameBoard';
import RulesModal from './components/RulesModal';

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

  const [gameLimit, setGameLimit] = useState(100); // 100, 50, or '1_ROUND'

  useEffect(() => {
    // Console log removed per request
    document.title = "JoSky - RETRO 90s";

    // Auto-reconnect
    const savedRoomId = sessionStorage.getItem("josky_roomId");
    if (savedRoomId && playerId) {
      console.log("Attempting Rejoin:", savedRoomId);
      socket.emit("rejoin_game", { roomId: savedRoomId, userId: playerId });
    }
  }, []); // Run once

  useEffect(() => {
    // ... Socket events ... (keeping same)
    socket.on('connect', () => {
      console.log("Connected:", socket.id);
      // Don't overwrite playerId from socket.id anymore! We use stable ID.
    });

    socket.on('room_created', ({ roomId, playerId }) => {
      console.log("Room Created:", roomId);
      // setPlayerId(playerId); // Already have it
      sessionStorage.setItem("josky_roomId", roomId);
      setRoom({ id: roomId, players: [] });
      setPhase('LOBBY');
    });

    socket.on('room_joined', ({ roomId, playerId }) => {
      console.log("Joined:", roomId);
      sessionStorage.setItem("josky_roomId", roomId);
      setRoom({ id: roomId, players: [] });
      setPhase('LOBBY');
    });

    socket.on('game_rejoined', ({ room, playerId }) => {
      console.log("Rejoined successfully!", room);
      setRoom(room);
      setPhase(room.gameState === 'LOBBY' ? 'LOBBY' : 'GAME');
      setPlayerId(playerId);
      sessionStorage.setItem("josky_roomId", room.id);
    });

    socket.on('player_list_update', (players) => {
      setRoom(prev => prev ? { ...prev, players } : { id: '???', players });
    });

    socket.on('game_started', (roomData) => {
      console.log("Game Started!", roomData);
      setRoom(roomData);
      setPhase('GAME');
    });

    socket.on('game_update', (newRoomState) => {
      console.log("Game Update:", newRoomState);
      setRoom(newRoomState);
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
          className="fixed bottom-4 right-4 bg-white border-2 border-black px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 z-50 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 pattern-dots-md text-slate-900">
          <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
            <h2 className="text-3xl font-black text-black mb-6 text-center uppercase">Lobby</h2>

            {/* Room Code - Improved Visibility */}
            <div className="bg-yellow-300 border-4 border-black p-6 mb-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest">CODE ROOM</span>
              <div
                className="text-5xl font-mono font-black text-black tracking-widest flex items-center justify-center gap-4 cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                  navigator.clipboard.writeText(room?.id || targetRoomId);
                  const el = document.getElementById('copy-feedback');
                  if (el) { el.classList.remove('opacity-0'); setTimeout(() => el.classList.add('opacity-0'), 2000); }
                }}
                title="Cliquer pour copier"
              >
                {room?.id || targetRoomId || '...'}
                <span className="text-3xl opacity-100 drop-shadow-sm">📋</span>
              </div>
              <div id="copy-feedback" className="text-sm font-black text-black uppercase mt-2 opacity-0 transition-opacity duration-300 bg-white inline-block px-2 border border-black transform rotate-2">Copié !</div>
            </div>

            {/* Game Options (Only for Host/Everyone for now) */}
            <div className="mb-6 border-b-2 border-black pb-6">
              <label className="block text-sm font-bold uppercase mb-2">Fin de la partie :</label>
              <div className="flex gap-2">
                {[100, 50, '1_ROUND'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setGameLimit(opt)}
                    className={`flex-1 py-2 font-black border-2 border-black text-xs uppercase
                                ${gameLimit === opt ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(100,100,100,1)]' : 'bg-white text-black hover:bg-gray-100'}
                            `}
                  >
                    {opt === '1_ROUND' ? '1 Manche' : `${opt} Pts`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">Joueurs prêts</div>
              {room?.players?.map((p, i) => (
                <div key={p.id} className="flex justify-between items-center bg-white border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="font-bold flex items-center gap-2">
                    {i === 0 && <span className="text-xl">👑</span>}
                    {p.pseudo} {p.id === playerId && "(Moi)"}
                  </span>
                  <span className="text-xs font-black bg-green-400 border border-black px-2 py-0.5 rounded-full text-black">PRÊT</span>
                </div>
              ))}
              {(!room?.players || room.players.length === 0) && <div className="text-gray-500 italic">En attente de copains...</div>}
            </div>

            <button
              onClick={handleStartGame}
              disabled={!room || room.players.length < 2}
              className={`w-full font-black py-4 border-2 border-black transition-all ${(!room || room.players.length < 2)
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-green-400 hover:bg-green-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
            >
              {(!room || room.players.length < 2) ? 'ATTENTE JOUEURS (MIN 2)' : 'LANCER LA PARTIE !'}
            </button>

            <div className="mt-4 text-xs font-bold text-center text-gray-500">
              Copie le code et envoie-le !
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
            <div className="fixed inset-0 z-50 bg-yellow-400 flex items-center justify-center p-4 pattern-grid-lg">
              <div className="bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full text-center">
                <h1 className="text-6xl font-black uppercase mb-8 text-black" style={{ textShadow: '4px 4px 0px #fff' }}>GAME OVER</h1>

                <div className="mb-8">
                  <div className="text-xl font-bold uppercase mb-4">Et le vainqueur est...</div>
                  {(() => {
                    const winner = room.players.reduce((prev, curr) => (prev.totalScore < curr.totalScore) ? prev : curr);
                    return (
                      <div className="inline-block bg-green-400 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-2 animate-bounce">
                        <div className="text-4xl font-black uppercase">{winner.pseudo}</div>
                        <div className="text-lg font-bold">avec {winner.totalScore} points !</div>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2 mb-8">
                  {room.players.sort((a, b) => a.totalScore - b.totalScore).map((p, i) => (
                    <div key={p.id} className="flex justify-between border-b-2 border-black py-2">
                      <span className="font-bold">{i + 1}. {p.pseudo}</span>
                      <span className="font-mono font-black">{p.totalScore} pts</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => window.location.reload()} className="bg-black text-white hover:bg-gray-800 border-2 border-black font-black py-3 px-8 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                  REJOUER 🔄
                </button>
              </div>
            </div>
          )}

          {/* Actual Game Board */}
          <GameBoard room={room} playerId={playerId} onAction={handleGameAction} />
        </div>
      )}

    </div>
  );
}

export default App;
