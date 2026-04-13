import { useEffect, useState } from "react";
import QRCode from "qrcode";
import AegisIcon from '../../assets/aegis/aegis-logo1.webp';

function LoadingGate() {
  return <div className="app-shell"><div className="app-container"><section className="single-panel loading-shell premium-surface"><div className="large-title">CHECKING SESSION…</div></section></div></div>;
}

function LegalModal({ legalModal, onClose }) {
  if (!legalModal) return null;
  return (
    <div className="legal-modal-backdrop" onClick={onClose}>
      <div className="legal-modal premium-surface" onClick={(event) => event.stopPropagation()}>
        <div className="module-header">
          <div>
            <div className="small-label">LEGAL NOTICE</div>
            <div className="large-title">{legalModal === "terms" ? "TERMS OF SERVICE" : "PRIVACY POLICY"}</div>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>CLOSE</button>
        </div>
        {legalModal === "terms" ? (
          <div className="legal-copy">
            <p>Use of this platform is limited to authorized fiduciary administration, repository governance, and workflow support.</p>
            <p>Users must maintain accurate records, protect credentials, and avoid unauthorized alteration, deletion, or misclassification of trust records.</p>
            <p>This application supports administrative process only and does not determine legal sufficiency, jurisdiction, or filing outcome.</p>
          </div>
        ) : (
          <div className="legal-copy">
            <p>The platform stores account, session, repository, and audit data needed to preserve secure trust administration.</p>
            <p>Security telemetry may include login attempts, IP address, browser data, authenticator enrollment events, and audit alerts for suspicious authentication activity.</p>
            <p>Information is used to maintain integrity, investigate misuse, and preserve repository continuity under the governing trust policies.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginScreen({ onLogin, ready }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [legalModal, setLegalModal] = useState(null);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingGate />;

  return (
    <div className="app-shell">
      <div className="app-container">
        <section className="single-panel premium-surface" style={{ maxWidth: 720, margin: "80px auto" }}>
          <div className="module-header">
            <div>
              <div className="small-label">SECURE ACCESS</div>
              <div className="aegis-auth-brand-row"><img src={AegisIcon} alt="AEGIS mark" className="aegis-auth-mark" /></div>
              <div className="large-title">AEGIS Governance</div>
              <div className="large-subhead">Governance. Verification. Control.</div>
              <div className="large-sub">Secure access to governed records, approvals, verification, and packet readiness. New access is issued through administrator-controlled provisioning.</div>
            </div>
          </div>
          <div className="intake-grid premium-form-grid">
            <input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="EMAIL" autoComplete="username" />
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PASSWORD" autoComplete="current-password" />
          </div>
          {error ? <div className="muted-inline" style={{ color: "#ffb4b4", marginTop: 12 }}>{error}</div> : null}
          <div className="action-cluster login-action-row" style={{ marginTop: 16 }}><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "SIGNING IN…" : "SIGN IN"}</button><div className="muted-inline" style={{ marginTop: 4 }}>Administrator-controlled provisioning is required for all new accounts.</div></div>
          <div className="login-legal-note">By signing in, you acknowledge the <button type="button" className="inline-link-btn" onClick={() => setLegalModal("terms")}>Terms of Service</button>, <button type="button" className="inline-link-btn" onClick={() => setLegalModal("privacy")}>Privacy Policy</button>, and that this platform provides workflow support only and does not determine legal sufficiency or compliance.</div>
          <LegalModal legalModal={legalModal} onClose={() => setLegalModal(null)} />
        </section>
        <footer className="trust-footer fade-in delay-4">AEGIS Governance · Fiduciary Governance Platform · Governed Records, Approvals, Verification, and Packet Control · All Rights Reserved</footer>
      </div>
    </div>
  );
}

export function BootstrapScreen({ onBootstrap, ready }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bootstrapApiKey, setBootstrapApiKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!fullName.trim()) return setError("Administrator full name is required.");
    if (!email.trim()) return setError("Administrator email is required.");
    if (password.length < 12) return setError("Bootstrap password must be at least 12 characters.");
    if (password !== confirmPassword) return setError("Password confirmation does not match.");
    setBusy(true);
    try {
      await onBootstrap({ fullName, email, password, bootstrapApiKey });
    } catch (err) {
      setError(err.message || "Unable to complete secure bootstrap.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingGate />;

  return (
    <div className="app-shell"><div className="app-container"><section className="single-panel premium-surface" style={{ maxWidth: 760, margin: "80px auto" }}><div className="module-header"><div><div className="small-label">SECURE BOOTSTRAP REQUIRED</div><div className="large-title">INITIALIZE AEGIS GOVERNANCE</div><div className="large-sub">No administrative user exists yet. Create the first admin account explicitly before the platform can be used.</div></div></div><div className="intake-grid premium-form-grid"><input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ADMINISTRATOR FULL NAME" autoComplete="name" /><input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ADMINISTRATOR EMAIL" autoComplete="username" /><input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PASSWORD" autoComplete="new-password" /><input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="CONFIRM PASSWORD" autoComplete="new-password" /><input className="form-input" type="password" value={bootstrapApiKey} onChange={(e) => setBootstrapApiKey(e.target.value)} placeholder="BOOTSTRAP API KEY" autoComplete="off" /></div>{error ? <div className="muted-inline" style={{ color: "#ffb4b4", marginTop: 12 }}>{error}</div> : null}<div className="action-cluster" style={{ marginTop: 16 }}><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "SECURING…" : "INITIALIZE ADMIN"}</button></div></section></div></div>
  );
}

export function PasswordChangeScreen({ onSubmit }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (newPassword.length < 12) return setError("New password must be at least 12 characters.");
    if (newPassword !== confirmPassword) return setError("New password and confirmation do not match.");
    setBusy(true);
    try {
      await onSubmit(currentPassword, newPassword);
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell"><div className="app-container"><section className="single-panel premium-surface" style={{ maxWidth: 720, margin: "80px auto" }}><div className="module-header"><div><div className="small-label">PASSWORD ROTATION REQUIRED</div><div className="large-title">SET A NEW ADMINISTRATIVE PASSWORD</div><div className="large-sub">Your account requires a password change before access to AEGIS Governance is granted.</div></div></div><div className="intake-grid premium-form-grid"><input className="form-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="CURRENT PASSWORD" autoComplete="current-password" /><input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="NEW PASSWORD" autoComplete="new-password" /><input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="CONFIRM NEW PASSWORD" autoComplete="new-password" /></div>{error ? <div className="muted-inline" style={{ color: "#ffb4b4", marginTop: 12 }}>{error}</div> : null}<div className="action-cluster" style={{ marginTop: 16 }}><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "UPDATING…" : "UPDATE PASSWORD"}</button></div></section></div></div>
  );
}


export function MfaChallengeScreen({ ready, pendingMfaChallenge, onVerify, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onVerify(code);
      setCode("");
    } catch (err) {
      setError(err.message || "Unable to verify the authenticator code.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingGate />;

  return (
    <div className="app-shell">
      <div className="app-container">
        <section className="single-panel premium-surface" style={{ maxWidth: 720, margin: "80px auto" }}>
          <div className="module-header">
            <div>
              <div className="small-label">MULTI-FACTOR AUTHENTICATION</div>
              <div className="large-title">VERIFY ACCESS TO AEGIS</div>
              <div className="large-sub">Complete sign-in for <strong>{pendingMfaChallenge?.challengeUser?.email || "this account"}</strong> by entering the current 6-digit code from the enrolled authenticator application.</div>
            </div>
          </div>
          <div className="intake-grid premium-form-grid">
            <input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-DIGIT AUTHENTICATOR CODE" autoComplete="one-time-code" />
          </div>
          <div className="muted-inline" style={{ marginTop: 12 }}>Challenge method: {(pendingMfaChallenge?.challengeMethod || "totp").toString().toUpperCase()} · Expires in about {pendingMfaChallenge?.challengeExpiresInSeconds || 300} seconds.</div>
          {error ? <div className="muted-inline" style={{ color: "#ffb4b4", marginTop: 12 }}>{error}</div> : null}
          <div className="action-cluster login-action-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "VERIFYING…" : "VERIFY CODE"}</button>
            <button className="btn btn-secondary" disabled={busy} onClick={onCancel}>BACK</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function MfaSetupScreen({ currentUser, mfaSetup, onBeginSetup, onEnable, onAcknowledge }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  useEffect(() => {
    if (!mfaSetup?.completed) {
      onBeginSetup().catch(() => {});
    }
  }, [mfaSetup?.completed, onBeginSetup]);

  useEffect(() => {
    let cancelled = false;
    if (!mfaSetup?.otpauthUri || mfaSetup?.completed) {
      setQrCodeDataUrl("");
      return () => { cancelled = true; };
    }
    QRCode.toDataURL(mfaSetup.otpauthUri, { margin: 1, width: 280 })
      .then((value) => { if (!cancelled) setQrCodeDataUrl(value); })
      .catch(() => { if (!cancelled) setQrCodeDataUrl(""); });
    return () => { cancelled = true; };
  }, [mfaSetup?.otpauthUri, mfaSetup?.completed]);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await onEnable(code);
      setCode("");
    } catch (err) {
      setError(err.message || "Unable to activate the authenticator.");
    } finally {
      setBusy(false);
    }
  }

  if (mfaSetup?.completed) {
    return (
      <div className="app-shell"><div className="app-container"><section className="single-panel premium-surface" style={{ maxWidth: 760, margin: "80px auto" }}><div className="module-header"><div><div className="small-label">AUTHENTICATOR CONNECTED</div><div className="large-title">QR ENROLLMENT COMPLETE</div><div className="large-sub">The account is now bound to its authenticator application and may continue into AEGIS Governance.</div></div></div><div className="action-cluster" style={{ marginTop: 16 }}><button className="btn btn-primary" onClick={onAcknowledge}>CONTINUE</button></div></section></div></div>
    );
  }

  return (
    <div className="app-shell"><div className="app-container"><section className="single-panel premium-surface" style={{ maxWidth: 860, margin: "80px auto" }}><div className="module-header"><div><div className="small-label">AUTHENTICATOR ENROLLMENT</div><div className="large-title">SCAN THE AEGIS QR CODE</div><div className="large-sub">Scan the QR code to enroll your authenticator and complete access to AEGIS Governance.</div></div></div><section className="premium-surface" style={{ padding: 20, borderRadius: 18 }}><div className="small-label">SETUP INSTRUCTIONS</div><div className="legal-copy"><p><strong>1.</strong> Open your authenticator application and choose to scan a QR code.</p><p><strong>2.</strong> Scan the governance QR code shown below for <strong>{currentUser?.email}</strong>.</p><p><strong>3.</strong> Enter the current 6-digit code generated by that authenticator to activate access.</p></div><div className="governance-auth-qr-shell"><div className="governance-auth-qr-card">{qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="Governance authenticator enrollment QR code" className="governance-auth-qr-image" /> : <div className="governance-auth-qr-placeholder">Generating AEGIS QR…</div>}</div><div className="governance-auth-qr-entry"><input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-DIGIT AUTHENTICATOR CODE" autoComplete="one-time-code" /><div className="muted-inline">Verification establishes controlled access to governed administrative workflows.</div>{error ? <div className="muted-inline" style={{ color: "#ffb4b4", marginTop: 12 }}>{error}</div> : null}<div className="action-cluster" style={{ marginTop: 16 }}><button className="btn btn-primary" disabled={busy || !mfaSetup?.otpauthUri} onClick={submit}>{busy ? "ACTIVATING…" : "ACTIVATE AUTHENTICATOR"}</button></div></div></div></section></section></div></div>
  );
}

export function AppLoadingScreen() {
  return <div className="app-shell"><div className="app-container"><section className="single-panel loading-shell premium-surface"><div className="small-label">AEGIS SYSTEM CORE</div><div className="large-title">BOOTSTRAPPING GOVERNANCE STATE…</div><div className="hero-note">Loading repository, intake, control, audit, deadline, and persistence layers.</div></section></div></div>;
}
