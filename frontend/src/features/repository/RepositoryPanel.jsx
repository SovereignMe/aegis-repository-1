import { useRepositoryState } from "./hooks/useRepositoryState";
import { RepositoryToolbar } from "./components/RepositoryToolbar";
import { RepositoryList } from "./components/RepositoryList";
import { RepositoryDetails } from "./components/RepositoryDetails";

export function RepositoryPanel({ settings, documents, onArchive, canArchive }) {
  const repository = useRepositoryState({ settings, documents });

  return (
    <section className="single-panel premium-surface">
      <RepositoryToolbar
        query={repository.query}
        onQueryChange={repository.setQuery}
        statusFilter={repository.statusFilter}
        onStatusFilterChange={repository.setStatusFilter}
        filteredCount={repository.filtered.length}
        activeCount={documents.filter((doc) => doc.status === "active").length}
      />
      <div className="repository-layout premium-grid-gap">
        <div className="stack">
          <RepositoryList documents={repository.filtered} selectedId={repository.selected?.id} onSelect={repository.setSelectedId} />
        </div>
        <div className="detail-panel premium-detail-panel">
          <RepositoryDetails
            selected={repository.selected}
            verification={repository.verification}
            verificationReport={repository.verificationReport}
            verificationError={repository.verificationError}
            verificationReportError={repository.verificationReportError}
            hintPack={repository.hintPack}
            canArchive={canArchive}
            onArchive={onArchive}
          />
        </div>
      </div>
    </section>
  );
}
