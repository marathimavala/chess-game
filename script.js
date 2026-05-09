const boardEl = document.getElementById('board');

// Board representation: row 0 = rank 8, row 7 = rank 1
let board = [];
let selectedSquare = null; // { r, c } or null
let currentTurn = 'white'; // 'white' or 'black'
let gameOver = false;
let gameOverReason = '';
let gameMode = 'two-player'; // 'two-player', 'vs-ai', or 'lichess'
let lichessGameId = null;
let lichessUsername = null;
let lichessStream = null;
let moveHistory = []; // Track all moves in algebraic notation
let pieceMoveHistory = {}; // Track which pieces have moved (for castling)
let capturedPieces = { white: [], black: [] }; // white/black = player who captured
let aiLevel = 3;
let timeControlMinutes = 10;
let clocks = { white: 600, black: 600 };
let timerInterval = null;
let clockStarted = false;

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

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
    if (dr === 0 && dc !== 0) return isPathClearDiagonal(fromR, fromC, toR, toC);
    if (dc === 0 && dr !== 0) return isPathClearDiagonal(fromR, fromC, toR, toC);
    return false;
  }

  // Bishop moves (diagonal, no blocking)
  if (pieceLower === 'b') {
    if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
      return isPathClearDiagonal(fromR, fromC, toR, toC);
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
    if (dr === 0 && dc !== 0) return isPathClearDiagonal(fromR, fromC, toR, toC); // horizontal
    if (dc === 0 && dr !== 0) return isPathClearDiagonal(fromR, fromC, toR, toC); // vertical
    if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
      return isPathClearDiagonal(fromR, fromC, toR, toC); // diagonal
    }
    return false;
  }

  // King moves (one square in any direction, or castling)
  if (pieceLower === 'k') {
    // Normal king move
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0)) {
      return true;
    }
    // Castling: 2 squares horizontally
    if (dr === 0 && Math.abs(dc) === 2) {
      return canCastle(fromR, fromC, toR, toC, piece);
    }
    return false;
  }

  return false;
}

// Check if castling is legal
function canCastle(kingFromR, kingFromC, kingToR, kingToC, king) {
  const isWhite = isWhitePiece(king);
  const color = isWhite ? 'white' : 'black';
  const opponent = isWhite ? 'black' : 'white';
  const homeRow = isWhite ? 7 : 0;
  const kingKey = isWhite ? 'wk' : 'bk';
  const isKingSide = kingToC > kingFromC;
  const rookFromC = isKingSide ? 7 : 0;
  const rookKey = isKingSide ? (isWhite ? 'wr-ks' : 'br-ks') : (isWhite ? 'wr-qs' : 'br-qs');
  const kingPath = isKingSide ? [5, 6] : [3, 2];

  if (kingFromR !== homeRow || kingToR !== homeRow || kingFromC !== 4) return false;
  if (pieceMoveHistory[kingKey]) return false;
  if (pieceMoveHistory[rookKey]) return false;
  if (board[kingToR][kingToC] !== '') return false;
  if (isInCheck(color)) return false;

  const rook = board[kingFromR][rookFromC];
  if (!rook || rook.toLowerCase() !== 'r') return false;
  if ((isWhite && !isWhitePiece(rook)) || (!isWhite && !isBlackPiece(rook))) return false;

  if (!isCastlingPathClear(kingFromR, kingFromC, rookFromC)) return false;

  for (const c of kingPath) {
    const originalTarget = board[kingFromR][c];
    board[kingFromR][kingFromC] = '';
    board[kingFromR][c] = king;
    const attacked = isSquareAttackedBy(kingFromR, c, opponent);
    board[kingFromR][c] = originalTarget;
    board[kingFromR][kingFromC] = king;

    if (attacked) return false;
  }

  return true;
}

function isCastlingPathClear(row, fromC, rookC) {
  const minC = Math.min(fromC, rookC);
  const maxC = Math.max(fromC, rookC);
  for (let c = minC + 1; c < maxC; c++) {
    if (board[row][c] !== '') return false;
  }
  return true;
}

// Original isPathClear for sliding pieces
function isPathClearDiagonal(fromR, fromC, toR, toC) {
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
// Handle castling by moving the rook
function handleCastling(kingFromR, kingFromC, kingToC) {
  // Determine rook movement
  const rookFromC = kingToC > kingFromC ? 7 : 0; // kingside or queenside
  const rookToC = kingToC > kingFromC ? 5 : 3;
  
  // Move rook
  board[kingFromR][rookToC] = board[kingFromR][rookFromC];
  board[kingFromR][rookFromC] = '';
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

function scoreAIMove(move, color) {
  const targetPiece = board[move.toR][move.toC];
  let score = 0;

  if (targetPiece) {
    score += (PIECE_VALUES[targetPiece.toLowerCase()] || 0) * 10;
    score -= PIECE_VALUES[move.piece.toLowerCase()] || 0;
  }

  const centerDistance = Math.abs(3.5 - move.toR) + Math.abs(3.5 - move.toC);
  score += (7 - centerDistance) * 8;

  const originalFrom = board[move.fromR][move.fromC];
  const originalTo = board[move.toR][move.toC];
  board[move.toR][move.toC] = originalFrom;
  board[move.fromR][move.fromC] = '';

  const opponent = color === 'white' ? 'black' : 'white';
  if (isInCheck(opponent)) score += 140;
  if (isSquareAttackedBy(move.toR, move.toC, opponent)) {
    score -= (PIECE_VALUES[move.piece.toLowerCase()] || 0) * 0.8;
  }

  board[move.fromR][move.fromC] = originalFrom;
  board[move.toR][move.toC] = originalTo;

  if (move.piece.toLowerCase() === 'p' && (move.toR === 0 || move.toR === 7)) {
    score += 760;
  }

  return score + Math.random() * 20;
}

function pickRandomMove(moves) {
  return moves[Math.floor(Math.random() * moves.length)];
}

function getAIMove(color) {
  const moves = getAllLegalMoves(color);
  if (moves.length === 0) return null;

  if (aiLevel === 1) {
    return pickRandomMove(moves);
  }

  const scoredMoves = moves
    .map((move) => ({ move, score: scoreAIMove(move, color) }))
    .sort((a, b) => b.score - a.score);

  if (aiLevel === 2) {
    return pickRandomMove(scoredMoves.slice(0, Math.min(8, scoredMoves.length))).move;
  }

  if (aiLevel === 3) {
    return pickRandomMove(scoredMoves.slice(0, Math.min(4, scoredMoves.length))).move;
  }

  if (aiLevel === 4) {
    return pickRandomMove(scoredMoves.slice(0, Math.min(2, scoredMoves.length))).move;
  }

  return scoredMoves[0].move;
}

// Convert coordinates to algebraic notation
function coordsToAlgebraic(r, c) {
  const file = 'abcdefgh'[c];
  const rank = 8 - r;
  return file + rank;
}

// Record a move in algebraic notation
function recordMove(fromR, fromC, toR, toC, piece, isCapture, isCastle = false) {
  let moveNotation;
  
  if (isCastle) {
    // Castling notation
    moveNotation = toC > fromC ? 'O-O' : 'O-O-O';
  } else {
    const from = coordsToAlgebraic(fromR, fromC);
    const to = coordsToAlgebraic(toR, toC);
    const pieceSymbol = piece.toLowerCase() === 'p' ? '' : PIECE_SYMBOLS[piece].toUpperCase();
    const captureSymbol = isCapture ? 'x' : '-';
    moveNotation = `${pieceSymbol}${from}${captureSymbol}${to}`;
  }
  moveHistory.push(moveNotation);
}

function recordCapture(capturingPiece, capturedPiece) {
  if (!capturedPiece) return;

  const capturer = isWhitePiece(capturingPiece) ? 'white' : 'black';
  capturedPieces[capturer].push(capturedPiece);
}

function renderCapturedPieces() {
  const whiteEl = document.getElementById('captured-by-white');
  const blackEl = document.getElementById('captured-by-black');
  const totalEl = document.getElementById('captured-total');
  const balanceEl = document.getElementById('material-balance');
  if (!whiteEl || !blackEl) return;

  const renderPieces = (pieces) => pieces.map((piece) => {
    const colorClass = isBlackPiece(piece) ? 'black-piece' : 'white-piece';
    return `<span class="captured-piece ${colorClass}">${PIECE_SYMBOLS[piece] || piece}</span>`;
  }).join('');

  whiteEl.innerHTML = renderPieces(capturedPieces.white);
  blackEl.innerHTML = renderPieces(capturedPieces.black);

  if (totalEl) {
    const total = capturedPieces.white.length + capturedPieces.black.length;
    totalEl.textContent = `${total} ${total === 1 ? 'piece' : 'pieces'}`;
  }

  if (balanceEl) {
    const whiteMaterial = capturedPieces.white.reduce((sum, piece) => sum + (PIECE_VALUES[piece.toLowerCase()] || 0), 0);
    const blackMaterial = capturedPieces.black.reduce((sum, piece) => sum + (PIECE_VALUES[piece.toLowerCase()] || 0), 0);
    const diff = Math.round((whiteMaterial - blackMaterial) / 100);
    balanceEl.textContent = diff === 0 ? 'Even' : `${diff > 0 ? 'White' : 'Black'} +${Math.abs(diff)}`;
  }
}

// Record that a piece has moved
function markPieceMoved(r, c, piece) {
  const isWhite = isWhitePiece(piece);
  const pieceLower = piece.toLowerCase();
  
  if (pieceLower === 'k') {
    const key = isWhite ? 'wk' : 'bk';
    pieceMoveHistory[key] = true;
  } else if (pieceLower === 'r') {
    // Determine if kingside or queenside rook
    const side = c === 7 ? 'ks' : 'qs';
    const key = isWhite ? `wr-${side}` : `br-${side}`;
    pieceMoveHistory[key] = true;
  }
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
  pieceMoveHistory = {}; // Reset castling eligibility
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
        p.className = `piece ${isWhitePiece(pieceCode) ? 'white-board-piece' : 'black-board-piece'}`;
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

    // Check if this is a castling move
    const isCastling = piece.toLowerCase() === 'k' && Math.abs(c - fromC) === 2;

    // Allow move to any square (including captures)
    const capturedPiece = board[r][c];
    const isCapture = capturedPiece !== '';
    board[r][c] = board[fromR][fromC];
    board[fromR][fromC] = '';
    
    // Handle castling rook movement
    if (isCastling) {
      handleCastling(fromR, fromC, c);
    }
    
    // Record the piece as moved
    markPieceMoved(fromR, fromC, piece);

    recordCapture(piece, capturedPiece);
    
    // Record the move
    recordMove(fromR, fromC, r, c, piece, isCapture, isCastling);

    // Handle pawn promotion
    if (piece.toLowerCase() === 'p') {
      if ((isWhitePiece(piece) && r === 0) || (isBlackPiece(piece) && r === 7)) {
        // Pawn reached the end; promote to queen (simple default)
        board[r][c] = isWhitePiece(piece) ? 'Q' : 'q';
      }
    }

    // Switch turn
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    startChessClock();

    selectedSquare = null;
    renderBoard();
    updateTurnIndicator();
    updateMoveHistory();
    renderCapturedPieces();

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

  if (gameOver) {
    stopChessClock();
    updateTurnIndicator();
  }
}

function makeAIMove() {
  const move = getAIMove(currentTurn);
  if (move) {
    // Check if this is a castling move
    const isCastling = move.piece.toLowerCase() === 'k' && Math.abs(move.toC - move.fromC) === 2;
    
    const capturedPiece = board[move.toR][move.toC];
    const isCapture = capturedPiece !== '';
    board[move.toR][move.toC] = board[move.fromR][move.fromC];
    board[move.fromR][move.fromC] = '';
    
    // Handle castling rook movement
    if (isCastling) {
      handleCastling(move.fromR, move.fromC, move.toC);
    }
    
    // Record the piece as moved
    markPieceMoved(move.fromR, move.fromC, move.piece);

    recordCapture(move.piece, capturedPiece);
    
    // Record the move
    recordMove(move.fromR, move.fromC, move.toR, move.toC, move.piece, isCapture, isCastling);

    // Handle pawn promotion
    if (move.piece.toLowerCase() === 'p') {
      if ((isWhitePiece(move.piece) && move.toR === 0) || 
          (isBlackPiece(move.piece) && move.toR === 7)) {
        board[move.toR][move.toC] = isWhitePiece(move.piece) ? 'Q' : 'q';
      }
    }

    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    startChessClock();
    selectedSquare = null;
    renderBoard();
    updateTurnIndicator();
    updateMoveHistory();
    renderCapturedPieces();
    checkGameStatus();
  }
}

function isGameInProgress() {
  return moveHistory.length > 0 && !gameOver;
}

function confirmGameReset() {
  if (!isGameInProgress()) return true;
  return window.confirm('Changing this will reset the current game. You will lose all moves, captured pieces, and timer progress. Continue?');
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateClockDisplay() {
  const whiteClockEl = document.getElementById('white-clock');
  const blackClockEl = document.getElementById('black-clock');
  const whiteCard = document.getElementById('white-clock-card');
  const blackCard = document.getElementById('black-clock-card');

  if (whiteClockEl) whiteClockEl.textContent = formatClock(clocks.white);
  if (blackClockEl) blackClockEl.textContent = formatClock(clocks.black);

  if (whiteCard && blackCard) {
    whiteCard.classList.toggle('active', currentTurn === 'white' && !gameOver);
    blackCard.classList.toggle('active', currentTurn === 'black' && !gameOver);
    whiteCard.classList.toggle('low-time', clocks.white <= 30);
    blackCard.classList.toggle('low-time', clocks.black <= 30);
  }
}

function stopChessClock() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startChessClock() {
  if (clockStarted || gameOver) return;
  clockStarted = true;
  timerInterval = setInterval(() => {
    if (gameOver) {
      stopChessClock();
      return;
    }

    clocks[currentTurn] -= 1;
    if (clocks[currentTurn] <= 0) {
      clocks[currentTurn] = 0;
      gameOver = true;
      gameOverReason = `${currentTurn === 'white' ? 'White' : 'Black'} lost on time.`;
      stopChessClock();
      updateTurnIndicator();
    }

    updateClockDisplay();
  }, 1000);
}

function resetClocks() {
  stopChessClock();
  clockStarted = false;
  const seconds = timeControlMinutes * 60;
  clocks = { white: seconds, black: seconds };
  updateClockDisplay();
}

function updateTurnIndicator() {
  const appEl = document.getElementById('app');
  let turnEl = document.getElementById('turn-indicator');
  if (!turnEl) {
    turnEl = document.createElement('div');
    turnEl.id = 'turn-indicator';
    turnEl.className = 'turn-indicator';
    appEl.insertBefore(turnEl, appEl.firstChild);
  }
  
  if (gameOver) {
    turnEl.textContent = gameOverReason;
    turnEl.style.color = '#a33c31';
  } else {
    turnEl.textContent = `${currentTurn === 'white' ? 'White' : 'Black'} to move`;
    turnEl.style.color = '#161a1d';
  }
  updateClockDisplay();
}

function updateMoveHistory() {
  const historyEl = document.getElementById('move-history-list');
  const countEl = document.querySelector('.move-count');
  if (!historyEl) return;

  if (countEl) {
    countEl.textContent = `${moveHistory.length} ${moveHistory.length === 1 ? 'move' : 'moves'}`;
  }
  
  historyEl.innerHTML = moveHistory.map((move, index) => {
    const moveNum = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;
    const label = isWhiteMove ? `${moveNum}.` : '';
    return `<span class="move-item">${label} ${move}</span>`;
  }).join('');
  
  // Scroll to bottom
  historyEl.scrollTop = historyEl.scrollHeight;
}

function initBoard() {
  stopChessClock();
  initStartingBoard();
  currentTurn = 'white';
  selectedSquare = null;
  gameOver = false;
  gameOverReason = '';
  moveHistory = [];
  capturedPieces = { white: [], black: [] };
  clockStarted = false;
  clocks = { white: timeControlMinutes * 60, black: timeControlMinutes * 60 };
  renderBoard();
  updateTurnIndicator();
  updateMoveHistory();
  renderCapturedPieces();
  updateClockDisplay();
}

function setGameMode(mode) {
  gameMode = mode;
  initBoard();
}

function selectMode(mode) {
  const nextMode = mode === 'local' ? 'two-player' : mode;
  if (nextMode === gameMode) return;

  if (!confirmGameReset()) return;

  document.querySelectorAll('.mode-btn').forEach((button) => {
    button.classList.toggle(
      'active',
      button.textContent.trim().toLowerCase() === (mode === 'vs-ai' ? 'computer' : mode)
    );
  });

  if (mode === 'lichess') {
    gameMode = 'lichess';
    document.getElementById('lichess-panel').style.display = 'grid';
    initBoard();
  } else {
    document.getElementById('lichess-panel').style.display = 'none';
    setGameMode(nextMode);
  }
}

function changeTimeControl(value) {
  const previousValue = String(timeControlMinutes);
  if (!confirmGameReset()) {
    const control = document.getElementById('time-control');
    if (control) control.value = previousValue;
    return;
  }

  timeControlMinutes = Number(value);
  initBoard();
}

function changeAILevel(value) {
  const previousValue = String(aiLevel);
  if (!confirmGameReset()) {
    const control = document.getElementById('ai-level');
    if (control) control.value = previousValue;
    return;
  }

  aiLevel = Number(value);
  initBoard();
}

function newGame() {
  if (!confirmGameReset()) return;
  initBoard();
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
window.changeTimeControl = changeTimeControl;
window.changeAILevel = changeAILevel;
window.newGame = newGame;
window.lichessLogin = lichessLogin;
window.generateLichessChallenge = generateLichessChallenge;

initBoard();
