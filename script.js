const boardEl = document.getElementById('board');

// Board representation: row 0 = rank 8, row 7 = rank 1
let board = [];
let selectedSquare = null; // { r, c } or null
let currentTurn = 'white'; // 'white' or 'black'
let gameOver = false;
let gameOverReason = '';
let gameMode = 'local'; // 'local', 'vs-ai', or 'lichess'
let lichessGameId = null;
let lichessUsername = null;
let lichessStream = null;

const PIECE_SYMBOLS = {
  'P': '♙','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔',
  'p': '♟','r':'♜','n':'♞','b':'♝','q':'♛','k':'♚'
};

// Helper: check if piece is white (uppercase) or black (lowercase)
function isWhitePiece(piece) {
  return piece === piece.toUpperCase() && piece !== '';
}

function isBlackPiece(piece) {
  return piece === piece.toLowerCase() && piece !== '';
}

// Check if a move is legal for the piece type
function isLegalMove(fromR, fromC, toR, toC, piece) {
  const targetPiece = board[toR][toC];
  const isCapture = targetPiece !== '';
  const dr = toR - fromR;
  const dc = toC - fromC;

  // Cannot move to same square
  if (dr === 0 && dc === 0) return false;

  // Cannot capture own piece
  if (isCapture) {
    if ((isWhitePiece(piece) && isWhitePiece(targetPiece)) ||
        (isBlackPiece(piece) && isBlackPiece(targetPiece))) {
      return false;
    }
  }

  const pieceLower = piece.toLowerCase();

  // Pawn moves
  if (pieceLower === 'p') {
    const isWhite = isWhitePiece(piece);
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    if (dc !== 0 && Math.abs(dc) === 1 && dr === direction && isCapture) {
      return true; // diagonal capture
    }
    if (dc === 0 && dr === direction && !isCapture) {
      return true; // one square forward
    }
    if (dc === 0 && dr === 2 * direction && fromR === startRow && !isCapture) {
      return board[fromR + direction][fromC] === ''; // two squares, intermediate empty
    }
    return false;
  }

  // Rook moves (horizontal or vertical, no blocking)
  if (pieceLower === 'r') {
    if (dr === 0 && dc !== 0) return isPathClear(fromR, fromC, toR, toC);
    if (dc === 0 && dr !== 0) return isPathClear(fromR, fromC, toR, toC);
    return false;
  }

  // Bishop moves (diagonal, no blocking)
  if (pieceLower === 'b') {
    if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
      return isPathClear(fromR, fromC, toR, toC);
    }
    return false;
  }

  // Knight moves (L-shape, jumps over pieces)
  if (pieceLower === 'n') {
    if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
        (Math.abs(dr) === 1 && Math.abs(dc) === 2)) {
      return true;
    }
    return false;
  }

  // Queen moves (rook + bishop)
  if (pieceLower === 'q') {
    if (dr === 0 && dc !== 0) return isPathClear(fromR, fromC, toR, toC); // horizontal
    if (dc === 0 && dr !== 0) return isPathClear(fromR, fromC, toR, toC); // vertical
    if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
      return isPathClear(fromR, fromC, toR, toC); // diagonal
    }
    return false;
  }

  // King moves (one square in any direction)
  if (pieceLower === 'k') {
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0)) {
      return true;
    }
    return false;
  }

  return false;
}

// Check if path is clear between two squares (for sliding pieces)
function isPathClear(fromR, fromC, toR, toC) {
  const dr = toR > fromR ? 1 : toR < fromR ? -1 : 0;
  const dc = toC > fromC ? 1 : toC < fromC ? -1 : 0;

  let r = fromR + dr;
  let c = fromC + dc;

  while (r !== toR || c !== toC) {
    if (board[r][c] !== '') return false; // path blocked
    r += dr;
    c += dc;
  }

  return true; // path clear
}

// Find king position for a given color
function findKing(color) {
  const isWhite = color === 'white';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if ((isWhite && piece === 'K') || (!isWhite && piece === 'k')) {
        return { r, c };
      }
    }
  }
  return null;
}

// Check if a square is attacked by the opponent
function isSquareAttackedBy(r, c, byColor) {
  for (let ar = 0; ar < 8; ar++) {
    for (let ac = 0; ac < 8; ac++) {
      const piece = board[ar][ac];
      if (!piece) continue;

      const isWhite = isWhitePiece(piece);
      if ((byColor === 'white' && !isWhite) || (byColor === 'black' && isWhite)) continue;

      // Check if this piece can attack the square
      if (isLegalMove(ar, ac, r, c, piece)) {
        return true;
      }
    }
  }
  return false;
}

// Check if a color is in check
function isInCheck(color) {
  const king = findKing(color);
  if (!king) return false;
  const opponent = color === 'white' ? 'black' : 'white';
  return isSquareAttackedBy(king.r, king.c, opponent);
}

// Check if a color has any legal moves
function hasLegalMoves(color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isWhite = isWhitePiece(piece);
      if ((color === 'white' && !isWhite) || (color === 'black' && isWhite)) continue;

      // Try all possible moves
      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
          if (isLegalMove(r, c, tr, tc, piece)) {
            // Simulate move
            const temp = board[tr][tc];
            board[tr][tc] = piece;
            board[r][c] = '';

            const inCheck = isInCheck(color);

            // Undo move
            board[r][c] = piece;
            board[tr][tc] = temp;

            if (!inCheck) return true; // found a legal move
          }
        }
      }
    }
  }
  return false;
}

// Get all legal moves for a piece
function getLegalMoves(r, c) {
  const piece = board[r][c];
  if (!piece) return [];

  const moves = [];
  for (let tr = 0; tr < 8; tr++) {
    for (let tc = 0; tc < 8; tc++) {
      if (isLegalMove(r, c, tr, tc, piece)) {
        // Simulate move and check if king is left in check
        const temp = board[tr][tc];
        board[tr][tc] = piece;
        board[r][c] = '';

        const color = isWhitePiece(piece) ? 'white' : 'black';
        const inCheck = isInCheck(color);

        // Undo move
        board[r][c] = piece;
        board[tr][tc] = temp;

        if (!inCheck) {
          moves.push({ r: tr, c: tc });
        }
      }
    }
  }
  return moves;
}

// Get all legal moves for a color
function getAllLegalMoves(color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isWhite = isWhitePiece(piece);
      if ((color === 'white' && !isWhite) || (color === 'black' && isWhite)) continue;

      const pieceMoves = getLegalMoves(r, c);
      for (const move of pieceMoves) {
        moves.push({ fromR: r, fromC: c, toR: move.r, toC: move.c, piece });
      }
    }
  }
  return moves;
}

// Simple AI: pick a random legal move (can improve with heuristics)
function getAIMove(color) {
  const moves = getAllLegalMoves(color);
  if (moves.length === 0) return null;

  // Simple heuristic: prefer captures and checks
  const captureAndCheckMoves = moves.filter(move => {
    return board[move.toR][move.toC] !== '' || (() => {
      board[move.toR][move.toC] = board[move.fromR][move.fromC];
      board[move.fromR][move.fromC] = '';
      const opponent = color === 'white' ? 'black' : 'white';
      const givesCheck = isInCheck(opponent);
      board[move.fromR][move.fromC] = board[move.toR][move.toC];
      board[move.toR][move.toC] = '';
      return givesCheck;
    })();
  });

  if (captureAndCheckMoves.length > 0) {
    return captureAndCheckMoves[Math.floor(Math.random() * captureAndCheckMoves.length)];
  }

  return moves[Math.floor(Math.random() * moves.length)];
}

function initStartingBoard() {
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let r = 0; r < 8; r++) {
    const rank = 8 - r; // convert row index to rank number for coords
    for (let c = 0; c < 8; c++) {
      const file = 'abcdefgh'[c];
      const square = document.createElement('div');
      square.className = 'square';
      square.dataset.r = r;
      square.dataset.c = c;

      const isLight = (rank + (c+1)) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');

      // Highlight selected square
      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        square.classList.add('selected');
      }

      // Show rank numbers only on the left file ('a') to avoid clutter
      if (file === 'a') {
        const coordRank = document.createElement('div');
        coordRank.className = 'coord-rank';
        coordRank.textContent = rank;
        square.appendChild(coordRank);
      }

      // Show file letters only on rank 1 (bottom row) to avoid clutter
      if (rank === 1) {
        const coordFile = document.createElement('div');
        coordFile.className = 'coord-file';
        coordFile.textContent = file;
        square.appendChild(coordFile);
      }

      const pieceCode = board[r][c];
      if (pieceCode) {
        const p = document.createElement('div');
        p.className = 'piece';
        p.textContent = PIECE_SYMBOLS[pieceCode] || pieceCode;
        square.appendChild(p);
      }

      // Add click handler for selecting/moving
      square.addEventListener('click', () => handleSquareClick(r, c));

      boardEl.appendChild(square);
    }
  }
}

function handleSquareClick(r, c) {
  if (!selectedSquare) {
    // First click: select a square if it has a piece belonging to the current player
    const piece = board[r][c];
    
    if (!piece) {
      return; // empty square
    }

    // Check if piece belongs to current player
    if (currentTurn === 'white' && !isWhitePiece(piece)) {
      return; // black piece on white's turn
    }
    if (currentTurn === 'black' && !isBlackPiece(piece)) {
      return; // white piece on black's turn
    }

    selectedSquare = { r, c };
    renderBoard();
  } else {
    // Second click: move the piece
    const fromR = selectedSquare.r;
    const fromC = selectedSquare.c;
    const piece = board[fromR][fromC];

    // Validate move
    if (!isLegalMove(fromR, fromC, r, c, piece)) {
      // Illegal move; deselect and return
      selectedSquare = null;
      renderBoard();
      return;
    }

    // Allow move to any square (including captures)
    board[r][c] = board[fromR][fromC];
    board[fromR][fromC] = '';

    // Handle pawn promotion
    if (piece.toLowerCase() === 'p') {
      if ((isWhitePiece(piece) && r === 0) || (isBlackPiece(piece) && r === 7)) {
        // Pawn reached the end; promote to queen (simple default)
        board[r][c] = isWhitePiece(piece) ? 'Q' : 'q';
      }
    }

    // Switch turn
    currentTurn = currentTurn === 'white' ? 'black' : 'white';

    selectedSquare = null;
    renderBoard();
    updateTurnIndicator();

    // Check for check/checkmate
    checkGameStatus();

    // If playing vs AI and it's black's turn, make AI move
    if (gameMode === 'vs-ai' && currentTurn === 'black' && !gameOver) {
      setTimeout(() => makeAIMove(), 500);
    }
  }
}

function checkGameStatus() {
  const inCheck = isInCheck(currentTurn);
  const hasLegal = hasLegalMoves(currentTurn);

  if (inCheck && !hasLegal) {
    gameOver = true;
    const opponent = currentTurn === 'white' ? 'Black' : 'White';
    gameOverReason = `Checkmate! ${opponent} wins.`;
  } else if (!inCheck && !hasLegal) {
    gameOver = true;
    gameOverReason = 'Stalemate! Draw.';
  }
}

function makeAIMove() {
  const move = getAIMove(currentTurn);
  if (move) {
    board[move.toR][move.toC] = board[move.fromR][move.fromC];
    board[move.fromR][move.fromC] = '';

    // Handle pawn promotion
    if (move.piece.toLowerCase() === 'p') {
      if ((isWhitePiece(move.piece) && move.toR === 0) || 
          (isBlackPiece(move.piece) && move.toR === 7)) {
        board[move.toR][move.toC] = isWhitePiece(move.piece) ? 'Q' : 'q';
      }
    }

    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    selectedSquare = null;
    renderBoard();
    updateTurnIndicator();
    checkGameStatus();
  }
}

function updateTurnIndicator() {
  const appEl = document.getElementById('app');
  let turnEl = document.getElementById('turn-indicator');
  if (!turnEl) {
    turnEl = document.createElement('div');
    turnEl.id = 'turn-indicator';
    appEl.insertBefore(turnEl, appEl.firstChild);
  }
  
  if (gameOver) {
    turnEl.textContent = gameOverReason;
    turnEl.style.color = '#e74c3c';
  } else {
    turnEl.textContent = `Turn: ${currentTurn === 'white' ? '⚪ White' : '⚫ Black'}`;
    turnEl.style.color = '#333';
  }
}

function initBoard() {
  initStartingBoard();
  currentTurn = 'white';
  selectedSquare = null;
  gameOver = false;
  gameOverReason = '';
  renderBoard();
  updateTurnIndicator();
}

function setGameMode(mode) {
  gameMode = mode;
  initBoard();
}

function selectMode(mode) {
  if (mode === 'lichess') {
    document.getElementById('lichess-panel').style.display = 'block';
  } else {
    document.getElementById('lichess-panel').style.display = 'none';
    setGameMode(mode === 'local' ? 'two-player' : 'vs-ai');
  }
}

// Lichess API functions
async function lichessLogin() {
  lichessUsername = document.getElementById('lichess-username').value.trim();
  if (!lichessUsername) {
    alert('Please enter your Lichess username');
    return;
  }

  const status = document.getElementById('lichess-status');
  status.textContent = 'Logging in...';

  try {
    // Check if user exists on Lichess
    const res = await fetch(`https://lichess.org/api/user/${lichessUsername}`);
    if (!res.ok) {
      status.textContent = 'User not found on Lichess';
      return;
    }

    status.textContent = `✓ Logged in as ${lichessUsername}. Waiting for opponent...`;
    generateLichessChallenge();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

function generateLichessChallenge() {
  if (!lichessUsername) {
    alert('Please enter your username first');
    return;
  }

  // Create a direct link to challenge on Lichess
  const challengeUrl = `https://lichess.org/?user=${lichessUsername}#friend`;
  const status = document.getElementById('lichess-status');
  status.innerHTML = `<a href="${challengeUrl}" target="_blank">Challenge a friend on Lichess →</a>`;
}

async function watchLichessGame(gameId) {
  lichessGameId = gameId;
  const status = document.getElementById('lichess-status');
  status.textContent = `Watching game: ${gameId}...`;

  try {
    const response = await fetch(`https://lichess.org/api/stream/game/${gameId}`, {
      headers: { Accept: 'application/x-ndjson' }
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.trim().split('\n');

      for (const line of lines) {
        if (!line) continue;
        const data = JSON.parse(line);

        if (data.type === 'gameState') {
          syncLichessGameState(data);
        } else if (data.type === 'gameFinish') {
          status.textContent = `Game finished. Winner: ${data.winner || 'Draw'}`;
          gameOver = true;
        }
      }
    }
  } catch (err) {
    status.textContent = `Error streaming game: ${err.message}`;
  }
}

function syncLichessGameState(gameState) {
  // gameState.moves contains the move list in UCI format
  // Reconstruct board from moves and sync
  const status = document.getElementById('lichess-status');
  status.textContent = `Game: ${lichessGameId} (${gameState.moves ? gameState.moves.split(' ').length : 0} moves)`;
}

// Expose board and functions for manual debugging
window.board = board;
window.initBoard = initBoard;
window.currentTurn = () => currentTurn;
window.setGameMode = setGameMode;
window.selectMode = selectMode;
window.lichessLogin = lichessLogin;
window.generateLichessChallenge = generateLichessChallenge;
