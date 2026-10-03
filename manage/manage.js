/**
 * WEBSITTER Manage — Super-Admin Platform Controller
 * Communicates with backend /api/v1/admin and /api/v1/auth services.
 */

(function () {
    'use strict';

    const API_BASE = window.__API_BASE_URL__ || (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : ''
    );

    let currentUser = null;
    let cachedUsers = [];
    let cachedRoles = [];

    const WebsitterManage = {
        async init() {
            try {
                const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
                    credentials: 'include'
                });
                if (meRes.ok) {
                    const data = await meRes.json();
                    currentUser = data.user || data;
                    if (this.isSuperAdminOrAdmin(currentUser)) {
                        this.unlockConsole();
                        return;
                    }
                }
            } catch (err) {
                console.info('[WebsitterManage] Auth check:', err.message);
            }

            // If not logged in, show auth gate
            document.getElementById('authGate').classList.remove('hidden');
        },

        isSuperAdminOrAdmin(user) {
            if (!user) return false;
            if (user.role === 'super_admin' || user.role === 'admin') return true;
            if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes('users.read'))) {
                return true;
            }
            if (Array.isArray(user.role_ids) && user.role_ids.length > 0) return true;
            return false;
        },

        unlockConsole() {
            document.getElementById('authGate').classList.add('hidden');
            if (currentUser) {
                document.getElementById('headerUserName').textContent = currentUser.full_name || currentUser.email;
                document.getElementById('headerAvatar').textContent = (currentUser.full_name || 'W').charAt(0).toUpperCase();
            }
            this.refreshOverview();
            this.loadRoles();
        },

        async handleLogin(event) {
            event.preventDefault();
            const errBox = document.getElementById('authGateError');
            const submitBtn = document.getElementById('loginSubmitBtn');
            errBox.style.display = 'none';

            const email = document.getElementById('loginEmail').value.trim();
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

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error((data.error && data.error.message) || 'Invalid super-admin credentials.');
                }

                const loginData = await res.json();
                currentUser = loginData.user;

                if (!this.isSuperAdminOrAdmin(currentUser)) {
                    throw new Error('Access denied: this account lacks WEBSITTER super-admin privileges.');
                }

                this.unlockConsole();
            } catch (err) {
                errBox.textContent = err.message;
                errBox.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Authorize Super-Admin Access';
            }
        },

        async logout() {
            try {
                await fetch(`${API_BASE}/api/v1/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (e) {
                // Ignore network errors on logout
            }
            if (window.SwanAuth) window.SwanAuth.logout();
            window.location.reload();
        },

        switchTab(tabName) {
            document.querySelectorAll('.stage-tab').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

            const targetTab = document.getElementById(`tab-${tabName}`);
            if (targetTab) targetTab.style.display = 'block';

            const targetBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
            if (targetBtn) targetBtn.classList.add('active');

            if (tabName === 'users') this.loadUsers();
            if (tabName === 'roles') this.loadRoles();
            if (tabName === 'audit') this.loadAuditLogs();
        },

        async refreshOverview() {
            try {
                // Fetch stats, users, audit in parallel
                const [dashRes, usersRes, auditRes] = await Promise.all([
                    fetch(`${API_BASE}/api/v1/admin/dashboard`, { credentials: 'include' }).catch(() => null),
                    fetch(`${API_BASE}/api/v1/admin/users`, { credentials: 'include' }).catch(() => null),
                    fetch(`${API_BASE}/api/v1/admin/audit-logs?page_size=5`, { credentials: 'include' }).catch(() => null)
                ]);

                if (dashRes && dashRes.ok) {
                    const dash = await dashRes.json();
                    document.getElementById('statRequestsCount').textContent = dash.requests?.total ?? 0;
                    document.getElementById('statCampaignsCount').textContent = dash.campaigns?.active ?? 0;
                }

                if (usersRes && usersRes.ok) {
                    const uData = await usersRes.json();
                    cachedUsers = uData.users || [];
                    document.getElementById('statUsersCount').textContent = cachedUsers.length;
                }

                if (auditRes && auditRes.ok) {
                    const aData = await auditRes.json();
                    document.getElementById('statAuditCount').textContent = aData.total ?? 0;
                    this.renderRecentLogs(aData.logs || []);
                }
            } catch (err) {
                console.error('[WebsitterManage] Overview error:', err);
            }
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
                    <td>${escapeHtml(log.entity_type || '-')} ${log.entity_id ? `(${log.entity_id})` : ''}</td>
                    <td class="code-cell">${escapeHtml(log.ip_address || '-')}</td>
                </tr>
            `).join('');
        },

        async loadUsers() {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">Loading accounts...</td></tr>';

            try {
                const res = await fetch(`${API_BASE}/api/v1/admin/users`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load user accounts.');

                const data = await res.json();
                cachedUsers = data.users || [];
                this.renderUsers(cachedUsers);
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">${err.message}</td></tr>`;
            }
        },

        renderUsers(users) {
            const tbody = document.getElementById('usersTableBody');
            document.getElementById('userCountIndicator').textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;

            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No matching users found.</td></tr>';
                return;
            }

            // Role map for labels
            const roleNameMap = {};
            cachedRoles.forEach(r => { roleNameMap[r.id] = r.name; });

            tbody.innerHTML = users.map(u => {
                const roleNames = (u.role_ids || []).map(rId => roleNameMap[rId] || 'User').join(', ') || 'Staff';
                const roleClass = (u.role_ids && u.role_ids.length) ? 'admin' : '';
                const isActive = u.is_active !== false;

                return `
                    <tr>
                        <td><strong>${escapeHtml(u.full_name || 'Unnamed')}</strong></td>
                        <td class="code-cell">${escapeHtml(u.email)}</td>
                        <td><span class="role-badge ${roleClass}">${escapeHtml(roleNames)}</span></td>
                        <td>
                            <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? 'ACTIVE' : 'SUSPENDED'}
                            </span>
                        </td>
                        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td>
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
                const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ is_active: targetActive })
                });

                if (!res.ok) throw new Error(`Failed to ${verb} user.`);
                this.loadUsers();
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        },

        async loadRoles() {
            try {
                const res = await fetch(`${API_BASE}/api/v1/admin/roles`, { credentials: 'include' });
                if (!res.ok) return;

                const data = await res.json();
                cachedRoles = data.roles || [];

                const tbody = document.getElementById('rolesTableBody');
                if (tbody) {
                    tbody.innerHTML = cachedRoles.map(r => `
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
                    `).join('');
                }

                // Populate modal role dropdown
                const select = document.getElementById('newRoleSelect');
                if (select) {
                    select.innerHTML = cachedRoles.map(r => `
                        <option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.description || '')})</option>
                    `).join('');
                }
            } catch (err) {
                console.error('[WebsitterManage] Roles error:', err);
            }
        },

        openCreateUserModal() {
            document.getElementById('createUserForm').reset();
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
            const roleId = document.getElementById('newRoleSelect').value;

            try {
                const res = await fetch(`${API_BASE}/api/v1/admin/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        full_name: fullName,
                        email: email,
                        password: password,
                        role_ids: roleId ? [roleId] : []
                    })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error((errData.error && errData.error.message) || 'Failed to create user account.');
                }

                this.closeCreateUserModal();
                alert(`Account created successfully for ${email}`);
                this.loadUsers();
                this.refreshOverview();
            } catch (err) {
                alert(`Error: ${err.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        },

        async loadAuditLogs() {
            const tbody = document.getElementById('auditTableBody');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">Loading audit trail...</td></tr>';

            try {
                const res = await fetch(`${API_BASE}/api/v1/admin/audit-logs?page=1&page_size=50`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load audit telemetry.');

                const data = await res.json();
                const logs = data.logs || [];

                if (!logs.length) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No audit records found.</td></tr>';
                    return;
                }

                tbody.innerHTML = logs.map(l => {
                    const detailsStr = l.details ? JSON.stringify(l.details) : '-';
                    return `
                        <tr>
                            <td class="code-cell">${new Date(l.created_at).toLocaleString()}</td>
                            <td><span class="role-badge">${escapeHtml(l.action || 'ACTION')}</span></td>
                            <td class="code-cell">${escapeHtml(l.actor_id || 'system')}</td>
                            <td>${escapeHtml(l.entity_type || '-')} ${l.entity_id ? `(${l.entity_id})` : ''}</td>
                            <td class="code-cell">${escapeHtml(l.ip_address || '-')}</td>
                            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text-muted);" title="${escapeHtml(detailsStr)}">
                                ${escapeHtml(detailsStr)}
                            </td>
                        </tr>
                    `;
                }).join('');
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">${err.message}</td></tr>`;
            }
        }
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
