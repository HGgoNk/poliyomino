import { useState } from "react";
import { SIZE } from "../constants/gameData.js";
import { pieceBounds } from "../utils/pieceUtils.js";

function usePieceDrag({ boardRef, gameOver, onDropPiece, onSelectPiece }) {
  const [hoverCell, setHoverCell] = useState(null);
  const [dragState, setDragState] = useState(null);

  function getBoardPieceMetrics() {
    const boardElement = boardRef.current;
    const firstCell = boardElement?.querySelector(".board-cell");
    const secondCell = boardElement?.querySelectorAll(".board-cell")[1];
    if (!firstCell) return { cellSize: 26, cellGap: 2 };

    const firstRect = firstCell.getBoundingClientRect();
    const secondRect = secondCell?.getBoundingClientRect();
    const cellGap = secondRect ? Math.max(0, secondRect.left - firstRect.right) : 2;

    return {
      cellSize: firstRect.width,
      cellGap
    };
  }

  function getBoardCellFromPoint(clientX, clientY, piece = null, metrics = null) {
    const boardElement = boardRef.current;
    if (!boardElement) return null;

    const firstCell = boardElement.querySelector(".board-cell");
    if (!firstCell) return null;

    const activeMetrics = metrics || getBoardPieceMetrics();
    const firstRect = firstCell.getBoundingClientRect();
    const bounds = piece ? pieceBounds(piece) : { rows: 1, cols: 1 };
    const ghostWidth = bounds.cols * activeMetrics.cellSize + Math.max(0, bounds.cols - 1) * activeMetrics.cellGap;
    const ghostHeight = bounds.rows * activeMetrics.cellSize + Math.max(0, bounds.rows - 1) * activeMetrics.cellGap;
    const targetX = piece ? clientX - ghostWidth / 2 : clientX;
    const targetY = piece ? clientY - ghostHeight / 2 : clientY;
    const step = activeMetrics.cellSize + activeMetrics.cellGap;
    const col = Math.round((targetX - firstRect.left) / step);
    const row = Math.round((targetY - firstRect.top) / step);

    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    return { row, col };
  }

  function clearDrag() {
    setDragState(null);
    setHoverCell(null);
  }

  function startDrag(piece, event) {
    if (gameOver) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const metrics = getBoardPieceMetrics();
    const nextDragState = { piece, pointerId: event.pointerId, x: event.clientX, y: event.clientY, ...metrics };
    onSelectPiece(piece.uid);
    setDragState(nextDragState);
    setHoverCell(getBoardCellFromPoint(event.clientX, event.clientY, piece, nextDragState));
  }

  function continueDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    setDragState((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
    setHoverCell(getBoardCellFromPoint(event.clientX, event.clientY, dragState.piece, dragState));
  }

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const dropCell = getBoardCellFromPoint(event.clientX, event.clientY, dragState.piece, dragState);
    if (dropCell) {
      onDropPiece(dragState.piece, dropCell.row, dropCell.col);
      return;
    }

    clearDrag();
  }

  return {
    clearDrag,
    continueDrag,
    dragState,
    endDrag,
    hoverCell,
    setHoverCell,
    startDrag
  };
}

export default usePieceDrag;
