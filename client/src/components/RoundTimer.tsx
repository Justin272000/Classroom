import { useEffect, useState } from "react";

interface Props {
  deadline: number;
}

function secondsLeft(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export default function RoundTimer({ deadline }: Props) {
  const [seconds, setSeconds] = useState(() => secondsLeft(deadline));

  useEffect(() => {
    setSeconds(secondsLeft(deadline));
    const interval = setInterval(() => setSeconds(secondsLeft(deadline)), 200);
    return () => clearInterval(interval);
  }, [deadline]);

  return <div className={`round-timer${seconds <= 3 ? " urgent" : ""}`}>{seconds}</div>;
}
