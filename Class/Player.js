class Player {
  constructor(username) {
    this.username = username;
    this.deck = null;
    this.hand = [];
    this.exile = [];
    this.graveyard = [];
    this.battlefield = [];
    this.library = [];
    this.life = 40;
    this.isReady = false;
  }

  setDeck(deck) {
    this.deck = deck;
    this.library = [...deck.cards];
    this.shuffleDeck();
  }

  shuffleDeck() {
    this.library = this.library.sort(() => Math.random() - 0.5);
  }

  drawCard() {
    if (this.library.length > 0) {
      const drawnCard = this.library.shift();
      this.hand.push(drawnCard);
      return drawnCard;
    } else {
      console.log(`${this.username} has no cards left in the library.`);
      return null;
    }
  }

  toggleReady() {
    this.isReady = !this.isReady;
  }

  getPublicInfos() {
    return {
      username: this.username,
      hand: this.hand.length,
      life: this.life,
      library: this.library.length,
      battlefield: this.battlefield,
      graveyard: this.graveyard,
      exile: this.exile,
    }
  }

  getPrivateInfos() {
    return {
      username: this.username,
      hand: this.hand,
      exile: this.exile,
      graveyard: this.graveyard,
      battlefield: this.battlefield,
      library: this.library.length,
      life: this.life
    }
  }
}

export default Player;