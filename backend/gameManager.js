const { v4: uuidv4 } = require('uuid');

// --- Constants ---
const CARD_DISTRIBUTION = {
    '-2': 5,
    '-1': 10,
    '0': 15,
};
// 1 to 12: 10 cards each
for (let i = 1; i <= 12; i++) {
    CARD_DISTRIBUTION[i.toString()] = 10;
}

// --- Data Models ---

class Card {
    constructor(value) {
        this.id = uuidv4();
        this.value = parseInt(value);
        this.visible = false;
    }
}

class Player {
    constructor(id, pseudo) {
        this.id = id; // This will be userId (UUID)
        this.pseudo = pseudo;
        this.socketId = null; // Store current socket ID
        this.grid = []; // Array of 12 Cards (or null/placeholder)
        this.score = 0;
        this.totalScore = 0; // Cumulative score across rounds
        this.isReady = false;
        this.revealedCount = 0;
    }
}

class Room {
    constructor(id) {
        this.id = id;
        this.players = []; // Array of Player
        this.deck = []; // Array of Card
        this.discardPile = []; // Array of Card
        this.currentTurnPlayerIndex = 0;
        this.gameState = 'LOBBY'; // LOBBY, PLAYING, FINISHED
        this.drawnCard = null; // Card drawn from deck but not yet placed (temp state)
        this.finalTurnInitiatorId = null; // ID of player who first revealed all cards
        this.turnState = 'CHOOSING'; // CHOOSING (Deck/Discard), PLACING (if drew from deck)
    }
}

// --- Game Logic ---

const rooms = {}; // RoomId -> Room

function createDeck() {
    const deck = [];
    for (const [value, count] of Object.entries(CARD_DISTRIBUTION)) {
        for (let i = 0; i < count; i++) {
            deck.push(new Card(value));
        }
    }
    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function initGame(roomId, settings = {}) {
    const room = rooms[roomId];
    if (!room) return;

    room.timeStarted = Date.now();
    room.limit = settings.limit || 100; // Store limit (100, 50, or '1_ROUND')
    room.deck = createDeck();
    room.discardPile = [room.deck.pop()];
    room.discardPile[0].visible = true; // Reveal discard
    room.gameState = 'SETUP'; // Change: SETUP phase for manual reveal
    room.turnState = 'IDLE'; // Waiting for setup
    room.drawnCard = null;
    room.finalTurnInitiatorId = null;

    // Deal cards
    room.players.forEach(player => {
        player.grid = [];
        for (let i = 0; i < 12; i++) {
            const card = room.deck.pop();
            player.grid.push(card);
        }
        player.revealedCount = 0; // Reset
        // No auto-reveal
    });

    // Starter determination moved to after setup
    room.currentTurnPlayerIndex = 0; // Temp

    return room;
}

function startNextRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Reset round-specific state
    room.gameState = 'SETUP';
    room.turnState = 'IDLE';
    room.drawnCard = null;
    room.finalTurnInitiatorId = null;
    room.deck = createDeck();
    room.discardPile = [room.deck.pop()];
    room.discardPile[0].visible = true;

    // Reset players for new round but keep totalScore
    room.players.forEach(player => {
        player.grid = [];
        player.score = 0; // Reset round score
        delete player.scorePrev;

        for (let i = 0; i < 12; i++) {
            player.grid.push(room.deck.pop());
        }
        player.revealedCount = 0;
    });

    return room;
}

function startGameplay(room) {
    room.gameState = 'PLAYING';
    room.turnState = 'CHOOSING';

    // Determine starting player: Highest visible score starts.
    let maxScore = -Infinity;
    let starterIndex = 0;
    room.players.forEach((p, index) => {
        // Calculate score of visible cards (should be 2 per player)
        const visibleScore = p.grid.reduce((acc, c) => c.visible ? acc + c.value : acc, 0);
        if (visibleScore > maxScore) {
            maxScore = visibleScore;
            starterIndex = index;
        }
    });
    room.currentTurnPlayerIndex = starterIndex;
}

function startNextRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Reset round-specific state
    // Reset round-specific state
    room.gameState = 'SETUP'; // Go to SETUP phase for new round
    room.turnState = 'CHOOSING';
    room.drawnCard = null;
    room.finalTurnInitiatorId = null;
    room.deck = createDeck();
    room.discardPile = [room.deck.pop()];
    room.discardPile[0].visible = true;

    // Reset players for new round but keep totalScore
    room.players.forEach(player => {
        player.grid = [];
        player.score = 0; // Reset round score
        // scorePrev is temp, remove if exists
        delete player.scorePrev;
        delete player.penaltyApplied; // Clear penalty flag

        for (let i = 0; i < 12; i++) {
            player.grid.push(room.deck.pop());
        }
        player.revealedCount = 0; // Reset reveal count
        // Do NOT auto-reveal cards
    });

    return room;
}


function checkColumnRule(player, discardPile) {
    // Grid 4 columns x 3 rows. Indices:
    // 0  1  2  3
    // 4  5  6  7
    // 8  9  10 11

    let columnsCleared = false;

    for (let col = 0; col < 4; col++) {
        const c1 = player.grid[col];
        const c2 = player.grid[col + 4];
        const c3 = player.grid[col + 8];

        // Ensure all visible and same value (and not already cleared)
        if (c1.visible && c2.visible && c3.visible && !c1.cleared && !c2.cleared && !c3.cleared) {
            if (c1.value === c2.value && c2.value === c3.value) {
                // Determine discard pile add? Rules say "défaussée".

                // Add copies to discard pile if array provided
                if (discardPile) {
                    // We push them one by one. The last one pushed will be the new top.
                    discardPile.push(new Card(c1.value, true));
                    discardPile.push(new Card(c2.value, true));
                    discardPile.push(new Card(c3.value, true));
                }

                c1.cleared = true;
                c2.cleared = true;
                c3.cleared = true;
                c1.value = 0; // Contributing 0 points
                c2.value = 0;
                c3.value = 0;
                columnsCleared = true;
            }
        }
    }
    return columnsCleared;
}

function calculateScore(player) {
    return player.grid.reduce((acc, card) => {
        if (card.cleared) return acc;
        // If hidden at end, does it count? "On révèle tout et on compte".
        return acc + card.value;
    }, 0);
}

module.exports = {
    rooms,
    Room,
    Player,
    Card,
    createDeck,
    initGame,
    startNextRound,
    startGameplay,
    checkColumnRule,
    calculateScore
};
