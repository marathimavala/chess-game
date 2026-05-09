# Chess Game Redesign Plan

## Vision

Build a simple, premium chess experience that feels calm, focused, and deliberate. The board should be the hero, controls should feel lightweight, and every supporting feature should help the player understand the game without making the screen feel busy.

The visual target is Apple-like restraint: confident spacing, clear hierarchy, soft surfaces, precise typography, minimal borders, and color used only where it communicates state or action.

## Design Principles

- Board first: the chessboard must be the largest and most important object on the screen.
- Calm controls: mode, time, and AI settings should be easy to reach but visually quiet.
- Minimal panels: avoid dashboard clutter; show only what helps during play.
- Clear typography: use a system font stack, strong contrast, and compact labels.
- Restrained color: use neutral surfaces, subtle depth, and one accent color for active states.
- Status near action: turn, check, timeout, and game-over states should appear close to the board.
- Responsive by design: desktop, tablet, and mobile should each feel intentionally composed.

## Layout System

### Desktop

- Use a compact top header with:
  - Brand on the left.
  - Mode selector in the center: Local, Computer, Lichess.
  - Developer credit `marathimavala` on the right.
- Keep the board centered and large.
- Use a slim captured-pieces rail on the left.
- Use a slim tools rail on the right for clocks, time control, AI level, and move history.
- Use a floating board status chip for turn and game-over messages instead of a large separate status card.

### Tablet

- Keep the board first and centered.
- Move captured pieces and game tools below the board in a two-column layout.
- Keep controls touch-friendly without increasing visual weight.

### Mobile

- Show the board first.
- Stack captured pieces, clocks, settings, and move history below the board.
- Avoid sidebars and fixed-height panels that create awkward scrolling.
- Keep text and controls large enough for touch use.

## Game Experience

The current app is a static browser chess game using:

- `index.html`
- `style.css`
- `script.js`

Current modes:

- Local
- Computer
- Lichess

Current UI/game features:

- Chessboard
- Floating turn status
- White and black clocks
- Time control selector
- Captured pieces
- Move history
- Computer AI level selector
- Reset warning when changing key settings mid-game

The next redesign should preserve these useful features but reorganize them into a cleaner, more premium interface.

## Feature Roadmap

### Core Chess Rules

- Keep enforcing legal moves and turn order.
- Ensure castling works on both sides for both colors.
- Add promotion choice instead of automatic queen promotion.
- Add en passant.
- Add stalemate and draw-state polish.
- Add clearer check and checkmate messaging.

### Computer Mode

- Keep current AI levels as a temporary built-in opponent.
- Later replace or augment the heuristic AI with Stockfish.
- Present difficulty as human-friendly labels:
  - Beginner
  - Casual
  - Club
  - Advanced
  - Master

### Lichess Mode

- Keep the current simple Lichess link flow as a placeholder.
- Future rated Lichess play should use OAuth/backend support.
- Future Lichess features should include:
  - Rated or casual challenge.
  - Rating range.
  - Time control.
  - Game stream sync.
  - Proper token handling outside frontend-only JavaScript.

### Premium Product Features

- New game control with confirmation when a game is active.
- Board theme selector.
- Piece style selector.
- Sound toggle.
- Move animation.
- Board coordinates toggle.
- PGN export.
- Game review or analysis mode after Stockfish is integrated.

## Implementation Phases

### Phase 1: Planning Document

Acceptance criteria:

- `DESIGN_PLAN.md` exists in the repo root.
- It captures the product vision, UX system, feature roadmap, implementation phases, and assumptions.
- Existing `README.md` and `plan.md` are unchanged.

### Phase 2: Visual Reset

Acceptance criteria:

- Board is visually dominant on desktop, tablet, and mobile.
- Header is compact and premium.
- Side panels are reduced to quiet instruments.
- No text overlaps or cramped controls.

### Phase 3: Interaction Polish

Acceptance criteria:

- Turn status is clear and close to the board.
- Clocks are readable and active clock state is obvious.
- Captured pieces update neatly.
- Move history scrolls cleanly.
- Changing mode, time, or AI level during a game warns before reset.

### Phase 4: Chess Rule Completion

Acceptance criteria:

- Castling, promotion, en passant, check, checkmate, stalemate, and timeout states behave correctly.
- Illegal moves are rejected without breaking selection state.
- Game-over states stop the clock.

### Phase 5: Engine And Online Upgrades

Acceptance criteria:

- Computer mode can be powered by Stockfish.
- Lichess mode has a safe backend/OAuth plan before rated play is implemented.
- Online/rated play does not expose tokens in frontend code.

## Testing Checklist

- Confirm `DESIGN_PLAN.md` exists in the repo root.
- Confirm markdown renders cleanly and is easy to scan.
- Confirm no app code is modified during the planning-document step.
- Test desktop layout at common widths: 1440px, 1280px, 1024px.
- Test tablet layout around 768px to 920px.
- Test mobile layout around 360px to 430px.
- Verify board remains the primary visual focus.
- Verify clocks, captured pieces, move history, and settings are readable.
- Verify reset warning appears during active games.
- Verify timers start, switch, stop, and timeout correctly.
- Verify captured pieces and move history update after captures and moves.
- Verify all legal chess-rule edge cases before releasing a gameplay-focused update.

## Assumptions

- This project remains a static HTML/CSS/JS app for now.
- Bootstrap may remain loaded, but premium UI should rely mainly on custom CSS.
- Stockfish is a future upgrade and is not currently bundled in the repo.
- Proper Lichess rated play requires backend/OAuth work and is not safe as frontend-only JavaScript.
- `plan.md` remains untouched unless explicitly replaced later.
- `README.md` remains untouched during this planning step.
