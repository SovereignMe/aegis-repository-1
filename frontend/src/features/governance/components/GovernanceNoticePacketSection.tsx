// @ts-nocheck
import { useEffect, useMemo, useState } from "react";

export function GovernanceNoticePacketSection({ overview, artifacts, documents, canNotice, canPacket, onCreateNotice, onServeNotice, onBuildPacket, outputFocused = false }) {
  const [noticeRecipient, setNoticeRecipient] = useState("");
  const [noticeToServeId, setNoticeToServeId] = useState("");
  const [packetTitle, setPacketTitle] = useState("Administrative Record Packet");
  const [packetType, setPacketType] = useState("administrative-record");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedNoticeIds, setSelectedNoticeIds] = useState<string[]>([]);

  const openNotices = useMemo(() => (artifacts?.notices || []).filter((item) => item.status !== "served"), [artifacts]);

  useEffect(() => {
    if (!noticeToServeId && openNotices.length) {
      setNoticeToServeId(openNotices[0].id);
    }
    if (noticeToServeId && !openNotices.some((item) => item.id === noticeToServeId)) {
      setNoticeToServeId(openNotices[0]?.id || "");
    }
  }, [openNotices, noticeToServeId]);

  useEffect(() => {
    if (!selectedDocumentIds.length && (documents || []).length) {
      setSelectedDocumentIds((documents || []).slice(0, 3).map((item) => item.id));
    }
  }, [documents, selectedDocumentIds.length]);

  useEffect(() => {
    if (!selectedNoticeIds.length && (artifacts?.notices || []).length) {
      setSelectedNoticeIds((artifacts?.notices || []).slice(0, 2).map((item) => item.id));
    }
  }, [artifacts, selectedNoticeIds.length]);

  const toggleSelection = (currentValues, nextValue, setValues) => {
    setValues(currentValues.includes(nextValue) ? currentValues.filter((item) => item !== nextValue) : [...currentValues, nextValue]);
  };

  const handleCreateNotice = () => {
    if (!noticeRecipient.trim()) return;
    onCreateNotice({ recipientName: noticeRecipient, noticeType: "administrative-notice", serviceMethod: "mail" });
    setNoticeRecipient("");
  };

  const handleBuildPacket = () => {
    onBuildPacket({ packetType, title: packetTitle, documentIds: selectedDocumentIds, noticeIds: selectedNoticeIds });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
      <div className="premium-surface" style={{ padding: 16, borderRadius: 18 }}>
        <div className="small-label">NOTICE / SERVICE TRACKING</div>
        <div className="intake-grid premium-form-grid" style={{ marginTop: 12 }}>
          <input className="form-input" value={noticeRecipient} onChange={(e) => setNoticeRecipient(e.target.value)} placeholder="Recipient name" />
          <select className="form-input" value={noticeToServeId} onChange={(e) => setNoticeToServeId(e.target.value)}>
            <option value="">Select open notice</option>
            {openNotices.map((item) => <option key={item.id} value={item.id}>{item.recipientName || item.id}</option>)}
          </select>
        </div>
        <div className="action-cluster" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" disabled={!canNotice || !noticeRecipient.trim()} onClick={handleCreateNotice}>ISSUE NOTICE</button>
          <button className="btn btn-primary" disabled={!canNotice || !noticeToServeId} onClick={() => onServeNotice(noticeToServeId, { trackingNumber: `TRK-${Date.now()}` })}>MARK SELECTED NOTICE SERVED</button>
        </div>
        <div className="muted-inline" style={{ marginTop: 12 }}>Open notices: {overview?.pendingNotices?.length || 0}</div>
      </div>

      <div className="premium-surface" style={{ padding: 16, borderRadius: 18 }}>
        <div className="small-label">ADMINISTRATIVE RECORD / EVIDENCE EXPORT</div>
        <div className="intake-grid premium-form-grid" style={{ marginTop: 12 }}>
          <input className="form-input" value={packetTitle} onChange={(e) => setPacketTitle(e.target.value)} placeholder="Packet title" />
          <select className="form-input" value={packetType} onChange={(e) => setPacketType(e.target.value)}>
            <option value="administrative-record">Administrative Record</option>
            <option value="evidence-package">Evidence Package</option>
          </select>
        </div>
        <div className="governance-selector-grid" style={{ marginTop: 12 }}>
          <div>
            <div className="small-label">Documents in packet</div>
            <div className="governance-multi-select-list">
              {(documents || []).slice(0, 8).map((item) => (
                <label key={item.id} className="governance-checkbox-row">
                  <input type="checkbox" checked={selectedDocumentIds.includes(item.id)} onChange={() => toggleSelection(selectedDocumentIds, item.id, setSelectedDocumentIds)} />
                  <span>{item.displayId || item.id}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="small-label">Notices in packet</div>
            <div className="governance-multi-select-list">
              {(artifacts?.notices || []).slice(0, 8).map((item) => (
                <label key={item.id} className="governance-checkbox-row">
                  <input type="checkbox" checked={selectedNoticeIds.includes(item.id)} onChange={() => toggleSelection(selectedNoticeIds, item.id, setSelectedNoticeIds)} />
                  <span>{item.recipientName || item.id}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="action-cluster" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={!canPacket || !selectedDocumentIds.length} onClick={handleBuildPacket}>GENERATE PACKAGE</button>
        </div>
        <div className="muted-inline" style={{ marginTop: 12 }}>Generated packets: {artifacts?.packets?.length || 0}</div>
        <div className="hint-disclaimer" style={{ marginTop: 10 }}>
          {outputFocused
            ? "Outputs tab emphasizes artifact production while preserving the same live controls and data bindings."
            : "Evidence bundles automatically embed a compliance disclaimer and preserve jurisdiction-aware workflow hints as informational support only."}
        </div>
      </div>
    </div>
  );
}
