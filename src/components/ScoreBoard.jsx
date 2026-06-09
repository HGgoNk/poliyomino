import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";

function ScoreBoard({ best, score }) {
  const [displayedScore, setDisplayedScore] = useState(score);
  const [isCounting, setIsCounting] = useState(false);
  const displayedScoreRef = useRef(score);

  useEffect(() => {
    displayedScoreRef.current = displayedScore;
  }, [displayedScore]);

  useEffect(() => {
    let timerId;
    let currentScore = displayedScoreRef.current;

    if (score <= currentScore) {
      displayedScoreRef.current = score;
      setDisplayedScore(score);
      setIsCounting(false);
      return undefined;
    }

    setIsCounting(true);
    timerId = window.setInterval(() => {
      currentScore += 1;
      displayedScoreRef.current = currentScore;
      setDisplayedScore(currentScore);

      if (currentScore >= score) {
        window.clearInterval(timerId);
        setIsCounting(false);
      }
    }, 50);

    return () => window.clearInterval(timerId);
  }, [score]);

  return (
    <>
      <div className="best-score-badge" aria-label="Best score">
        <Trophy size={16} aria-hidden="true" />
        <span>Best</span>
        <strong>{best}</strong>
      </div>
      <div className="score-row" aria-label="Current score">
        <div className="score-box">
          <strong className={isCounting ? "is-counting" : ""}>{displayedScore}</strong>
        </div>
      </div>
    </>
  );
}

export default ScoreBoard;
