class Game {
  constructor(userSockets) {
    this.players = [];
    this.userSockets = userSockets;
    this.status = 'waiting';
    this.io = null;
  }

  addPlayer(player) {
    if (this.players.length < 2) {
      this.players.push(player);
      return true;
    }
    return false;
  }
  
  initializeGame(io) {
    this.io = io;
    this.status = 'in progress';
    this.players.forEach(player => {
      this.shuffleLibrary(player);
      for (let i = 0; i < 7; i++) {
        player.drawCard();
      }
    });
    this.notifyPlayers('La partie commence !');
  }

  shuffleLibrary(player) {
    let library = player.library;
    for (let i = library.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [library[i], library[j]] = [library[j], library[i]];
    }
    player.library = library;
  }

  notifyPlayer(userId, message) {
    const socketId = this.userSockets[userId];
    if (this.io && socketId) {
      this.io.to(socketId).emit('notification', message);
    }
  }

  notifyPlayers(message) {
    this.players.forEach(player => {
      this.notifyPlayer(player.userId, message);
    });
  }
}