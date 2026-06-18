import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/App.css";
import "./styles/StartScreen.css";
import { Home, Layers, Play, RotateCcw, Settings } from "lucide-react";
import BlockRewardModal from "./components/BlockRewardModal.jsx";
import Board from "./components/Board.jsx";
import DeckModal from "./components/DeckModal.jsx";
import GameOver from "./components/GameOver.jsx";
import PieceShape from "./components/PieceShape.jsx";
import PieceTray from "./components/PieceTray.jsx";
import RerollModal from "./components/RerollModal.jsx";
import ScoreBoard from "./components/ScoreBoard.jsx";
import { DEFAULT_DECK, EMPTY_BOARD, getDeckPieces, isValidDeck, SIZE } from "./constants/gameData.js";
import {
  AugmentChoiceModal,
  AugmentPanel,
  chooseAugment,
  createInitialAugmentState,
  getAugmentedScore,
  getAugmentLevel,
  getNextAugmentStateAfterPlacement,
  getSavedAugmentState,
  getTotalAugmentLevels,
  rollSpreadClear,
  rollSpreadFill,
  shouldOfferAugmentChoice
} from "./features/augments.jsx"; 
import { GHOST_AUGMENT_INTERVAL, resolveGhostClears } from "./features/ghosts.js";
import { getSavedItemState, ItemSlots, useItemSystem } from "./features/items.jsx";
import { applyBombClear, getBombArea } from "./features/bombBlocks.js";
import { applyLineClear } from "./features/lineBlocks.js";
import { createRandomSpecialTemplate, isValidSpecialPiece } from "./features/specials.js";
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
      deck: isValidDeck(savedGame.deck) ? savedGame.deck : DEFAULT_DECK,
      ghostCells: Array.isArray(savedGame.ghostCells)
        ? savedGame.ghostCells.filter((key) => typeof key === "string")
        : [],
      score: Number.isFinite(savedGame.score) ? savedGame.score : 0,
      specialPieces: Array.isArray(savedGame.specialPieces)
        ? savedGame.specialPieces.filter(isValidSpecialPiece)
        : [],
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
  // The deck is the set of block ids that may appear in the tray. Defaults to every block.
  const [deck, setDeck] = useState(() => initialGame?.deck || DEFAULT_DECK);
  // Special blocks (e.g. ghosts) earned this game, added to the deck until reset.
  const [specialPieces, setSpecialPieces] = useState(() => initialGame?.specialPieces || []);
  // Board cells overlapped by a ghost, awaiting a clear to award the doubled score.
  const [ghostCells, setGhostCells] = useState(() => new Set(initialGame?.ghostCells || []));
  const deckPieces = useMemo(() => [...getDeckPieces(deck), ...specialPieces], [deck, specialPieces]);
  const [tray, setTray] = useState(
    () =>
      initialGame?.tray ||
      nextTray(initialGame?.board || EMPTY_BOARD, [
        ...getDeckPieces(initialGame?.deck || DEFAULT_DECK),
        ...(initialGame?.specialPieces || [])
      ])
  );
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
  // The special block just earned, shown in the reward modal until acknowledged.
  const [rewardPiece, setRewardPiece] = useState(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    deckPieces,
    ghostCells,
    initialGame,
    isClearing,
    score,
    setAugmentState,
    setBoard,
    setClearingCells,
    setGhostCells,
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

    // Line block: preview the whole row + column cross it will clear.
    if (selectedPiece.special === "line") {
      const cross = new Set();
      for (let index = 0; index < SIZE; index += 1) {
        cross.add(`${closestPlacementCell.row}-${index}`);
        cross.add(`${index}-${closestPlacementCell.col}`);
      }
      return cross;
    }

    // Bomb block: preview the 3x3 area it will destroy.
    if (selectedPiece.special === "bomb") {
      return new Set(
        getBombArea(closestPlacementCell.row, closestPlacementCell.col).map(([r, c]) => `${r}-${c}`)
      );
    }

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
        deck,
        ghostCells: [...ghostCells],
        itemAwardLevel,
        itemSlots,
        score,
        specialPieces,
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
    deck,
    ghostCells,
    isPlaying,
    itemAwardLevel,
    itemSlots,
    specialPieces,
    score,
    tray,
    undoSnapshot
  ]);

  useEffect(() => {
    if (!isPlaying || gameOver || isClearing || augmentChoiceOpen || rewardPiece) return;
    if (!shouldOfferAugmentChoice(augmentState, score)) return;

    clearSelection();
    setAugmentChoiceOpen(true);
  }, [augmentChoiceOpen, augmentState, gameOver, isClearing, isPlaying, rewardPiece, score]);

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
    // Special blocks are per-game: a new game starts with the base deck only.
    setSpecialPieces([]);
    setGhostCells(new Set());
    setTray(nextTray(nextBoard, getDeckPieces(deck)));
    clearSelection();
    setClearingCells(new Set());
    setScore(0);
    setAugmentState(createInitialAugmentState());
    setAugmentChoiceOpen(false);
    setRewardPiece(null);
    resetItems();
  }

  function startGame() {
    resetGame();
    setGamePhase("playing");
  }

  function continueGame() {
    setGamePhase("playing");
  }

  function restartFromSettings() {
    setSettingsOpen(false);
    startGame();
  }

  function goHomeFromSettings() {
    setSettingsOpen(false);
    clearSelection();
    setGamePhase("start");
  }

  function placePieceAt(piece, row, col) {
    if (augmentChoiceOpen || isClearing || !piece || !canPlace(board, piece, row, col)) return;

    let result = placePiece(board, piece, row, col);
    // Cells where a ghost block was dropped onto an existing block; these score double
    // when they are eventually cleared.
    const newOverlapCells = piece.special === "ghost" ? result.overlappedCells : [];
    let extraCells = 0;

    if (piece.special === "line") {
      // Line block: clear the entire row and column it lands on.
      result = { ...applyLineClear(result.placedBoard, row, col), placedBoard: result.placedBoard };
    } else if (piece.special === "bomb") {
      // Bomb block: destroy the surrounding 3x3 area; each destroyed cell scores.
      const bombResult = applyBombClear(result.placedBoard, row, col);
      extraCells = bombResult.clearedCells.length;
      result = { ...bombResult, placedBoard: result.placedBoard };
    } else {
      // Spread-fill augment: a chance to fill nearby empty cells, which may complete lines.
      const spreadCount = rollSpreadFill(augmentState);
      if (spreadCount > 0) {
        const spreadCells = getSpreadFillCells(result.placedBoard, piece, row, col, spreadCount);
        if (spreadCells.length) {
          extraCells = spreadCells.length;
          const spreadBoard = cloneBoard(result.placedBoard);
          spreadCells.forEach(({ row: spreadRow, col: spreadCol }) => {
            spreadBoard[spreadRow][spreadCol] = piece.color;
          });
          result = { ...clearLines(spreadBoard), placedBoard: spreadBoard };
        }
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
      extraCells
    });
    // Award doubled score for any ghost-overlapped cells caught in this clear, and keep
    // the rest marked for a future clear.
    const ghostResult = resolveGhostClears(ghostCells, newOverlapCells, nextClearingCells);

    setBoard(nextClearingCells.size ? result.placedBoard : result.board);
    setClearingCells(nextClearingCells);
    setScore((current) => current + scoreGain.total + ghostResult.bonus);
    setGhostCells(ghostResult.ghostCells);

    const updatedTray = tray.map((trayPiece) => (trayPiece?.uid === piece.uid ? null : trayPiece));
    const trayCompleted = updatedTray.every((trayPiece) => !trayPiece);
    const refreshedTray = trayCompleted ? nextTray(result.board, deckPieces) : updatedTray;
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
    // Each choice raises the total augment level by exactly one, so the running level
    // total doubles as the number of choices made. Earn a ghost block every interval.
    const choicesMade = getTotalAugmentLevels(augmentState) + 1;
    if (choicesMade % GHOST_AUGMENT_INTERVAL === 0) {
      const special = createRandomSpecialTemplate();
      setSpecialPieces((current) => [...current, special]);
      setRewardPiece(special);
    }
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
      <div className="game-settings">
        <button
          aria-expanded={settingsOpen}
          aria-label="설정"
          className="game-settings-button"
          onClick={() => setSettingsOpen((open) => !open)}
          type="button"
        >
          <Settings size={22} aria-hidden="true" />
        </button>
      </div>
      {settingsOpen && (
        <div className="game-settings-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={() => setSettingsOpen(false)}>
          <section className="game-settings-menu" onClick={(event) => event.stopPropagation()}>
            <strong id="settings-title" className="game-settings-title">설정</strong>
            <button className="game-settings-menu-button" onClick={restartFromSettings} type="button">
              <RotateCcw size={18} aria-hidden="true" />
              <span>다시하기</span>
            </button>
            <button className="game-settings-menu-button" onClick={goHomeFromSettings} type="button">
              <Home size={18} aria-hidden="true" />
              <span>홈</span>
            </button>
          </section>
        </div>
      )}
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
              onEmptySlotClick={clearSelection}
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
          <button
            aria-label="현재 덱 보기"
            className="deck-view-button"
            onClick={() => setDeckModalOpen(true)}
            type="button"
          >
            <Layers size={22} aria-hidden="true" />
            <span>덱</span>
          </button>
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
      {rewardPiece && <BlockRewardModal onConfirm={() => setRewardPiece(null)} piece={rewardPiece} />}
      {deckModalOpen && <DeckModal deckPieces={deckPieces} onClose={() => setDeckModalOpen(false)} />}
      {rerollModalSlot !== null && (
        <RerollModal
          board={board}
          deckPieces={deckPieces}
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
