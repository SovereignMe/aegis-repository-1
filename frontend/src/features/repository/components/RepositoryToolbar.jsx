export function RepositoryToolbar({ query, onQueryChange, statusFilter, onStatusFilterChange, filteredCount, activeCount }) {
  return (
    <div className="module-shell">
      <div className="module-header">
        <div>
          <div className="small-label">RECORD SYSTEM</div>
          <div className="large-title">REPOSITORY</div>
          <div className="large-sub">Searchable governed records with durable file attachments, checksum metadata, and archive controls.</div>
        </div>
        <div className="module-stat-rail">
          <div className="module-stat"><span className="module-stat-label">VISIBLE</span><span className="module-stat-value">{filteredCount}</span></div>
          <div className="module-stat"><span className="module-stat-label">ACTIVE</span><span className="module-stat-value">{activeCount}</span></div>
        </div>
      </div>
      <div className="module-toolbar">
        <input className="form-input module-search" placeholder="SEARCH DOCUMENTS" value={query} onChange={(e) => onQueryChange(e.target.value)} />
        <select className="form-select module-filter" value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
          <option value="all">ALL STATUS</option>
          <option value="active">ACTIVE</option>
          <option value="recorded">RECORDED</option>
          <option value="pending">PENDING</option>
          <option value="archived">ARCHIVED</option>
        </select>
      </div>
    </div>
  );
}
