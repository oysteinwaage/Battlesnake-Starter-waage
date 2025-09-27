import { Coord, GameState, InfoResponse, MoveResponse } from "./types";

export function info(): InfoResponse {
  console.log("INFO");
  return {
    apiversion: "1",
    author: "Gøystein",
    color: "#F63866",
    head: "tiger-king",
    tail: "mouse",
  };
}

export function start(gameState: GameState): void {
  console.log(`${gameState.game.id} START`);
}

export function end(gameState: GameState): void {
  console.log(`${gameState.game.id} END\n`);
}

export function move(gameState: GameState): MoveResponse {
  let isMoveSafe: { [key: string]: boolean } = {
    up: true,
    down: true,
    left: true,
    right: true,
  };

  // Step 0: Don't move backwards
  const myHead = gameState.you.head;
  const myNeck = gameState.you.body[1];

  if (myNeck.x < myHead.x) isMoveSafe.left = false;
  else if (myNeck.x > myHead.x) isMoveSafe.right = false;
  else if (myNeck.y < myHead.y) isMoveSafe.down = false;
  else if (myNeck.y > myHead.y) isMoveSafe.up = false;

  // Step 1: Prevent moving out of bounds
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;
  if (myHead.x === 0) isMoveSafe.left = false;
  if (myHead.x === boardWidth - 1) isMoveSafe.right = false;
  if (myHead.y === 0) isMoveSafe.down = false;
  if (myHead.y === boardHeight - 1) isMoveSafe.up = false;

  // det mangler anit-hale kollisjon -> altså hvis alt annet er utrygt, gå mot en hale

  // Prevent colliding with yourself
  const myBody = gameState.you.body;
  myBody.slice(0, -1).forEach((segment) => {
    if (myHead.x === segment.x - 1 && myHead.y === segment.y) isMoveSafe.right = false;
    if (myHead.x === segment.x + 1 && myHead.y === segment.y) isMoveSafe.left = false;
    if (myHead.y === segment.y - 1 && myHead.x === segment.x) isMoveSafe.up = false;
    if (myHead.y === segment.y + 1 && myHead.x === segment.x) isMoveSafe.down = false;
  });

  // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
  gameState.board.snakes.filter(slange => slange.id !== gameState.you.id).forEach((snake) => {
    // sjekk om potensiell krasj med hodet til andre slanger, kun hvis den andre slangen er like stor eller større enn oss

    if(gameState.you.length <= snake.length) {
      if (myHead.x === snake.head.x - 1 && myHead.y === snake.head.y) isMoveSafe.right = false;
      if (myHead.x === snake.head.x + 1 && myHead.y === snake.head.y) isMoveSafe.left = false;
      if (myHead.y === snake.head.y - 1 && myHead.x === snake.head.x) isMoveSafe.up = false;
      if (myHead.y === snake.head.y + 1 && myHead.x === snake.head.x) isMoveSafe.down = false;
    }
    // hindrer krasj med kroppen til andre slanger
    snake.body.slice(0, -1).forEach((otherSnake) => {
      if (myHead.x === otherSnake.x - 1 && myHead.y === otherSnake.y) isMoveSafe.right = false;
      if (myHead.x === otherSnake.x + 1 && myHead.y === otherSnake.y) isMoveSafe.left = false;
      if (myHead.y === otherSnake.y - 1 && myHead.x === otherSnake.x) isMoveSafe.up = false;
      if (myHead.y === otherSnake.y + 1 && myHead.x === otherSnake.x) isMoveSafe.down = false;
    });
  });

  // Get all safe moves
  const safeMoves = Object.keys(isMoveSafe).filter((key) => isMoveSafe[key]);
  if (safeMoves.length == 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
  }

  // Step 4: Move towards the closest food
  const food = gameState.board.food;
  let closestFood: Coord | undefined;
  let minDistance = Infinity;

  food.forEach((f) => {
    const distance = Math.abs(myHead.x - f.x) + Math.abs(myHead.y - f.y);
    if (distance < minDistance) {
      minDistance = distance;
      closestFood = f;
    }
  });
// TODO start på test
  function hasSafeNextMove(newHead: Coord, gameState: GameState): boolean {
    const directions = {
      up: { x: newHead.x, y: newHead.y + 1 },
      down: { x: newHead.x, y: newHead.y - 1 },
      left: { x: newHead.x - 1, y: newHead.y },
      right: { x: newHead.x + 1, y: newHead.y },
    };
    for (const dir in directions) {
      const pos = directions[dir];
      // Check out of bounds
      if (pos.x < 0 || pos.x >= gameState.board.width || pos.y < 0 || pos.y >= gameState.board.height) continue;
      // Check collision with any snake
      const collision = gameState.board.snakes.some(snake =>
          snake.body.some(segment => segment.x === pos.x && segment.y === pos.y)
      );
      if (!collision) return true;
    }
    return false;
  }

// In your move function, after calculating safeMoves:
  const lookaheadMoves = safeMoves.filter(move => {
    let newHead = { ...myHead };
    if (move === "up") newHead.y += 1;
    if (move === "down") newHead.y -= 1;
    if (move === "left") newHead.x -= 1;
    if (move === "right") newHead.x += 1;
    return hasSafeNextMove(newHead, gameState);
  });

  const finalMoves = lookaheadMoves.length > 0 ? lookaheadMoves : safeMoves;
  let nextMove = finalMoves[Math.floor(Math.random() * finalMoves.length)];
  // let nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
// TODO slutt på test
// marker mat som er farlig fordi en annen slange kan spise den samtidig
  const dangerousFood: Set<string> = new Set();
  food.forEach((f) => {
    gameState.board.snakes.forEach((snake) => {
      if (snake.id !== gameState.you.id && snake.length >= gameState.you.length) {
        const dist = Math.abs(snake.head.x - f.x) + Math.abs(snake.head.y - f.y);
        if (dist === 1) {
          dangerousFood.add(`${f.x},${f.y}`);
        }
      }
    });
  });

// When choosing preferredMoves, skip dangerous food
  if (closestFood !== undefined && !dangerousFood.has(`${closestFood.x},${closestFood.y}`)) {
    const preferredMoves: string[] = [];
    if (myHead.x < closestFood.x) preferredMoves.push("right");
    else if (myHead.x > closestFood.x) preferredMoves.push("left");
    if (myHead.y < closestFood.y) preferredMoves.push("up");
    else if (myHead.y > closestFood.y) preferredMoves.push("down");

    const safePreferredMoves = preferredMoves.filter((move) => safeMoves.includes(move));
    if (safePreferredMoves.length > 0) {
      nextMove = safePreferredMoves[Math.floor(Math.random() * safePreferredMoves.length)];
    }
  }

  console.log(`MOVE ${gameState.turn}: ${nextMove}`);
  return { move: nextMove };
}
