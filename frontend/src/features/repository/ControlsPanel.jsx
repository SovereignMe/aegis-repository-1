import { useState } from "react";

export function ControlsPanel({ role, currentUser, users, permissions, onPermissionsChange, onCreateUser, canEditPermissions, canManageUsers }) {
  const [form, setForm] = useState({ email: "", fullName: "", role: "VIEWER", password: "" });

  async function submitUser() {
    await onCreateUser(form);
    setForm({ email: "", fullName: "", role: "VIEWER", password: "" });
  }

  return (
    <section className="single-panel premium-surface">
      <div className="module-header">
        <div>
          <div className="small-label">AUTHORIZATION SURFACE</div>
          <div className="large-title">CONTROLS</div>
          <div className="large-sub">Authenticated users, request-scoped RBAC, durable permission matrix, and managed local operators.</div>
        </div>
        <div className="module-callout">
          <div className="small-label">CURRENT AUTHORITY</div>
          <div className="callout-title">{role.toUpperCase()}</div>
          <div className="callout-copy">Signed in as {currentUser?.fullName || currentUser?.email}. Permissions are enforced server-side before persistence.</div>
        </div>
      </div>

      <div className="card-grid premium-card-grid">
        <div className="info-card premium-card">
          <div className="info-card-title">ROLE PERMISSIONS</div>
          <div className="permissions-grid premium-permissions-grid">
            {Object.entries(permissions).map(([roleKey, config]) => (
              <div key={roleKey} className="permission-card premium-card">
                <div className="repo-title">{roleKey}</div>
                <div className="permission-pill-row">
                  {Object.entries(config).map(([permissionKey, enabled]) => (
                    <label key={permissionKey} className="permission-row premium-permission-row">
                      <span>{permissionKey.toUpperCase()}</span>
                      <input type="checkbox" checked={enabled} disabled={!canEditPermissions} onChange={(e) => onPermissionsChange({ ...permissions, [roleKey]: { ...config, [permissionKey]: e.target.checked } })} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card premium-card">
          <div className="info-card-title">MANAGED USERS</div>
          <div className="setting-list">
            {users.length ? users.map((user) => <div key={user.id} className="setting-row"><span>{user.email}</span><strong>{user.role}</strong></div>) : <div className="muted-inline">No additional users provisioned.</div>}
          </div>
          <div className="intake-grid premium-form-grid" style={{ marginTop: 12 }}>
            <input className="form-input" placeholder="FULL NAME" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} disabled={!canManageUsers} />
            <input className="form-input" placeholder="EMAIL" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canManageUsers} />
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!canManageUsers}><option value="VIEWER">VIEWER</option><option value="EDITOR">EDITOR</option><option value="ADMIN">ADMIN</option></select>
            <input className="form-input" type="password" placeholder="TEMP PASSWORD" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={!canManageUsers} />
          </div>
          <div className="action-cluster"><button className="btn btn-primary" disabled={!canManageUsers || !form.email || !form.password || !form.fullName} onClick={submitUser}>CREATE USER</button></div>
        </div>
      </div>
      {!canEditPermissions ? <div className="muted-inline">Current role cannot edit the permission matrix.</div> : null}
      {!canManageUsers ? <div className="muted-inline">Current role cannot provision or manage users.</div> : null}
    </section>
  );
}
