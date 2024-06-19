import Player from './Player.js';
class Game {
  constructor(gameId, hostUsername, io) {
    this.name = "";
    this.gameId = gameId;
    this.hostUsername = hostUsername;
    this.players = [];
    this.state = {
      status: "waiting",
      turn: null,
    };
    this.io = io;
  }

  addPlayer(username) {
    const newPlayer = new Player(username);
    this.players.push(newPlayer);
    this.updateGame();
  }

  allPlayersReady() {
    return this.players.every((player) => player.isReady && player.deck);
  }

  startGame() {
    if (this.allPlayersReady()) {
      this.state.status = "started";
      this.state.turn = this.players[0].username;
      this.players.forEach((player) => {
        player.shuffleDeck();
        for (let i = 0; i < 7; i++) {
          player.drawCard();
        }
      });
      this.updateGame();
      this.inGameUpdate();
    } else {
      console.log("Not all players are ready or have selected a deck");
    }
  }

  nextTurn() {
    const currentIndex = this.players.findIndex(
      (p) => p.username === this.state.turn
    );
    const nextIndex = (currentIndex + 1) % this.players.length;
    this.state.turn = this.players[nextIndex].username;
    this.updateGame();
  }

  updateGame() {
    const gameInfo = {
      gameId: this.gameId,
      host: this.hostUsername,
      name: this.name,
      status: this.state.status,
      players: this.players.map((player) => ({
        username: player.username,
        isReady: player.isReady,
        deck: player.deck?.name,
      })),
    };
    this.io.to(this.gameId).emit("game details", gameInfo);
  }

  inGameUpdate() {
    const sockets = this.io.sockets.adapter.rooms.get(this.gameId);
    if (sockets) {
      sockets.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        const username = socket.username;
        const player = this.players.find((p) => p.username === username);

        if (player) {
          const playerInfo = player.getPrivateInfos();
          const publicInfo = this.players.map((p) =>
            p.username === player.username ? playerInfo : p.getPublicInfos()
          );

          socket.emit("ingame update", {
            gameId: this.gameId,
            name: this.name,
            status: this.state.status,
            turn: this.state.turn,
            players: publicInfo,
          });
        }
      });
    }
    console.log("j'update les infos ingame");
  }
}

export default Game;
