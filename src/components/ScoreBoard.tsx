import { useEffect, useRef, useState } from "react";
import "../styles/ScoreBoard.css";
import { Trophy } from "lucide-react";

interface ScoreBoardProps {
  best: number;
  score: number;
}

function ScoreBoard({ best, score }: ScoreBoardProps) {
  const [displayedScore, setDisplayedScore] = useState<number>(score);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const displayedScoreRef = useRef<number>(score);

  useEffect(() => {
    displayedScoreRef.current = displayedScore;
  }, [displayedScore]);

  useEffect(() => {
    let timerId: ReturnType<typeof window.setInterval> | undefined;
    let currentScore = displayedScoreRef.current;

    if (score <= currentScore) {
      displayedScoreRef.current = score;
      setDisplayedScore(score);
      setIsCounting(false);
      return undefined;
    }

    setIsCounting(true);
    // Scale the increment so large score jumps finish in roughly the same time
    // (~30 ticks) instead of crawling up one point at a time.
    const step = Math.max(1, Math.ceil((score - currentScore) / 30));
    timerId = window.setInterval(() => {
      currentScore = Math.min(score, currentScore + step);
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
        <Trophy size={20} aria-hidden="true" />
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
