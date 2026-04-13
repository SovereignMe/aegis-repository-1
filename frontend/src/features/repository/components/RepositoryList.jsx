export function RepositoryList({ documents, selectedId, onSelect }) {
  if (!documents.length) {
    return <div className="empty-state-card"><div className="empty-state-title">No repository documents found</div><div className="empty-state-copy">Adjust filters or intake a new record to populate this repository node.</div></div>;
  }

  return documents.map((doc) => (
    <button key={doc.id} className={`repo-card repo-card-button premium-list-card ${selectedId === doc.id ? "repo-card-active" : ""}`} onClick={() => onSelect(doc.id)}>
      <div className="repo-card-top"><div><div className="repo-title">{doc.title}</div><div className="repo-id">{doc.displayId} • {doc.exhibitCode}</div></div><div className="tag-row"><span className="tag tag-status">{doc.status.toUpperCase()}</span></div></div>
      <div className="info-card-text">{doc.summary}</div>
      <div className="micro-divider" />
      <div className="meta-inline"><span>{doc.docType?.toUpperCase()}</span><span>{doc.jurisdiction}</span><span>{doc.fileName ? "FILE ATTACHED" : "METADATA ONLY"}</span></div>
    </button>
  ));
}
