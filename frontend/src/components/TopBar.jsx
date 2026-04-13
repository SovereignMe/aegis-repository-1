import { useEffect, useState } from "react";

export function TopBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeText = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateText = now.toLocaleDateString([], {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="topbar-panel premium-surface fade-in delay-2">      <div className="topbar-item topbar-item-compact clock-block topbar-clock-right topbar-clock-full">
        <div className="clock-time">{timeText}</div>
        <div className="clock-date">{dateText}</div>
      </div>
    </section>
  );
}
