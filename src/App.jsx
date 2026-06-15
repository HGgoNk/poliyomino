import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/App.css";
import "./styles/StartScreen.css";
import { Play } from "lucide-react";
import Board from "./components/Board.jsx";
import GameOver from "./components/GameOver.jsx";
import PieceShape from "./components/PieceShape.jsx";
import PieceTray from "./components/PieceTray.jsx";
import RerollModal from "./components/RerollModal.jsx";
import ScoreBoard from "./components/ScoreBoard.jsx";
import { EMPTY_BOARD, SIZE } from "./constants/gameData.js";
import {
  AugmentChoiceModal,
  AugmentPanel,
  chooseAugment,
  createInitialAugmentState,
  getAugmentedScore,
  getAugmentLevel,
  getNextAugmentStateAfterPlacement,
  getSavedAugmentState,
  rollSpreadClear,
  rollSpreadFill,
  shouldOfferAugmentChoice
} from "./features/augments.jsx";
import { getSavedItemState, ItemSlots, useItemSystem } from "./features/items.jsx";
import useBestScore from "./hooks/useBestScore.js";
import { applySpreadClear, clearLines, cloneBoard, isBoardEmpty } from "./utils/boardUtils.js";
import { createPieceInstance } from "./utils/pieceUtils.js";
import { canPlace, getPlacements, getSpreadFillCells, hasMove, placePiece } from "./utils/placement.js";
import { nextTray } from "./utils/tray.js";

const MAX_SNAP_DISTANCE = 1;
const CLEAR_HIGHLIGHT_MS = 260;
const SAVED_GAME_KEY = "block-blast-current-game";
const START_PREVIEW_CELLS = [
  "piece-cyan",
  "piece-lime",
  "piece-amber",
  "",
  "",
  "piece-rose",
  "piece-violet",
  "piece-blue",
  "piece-teal",
  "piece-orange",
  "",
  "",
  "piece-pink",
  "piece-green",
  "piece-indigo",
  ""
];

function isValidBoard(board) {
  return (
    Array.isArray(board) &&
    board.length === SIZE &&
    board.every((row) => Array.isArray(row) && row.length === SIZE)
  );
}

function isValidPiece(piece) {
  return (
    piece &&
    typeof piece.uid === "string" &&
    typeof piece.id === "string" &&
    typeof piece.color === "string" &&
    Array.isArray(piece.cells) &&
    piece.cells.every(
      (cell) =>
        Array.isArray(cell) &&
        cell.length === 2 &&
        Number.isInteger(cell[0]) &&
        Number.isInteger(cell[1])
    )
  );
}

function isValidTray(tray) {
  return Array.isArray(tray) && tray.length === 3 && tray.every((piece) => piece === null || isValidPiece(piece));
}

function loadSavedGame() {
  try {
    const savedGame = JSON.parse(localStorage.getItem(SAVED_GAME_KEY));
    if (!savedGame || !isValidBoard(savedGame.board) || !isValidTray(savedGame.tray)) {
      return null;
    }

    return {
      augmentState: getSavedAugmentState(savedGame),
      board: cloneBoard(savedGame.board),
      score: Number.isFinite(savedGame.score) ? savedGame.score : 0,
      tray: savedGame.tray,
      ...getSavedItemState(savedGame, { isValidBoard, isValidTray })
    };
  } catch {
    return null;
  }
}

function getPlacementCell(piece, cursorCell, anchorCell) {
  if (!piece || !cursorCell || !anchorCell) return null;

  const [anchorRow, anchorCol] = anchorCell;
  return {
    row: cursorCell.row - anchorRow,
    col: cursorCell.col - anchorCol
  };
}

function getPlacementDistanceSquared(firstCell, secondCell) {
  if (!firstCell || !secondCell) return Infinity;
  return (firstCell.row - secondCell.row) ** 2 + (firstCell.col - secondCell.col) ** 2;
}

function getClosestPlacement(board, piece, targetCell) {
  if (!piece || !targetCell) return null;

  const placements = getPlacements(board, piece);
  if (!placements.length) return null;

  return placements.reduce((closest, placement) => {
    const closestDistance = getPlacementDistanceSquared(closest, targetCell);
    const placementDistance = getPlacementDistanceSquared(placement, targetCell);
    return placementDistance < closestDistance ? placement : closest;
  }, placements[0]);
}

function App() {
  const [initialGame] = useState(loadSavedGame);
  const [board, setBoard] = useState(() => initialGame?.board || cloneBoard(EMPTY_BOARD));
  const [tray, setTray] = useState(() => initialGame?.tray || nextTray(initialGame?.board || EMPTY_BOARD));
  const [selectedId, setSelectedId] = useState(null);
  const [cursorPiece, setCursorPiece] = useState(null);
  const [anchorCell, setAnchorCell] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [cursorPoint, setCursorPoint] = useState(null);
  const [boardMetrics, setBoardMetrics] = useState({ cellGap: 2, cellSize: 26 });
  const [clearingCells, setClearingCells] = useState(() => new Set());
  const [score, setScore] = useState(() => initialGame?.score || 0);
  const [augmentState, setAugmentState] = useState(() => initialGame?.augmentState || createInitialAugmentState());
  const [augmentChoiceOpen, setAugmentChoiceOpen] = useState(false);
  const [gamePhase, setGamePhase] = useState("start");
  const boardRef = useRef(null);
  const clearTimerRef = useRef(null);
  const best = useBestScore(score);
  const availablePieces = tray.filter(Boolean);
  const selectedPiece = availablePieces.find((piece) => piece.uid === selectedId) || null;
  const isClearing = clearingCells.size > 0;
  const {
    activeCellSlot,
    applyCellAction,
    applyReroll,
    cancelCellMode,
    cancelReroll,
    cellActionMode,
    cellActionsRemaining,
    handleItemClick,
    itemAwardLevel,
    itemSlots,
    rerollModalSlot,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  } = useItemSystem({
    augmentState,
    board,
    clearHighlightMs: CLEAR_HIGHLIGHT_MS,
    clearSelection,
    clearTimerRef,
    initialGame,
    isClearing,
    score,
    setAugmentState,
    setBoard,
    setClearingCells,
    setScore,
    setTray,
    tray
  });
  const isPlaying = gamePhase === "playing";
  const gameOver =
    isPlaying && !isClearing && (tray.length === 0 || (availablePieces.length > 0 && !hasMove(board, availablePieces)));
  const placementCell = getPlacementCell(selectedPiece, hoverCell, anchorCell);
  const closestPlacementCell = getClosestPlacement(board, selectedPiece, placementCell);
  const cursorAnchorOffset = anchorCell
    ? {
        x: anchorCell[1] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2,
        y: anchorCell[0] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2
      }
    : null;
  const invalidPreview = Boolean(
    selectedPiece &&
      placementCell &&
      closestPlacementCell &&
      getPlacementDistanceSquared(placementCell, closestPlacementCell) > MAX_SNAP_DISTANCE ** 2
  );

  const previewCells = useMemo(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();
    return new Set(selectedPiece.cells.map(([dr, dc]) => `${closestPlacementCell.row + dr}-${closestPlacementCell.col + dc}`));
  }, [closestPlacementCell, invalidPreview, selectedPiece]);
  const previewClearingCells = useMemo(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();

    const result = placePiece(board, selectedPiece, closestPlacementCell.row, closestPlacementCell.col);
    return new Set(result.clearedCells);
  }, [board, closestPlacementCell, invalidPreview, selectedPiece]);

  useEffect(() => {
    if (!isPlaying) return;
    localStorage.setItem(
      SAVED_GAME_KEY,
      JSON.stringify({
        activeCellSlot,
        augmentState,
        board,
        cellActionMode,
        cellActionsRemaining,
        itemAwardLevel,
        itemSlots,
        score,
        tray,
        undoSnapshot
      })
    );
  }, [
    activeCellSlot,
    augmentState,
    board,
    cellActionMode,
    cellActionsRemaining,
    isPlaying,
    itemAwardLevel,
    itemSlots,
    score,
    tray,
    undoSnapshot
  ]);

  useEffect(() => {
    if (!isPlaying || gameOver || isClearing || augmentChoiceOpen) return;
    if (!shouldOfferAugmentChoice(augmentState, score)) return;

    clearSelection();
    setAugmentChoiceOpen(true);
  }, [augmentChoiceOpen, augmentState, gameOver, isClearing, isPlaying, score]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    function updateBoardMetrics() {
      const boardElement = boardRef.current;
      const firstCell = boardElement?.querySelector(".board-cell");
      const secondCell = boardElement?.querySelectorAll(".board-cell")[1];
      if (!firstCell) return;

      const firstRect = firstCell.getBoundingClientRect();
      const secondRect = secondCell?.getBoundingClientRect();
      const cellGap = secondRect ? Math.max(0, secondRect.left - firstRect.right) : 2;

      setBoardMetrics({ cellGap, cellSize: firstRect.width });
    }

    updateBoardMetrics();
    window.addEventListener("resize", updateBoardMetrics);
    return () => window.removeEventListener("resize", updateBoardMetrics);
  }, [isPlaying]);

  useEffect(() => {
    if (!selectedPiece) {
      setCursorPiece(null);
      setAnchorCell(null);
      setCursorPoint(null);
      return undefined;
    }

    function handlePointerMove(event) {
      setCursorPoint({ x: event.clientX, y: event.clientY });
    }

    function handlePointerDown(event) {
      // Dropping the held block when pressing anywhere other than the board or tray.
      if (event.target instanceof Element && (event.target.closest(".board") || event.target.closest(".tray"))) {
        return;
      }
      clearSelection();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedPiece]);

  useEffect(() => () => clearTimeout(clearTimerRef.current), []);

  function clearSelection() {
    setSelectedId(null);
    setCursorPiece(null);
    setAnchorCell(null);
    setHoverCell(null);
    setCursorPoint(null);
  }

  function resetGame() {
    clearTimeout(clearTimerRef.current);
    const nextBoard = cloneBoard(EMPTY_BOARD);
    setBoard(nextBoard);
    setTray(nextTray(nextBoard));
    clearSelection();
    setClearingCells(new Set());
    setScore(0);
    setAugmentState(createInitialAugmentState());
    setAugmentChoiceOpen(false);
    resetItems();
  }

  function startGame() {
    resetGame();
    setAugmentChoiceOpen(true);
    setGamePhase("playing");
  }

  function continueGame() {
    setGamePhase("playing");
  }

  function placePieceAt(piece, row, col) {
    if (augmentChoiceOpen || isClearing || !piece || !canPlace(board, piece, row, col)) return;

    let result = placePiece(board, piece, row, col);
    let spreadFilledCount = 0;

    // Spread-fill augment: a chance to fill nearby empty cells, which may complete lines.
    const spreadCount = rollSpreadFill(augmentState);
    if (spreadCount > 0) {
      const spreadCells = getSpreadFillCells(result.placedBoard, piece, row, col, spreadCount);
      if (spreadCells.length) {
        spreadFilledCount = spreadCells.length;
        const spreadBoard = cloneBoard(result.placedBoard);
        spreadCells.forEach(({ row: spreadRow, col: spreadCol }) => {
          spreadBoard[spreadRow][spreadCol] = piece.color;
        });
        result = { ...clearLines(spreadBoard), placedBoard: spreadBoard };
      }
    }

    // Spread-clear augment: a chance for cleared lines to take nearby lines with them.
    result = applySpreadClear(result, rollSpreadClear(augmentState));

    const nextClearingCells = new Set(result.clearedCells);
    const scoreGain = getAugmentedScore({
      augmentState,
      cleared: result.cleared,
      piece,
      allClear: isBoardEmpty(result.board),
      extraCells: spreadFilledCount
    });

    setBoard(nextClearingCells.size ? result.placedBoard : result.board);
    setClearingCells(nextClearingCells);
    setScore((current) => current + scoreGain.total);

    const updatedTray = tray.map((trayPiece) => (trayPiece?.uid === piece.uid ? null : trayPiece));
    const trayCompleted = updatedTray.every((trayPiece) => !trayPiece);
    const refreshedTray = trayCompleted ? nextTray(result.board) : updatedTray;
    saveUndoSnapshot();
    setAugmentState((current) =>
      getNextAugmentStateAfterPlacement(current, {
        cleared: result.cleared,
        trayCompleted
      })
    );
    setTray(refreshedTray);
    clearSelection();

    if (nextClearingCells.size) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(result.board);
        setClearingCells(new Set());
      }, CLEAR_HIGHLIGHT_MS);
    }
  }

  function handleCellClick(row, col) {
    if (augmentChoiceOpen) return;

    if (cellActionsRemaining > 0) {
      applyCellAction(row, col);
      return;
    }

    const nextPlacementCell = getPlacementCell(selectedPiece, { row, col }, anchorCell);
    const nextClosestPlacementCell = getClosestPlacement(board, selectedPiece, nextPlacementCell);
    if (!nextClosestPlacementCell) return;
    if (getPlacementDistanceSquared(nextPlacementCell, nextClosestPlacementCell) > MAX_SNAP_DISTANCE ** 2) return;
    placePieceAt(selectedPiece, nextClosestPlacementCell.row, nextClosestPlacementCell.col);
  }

  function handlePieceSelect(piece, event, nextAnchorCell) {
    event.preventDefault();
    if (augmentChoiceOpen) return;

    if (piece.uid === selectedId) {
      clearSelection();
      return;
    }

    setSelectedId(piece.uid);
    cancelCellMode();
    setCursorPiece(createPieceInstance(piece));
    setAnchorCell(nextAnchorCell);
    setCursorPoint({ x: event.clientX, y: event.clientY });
  }

  function handleAugmentChoose(augmentId) {
    setAugmentState((current) => chooseAugment(current, augmentId, score));
    setAugmentChoiceOpen(false);
  }

  if (gamePhase === "start") {
    // Base "continue" on the live game state (which is seeded from the saved game on
    // launch) so that returning home after a game over no longer offers to resume a
    // board that has no remaining moves.
    const hasProgress = score > 0 || board.some((row) => row.some(Boolean));
    const canContinue = hasProgress && availablePieces.length > 0 && hasMove(board, availablePieces);

    return (
      <main className="app-shell start-shell">
        <section className="start-screen" aria-labelledby="start-title">
          <div className="start-preview" aria-hidden="true">
            {START_PREVIEW_CELLS.map((cellClass, index) => (
              <span className={`start-cell ${cellClass}`} key={index} />
            ))}
          </div>
          <h1 id="start-title">Polyomino</h1>
          <div className="start-actions">
            {canContinue && (
              <button className="primary-action" onClick={continueGame} type="button">
                <Play size={20} aria-hidden="true" />
                이어하기
              </button>
            )}
            <button
              className={canContinue ? "secondary-action" : "primary-action"}
              onClick={startGame}
              type="button"
            >
              {!canContinue && <Play size={20} aria-hidden="true" />}
              새 게임
            </button>
          </div>
          {canContinue && (
            <div className="start-saved-score" aria-label="Saved game score">
              <span>진행 점수</span>
              <strong>{score}</strong>
            </div>
          )}
          <div className="start-best" aria-label="Best score">
            <span>Best</span>
            <strong>{best}</strong>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${selectedPiece ? "has-cursor-piece" : ""} ${cellActionsRemaining > 0 ? "has-cell-mode" : ""}`}>
      <section className="game-area">
        <ScoreBoard best={best} score={score} />
        <div className="board-layout">
          <AugmentPanel augmentState={augmentState} />
          <div className="board-stack">
            <Board
              board={board}
              boardRef={boardRef}
              hoverCell={hoverCell}
              clearingCells={clearingCells}
              onCellClick={handleCellClick}
              onCellEnter={setHoverCell}
              onCellLeave={() => setHoverCell(null)}
              previewClearingCells={previewClearingCells}
              previewCells={previewCells}
              selectedPiece={selectedPiece}
            />
            <PieceTray
              disabled={augmentChoiceOpen || gameOver || isClearing}
              onPieceSelect={handlePieceSelect}
              selectedId={selectedId}
              tray={tray}
            />
          </div>
          <ItemSlots
            activeCellSlot={activeCellSlot}
            cellActionsRemaining={cellActionsRemaining}
            isClearing={isClearing}
            itemSlots={itemSlots}
            onItemClick={handleItemClick}
            undoSnapshot={undoSnapshot}
          />
        </div>
        {cursorPiece && cursorPoint && cursorAnchorOffset && (
          <div
            className={`cursor-piece ${invalidPreview ? "invalid" : ""}`}
            style={{
              left: cursorPoint.x,
              top: cursorPoint.y,
              transform: `translate(-${cursorAnchorOffset.x}px, -${cursorAnchorOffset.y}px)`
            }}
          >
            <PieceShape
              cellGap={boardMetrics.cellGap}
              cellSize={boardMetrics.cellSize}
              className="cursor-piece-grid"
              piece={cursorPiece}
            />
          </div>
        )}
      </section>
      {augmentChoiceOpen && (
        <AugmentChoiceModal augmentState={augmentState} onChoose={handleAugmentChoose} score={score} />
      )}
      {rerollModalSlot !== null && (
        <RerollModal
          board={board}
          level={getAugmentLevel(augmentState, "reroll-power")}
          onApply={applyReroll}
          onCancel={cancelReroll}
          tray={tray}
        />
      )}
      {gameOver && <GameOver best={best} onGoHome={() => setGamePhase("start")} onRestart={startGame} score={score} />}
    </main>
  );
}

export default App;
