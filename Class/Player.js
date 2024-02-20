class Player {
  constructor(name, userId) {
    this.name = name;
    this.userId = userId;
    this.hand = [];
    this.library = [];
    this.lifePoints = 20;
    this.board = [];
  }

  drawCard() {
    if (this.library.length > 0) {
      const card = this.library.shift();
      this.hand.push(card);
      return card;
    }
    return null;
  }

  playCard(cardIndex) {
    if (cardIndex < this.hand.length) {
      const card = this.hand.splice(cardIndex, 1)[0];
      this.board.push(card);
      return card;
    }
    return null;
  }
}