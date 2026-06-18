import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles/App.css";
import "./styles/StartScreen.css";
import { Home, Layers, Play, RotateCcw, Settings } from "lucide-react";
import BlockRewardModal from "./components/BlockRewardModal";
import Board from "./components/Board";
import DeckModal from "./components/DeckModal";
import GameOver from "./components/GameOver";
import PieceShape from "./components/PieceShape";
import PieceTray from "./components/PieceTray";
import RerollModal from "./components/RerollModal";
import ScoreBoard from "./components/ScoreBoard";
import { DEFAULT_DECK, EMPTY_BOARD, getDeckPieces, isValidDeck, SIZE } from "./constants/gameData";
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
} from "./features/augments";
import { GHOST_AUGMENT_INTERVAL, resolveGhostClears } from "./features/ghosts";
import { getSavedItemState, ItemSlots, useItemSystem } from "./features/items";
import { applyBombClear } from "./features/bombBlocks";
import { applyLineClear } from "./features/lineBlocks";
import { createRandomSpecialTemplate, isValidSpecialPiece } from "./features/specials";
import useBestScore from "./hooks/useBestScore";
import { useComboEffect } from "./hooks/useComboEffect";
import { usePieceSelection } from "./hooks/usePieceSelection";
import { applySpreadClear, clearLines, cloneBoard, isBoardEmpty } from "./utils/boardUtils";
import { createPieceInstance } from "./utils/pieceUtils";
import {
  canPlace,
  getClosestPlacement,
  getPlacementDistanceSquared,
  getSpreadFillCells,
  hasMove,
  placePiece
} from "./utils/placement";
import { nextTray } from "./utils/tray";
import type {
  AugmentId,
  AugmentState,
  Board as BoardType,
  PieceInstance,
  PieceTemplate,
  SavedGame,
  Tray
} from "./types";

const MAX_SNAP_DISTANCE = 1;
const CLEAR_HIGHLIGHT_MS = 260;
const SAVED_GAME_KEY = "block-blast-current-game";
const START_PREVIEW_CELLS: string[] = [
  "piece-cyan", "piece-lime", "piece-amber", "", "",
  "piece-rose", "piece-violet", "piece-blue", "piece-teal", "piece-orange", "", "",
  "piece-pink", "piece-green", "piece-indigo", ""
];

function isValidBoard(board: unknown): board is BoardType {
  return (
    Array.isArray(board) &&
    board.length === SIZE &&
    board.every((row) => Array.isArray(row) && row.length === SIZE)
  );
}

function isValidPiece(piece: unknown): piece is PieceInstance {
  return (
    piece !== null &&
    typeof piece === "object" &&
    typeof (piece as PieceInstance).uid === "string" &&
    typeof (piece as PieceInstance).id === "string" &&
    typeof (piece as PieceInstance).color === "string" &&
    Array.isArray((piece as PieceInstance).cells) &&
    (piece as PieceInstance).cells.every(
      (cell) =>
        Array.isArray(cell) &&
        cell.length === 2 &&
        Number.isInteger(cell[0]) &&
        Number.isInteger(cell[1])
    )
  );
}

function isValidTray(tray: unknown): tray is Tray {
  return (
    Array.isArray(tray) &&
    tray.length === 3 &&
    tray.every((piece) => piece === null || isValidPiece(piece))
  );
}

function loadSavedGame(): (ReturnType<typeof getSavedItemState> & {
  augmentState: AugmentState;
  board: BoardType;
  deck: string[];
  ghostCells: string[];
  score: number;
  specialPieces: PieceTemplate[];
  tray: Tray;
}) | null {
  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    const savedGame = raw ? (JSON.parse(raw) as SavedGame) : null;
    if (!savedGame || !isValidBoard(savedGame.board) || !isValidTray(savedGame.tray)) {
      return null;
    }

    return {
      augmentState: getSavedAugmentState(savedGame),
      board: cloneBoard(savedGame.board as BoardType),
      deck: isValidDeck(savedGame.deck) ? savedGame.deck : DEFAULT_DECK,
      ghostCells: Array.isArray(savedGame.ghostCells)
        ? (savedGame.ghostCells as unknown[]).filter((key): key is string => typeof key === "string")
        : [],
      score: Number.isFinite(savedGame.score) ? (savedGame.score as number) : 0,
      specialPieces: Array.isArray(savedGame.specialPieces)
        ? (savedGame.specialPieces as unknown[]).filter(isValidSpecialPiece) as PieceTemplate[]
        : [],
      tray: savedGame.tray as Tray,
      ...getSavedItemState(savedGame, { isValidBoard, isValidTray })
    };
  } catch {
    return null;
  }
}

type GamePhase = "start" | "playing";

function App() {
  const [initialGame] = useState(loadSavedGame);
  const [board, setBoard] = useState<BoardType>(() => initialGame?.board ?? cloneBoard(EMPTY_BOARD));
  const [deck, setDeck] = useState<string[]>(() => initialGame?.deck ?? DEFAULT_DECK);
  const [specialPieces, setSpecialPieces] = useState<PieceTemplate[]>(
    () => initialGame?.specialPieces ?? []
  );
  const [ghostCells, setGhostCells] = useState<Set<string>>(
    () => new Set(initialGame?.ghostCells ?? [])
  );
  const deckPieces = useMemo<PieceTemplate[]>(
    () => [...getDeckPieces(deck), ...specialPieces],
    [deck, specialPieces]
  );
  const [tray, setTray] = useState<Tray>(
    () =>
      initialGame?.tray ??
      nextTray(initialGame?.board ?? EMPTY_BOARD, [
        ...getDeckPieces(initialGame?.deck ?? DEFAULT_DECK),
        ...(initialGame?.specialPieces ?? [])
      ])
  );
  const [clearingCells, setClearingCells] = useState<Set<string>>(() => new Set());
  const [score, setScore] = useState<number>(() => initialGame?.score ?? 0);
  const [augmentState, setAugmentState] = useState<AugmentState>(
    () => initialGame?.augmentState ?? createInitialAugmentState()
  );
  const [augmentChoiceOpen, setAugmentChoiceOpen] = useState(false);
  const [rewardPiece, setRewardPiece] = useState<PieceInstance | null>(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>("start");
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availablePieces = tray.filter((p): p is PieceInstance => p !== null);
  const isClearing = clearingCells.size > 0;
  const isPlaying = gamePhase === "playing";

  const {
    anchorCell,
    boardMetrics,
    boardRef,
    clearSelection,
    closestPlacementCell,
    cursorAnchorOffset,
    cursorPiece,
    cursorPoint,
    handlePieceSelect,
    hoverCell,
    invalidPreview,
    previewCells,
    previewClearingCells,
    selectedPiece,
    setHoverCell
  } = usePieceSelection({ augmentChoiceOpen, availablePieces, board, isPlaying });

  const comboEffectValue = useComboEffect(augmentState.combo);

  const {
    applyReroll,
    cancelReroll,
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

  const gameOver =
    isPlaying &&
    !isClearing &&
    availablePieces.length > 0 &&
    !hasMove(board, availablePieces);

  useEffect(() => {
    if (!isPlaying) return;
    try {
      localStorage.setItem(
        SAVED_GAME_KEY,
        JSON.stringify({
          augmentState,
          board,
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
    } catch {
      // localStorage quota exceeded — continue without saving
    }
  }, [
    augmentState, board, deck, ghostCells, isPlaying,
    itemAwardLevel, itemSlots, specialPieces, score, tray, undoSnapshot
  ]);

  useEffect(() => {
    if (!isPlaying || gameOver || isClearing || augmentChoiceOpen || rewardPiece) return;
    if (!shouldOfferAugmentChoice(augmentState, score)) return;
    clearSelection();
    setAugmentChoiceOpen(true);
  }, [augmentChoiceOpen, augmentState, clearSelection, gameOver, isClearing, isPlaying, rewardPiece, score]);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
  }, []);

  function resetGame() {
    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    const nextBoard = cloneBoard(EMPTY_BOARD);
    setBoard(nextBoard);
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

  function placePieceAt(piece: PieceInstance, row: number, col: number) {
    if (augmentChoiceOpen || isClearing || !canPlace(board, piece, row, col)) return;

    let result = placePiece(board, piece, row, col);
    const newOverlapCells = piece.special === "ghost" ? result.overlappedCells : [];
    let extraCells = 0;

    if (piece.special === "line") {
      result = { ...applyLineClear(result.placedBoard, row, col), placedBoard: result.placedBoard, overlappedCells: [] };
    } else if (piece.special === "bomb") {
      const bombResult = applyBombClear(result.placedBoard, row, col);
      extraCells = bombResult.clearedCells.length;
      result = { ...bombResult, placedBoard: result.placedBoard, overlappedCells: [] };
    } else {
      const spreadCount = rollSpreadFill(augmentState);
      if (spreadCount > 0) {
        const spreadCells = getSpreadFillCells(result.placedBoard, piece, row, col, spreadCount);
        if (spreadCells.length) {
          extraCells = spreadCells.length;
          const spreadBoard = cloneBoard(result.placedBoard);
          spreadCells.forEach(({ row: r, col: c }) => { spreadBoard[r][c] = piece.color; });
          result = { ...clearLines(spreadBoard), placedBoard: spreadBoard, overlappedCells: [] };
        }
      }
    }

    result = { ...applySpreadClear(result, rollSpreadClear(augmentState)), placedBoard: result.placedBoard, overlappedCells: result.overlappedCells };

    const nextClearingCells = new Set(result.clearedCells);
    const scoreGain = getAugmentedScore({
      augmentState, cleared: result.cleared, piece,
      allClear: isBoardEmpty(result.board), extraCells
    });
    const ghostResult = resolveGhostClears(ghostCells, newOverlapCells, nextClearingCells);

    setBoard(nextClearingCells.size ? result.placedBoard : result.board);
    setClearingCells(nextClearingCells);
    setScore((current) => current + scoreGain.total + ghostResult.bonus);
    setGhostCells(ghostResult.ghostCells);

    const updatedTray = tray.map((p) => (p?.uid === piece.uid ? null : p)) as Tray;
    const trayCompleted = updatedTray.every((p) => !p);
    const refreshedTray = trayCompleted ? nextTray(result.board, deckPieces) : updatedTray;
    saveUndoSnapshot();
    setAugmentState((current) => getNextAugmentStateAfterPlacement(current, { cleared: result.cleared, trayCompleted }));
    setTray(refreshedTray);
    clearSelection();

    if (nextClearingCells.size) {
      if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(result.board);
        setClearingCells(new Set());
      }, CLEAR_HIGHLIGHT_MS);
    }
  }

  function handleCellClick(row: number, col: number) {
    if (augmentChoiceOpen || !selectedPiece) return;
    const targetCell = anchorCell
      ? { row: row - anchorCell[0], col: col - anchorCell[1] }
      : { row, col };
    const closest = getClosestPlacement(board, selectedPiece, targetCell);
    if (!closest) return;
    if (getPlacementDistanceSquared(targetCell, closest) > MAX_SNAP_DISTANCE ** 2) return;
    placePieceAt(selectedPiece, closest.row, closest.col);
  }

  function handleAugmentChoose(augmentId: AugmentId) {
    const choicesMade = getTotalAugmentLevels(augmentState) + 1;
    if (choicesMade % GHOST_AUGMENT_INTERVAL === 0) {
      const special = createRandomSpecialTemplate();
      setSpecialPieces((current) => [...current, special]);
      setRewardPiece(createPieceInstance(special));
    }
    setAugmentState((current) => chooseAugment(current, augmentId, score));
    setAugmentChoiceOpen(false);
  }

  const best = useBestScore(score);

  if (gamePhase === "start") {
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
    <main className={`app-shell ${selectedPiece ? "has-cursor-piece" : ""}`}>
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
        <div
          className="game-settings-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={() => setSettingsOpen(false)}
        >
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
            <div className="board-combo-stage">
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
              {comboEffectValue !== null && (
                <div className="combo-burst" aria-live="polite">
                  combo {comboEffectValue}
                </div>
              )}
            </div>
            <PieceTray
              disabled={augmentChoiceOpen || gameOver || isClearing}
              onEmptySlotClick={clearSelection}
              onPieceSelect={handlePieceSelect}
              selectedId={selectedPiece?.uid ?? null}
              tray={tray}
            />
          </div>
          <ItemSlots
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
      {deckModalOpen && (
        <DeckModal deckPieces={deckPieces as PieceInstance[]} onClose={() => setDeckModalOpen(false)} />
      )}
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
      {gameOver && (
        <GameOver
          best={best}
          onGoHome={() => setGamePhase("start")}
          onRestart={startGame}
          score={score}
        />
      )}
    </main>
  );
}

export default App;
