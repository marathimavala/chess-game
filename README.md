# Build Your Own Chess Game - Step by Step

## Goal

Build a chess game in the browser using:

- HTML
- CSS
- JavaScript

Later we will add:

- Legal chess moves
- Turn-based play
- Check/checkmate detection
- Simple AI
- Better AI
- Agentic AI style thinking

---

# Phase 1: Basic Chess Board

## Step 1: Create project folder

Create a folder:

chess-game

Inside it create these files:

index.html
style.css
script.js

---

## Step 2: Create 8x8 chess board

In this phase, only show the board.

No pieces.
No movement.
Just 64 squares.

Concepts you will learn:

- HTML structure
- CSS grid
- JavaScript DOM creation

---

# Phase 2: Add Chess Pieces

## Step 3: Represent board in JavaScript

Use an 8x8 array.

Example:

[
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"]
]

Capital letters = White pieces  
Small letters = Black pieces

---

## Step 4: Display pieces on board

Map letters to chess symbols:

P = ♙
R = ♖
N = ♘
B = ♗
Q = ♕
K = ♔

p = ♟
r = ♜
n = ♞
b = ♝
q = ♛
k = ♚

---

# Phase 3: Move Pieces

## Step 5: Click to select a piece

When user clicks a square:

- If no piece is selected, select the piece.
- Highlight selected square.

---

## Step 6: Move selected piece

When user clicks another square:

- Move piece from old square to new square.
- Clear old square.
- Re-render board.

At first, allow any move.

This is okay for learning.

---

# Phase 4: Add Basic Rules

## Step 7: Add turn system

White moves first.

After white moves, black moves.

Rules:

- White can only move white pieces.
- Black can only move black pieces.

---

## Step 8: Add legal moves piece by piece

Do not try all rules at once.

Add in this order:

1. Pawn
2. Rook
3. Bishop
4. Queen
5. Knight
6. King

---

# Phase 5: Add Game Logic

## Step 9: Detect capture

If target square has opponent piece, capture it.

Do not allow capturing your own piece.

---

## Step 10: Detect check

Find king position.

Check if any opponent piece attacks the king.

---

## Step 11: Detect checkmate

Checkmate means:

- King is in check
- Player has no legal move to escape

This is harder, so do it later.

---

# Phase 6: Add Simple AI

## Step 12: Random AI

When it is black's turn:

- Find all legal black moves.
- Pick one random move.
- Play it.

This is the first AI.

---

## Step 13: Better AI

Improve AI by giving pieces value:

Pawn = 1
Knight = 3
Bishop = 3
Rook = 5
Queen = 9
King = 100

AI should prefer captures with higher value.

---

# Phase 7: Agentic AI Style

## Step 14: Make AI think in steps

Instead of just random move, AI should do:

1. Am I in check?
2. Can I capture queen?
3. Can I give check?
4. Can I save my important piece?
5. Otherwise play best available move.

This is basic agentic behavior.

---

# Final Target

The final project should have:

- Chess board
- Pieces
- Click-to-move
- Turn system
- Legal moves
- Capture
- Check
- Checkmate
- Simple AI
- Better AI
- Agentic AI logic
