import { useEffect, useState } from "react";
import AegisIcon from '../../assets/aegis/aegis-logo1.webp';

function SealMark() {
  return <div className="hero-seal-wrap fade-in delay-1"><img className="seal hero-seal aegis-mark" src={AegisIcon} alt="AEGIS mark" width={176} height={176} /></div>;
}

function HeroClock() {
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
    <div className="topbar-panel hero-clock-card fade-in delay-3">
      <div className="topbar-item clock-block topbar-clock-right topbar-clock-compact">
        <div className="clock-time">{timeText}</div>
        <div className="clock-date">{dateText}</div>
      </div>
    </div>
  );
}

function HeroPill({ children, tone = "default" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function AppHero({ currentUser, nextDueTask, settings, storageMeta, auditVerification, role, documents, tasks, onLogout }) {
  return (
    <section className="hero premium-surface fade-in delay-1">
      <div className="hero-meta-bar fade-in delay-2">
        <div className="system-core-tag">{nextDueTask ? `NEXT DUE • ${nextDueTask.dueDate}` : "NO OPEN DEADLINES"}</div>
        <div className="system-core-tag system-core-tag-live">SIGNED IN • {currentUser?.email}</div>
      </div>
      <div className="hero-brand-row">
        <SealMark />
        <div className="hero-copy">
          <div className="hero-line-1 fade-in delay-2">AEGIS Governance</div>
          <h1 className="hero-line-2 fade-in delay-3"><span>GOVERNANCE.</span><span>VERIFICATION. CONTROL.</span></h1>
          <div className="hero-line-3 fade-in delay-4">A fiduciary governance platform for notices, approvals, packet readiness, verification, and administrative record control.</div>
          <div className="badge-row fade-in delay-5">
            <HeroPill tone="blue">APP MODE • {settings?.values?.app?.mode?.toUpperCase?.() || settings?.app?.mode?.toUpperCase?.()}</HeroPill>
            <HeroPill tone="gold">STORAGE • {storageMeta?.mode?.toUpperCase()}</HeroPill>
            <HeroPill tone="green">AUDIT • {auditVerification?.valid ? "VERIFIED" : "CHECK REQUIRED"}</HeroPill>
            <HeroPill>ROLE • {role}</HeroPill>
            <HeroPill>DOCS • {documents.length}</HeroPill>
            <HeroPill>TASKS • {tasks.length}</HeroPill>
          </div>
        </div>
        <div className="hero-side-stack">
          <HeroClock />
        </div>
      </div>
      <div className="hero-actions-row fade-in delay-5">
        <button className="btn btn-secondary signout-btn hero-exit-pill" onClick={() => onLogout?.()}>EXIT AEGIS</button>
      </div>
    </section>
  );
}
