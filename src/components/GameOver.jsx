function GameOver({ onReset }) {
  return (
    <div className="game-over">
      <strong>Game Over</strong>
      <button onClick={onReset} type="button">다시 시작</button>
    </div>
  );
}

export default GameOver;
