/**
 * WEBSITTER Manage — Super-Admin Platform Controller
 * Communicates with backend /api/v1/admin and /api/v1/auth services.
 * Authorization and account data are always server-authoritative.
 */

(function () {
    'use strict';

    const API_BASE = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';

    async function apiFetch(url, options) {
        const opts = options || {};
        let response;
        if (window.SwanAuth && window.SwanAuth.authorizedFetch) response = await window.SwanAuth.authorizedFetch(url, opts);
        else {
        const headers = new Headers(opts.headers || {});
        try {
            const token = localStorage.getItem('swan_admin_token');
            if (token) headers.set('Authorization', 'Bearer ' + token);
        } catch (_) {}
        opts.headers = headers;
        opts.credentials = 'include';
            response = await fetch(url, opts);
        }
        try {
            if (localStorage.getItem('swan_admin_inactive') === '1') {
                localStorage.removeItem('swan_admin_inactive');
                window.WebsitterManage?.redirectInactive();
            }
        } catch (_) {}
        if (response.status === 403 && !url.includes('/api/v1/auth/me')) {
            try {
                const token = localStorage.getItem('swan_admin_token');
                const headers = token ? { Authorization: 'Bearer ' + token } : {};
                const check = await fetch(`${API_BASE}/api/v1/auth/me`, { headers, credentials: 'include' });
                const body = check.ok ? await check.json() : await check.json().catch(() => ({}));
                if (body.error?.code === 'ACCOUNT_INACTIVE') window.WebsitterManage?.redirectInactive();
                else if (check.ok && !body.role_names?.includes('super_admin')) window.location.replace('../super-admin/login.html?reason=access-changed');
            } catch (_) {}
        }
        return response;
    }

    let currentUser = null;
    let cachedUsers = [];
    let cachedRoles = [];

    const WebsitterManage = {
        async init() {
            try {
                if (localStorage.getItem('swan_admin_inactive') === '1') {
                    localStorage.removeItem('swan_admin_inactive');
                    this.redirectInactive();
                    return;
                }
            } catch (_) {}
            const passwordToggle = document.getElementById('toggleNewPassword');
            passwordToggle?.addEventListener('click', () => {
                const input = document.getElementById('newPassword');
                const visible = input.type === 'text';
                input.type = visible ? 'password' : 'text';
                passwordToggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
                passwordToggle.title = visible ? 'Show password' : 'Hide password';
                passwordToggle.setAttribute('aria-pressed', String(!visible));
                passwordToggle.innerHTML = visible
                    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
                    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.6 10.6 0 0112 5c6.4 0 10 7 10 7a15.5 15.5 0 01-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.7-.5"/></svg>';
            });
            this.initMobileNavigation();
            document.getElementById('newRoleOptions')?.addEventListener('change', () => {
                const roleError = document.getElementById('newRoleError');
                if (roleError) roleError.hidden = true;
            });
            // Check session
            try {
                const meRes = await apiFetch(`${API_BASE}/api/v1/auth/me`, {
                    credentials: 'include'
                });
                if (meRes.ok) {
                    const data = await meRes.json();
                    currentUser = data.user || data;
                    if (this.isSuperAdminOrAdmin(currentUser)) {
                        this.unlockConsole();
                        return;
                    }
                } else {
                    const body = await meRes.json().catch(() => ({}));
                    let refreshDetectedInactive = false;
                    try { refreshDetectedInactive = localStorage.getItem('swan_admin_inactive') === '1'; } catch (_) {}
                    if (body.error?.code === 'ACCOUNT_INACTIVE' || refreshDetectedInactive) {
                        try { localStorage.removeItem('swan_admin_inactive'); } catch (_) {}
                        this.redirectInactive();
                        return;
                    }
                }
            } catch (err) {
                console.error('[WebsitterManage] Authentication service unavailable.');
            }

            // If not logged in, show auth gate
            document.getElementById('authGate').classList.remove('hidden');
        },

        isSuperAdminOrAdmin(user) {
            if (!user) return false;
            return Array.isArray(user.role_names) && user.role_names.includes('super_admin');
        },

        redirectInactive() {
            try {
                localStorage.removeItem('swan_admin_token');
                localStorage.removeItem('swan_admin_refresh_token');
            } catch (_) {}
            window.location.replace('../super-admin/login.html?reason=deactivated');
        },

        unlockConsole() {
            document.getElementById('authGate').classList.add('hidden');
            if (currentUser) {
                document.getElementById('headerUserName').textContent = currentUser.full_name || currentUser.email;
                document.getElementById('headerAvatar').textContent = (currentUser.full_name || 'W').charAt(0).toUpperCase();
            }
            this.refreshOverview();
            this.loadRoles();
            if (!this.sessionCheckTimer) {
                this.sessionCheckTimer = window.setInterval(async () => {
                    try {
                        const response = await apiFetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' });
                        const body = response.ok ? null : await response.json().catch(() => ({}));
                        if (body?.error?.code === 'ACCOUNT_INACTIVE') this.redirectInactive();
                    } catch (_) {}
                }, 30000);
            }
            const requestedTab = window.location.hash.replace(/^#/, '');
            if (['overview', 'users', 'roles', 'audit', 'system'].includes(requestedTab)) {
                this.switchTab(requestedTab);
            }
        },

        async handleLogin(event) {
            event.preventDefault();
            const errBox = document.getElementById('authGateError');
            const submitBtn = document.getElementById('loginSubmitBtn');
            errBox.style.display = 'none';

            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying Credentials...';

            try {
                const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                if (res.ok) {
                    const loginData = await res.json();
                    if (loginData.access_token) {
                        try { localStorage.setItem('swan_admin_token', loginData.access_token); } catch (_) {}
                    }
                    if (loginData.refresh_token) {
                        try { localStorage.setItem('swan_admin_refresh_token', loginData.refresh_token); } catch (_) {}
                    }
                    currentUser = loginData.user;
                    if (!this.isSuperAdminOrAdmin(currentUser)) {
                        throw new Error('Access denied: this account lacks WEBSITTER super-admin privileges.');
                    }
                    this.unlockConsole();
                    return;
                } else {
                    const data = await res.json().catch(() => ({}));
                    const msg = (data.error && data.error.message) || 'Invalid super-admin credentials.';
                    throw new Error(msg);
                }
            } catch (err) {
                // Privileged browser-local fallback is intentionally disabled.
                // Supabase/temporary server-side authentication is authoritative.
                errBox.textContent = err.message || 'Unable to verify super-admin credentials.';
                errBox.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Authorize Super-Admin Access';
            }
        },

        async logout() {
            try {
                await apiFetch(`${API_BASE}/api/v1/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (e) {
                // Ignore network errors on logout
            }
            try {
                localStorage.removeItem('swan_admin_token');
                localStorage.removeItem('swan_admin_refresh_token');
            } catch (_) {}
            window.location.replace('../super-admin/login.html');
        },

        switchTab(tabName) {
            document.querySelectorAll('.stage-tab').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

            const targetTab = document.getElementById(`tab-${tabName}`);
            if (targetTab) targetTab.style.display = 'block';

            const targetBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
            if (targetBtn) targetBtn.classList.add('active');
            this.closeMobileNavigation();

            if (tabName === 'users') this.loadUsers();
            if (tabName === 'roles') this.loadRoles();
            if (tabName === 'audit') this.loadAuditLogs();
        },

        async refreshOverview() {
            let requestsCount = 0;
            let usersCount = 0;
            let auditCount = 0;
            let recentLogs = [];

            try {
                const [dashRes, usersRes, auditRes] = await Promise.all([
                    apiFetch(`${API_BASE}/api/v1/admin/dashboard`).catch(() => null),
                    apiFetch(`${API_BASE}/api/v1/admin/users`).catch(() => null),
                    apiFetch(`${API_BASE}/api/v1/admin/audit-logs?page_size=5`).catch(() => null)
                ]);

                if (dashRes && dashRes.ok) {
                    const dash = await dashRes.json();
                    requestsCount = dash.requests?.total ?? 0;
                }

                if (usersRes && usersRes.ok) {
                    const uData = await usersRes.json();
                    cachedUsers = uData.users || [];
                    usersCount = cachedUsers.length;
                }

                if (auditRes && auditRes.ok) {
                    const aData = await auditRes.json();
                    auditCount = aData.total ?? 0;
                    recentLogs = aData.logs || [];
                }
            } catch (err) {
                console.error('[WebsitterManage] Overview data could not be loaded.');
            }

            document.getElementById('statRequestsCount').textContent = requestsCount;
            document.getElementById('statUsersCount').textContent = usersCount;
            document.getElementById('statAuditCount').textContent = auditCount;

            this.renderRecentLogs(recentLogs);
        },

        renderRecentLogs(logs) {
            const tbody = document.getElementById('overviewRecentLogs');
            if (!tbody) return;

            if (!logs.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No audit logs recorded yet.</td></tr>';
                return;
            }

            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td class="code-cell">${new Date(log.created_at).toLocaleString()}</td>
                    <td class="code-cell">${escapeHtml(log.actor_id || 'system')}</td>
                    <td><span class="role-badge">${escapeHtml(log.action || 'unknown')}</span></td>
                    <td>${escapeHtml(log.resource_type || '-')} ${log.resource_id ? `(${log.resource_id})` : ''}</td>
                    <td class="code-cell">${escapeHtml(log.result || '-')}</td>
                </tr>
            `).join('');
        },

        async loadUsers() {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">Loading accounts...</td></tr>';

            try {
                const res = await apiFetch(`${API_BASE}/api/v1/admin/users`);
                if (!res.ok) throw new Error('Unable to load accounts from the server.');
                const data = await res.json();
                cachedUsers = data.users || [];
                this.renderUsers(cachedUsers);
            } catch (err) {
                cachedUsers = [];
                document.getElementById('userCountIndicator').textContent = 'Unavailable';
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ff8a8a;">${escapeHtml(err.message || 'Account service unavailable.')} No local or stale data was substituted.</td></tr>`;
            }
        },

        renderUsers(users) {
            const tbody = document.getElementById('usersTableBody');
            document.getElementById('userCountIndicator').textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;

            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No matching users found.</td></tr>';
                return;
            }

            const roleNameMap = {};
            cachedRoles.forEach(r => { roleNameMap[r.id] = r.name; roleNameMap[r.name] = r.name; });

            tbody.innerHTML = users.map(u => {
                const roleNames = (u.role_ids || []).map(rId => roleNameMap[rId] || rId).join(', ') || 'No role';
                const roleClass = (u.role_ids || []).some(id => (roleNameMap[id] || '').toLowerCase() === 'super_admin') ? 'super_admin' : 'admin';
                const isActive = u.is_active !== false;
                const roleOptions = cachedRoles.map(role => `<label class="role-choice"><input class="user-role-checkbox" type="checkbox" data-user-id="${escapeHtml(u.id)}" value="${escapeHtml(role.id)}" ${(u.role_ids || []).includes(role.id) ? 'checked' : ''}><span><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.description || '')}</small></span></label>`).join('');

                return `
                    <tr>
                        <td data-label="User"><strong>${escapeHtml(u.full_name || 'Unnamed')}</strong></td>
                        <td data-label="Email" class="code-cell">${escapeHtml(u.email)}</td>
                        <td data-label="Roles"><span class="role-badge ${roleClass}">${escapeHtml(roleNames)}</span><details class="role-editor"><summary>Edit roles</summary><div class="role-choice-list" aria-label="Roles for ${escapeHtml(u.email)}">${roleOptions}</div><button class="btn-action" type="button" onclick="WebsitterManage.saveUserRoles('${escapeHtml(u.id)}')" ${cachedRoles.length ? '' : 'disabled'}>Save roles</button></details></td>
                        <td data-label="Status">
                            <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? 'ACTIVE' : 'SUSPENDED'}
                            </span>
                        </td>
                        <td data-label="Created">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td data-label="Actions" class="user-actions-cell">
                            <button class="btn-action ${isActive ? 'toggle-off' : ''}" onclick="WebsitterManage.toggleUserStatus('${u.id}', ${isActive})">
                                ${isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        filterUsers(query) {
            const q = (query || '').toLowerCase().trim();
            if (!q) {
                this.renderUsers(cachedUsers);
                return;
            }
            const filtered = cachedUsers.filter(u => 
                (u.full_name && u.full_name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
            );
            this.renderUsers(filtered);
        },

        async toggleUserStatus(userId, currentActive) {
            const targetActive = !currentActive;
            const verb = targetActive ? 'activate' : 'deactivate';
            if (!confirm(`Are you sure you want to ${verb} this user account?`)) return;

            try {
                const res = await apiFetch(`${API_BASE}/api/v1/admin/users/${userId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ is_active: targetActive })
                });

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error?.message || `Failed to ${verb} user via API.`);
                }
            } catch (err) {
                alert(err.message || `Unable to ${verb} the account. No local changes were made.`);
                return;
            }
            this.loadUsers();
        },

        async saveUserRoles(userId) {
            const roleIds = Array.from(document.querySelectorAll('.user-role-checkbox:checked')).filter(input => input.dataset.userId === userId).map(input => input.value);
            if (!roleIds.length) { alert('Assign at least one role to the account.'); return; }
            try {
                const res = await apiFetch(`${API_BASE}/api/v1/admin/users/${encodeURIComponent(userId)}/roles`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role_ids: roleIds })
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error?.message || 'Unable to update roles.');
                }
                const meRes = await apiFetch(`${API_BASE}/api/v1/auth/me`);
                if (meRes.ok) {
                    currentUser = await meRes.json();
                    if (!this.isSuperAdminOrAdmin(currentUser)) {
                        window.location.replace('../super-admin/login.html?reason=access-changed');
                        return;
                    }
                }
                await this.loadUsers();
                this.refreshOverview();
            } catch (err) {
                alert(err.message || 'Unable to update roles. No local changes were made.');
            }
        },

        async loadRoles() {
            try {
                const res = await apiFetch(`${API_BASE}/api/v1/admin/roles`);
                if (!res.ok) throw new Error('Unable to load roles from the server.');
                const data = await res.json();
                cachedRoles = data.roles || [];
            } catch (err) {
                cachedRoles = [];
                console.error('[WebsitterManage] Role definitions unavailable.');
            }

            const tbody = document.getElementById('rolesTableBody');
            if (tbody) {
                tbody.innerHTML = cachedRoles.length ? cachedRoles.map(r => `
                    <tr>
                        <td><strong>${escapeHtml(r.name)}</strong></td>
                        <td style="color:var(--text-muted);">${escapeHtml(r.description || '-')}</td>
                        <td>
                            <div style="display:flex;flex-wrap:wrap;gap:6px;">
                                ${(r.permissions || []).map(p => `
                                    <span class="code-cell" style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;">${escapeHtml(p)}</span>
                                `).join('')}
                            </div>
                        </td>
                    </tr>
                `).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);">Role definitions could not be loaded.</td></tr>';
            }

            // Populate modal role dropdown
            const roleOptions = document.getElementById('newRoleOptions');
            if (roleOptions) {
                roleOptions.innerHTML = cachedRoles.map(r => `
                    <label class="role-choice"><input type="checkbox" name="newRoleIds" value="${escapeHtml(r.id)}"><span><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(r.description || '')}</small></span></label>
                `).join('') || '<p class="role-empty">No roles are available.</p>';
            }
        },

        openCreateUserModal() {
            document.getElementById('createUserForm').reset();
            const roleError = document.getElementById('newRoleError');
            if (roleError) { roleError.hidden = true; roleError.textContent = ''; }
            const password = document.getElementById('newPassword');
            const toggle = document.getElementById('toggleNewPassword');
            if (password) password.type = 'password';
            if (toggle) { toggle.setAttribute('aria-pressed', 'false'); toggle.setAttribute('aria-label', 'Show password'); toggle.title = 'Show password'; }
            document.getElementById('createUserModal').classList.remove('hidden');
        },

        closeCreateUserModal() {
            document.getElementById('createUserModal').classList.add('hidden');
        },

        async handleCreateUser(event) {
            event.preventDefault();
            const submitBtn = document.getElementById('createUserSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            const fullName = document.getElementById('newFullName').value.trim();
            const email = document.getElementById('newEmail').value.trim().toLowerCase();
            const password = document.getElementById('newPassword').value;
            const roleIds = Array.from(document.querySelectorAll('input[name="newRoleIds"]:checked')).map(input => input.value);
            if (!roleIds.length) {
                document.getElementById('newRoleError').textContent = 'Choose at least one role for this user.';
                document.getElementById('newRoleError').hidden = false;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
                return;
            }

            try {
                const res = await apiFetch(`${API_BASE}/api/v1/admin/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        full_name: fullName,
                        email: email,
                        password: password,
                        role_ids: roleIds
                    })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error((errData.error && errData.error.message) || 'Failed to create user account.');
                }
                this.closeCreateUserModal();
                alert(`Account registered successfully for ${email}`);
                this.loadUsers();
                this.refreshOverview();
            } catch (err) {
                alert(err.message || 'The account was not created. No local account was substituted.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        },

        async loadAuditLogs() {
            const tbody = document.getElementById('auditTableBody');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">Loading audit trail...</td></tr>';
            const category = document.getElementById('auditCategoryFilter')?.value || 'all';
            try {
                const res = await apiFetch(`${API_BASE}/api/v1/admin/audit-logs?page=1&page_size=100&category=${encodeURIComponent(category)}`);
                if (!res.ok) throw new Error('Unable to load audit records.');
                const data = await res.json();
                const logs = data.logs || [];
                if (!logs.length) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No audit records match this filter.</td></tr>';
                    return;
                }
                tbody.innerHTML = logs.map(log => {
                    const details = log.metadata ? JSON.stringify(log.metadata) : '-';
                    return `<tr>
                        <td class="code-cell">${new Date(log.created_at).toLocaleString()}</td>
                        <td><span class="role-badge">${escapeHtml(log.action || 'ACTION')}</span></td>
                        <td class="code-cell">${escapeHtml(log.actor_email || log.actor_id || 'system')}</td>
                        <td>${escapeHtml(log.resource_type || '-')} ${log.resource_id ? `(${escapeHtml(log.resource_id)})` : ''}</td>
                        <td>${escapeHtml(log.result || '-')}</td>
                        <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text-muted);" title="${escapeHtml(details)}">${escapeHtml(details)}</td>
                    </tr>`;
                }).join('');
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ff8a8a;">${escapeHtml(err.message || 'Audit service unavailable.')}</td></tr>`;
            }
        }
    };

    WebsitterManage.initMobileNavigation = function () {
        const sidebar = document.querySelector('.manage-sidebar');
        const header = document.querySelector('.manage-header');
        if (!sidebar || !header || document.getElementById('manageNavToggle')) return;
        const button = document.createElement('button');
        button.id = 'manageNavToggle';
        button.className = 'manage-menu-toggle';
        button.type = 'button';
        button.setAttribute('aria-controls', 'manageSidebar');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Open navigation');
        button.innerHTML = '<span></span><span></span><span></span>';
        sidebar.id = 'manageSidebar';
        header.querySelector('.brand-cluster')?.prepend(button);
        const backdrop = document.createElement('button');
        backdrop.className = 'manage-nav-backdrop';
        backdrop.type = 'button';
        backdrop.setAttribute('aria-label', 'Close navigation');
        document.body.append(backdrop);
        button.addEventListener('click', () => {
            const open = sidebar.classList.toggle('open');
            backdrop.classList.toggle('open', open);
            button.setAttribute('aria-expanded', String(open));
            button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        });
        backdrop.addEventListener('click', () => this.closeMobileNavigation());
        document.addEventListener('keydown', event => { if (event.key === 'Escape') this.closeMobileNavigation(); });
    };

    WebsitterManage.closeMobileNavigation = function () {
        document.querySelector('.manage-sidebar')?.classList.remove('open');
        document.querySelector('.manage-nav-backdrop')?.classList.remove('open');
        const button = document.getElementById('manageNavToggle');
        button?.setAttribute('aria-expanded', 'false');
        button?.setAttribute('aria-label', 'Open navigation');
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    window.WebsitterManage = WebsitterManage;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => WebsitterManage.init());
    } else {
        WebsitterManage.init();
    }
})();
