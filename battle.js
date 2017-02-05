let player1 = 10
let player2 = 9

while (player1 > 0 && player2 > 0) {
  const player1Dice = Math.floor(Math.random() * (player1 > 20 ? 20 : player1)) + 1
  const player2Dice = Math.floor(Math.random() * (player2 > 20 ? 20 : player2)) + 1
  console.log('--', player1Dice, player2Dice)
  
  player1 -= player2Dice
  player2 -= player1Dice
}

console.log(player1, player2)
