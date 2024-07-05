import Player from "./Player.js";
import { activeGames } from "../globalState.js";
import User from "../models/User.js";
import { capitalizeFirstLetter } from "../utils/userUtils.js";

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

  static getActiveGamesList() {
    return Object.keys(activeGames).map((gameId) => ({
      gameId,
      name: activeGames[gameId].name,
      host: activeGames[gameId].hostUsername,
      status: activeGames[gameId].state.status,
      players: activeGames[gameId].players.map((player) => player.username),
    }));
  }

  static getGameById(gameId) {
    return activeGames[gameId];
  }

  async addPlayerAndGetDetails(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { error: "Utilisateur non trouvé" };
      }

      if (this.state.status !== "waiting") {
        return { error: "Cannot join, game already started" };
      }

      const newPlayer = new Player(user.username);
      this.players.push(newPlayer);
      return this.getDetails();
    } catch (error) {
      console.error("Erreur lors de l'ajout du joueur: ", error);
      return { error: "Erreur lors de l'ajout du joueur" };
    }
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
      this.inGameUpdate();
      return { gameId: this.gameId, status: this.state.status };
    } else {
      return { error: "Not all players are ready or have selected a deck" };
    }
  }

  sendLogMessage(message) {
    this.io.to(this.gameId).emit("chat message", message);
  }

  playCard(username, card) {
    const player = this.players.find((p) => p.username === username);
    if (player) {
      const cardIndex = player.hand.findIndex((c) => c.uuid === card.uuid);
      if (cardIndex !== -1) {
        const [playedCard] = player.hand.splice(cardIndex, 1);
        player.battlefield.push(playedCard);
        this.sendLogMessage({
          username: capitalizeFirstLetter(username),
          text: `joue la carte ${playedCard.name}`,
        });
        this.inGameUpdate();
      } else {
        console.error("Card not found in hand");
      }
    } else {
      console.error("Player not found");
    }
  }

  moveCard(username, cardUuid, position) {
    const player = this.players.find((p) => p.username === username);
    if (player) {
      player.moveCard(cardUuid, position);

      const opponent = this.players.find((p) => p.username !== username);
      if (opponent) {
        const card = opponent.battlefield.find((c) => c.uuid === cardUuid);
        if (card) {
          card.position = position;
        }
      }

      this.inGameUpdate();
    } else {
      return { error: "Player not found" };
    }
  }

  async toggleReady(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { error: "User not found" };
      }

      const player = this.players.find((p) => p.username === user.username);
      if (player) {
        player.toggleReady();
        this.inGameUpdate();
        return this.getDetails();
      } else {
        return { error: "Player not found" };
      }
    } catch (error) {
      console.error("Erreur lors du changement d'état de préparation: ", error);
      return { error: "Erreur lors du changement d'état de préparation" };
    }
  }

  lookAtLibrary(player, number) {
    const cards =
      number === null ? player.library : player.library.slice(0, number);
    this.sendLogMessage({
      username: capitalizeFirstLetter(player.username),
      text: `regarde ${
        number
          ? `les ${number} premières cartes de sa bibliothèque`
          : "sa bibliothèque"
      }`,
    });
    return cards;
  }

  moveToGraveyard(player, cardId) {
    let card = null;
    const zones = ["hand", "battlefield", "exile", "library"];

    for (const zone of zones) {
      const index = player[zone].findIndex((c) => c.uuid === cardId);
      if (index !== -1) {
        card = player[zone].splice(index, 1)[0];
        break;
      }
    }

    if (card) {
      player.graveyard.push(card);
      this.sendLogMessage({
        username: capitalizeFirstLetter(player.username),
        text: `met ${card.name} au cimetière`,
      });
      this.inGameUpdate();
    } else {
      console.error(`La carte avec l'ID ${cardId} n'a pas été trouvée.`);
    }
    this.inGameUpdate();
  }

  moveToExile(player, cardId) {
    let card = null;
    const zones = ["hand", "battlefield", "graveyard", "library"];

    for (const zone of zones) {
      const index = player[zone].findIndex((c) => c.uuid === cardId);
      if (index !== -1) {
        card = player[zone].splice(index, 1)[0];
        break;
      }
    }

    if (card) {
      player.exile.push(card);
      this.sendLogMessage({
        username: capitalizeFirstLetter(player.username),
        text: `exile ${card.name}`,
      });
      this.inGameUpdate();
    } else {
      console.error(`La carte avec l'ID ${cardId} n'a pas été trouvée.`);
    }
    this.inGameUpdate();
  }

  moveToHand(player, cardId) {
    let card = null;
    const zones = ["battlefield", "graveyard", "exile", "library"];

    for (const zone of zones) {
      const index = player[zone].findIndex((c) => c.uuid === cardId);
      if (index !== -1) {
        card = player[zone].splice(index, 1)[0];
        break;
      }
    }

    if (card) {
      player.hand.push(card);
      this.sendLogMessage({
        username: capitalizeFirstLetter(player.username),
        text: `renvoie ${card.name} à la main`,
      });
      this.inGameUpdate();
    } else {
      console.error(`La carte avec l'ID ${cardId} n'a pas été trouvée.`);
    }
  }

  tapCard(player, cardId, tap) {
    const card = player.battlefield.find((card) => card.uuid === cardId);
    if (card) {
      card.tap = tap;
      this.sendLogMessage({
        username: capitalizeFirstLetter(player.username),
        text: `${tap ? "engage" : "désengage"} ${card.name}`,
      });
      this.inGameUpdate();
    }
  }

  drawCards(username, number) {
    const player = this.players.find((p) => p.username === username);
    if (player) {
      for (let i = 0; i < number; i++) {
        player.drawCard();
      }
      this.sendLogMessage({
        username: capitalizeFirstLetter(username),
        text: `pioche ${number} carte${number > 1 ? "s" : ""}`,
      });
      this.inGameUpdate();
    }
  }

  getDetails() {
    return {
      gameId: this.gameId,
      name: this.name,
      host: this.hostUsername,
      status: this.state.status,
      players: this.players.map((player) => ({
        username: player.username,
        isReady: player.isReady,
        deck: player.deck?.name,
      })),
    };
  }

  changePlayerLife(targetUsername, changedBy, amount) {
    const player = this.players.find((p) => p.username === targetUsername);
    if (player) {
      player.changeLife(amount);
      const action = amount > 0 ? "augmente" : "diminue";
      const logMessage =
        changedBy === targetUsername
          ? {
              username: capitalizeFirstLetter(changedBy),
              text: `${action} sa vie de ${Math.abs(amount)}`,
            }
          : {
              username: capitalizeFirstLetter(changedBy),
              text: `${action} la vie de ${capitalizeFirstLetter(
                player.username
              )} de ${Math.abs(amount)}`,
            };
      this.sendLogMessage(logMessage);
      this.inGameUpdate();
    } else {
      console.error(`Player ${targetUsername} not found`);
    }
  }

  getInGameInfoForPlayer(username) {
    const player = this.players.find((player) => player.username === username);
    if (!player) {
      console.error(`Player not found for username: ${username}`);
      return { error: "Player not found" };
    }

    const playerInfo = player.getPrivateInfos();
    const publicInfos = this.players.map((p) =>
      p.username === username ? playerInfo : p.getPublicInfos()
    );

    return {
      gameId: this.gameId,
      name: this.name,
      status: this.state.status,
      turn: this.state.turn,
      players: publicInfos,
    };
  }

  inGameUpdate() {
    try {
      const playerSockets = this.io.sockets.adapter.rooms.get(this.gameId);

      if (playerSockets) {
        playerSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            const gameInfo = this.getInGameInfoForPlayer(socket.username);
            if (gameInfo.error) {
              console.error(
                `Error getting gameInfo for player: ${socket.username}`
              );
              return;
            }

            socket.emit("ingame update", gameInfo);
          } else {
            console.log(`No socket found for socketId: ${socketId}`);
          }
        });
      } else {
        console.log("No player sockets found for gameId:", this.gameId);
      }
    } catch (error) {
      console.error("Error in inGameUpdate:", error);
    }
  }
}

export default Game;
