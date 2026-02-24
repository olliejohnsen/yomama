const { Server } = require('socket.io');
const http = require('http');
const { createBattle, applyJoke } = require('./battleService');

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

let waitingPlayer = null;
const activeBattles = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('find_match', (region) => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const opponent = waitingPlayer;
      waitingPlayer = null;

      const battle = createBattle(
        { id: opponent.id, region: opponent.region },
        { id: socket.id, region },
      );

      activeBattles.set(battle.id, battle);
      opponent.socket.join(battle.id);
      socket.join(battle.id);

      io.to(battle.id).emit('match_found', battle);
    } else {
      waitingPlayer = { id: socket.id, region, socket };
      socket.emit('waiting_for_match');
    }
  });

  socket.on('joke_generated', ({ battleId, joke }) => {
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    const { damage, isCrit, isFinished, winnerId } = applyJoke(battle, socket.id, joke);

    io.to(battleId).emit('battle_update', {
      battle,
      lastJoke: joke,
      attackerId: socket.id,
      damage,
      isCrit,
    });

    if (isFinished) {
      io.to(battleId).emit('battle_finished', { winnerId });
      activeBattles.delete(battleId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    if (waitingPlayer?.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
