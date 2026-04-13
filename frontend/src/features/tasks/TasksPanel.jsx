
import { useMemo, useState } from "react";
import { taskService } from "../../services/taskService";

export function TasksPanel({ rules = [], deadlineRules = [], tasks, onCreate, onComplete, canCreate, canComplete }) {
  const effectiveRules = rules.length ? rules : deadlineRules;
  const [title, setTitle] = useState("");
  const [triggerDate, setTriggerDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedRuleCode, setSelectedRuleCode] = useState("D15");
  const [customDayValue, setCustomDayValue] = useState(15);

  const selectedRule = useMemo(() => effectiveRules.find((rule) => rule.code === selectedRuleCode) || null, [effectiveRules, selectedRuleCode]);

  return (
    <section className="single-panel premium-surface">
      <div className="module-header">
        <div>
          <div className="small-label">DEADLINE ENGINE</div>
          <div className="large-title">DEADLINES</div>
          <div className="large-sub">ADMINISTRATIVE DEADLINE ENGINE WITH PRESETS, COUNTDOWN, AND CUSTOM DAY SUPPORT</div>
        </div>
        <div className="module-callout">
          <div className="small-label">OPEN TASKS</div>
          <div className="callout-title">{tasks.filter((task) => task.status !== "completed").length}</div>
          <div className="callout-copy">Deadline records here can be created directly or originated through Intake correspondence and notices.</div>
        </div>
        {!canCreate ? <div className="muted-inline">Current role cannot originate deadline records.</div> : null}
      </div>

      <div className="module-form-shell">
        <div className="intake-grid premium-form-grid">
          <input className="form-input" placeholder="TASK TITLE" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="form-input" type="date" value={triggerDate} onChange={(e) => setTriggerDate(e.target.value)} />
          <select className="form-select" value={selectedRuleCode} onChange={(e) => setSelectedRuleCode(e.target.value)}>
            {effectiveRules.map((rule) => <option key={rule.code} value={rule.code}>{rule.name}</option>)}
          </select>
          <input className="form-input" type="number" min="1" placeholder="CUSTOM DAYS" value={customDayValue} onChange={(e) => setCustomDayValue(Number(e.target.value || 0))} />
        </div>
        <div className="action-cluster">
          <button className="btn btn-primary" disabled={!canCreate} onClick={() => { onCreate({ title, triggerDate, rule: selectedRuleCode === "CUSTOM" ? { code: "CUSTOM", defaultDays: null } : selectedRule, customDayValue: selectedRuleCode === "CUSTOM" ? customDayValue : null }); setTitle(""); }}>
            ADD DEADLINE
          </button>
        </div>
      </div>

      <div className="stack card-stack-space">
        {tasks.map((task) => {
          const countdown = taskService.computeCountdown(task);
          return (
            <div key={task.id} className="repo-card premium-list-card deadline-card">
              <div className="repo-card-top">
                <div>
                  <div className="repo-title">{task.title}</div>
                  <div className="repo-id">TRIGGER {task.triggerDate} • DUE {task.dueDate} • RULE {task.ruleCode || "N/A"}</div>
                </div>
                <div className="tag-row">
                  <span className="tag tag-countdown">{countdown} DAYS</span>
                  <span className="tag tag-status">{task.status.toUpperCase()}</span>
                  {task.status !== "completed" ? <button className="btn btn-secondary btn-inline-compact" disabled={!canComplete} onClick={() => onComplete(task.id)} title={!canComplete ? "Current role cannot complete tasks." : "Complete task"}>COMPLETE</button> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
