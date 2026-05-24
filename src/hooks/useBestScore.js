import { useEffect, useState } from "react";

function useBestScore(score) {
  const [best, setBest] = useState(() => Number(localStorage.getItem("block-blast-best") || 0));

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("block-blast-best", String(score));
    }
  }, [best, score]);

  return best;
}

export default useBestScore;
