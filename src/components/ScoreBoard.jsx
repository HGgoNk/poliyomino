import { Trophy } from "lucide-react";

function ScoreBoard({ best, score }) {
  return (
    <div className="score-row" aria-label="점수판">
      <div className="score-box">
        <span>Score</span>
        <strong>{score}</strong>
      </div>
      <div className="score-box best">
        <span><Trophy size={16} /> Best</span>
        <strong>{best}</strong>
      </div>
    </div>
  );
}

export default ScoreBoard;
