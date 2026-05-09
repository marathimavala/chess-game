# Chess Game — Implementation Plan

Brief: a phased roadmap and technical plan to evolve the current Phase‑1 empty board into a fully working browser chess game with two play modes: Human vs Computer (AI) and Local Two‑Player.

Goals

- Playable chess in the browser (no backend required)
- Modes: Human vs Computer (AI), Local Two‑player (two humans on same device)
- Feature set: pieces, click-to-select/move, turn enforcement, legal move generation (piece-by-piece), capture, check/checkmate detection, simple AI (random → heuristic), tests, and a clean UI

Assumptions

- Client-side only (HTML/CSS/JS). No server needed for now.
- Single page app. State kept in-memory. Optionally save/restore via localStorage later.
- Use Unicode chess glyphs for pieces (no external assets required).

Minimal technical contract (functions & data shapes)

- Board state: 8x8 array of strings or empty string. Example:
  - board[row][col] where row 0 = rank 8 (black back rank) and row 7 = rank 1 (white back rank)
  - Pieces: 'P','R','N','B','Q','K' for White; lowercase for Black
- API surface (JS functions):
  - initBoard(): initializes board and UI
  - renderBoard(board): draws pieces and highlights
  - getLegalMoves(board, fromSquare): returns array of toSquares (initially permissive, then refined)
  - makeMove(board, from, to): applies the move (returns new board or mutation)
  - isInCheck(board, color): boolean
  - isCheckmate(board, color): boolean
  - aiPickMove(board, color, difficulty): returns move

Edge cases to handle

- Click on empty square when no piece selected
- Selecting opponent piece on your turn
- Attempting illegal move (should be rejected)
- Pawn promotions (simple default to Queen, later UI for choice)
- Castling and en-passant (defer until core moves work)
- Stalemate detection
- Undo / restart

Quality gates

- Build: static files only — verify no JS syntax errors
- Lint: simple linting with ESLint (optional later)
- Unit tests: move generation (happy path + edge cases) using a lightweight test runner (Jest or plain assertions)
- Smoke test: play a short manual game; verify captures and turn alternation

Phased roadmap (estimated order and outcomes)

Phase 1 — Board (DONE)

- Outcome: static 8×8 board displayed (`index.html`, `style.css`, `script.js`)

Phase 2 — Pieces rendering (1 day)

- Represent starting position in `board` array
- Map letter codes to Unicode symbols and render them
- Deliverable: visible starting chess position

Phase 3 — Click-to-select and move (1–2 days)

- Implement selection, highlighting, and moving pieces (allow any move initially)
- Update `script.js` to re-render after each move
- Deliverable: user can move pieces by clicking source then target

Phase 4 — Turn system + basic capture rules (1 day)

- Enforce white/black turn alternation
- Prevent moving opponent's pieces
- Capture: moving to occupied opponent square replaces piece

Phase 5 — Legal moves (incremental by piece) (3–7 days)

- Implement legal move generators, piece-by-piece order:
  1. Pawn (single, double, captures)
  2. Rook
  3. Bishop
  4. Knight
  5. Queen
  6. King
- Integrate isInCheck check to filter moves that leave player's king in check

Phase 6 — Check / Checkmate / Stalemate (3–5 days)

- Implement functions to detect check and checkmate
- Add UI indicator when in check

Phase 7 — AI (progressive) (3–7 days)

- Level 0: Random legal move
- Level 1: Prefer captures, simple piece-value heuristic
- Level 2: Minimax with depth=2 and material evaluation (optional later)

Phase 8 — UX / polish / tests / packaging (2–4 days)

- Add move history, restart, undo, promotion UI, animations
- Add unit tests for move generation and check detection
- Package and document usage in `README.md`

Files to create / edit (short list)

- `index.html` — UI skeleton (exists)
- `style.css` — styles (exists)
- `script.js` — game logic and rendering (exists)
- `plan.md` — this file
- `tests/` — unit tests for move generation
- `utils/` — optional split for move generators and AI

Testing strategy

- Unit tests for:
  - move generation for each piece (including captures)
  - isInCheck and isCheckmate for simple positions
  - makeMove ensures board consistency
- Manual integration tests (playable scenarios)

Milestones and acceptance criteria

- M1: Board + pieces + click-to-move + alternating turns + capture → Playable moves (manual) — Accept when user can move pieces and capture.
- M2: Legal moves for all pieces + check detection — Accept when illegal moves are blocked and check is detected.
- M3: AI plays legal moves (random/heuristic) — Accept when computer makes moves on its turn and respects rules.

Extensions (future)

- Online multiplayer (WebSockets)
- Better AI (alpha‑beta pruning, Zobrist hashing)
- Mobile-friendly UI, accessibility improvements

Next immediate step (pick one)

1. Implement Phase 2: render starting piece setup in `script.js` (I can do this now), or
2. Implement Phase 3: add click-to-select and move logic (I can implement after Phase 2), or
3. Jump to Phase 5: implement pawn legal moves first (if you prefer to prioritize rules)

Pick which immediate step to start and I'll implement it and run a quick smoke check.
