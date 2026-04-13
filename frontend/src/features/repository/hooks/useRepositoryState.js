import { useEffect, useMemo, useState } from "react";
import { documentService } from "../../../services/documentService";
import { getJurisdictionHintPack } from "../../../utils/jurisdictionHints";

export function useRepositoryState({ settings, documents }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(documents[0]?.id || null);
  const [verification, setVerification] = useState(null);
  const [verificationReport, setVerificationReport] = useState(null);
  const [verificationError, setVerificationError] = useState("");
  const [verificationReportError, setVerificationReportError] = useState("");

  const filtered = useMemo(() => documents.filter((doc) => {
    const haystack = [doc.title, doc.displayId, doc.summary, doc.notes, ...(doc.tags || [])].join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [documents, query, statusFilter]);

  const selected = filtered.find((doc) => doc.id === selectedId) || filtered[0] || null;
  const hintPack = useMemo(
    () => getJurisdictionHintPack(selected?.jurisdiction || settings?.trust?.jurisdiction, settings?.trust?.trustName),
    [selected, settings],
  );

  useEffect(() => {
    if (!selected?.id) {
      setVerification(null);
      setVerificationReport(null);
      return;
    }
    let cancelled = false;
    setVerificationError("");
    setVerificationReportError("");
    documentService.getVerification(selected.id)
      .then((payload) => {
        if (!cancelled) setVerification(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setVerification(null);
          setVerificationError(error.message || "Verification unavailable.");
        }
      });
    documentService.getVerificationReport(selected.id)
      .then((payload) => {
        if (!cancelled) setVerificationReport(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setVerificationReport(null);
          setVerificationReportError(error.message || "Verification report unavailable.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  return {
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    selectedId,
    setSelectedId,
    filtered,
    selected,
    verification,
    verificationReport,
    verificationError,
    verificationReportError,
    hintPack,
  };
}
