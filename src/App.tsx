import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/App.css";
import "./styles/StartScreen.css";
import "./styles/AutoUndoFlash.css";
import { Home, Layers, Play, RotateCcw, Settings, Undo2 } from "lucide-react";
import BlockRewardModal from "./components/BlockRewardModal";
import Board from "./components/Board";
import DeckModal from "./components/DeckModal";
import GameOver from "./components/GameOver";
import PieceShape from "./components/PieceShape";
import PieceTray from "./components/PieceTray";
import RerollModal from "./components/RerollModal";
import ScoreBoard from "./components/ScoreBoard";
import { AugmentChoiceModal } from "./components/AugmentChoiceModal";
import { AugmentPanel } from "./components/AugmentPanel";
import { CLEAR_HIGHLIGHT_MS, MAX_SNAP_DISTANCE, SAVED_GAME_KEY } from "./constants/config";
import { DEFAULT_DECK, EMPTY_BOARD, getDeckPieces, isValidDeck, SIZE } from "./constants/gameData";
import {
  advanceAugmentSchedule,
  chooseAugment,
  createInitialAugmentState,
  getAugmentLevel,
  getNextAugmentStateAfterPlacement,
  getSavedAugmentState,
  getTotalAugmentLevels,
  shouldOfferAugmentChoice
} from "./features/augments";
import { ItemSlots } from "./components/ItemSlots";
import { CLEAR_TIER_LABEL, getClearTier } from "./features/clearFeedback";
import { GHOST_AUGMENT_INTERVAL } from "./features/ghosts";
import { getSavedItemState, useItemSystem } from "./features/items";
import { resolvePlacement } from "./features/resolvePlacement";
import { createSpecialChoices, isValidSpecialPiece } from "./features/specials";
import SpecialChoiceModal from "./components/SpecialChoiceModal";
import useBestScore from "./hooks/useBestScore";
import { useComboEffect } from "./hooks/useComboEffect";
import { useGameAudio } from "./hooks/useGameAudio";
import { usePieceSelection } from "./hooks/usePieceSelection";
import { usePulseLabel } from "./hooks/usePulseLabel";
import { cloneBoard } from "./utils/boardUtils";
import { createPieceInstance } from "./utils/pieceUtils";
import { canPlace, getClosestPlacement, getPlacementDistanceSquared, hasMove } from "./utils/placement";
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

const SPECIAL_CHOICE_COUNT = 3;
const START_PREVIEW_CELLS: string[] = [
  "piece-cyan", "piece-lime", "piece-amber", "", "",
  "piece-rose", "piece-violet", "piece-blue", "piece-teal", "piece-orange", "", "",
  "piece-pink", "piece-green", "piece-indigo", ""
];

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
}

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
  bombCells: string[];
  boostCells: string[];
  deck: string[];
  ghostCells: string[];
  goldenCells: string[];
  score: number;
  specialPieces: PieceTemplate[];
  specialsGranted: number;
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
      bombCells: toStringArray(savedGame.bombCells),
      boostCells: toStringArray(savedGame.boostCells),
      deck: isValidDeck(savedGame.deck) ? savedGame.deck : DEFAULT_DECK,
      ghostCells: toStringArray(savedGame.ghostCells),
      goldenCells: toStringArray(savedGame.goldenCells),
      score: Number.isFinite(savedGame.score) ? (savedGame.score as number) : 0,
      specialPieces: Array.isArray(savedGame.specialPieces)
        ? (savedGame.specialPieces as unknown[]).filter(isValidSpecialPiece) as PieceTemplate[]
        : [],
      specialsGranted: Number.isFinite(savedGame.specialsGranted)
        ? Math.max(0, savedGame.specialsGranted as number)
        : 0,
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
  // The deck is fixed for the lifetime of a game (the deck modal is view-only), so there
  // is no setter — it is seeded once from the saved game or the default deck.
  const [deck] = useState<string[]>(() => initialGame?.deck ?? DEFAULT_DECK);
  const [specialPieces, setSpecialPieces] = useState<PieceTemplate[]>(
    () => initialGame?.specialPieces ?? []
  );
  const [ghostCells, setGhostCells] = useState<Set<string>>(
    () => new Set(initialGame?.ghostCells ?? [])
  );
  const [goldenCells, setGoldenCells] = useState<Set<string>>(
    () => new Set(initialGame?.goldenCells ?? [])
  );
  const [bombCells, setBombCells] = useState<Set<string>>(
    () => new Set(initialGame?.bombCells ?? [])
  );
  const [boostCells, setBoostCells] = useState<Set<string>>(
    () => new Set(initialGame?.boostCells ?? [])
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
  const [specialChoices, setSpecialChoices] = useState<PieceTemplate[] | null>(null);
  // How many special-block choices have been granted so far (drives the augment/special cadence).
  const [specialsGranted, setSpecialsGranted] = useState<number>(() => initialGame?.specialsGranted ?? 0);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>("start");
  const [autoUndoFlash, setAutoUndoFlash] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useGameAudio();

  function playPop() {
    audio.resume();
    audio.playPop();
  }

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
  const { label: clearLabel, pulseId: clearLabelId, pulse: pulseClearLabel } = usePulseLabel();

  // Points the player would gain by placing the selected piece at the previewed spot.
  const previewGain = useMemo<number | null>(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return null;
    return resolvePlacement({
      augmentState, board, bombCells, boostCells,
      col: closestPlacementCell.col, ghostCells, goldenCells,
      piece: selectedPiece, row: closestPlacementCell.row, preview: true
    }).scoreGain;
  }, [augmentState, board, bombCells, boostCells, closestPlacementCell, ghostCells, goldenCells, invalidPreview, selectedPiece]);

  const {
    applyReroll,
    autoUndo,
    canUndo,
    cancelReroll,
    gravityAnimating,
    handleItemClick,
    itemSlots,
    rerollModalSlot,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  } = useItemSystem({
    augmentState,
    board,
    bombCells,
    boostCells,
    clearHighlightMs: CLEAR_HIGHLIGHT_MS,
    clearSelection,
    clearTimerRef,
    deckPieces,
    ghostCells,
    goldenCells,
    initialGame,
    isClearing,
    score,
    setAugmentState,
    setBoard,
    setBombCells,
    setBoostCells,
    setClearingCells,
    setGhostCells,
    setGoldenCells,
    setScore,
    setTray,
    tray
  });

  const noMovesLeft =
    isPlaying &&
    !isClearing &&
    !gravityAnimating &&
    availablePieces.length > 0 &&
    !hasMove(board, availablePieces);
  // When the player is stuck but holds an undo item, spend it automatically (below) instead
  // of ending the game — so true game over is only when there is no rescue available.
  const gameOver = noMovesLeft && !canUndo;

  // Auto-spend a held undo item the moment the board has no legal moves left, and flash a
  // notice so the player sees the rescue happen.
  useEffect(() => {
    if (!noMovesLeft || !canUndo) return;
    if (!autoUndo()) return;
    setAutoUndoFlash(true);
    if (autoUndoTimerRef.current !== null) clearTimeout(autoUndoTimerRef.current);
    autoUndoTimerRef.current = setTimeout(() => setAutoUndoFlash(false), 1500);
    // autoUndo/canUndo reflect the latest render; rerun whenever the stuck state flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noMovesLeft, canUndo]);

  useEffect(() => {
    if (!isPlaying) return;
    try {
      localStorage.setItem(
        SAVED_GAME_KEY,
        JSON.stringify({
          augmentState,
          board,
          bombCells: [...bombCells],
          boostCells: [...boostCells],
          deck,
          ghostCells: [...ghostCells],
          goldenCells: [...goldenCells],
          itemSlots,
          score,
          specialPieces,
          specialsGranted,
          tray,
          undoSnapshot
        })
      );
    } catch {
      // localStorage quota exceeded — continue without saving
    }
  }, [
    augmentState, board, bombCells, boostCells, deck, ghostCells, goldenCells, isPlaying,
    itemSlots, specialPieces, specialsGranted, score, tray, undoSnapshot
  ]);

  useEffect(() => {
    if (gameOver) audio.playGameOver();
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (augmentChoiceOpen) audio.playPopup();
  }, [augmentChoiceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rewardPiece) audio.playPopup();
  }, [rewardPiece]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (specialChoices) audio.playPopup();
  }, [specialChoices]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isPlaying || gameOver || isClearing || augmentChoiceOpen || rewardPiece || specialChoices) return;
    if (!shouldOfferAugmentChoice(augmentState, score)) return;
    clearSelection();
    const specialDue =
      Math.floor(getTotalAugmentLevels(augmentState) / GHOST_AUGMENT_INTERVAL) > specialsGranted;
    const timer = setTimeout(() => {
      if (specialDue) {
        setSpecialChoices(createSpecialChoices(SPECIAL_CHOICE_COUNT));
      } else {
        setAugmentChoiceOpen(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [augmentChoiceOpen, augmentState, clearSelection, gameOver, isClearing, isPlaying, rewardPiece, score, specialChoices, specialsGranted]);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    if (autoUndoTimerRef.current !== null) clearTimeout(autoUndoTimerRef.current);
  }, []);

  function resetGame() {
    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    if (autoUndoTimerRef.current !== null) clearTimeout(autoUndoTimerRef.current);
    setAutoUndoFlash(false);
    const nextBoard = cloneBoard(EMPTY_BOARD);
    setBoard(nextBoard);
    setSpecialPieces([]);
    setGhostCells(new Set());
    setGoldenCells(new Set());
    setBombCells(new Set());
    setBoostCells(new Set());
    setTray(nextTray(nextBoard, getDeckPieces(deck)));
    clearSelection();
    setClearingCells(new Set());
    setScore(0);
    setAugmentState(createInitialAugmentState());
    setAugmentChoiceOpen(false);
    setRewardPiece(null);
    setSpecialChoices(null);
    setSpecialsGranted(0);
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
    if (augmentChoiceOpen || isClearing || gravityAnimating || !canPlace(board, piece, row, col)) return;

    audio.resume();
    audio.playPlacement();

    const outcome = resolvePlacement({ augmentState, board, bombCells, boostCells, col, ghostCells, goldenCells, piece, row });
    audio.playClearFeedback(outcome.cleared);
    const clearTier = getClearTier(outcome.cleared);
    if (clearTier) pulseClearLabel(CLEAR_TIER_LABEL[clearTier]);

    setBoard(outcome.displayBoard);
    setClearingCells(outcome.clearingCells);
    setScore((current) => current + outcome.scoreGain);
    setGhostCells(outcome.ghostCells);
    setGoldenCells(outcome.goldenCells);
    setBombCells(outcome.bombCells);
    setBoostCells(outcome.boostCells);

    const updatedTray = tray.map((p) => (p?.uid === piece.uid ? null : p)) as Tray;
    const trayCompleted = updatedTray.every((p) => !p);
    const trayClearedLine = augmentState.trayClearedLine || outcome.cleared > 0;
    // Keep the combo-sound escalation in step with the scoring combo: it only resets
    // when a tray is emptied without having cleared a single line.
    if (trayCompleted && !trayClearedLine) audio.resetComboSound();
    const refreshedTray = trayCompleted ? nextTray(outcome.settledBoard, deckPieces) : updatedTray;
    saveUndoSnapshot();
    setAugmentState((current) => getNextAugmentStateAfterPlacement(current, { cleared: outcome.cleared, trayCompleted }));
    setTray(refreshedTray);
    clearSelection();

    if (outcome.clearingCells.size) {
      if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(outcome.settledBoard);
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
    setAugmentState((current) => chooseAugment(current, augmentId, score));
    setAugmentChoiceOpen(false);
  }

  function handleSpecialChoose(template: PieceTemplate) {
    setSpecialPieces((current) => [...current, template]);
    setRewardPiece(createPieceInstance(template));
    setSpecialChoices(null);
    setSpecialsGranted((count) => count + 1);
    // A special pick uses up this choice slot, so advance the next-augment target.
    setAugmentState((current) => advanceAugmentSchedule(current, score));
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
              <button className="primary-action" onClick={() => { playPop(); continueGame(); }} type="button">
                <Play size={20} aria-hidden="true" />
                이어하기
              </button>
            )}
            <button
              className={canContinue ? "secondary-action" : "primary-action"}
              onClick={() => { playPop(); startGame(); }}
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
          onClick={() => { playPop(); setSettingsOpen((open) => !open); }}
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
        <ScoreBoard best={best} score={score} previewGain={previewGain} />
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
              {clearLabel && (
                <div key={clearLabelId} className="clear-burst" aria-live="polite">
                  {clearLabel}
                </div>
              )}
            </div>
            <PieceTray
              disabled={augmentChoiceOpen || gameOver || isClearing || gravityAnimating}
              onEmptySlotClick={clearSelection}
              onPieceSelect={handlePieceSelect}
              selectedId={selectedPiece?.uid ?? null}
              tray={tray}
            />
          </div>
          <ItemSlots
            isClearing={isClearing || gravityAnimating}
            itemSlots={itemSlots}
            onItemClick={handleItemClick}
            undoSnapshot={undoSnapshot}
          />
          <button
            aria-label="현재 덱 보기"
            className="deck-view-button"
            onClick={() => { playPop(); setDeckModalOpen(true); }}
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
      {specialChoices && (
        <SpecialChoiceModal choices={specialChoices} onChoose={handleSpecialChoose} />
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
      {autoUndoFlash && (
        <div className="auto-undo-flash" role="status" aria-live="assertive">
          <div className="auto-undo-flash-card">
            <Undo2 className="auto-undo-flash-icon" size={64} aria-hidden="true" />
            <span className="auto-undo-flash-text">되돌리기 자동 사용!</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
