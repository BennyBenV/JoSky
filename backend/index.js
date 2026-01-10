const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const {
    rooms, Room, Player, initGame, startNextRound, startGameplay, checkColumnRule, calculateScore
} = require('./gameManager');

const app = express();
app.use(cors());

const httpServer = http.createServer(app);

// Use the CORS config from user request
const io = new Server(httpServer, {
    cors: {
        origin: ["https://ton-projet-vercel.app", "http://localhost:5173", "http://127.0.0.1:5173"], // Added 127.0.0.1 just in case
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // --- Lobby Events ---

    socket.on("create_room", ({ pseudo, userId }) => {
        const roomId = uuidv4().substring(0, 6).toUpperCase(); // Short code
        const newRoom = new Room(roomId);
        // Use userId (stable) instead of socket.id for Player ID
        const player = new Player(userId || socket.id, pseudo);
        player.socketId = socket.id; // Set socketId
        newRoom.players.push(player);
        rooms[roomId] = newRoom;

        socket.join(roomId);
        if (userId) socket.join(userId); // Join channel for this specific user

        socket.emit("room_created", { roomId, playerId: player.id });
        io.to(roomId).emit("player_list_update", newRoom.players);
    });

    socket.on("join_room", ({ roomId, pseudo, userId }) => { // roomId should be upper
        const room = rooms[roomId];
        if (room && room.gameState === 'LOBBY') { // Join only if lobby
            // Check if already in?
            const existing = room.players.find(p => p.id === userId);
            if (existing) {
                // Re-connect logic if accidentally joined same room?
                existing.socketId = socket.id; // Update socketId
                existing.connected = true; // Mark as reconnected
                socket.join(roomId);
                if (userId) socket.join(userId);
                socket.emit("room_joined", { roomId, playerId: existing.id });
                io.to(roomId).emit("player_list_update", room.players);
                return;
            }

            const player = new Player(userId || socket.id, pseudo);
            player.socketId = socket.id; // Set socketId
            room.players.push(player);
            socket.join(roomId);
            if (userId) socket.join(userId);

            socket.emit("room_joined", { roomId, playerId: player.id });
            io.to(roomId).emit("player_list_update", room.players);
        } else {
            socket.emit("error", { message: "Room not found or game started" });
        }
    });

    socket.on("rejoin_game", ({ roomId, userId }) => {
        const room = rooms[roomId];
        if (room) {
            const player = room.players.find(p => p.id === userId);
            if (player) {
                // Success
                player.socketId = socket.id; // Update socketId
                player.connected = true; // Mark as reconnected
                socket.join(roomId);
                socket.join(userId);

                // If game is running, send full state
                // If lobby, send lobby state
                socket.emit("game_rejoined", { room, playerId: userId });
                // Notify others? Not strictly necessary if just reconnecting socket
                console.log(`User ${player.pseudo} rejoined room ${roomId}`);
                io.to(roomId).emit("player_list_update", room.players); // Update player list for others
                if (room.gameState !== 'LOBBY') {
                    io.to(roomId).emit("game_update", room); // Send game state if game is active
                }
            } else {
                socket.emit("error", { message: "Player not found in this room", code: 'NOT_found' });
            }
        } else {
            socket.emit("error", { message: "Room not found", code: 'ROOM_NOT_FOUND' });
        }
    });

    socket.on("start_game", ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 2) { // Min 2 players logic?
            initGame(roomId);
            io.to(roomId).emit("game_started", room);
        }
    });

    // --- Game Events ---

    socket.on("action", ({ roomId, action, payload }) => {
        // action: 'DRAW_DECK', 'DRAW_DISCARD', 'REPLACE_GRID', 'FLIP_GRID'
        const room = rooms[roomId];
        if (!room) return;

        // Find player by socketId (since p.id is now UUID)
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) {
            console.log("Action blocked: Player not found for socket", socket.id);
            return;
        }

        // Special Phase: SETUP (No turn order)
        if (room.gameState === 'SETUP') {
            if (action === 'SETUP_REVEAL') {
                const { gridIndex } = payload;
                const card = player.grid[gridIndex];

                // Validate
                if (player.revealedCount >= 2 || card.visible) return; // Ignore if already 2 or card visible

                card.visible = true;
                player.revealedCount++;

                // Check if ALL players are ready (2 cards revealed)
                const allReady = room.players.every(p => p.revealedCount === 2);
                if (allReady) {
                    startGameplay(room); // Calculates starter, sets state to PLAYING
                    io.to(roomId).emit("game_started", room); // Re-emit game_started or update?
                    // game_started sets phase=GAME in frontend (good)
                    // But we are already in GAME phase probably?
                    // Emit game_update is safer usually but game_started is fine.
                }
                io.to(roomId).emit("game_update", room);
            }
            return;
        }

        // Turn validation (For PLAYING phase)
        if (room.gameState === 'PLAYING') {
            const currentPlayer = room.players[room.currentTurnPlayerIndex];
            // Validate that the acting player is the current turn player
            if (currentPlayer.id !== player.id) {
                console.log("Not your turn. Current:", currentPlayer.pseudo, "Acting:", player.pseudo);
                socket.emit("error", { message: "Not your turn" });
                return;
            }
        } else {
            // Block other states?
            return;
        }

        const { turnState } = room;

        if (action === 'DRAW_DECK') {
            if (turnState !== 'CHOOSING') return;
            const card = room.deck.pop();
            room.drawnCard = card;
            room.turnState = 'PLACING'; // Must now replace or discard
        }
        else if (action === 'DRAW_DISCARD') {
            // Take invalidates turn immediately (must swap)
            if (turnState !== 'CHOOSING') return;
            // Payload: gridIndex
            const { gridIndex } = payload;
            const targetCard = player.grid[gridIndex];
            const discardCard = room.discardPile.pop();

            // Swap
            player.grid[gridIndex] = discardCard;
            player.grid[gridIndex].visible = true; // Always visible on grid if placed? Yes.

            targetCard.visible = true; // Old card goes to discard visible
            room.discardPile.push(targetCard);

            endTurn(room);
        }
        else if (action === 'DISCARD_DRAWN') {
            if (turnState !== 'PLACING' || !room.drawnCard) return;
            // Discard the drawn card
            room.drawnCard.visible = true;
            room.discardPile.push(room.drawnCard);
            room.drawnCard = null;

            // Rule: "Si on jette la carte piochée, on DOIT révéler une de ses cartes cachées."
            // Payload: gridIndex to flip
            const { gridIndex } = payload;
            const cardToFlip = player.grid[gridIndex];
            if (!cardToFlip.visible && !cardToFlip.cleared) {
                cardToFlip.visible = true;
            }

            endTurn(room);
        }
        else if (action === 'REPLACE_DRAWN') {
            if (turnState !== 'PLACING' || !room.drawnCard) return;
            // Swap drawn card with grid card
            const { gridIndex } = payload;
            const targetCard = player.grid[gridIndex];

            player.grid[gridIndex] = room.drawnCard;
            player.grid[gridIndex].visible = true;

            targetCard.visible = true;
            room.discardPile.push(targetCard);
            room.drawnCard = null;

            endTurn(room);
        }

        io.to(roomId).emit("game_update", room);
    });

    socket.on("next_round", ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.gameState === 'ROUND_FINISHED') {
            // Only host should start? Or anyone? Let's say anyone for now or check host.
            // We don't have host concept explicitly, assume first player or anyone.
            const { startNextRound } = require('./gameManager');
            startNextRound(roomId);
            io.to(roomId).emit("game_update", room); // Will show fresh grid
            // Maybe emit "round_started" to force clean state logic?
            io.to(roomId).emit("game_started", room); // Reuse game_started to reset UI phase
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Handle cleanup ONLY if in Lobby
        for (const roomId in rooms) {
            const room = rooms[roomId];

            // Find player by socketId (preferable) or id (fallback)
            const playerIdx = room.players.findIndex(p => p.socketId === socket.id || p.id === socket.id);

            if (playerIdx !== -1) {
                if (room.gameState === 'LOBBY') {
                    // In Lobby: Remove player
                    room.players.splice(playerIdx, 1);
                    io.to(roomId).emit("player_list_update", room.players);

                    if (room.players.length === 0) {
                        delete rooms[roomId];
                    }
                } else {
                    // In Game: Do NOT remove. Maybe mark as disconnected?
                    // For now, we just leave them. The user can rejoin.
                    console.log(`Player disconnected from active game ${roomId}. Keeping state.`);
                }
                break;
            }
        }
    });
});

function endTurn(room) { // Reverted io param
    const currentPlayer = room.players[room.currentTurnPlayerIndex];
    checkColumnRule(currentPlayer);

    // Check if player revealed all
    const allRevealed = currentPlayer.grid.every(c => c.visible || c.cleared);

    // If someone finished and we are at final round?
    if (room.finalTurnInitiatorId) {
        // If the current player was the last one to play before starter?
        // Logic: continue until it loops back to initiator.
    } else if (allRevealed) {
        room.finalTurnInitiatorId = currentPlayer.id;
        // The game continues until just before this player's next turn.
    }

    // Check if Game Over (Round complete)
    // If specific conditions met.
    // Simple logic: If finalTurnInitiatorId is set, check if next player is initiator. 
    // If so, end game.

    // Move to next player
    let nextIndex = (room.currentTurnPlayerIndex + 1) % room.players.length;

    // Check game over condition (Round End)
    if (room.finalTurnInitiatorId && room.players[nextIndex].id === room.finalTurnInitiatorId) {
        finishRound(room);
    } else {
        room.currentTurnPlayerIndex = nextIndex;
        room.turnState = 'CHOOSING';
    }
}

function finishRound(room) {
    // 1. Reveal ALL cards for everyone
    room.players.forEach(p => {
        p.grid.forEach(c => {
            if (!c.cleared) c.visible = true;
        });
    });

    // 2. Refresh Columns Logic (In case revealing creates new columns? Rules usually: "At end of turn". 
    // If we reveal all at once, do we check columns? Rules: "Cette vérification se fait à la fin de chaque tour de joueur."
    // "À la fin de ce dernier tour, toutes les cartes encore cachées sont retournées => On compte".
    // Usually no column clearing on final reveal, just raw counting. (Consensus in Skyjo).

    // 3. Calculate Scores & Penalty
    const scores = room.players.map(p => ({ id: p.id, rawScore: calculateScore(p) }));
    const initiatorId = room.finalTurnInitiatorId;

    if (initiatorId) {
        const initiatorScore = scores.find(s => s.id === initiatorId).rawScore;
        const othersScores = scores.filter(s => s.id !== initiatorId).map(s => s.rawScore);
        const minOther = Math.min(...othersScores);

        // Penalty Rule: "Si celui qui a fini n'a pas le score le plus bas strictement..."
        // i.e. Initiator Score >= Lowest of Others
        if (initiatorScore >= minOther) {
            // Apply Penalty: Double Score (if positve)
            // "Note : Cette règle ne s'applique que si son score est positif."
            const p = room.players.find(p => p.id === initiatorId);
            p.scorePrev = initiatorScore;
            if (initiatorScore > 0) {
                p.score = initiatorScore * 2;
                p.penaltyApplied = true;
            } else {
                p.score = initiatorScore;
                p.penaltyApplied = false;
            }
        } else {
            // No penalty
            room.players.forEach(p => {
                p.score = calculateScore(p);
            });
        }
    } else {
        // Fallback (shouldn't happen if logic holds)
        room.players.forEach(p => {
            p.score = calculateScore(p);
        });
    }

    // 4. Update Total Scores
    room.players.forEach(p => {
        p.totalScore += p.score;
    });

    // 5. Check Game Over Condition (>= 100 pts)
    const gameOver = room.players.some(p => p.totalScore >= 100);

    if (gameOver) {
        room.gameState = 'GAME_OVER';
        // Determine Winner (Lowest Total Score)
        // We can sort players in frontend
    } else {
        room.gameState = 'ROUND_FINISHED';
    }

    // Emit update
    // We need io here? 'endTurn' is defined outside io scope? 
    // No, it's defined in the file but needs access to io? 
    // 'endTurn' is called by socket handler which has io access? 
    // It's currently outside. I need to make sure `io` is accessible or pass it.
    // I will modify `endTurn` signature to accept `io`.
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
