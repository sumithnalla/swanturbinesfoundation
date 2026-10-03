/**
 * Swan Turbines Foundation — Admin Portal Controller
 * Connects to the backend REST API with fallback to local storage during offline testing.
 */
(function () {
    const escapeHTML = value => String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const validStatuses = ['pending', 'under_review', 'accepted', 'rejected', 'new', 'reviewing', 'approved', 'closed'];
    let activeStatus = 'all';

    const formatDate = value => {
        try {
            return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return String(value || '');
        }
    };

    const API_BASE = window.__API_BASE_URL__ || (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : ''
    );

    let cachedRequests = [];

    const Admin = {
        async init() {
            if (!window.SwanAuth.requireAuth('admin')) return;
            await Admin.renderStats();
            await Admin.renderRequests();
        },

        async renderStats() {
            try {
                const response = await fetch(`${API_BASE}/api/v1/requests/admin/stats`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    const counts = data.by_status || {};
                    const total = data.total || 0;
                    const elTotal = document.getElementById('adminRequestsTotal');
                    const elNew = document.getElementById('adminRequestsNew');
                    const elReviewing = document.getElementById('adminRequestsReviewing');
                    const elApproved = document.getElementById('adminRequestsApproved');

                    if (elTotal) elTotal.textContent = total;
                    if (elNew) elNew.textContent = counts.pending || counts.new || 0;
                    if (elReviewing) elReviewing.textContent = counts.under_review || counts.reviewing || 0;
                    if (elApproved) elApproved.textContent = counts.accepted || counts.approved || 0;
                    return;
                }
            } catch (err) {
                // Backend unreachable, fallback to local DB
            }

            // Fallback
            if (window.SwanDB && window.SwanDB.getHelpRequestAnalytics) {
                const stats = window.SwanDB.getHelpRequestAnalytics();
                const map = {
                    adminRequestsTotal: stats.total,
                    adminRequestsNew: stats.new_count,
                    adminRequestsReviewing: stats.reviewing_count,
                    adminRequestsApproved: stats.approved_count
                };
                Object.entries(map).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                });
            }
        },

        filterByStatus(status, button) {
            activeStatus = status;
            document.querySelectorAll('[data-status]').forEach(item => {
                item.classList.toggle('active', item === button);
            });
            Admin.renderRequests();
        },

        async renderRequests(searchQuery = '') {
            const tbody = document.getElementById('adminRequestsTableBody');
            if (!tbody) return;

            let requests = [];

            try {
                // Map filter pill status to API status
                let apiStatus = null;
                if (activeStatus === 'new') apiStatus = 'pending';
                else if (activeStatus === 'reviewing') apiStatus = 'under_review';
                else if (activeStatus === 'approved') apiStatus = 'accepted';

                const url = new URL(`${API_BASE}/api/v1/requests/admin`, window.location.origin);
                url.searchParams.set('page_size', '50');
                if (apiStatus) url.searchParams.set('status', apiStatus);
                if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

                const response = await fetch(url.toString(), { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    requests = data.requests || [];
                    cachedRequests = requests;
                } else {
                    throw new Error('API request failed');
                }
            } catch (err) {
                // Fallback to local DB
                if (window.SwanDB && window.SwanDB.getHelpRequests) {
                    requests = window.SwanDB.getHelpRequests();
                    if (activeStatus !== 'all') {
                        requests = requests.filter(r => r.status === activeStatus);
                    }
                    const query = searchQuery.trim().toLowerCase();
                    if (query) {
                        requests = requests.filter(r =>
                            [r.id, r.full_name, r.phone, r.email, r.help_type].some(v =>
                                String(v || '').toLowerCase().includes(query)
                            )
                        );
                    }
                    cachedRequests = requests;
                }
            }

            if (!requests.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="table-empty-state"><p>No help requests match the selected criteria.</p></div></td></tr>';
                return;
            }

            tbody.innerHTML = requests.map(req => {
                const reqId = req.reference || req.id;
                const personName = req.applicant ? req.applicant.full_name : (req.full_name || 'Anonymous');
                const phone = req.applicant ? req.applicant.mobile : (req.phone || '');
                const email = req.applicant ? req.applicant.email : (req.email || '');
                const supportType = req.support_type || (req.request ? req.request.support_type : (req.help_type || 'Support'));
                const urgency = req.urgency || (req.request ? req.request.urgency : 'normal');
                const status = req.status || 'pending';
                const created = req.created_at || new Date().toISOString();

                return `
                    <tr>
                        <td><strong>${escapeHTML(reqId)}</strong></td>
                        <td>
                            <strong>${escapeHTML(personName)}</strong>
                            <div style="font-size:12px;color:#64748b;margin-top:3px;">
                                ${escapeHTML(phone)}${email ? ' · ' + escapeHTML(email) : ''}
                            </div>
                        </td>
                        <td>
                            <span style="background:rgba(0,102,255,.1);color:#0066ff;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;">
                                ${escapeHTML(supportType)}
                            </span>
                        </td>
                        <td>
                            <span class="request-urgency ${escapeHTML(urgency)}">${escapeHTML(urgency)}</span>
                        </td>
                        <td>${formatDate(created)}</td>
                        <td>
                            <span class="status-pill ${escapeHTML(status)} no-dot">${escapeHTML(status)}</span>
                        </td>
                        <td>
                            <button class="btn-icon-text" onclick="SwanAdmin.openRequest('${escapeHTML(req.id || reqId)}')">Review</button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        async openRequest(id) {
            let request = null;

            try {
                const response = await fetch(`${API_BASE}/api/v1/requests/admin/${encodeURIComponent(id)}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    request = await response.json();
                }
            } catch (err) {
                // ignore
            }

            if (!request) {
                request = cachedRequests.find(r => (r.id === id || r.reference === id)) || (window.SwanDB ? window.SwanDB.getHelpRequestById(id) : null);
            }

            const modal = document.getElementById('requestReviewModal');
            if (!request || !modal) return;

            const applicant = request.applicant || {};
            const reqInfo = request.request || {};
            const fullName = applicant.full_name || request.full_name || 'Applicant';
            const phone = applicant.mobile || request.phone || 'Not provided';
            const email = applicant.email || request.email || 'Not provided';
            const location = applicant.address || request.address || 'Not provided';
            const supportType = reqInfo.support_type || request.support_type || request.help_type || 'Support';
            const urgency = reqInfo.urgency || request.urgency || 'normal';
            const estimatedAmount = reqInfo.amount_required || request.estimated_amount || 'Not provided';
            const description = reqInfo.description || request.description || '';
            const status = request.status || 'pending';
            const adminNote = request.admin_note || '';

            modal.hidden = false;
            modal.innerHTML = `
                <div class="request-review-backdrop" onclick="SwanAdmin.closeRequest()"></div>
                <section class="request-review-card" role="dialog" aria-modal="true" aria-labelledby="reviewTitle">
                    <button class="request-review-close" onclick="SwanAdmin.closeRequest()" aria-label="Close">×</button>
                    <span class="panel-eyebrow">${escapeHTML(request.reference || request.id)}</span>
                    <h2 id="reviewTitle">${escapeHTML(fullName)}</h2>
                    <div class="request-detail-grid">
                        <div><strong>Phone</strong><span>${escapeHTML(phone)}</span></div>
                        <div><strong>Email</strong><span>${escapeHTML(email)}</span></div>
                        <div><strong>Type of help</strong><span>${escapeHTML(supportType)}</span></div>
                        <div><strong>Urgency</strong><span>${escapeHTML(urgency)}</span></div>
                        <div class="full"><strong>Location</strong><span>${escapeHTML(location)}</span></div>
                        <div class="full"><strong>Estimated amount</strong><span>${escapeHTML(estimatedAmount)}</span></div>
                        <div class="full"><strong>Situation</strong><p>${escapeHTML(description)}</p></div>
                    </div>
                    <label class="review-field">Case status
                        <select id="requestStatus">
                            <option value="pending" ${status === 'pending' || status === 'new' ? 'selected' : ''}>Pending / New</option>
                            <option value="under_review" ${status === 'under_review' || status === 'reviewing' ? 'selected' : ''}>Under Review</option>
                            <option value="accepted" ${status === 'accepted' || status === 'approved' ? 'selected' : ''}>Accepted / Approved</option>
                            <option value="rejected" ${status === 'rejected' || status === 'closed' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </label>
                    <label class="review-field">Internal note
                        <textarea id="requestNote" rows="4" maxlength="1500" placeholder="Add a case note for the foundation team.">${escapeHTML(adminNote)}</textarea>
                    </label>
                    <button class="help-submit-btn" id="saveCaseBtn" onclick="SwanAdmin.saveRequest('${escapeHTML(request.id)}')">Save case update</button>
                </section>
            `;
            document.body.classList.add('request-modal-open');
        },

        closeRequest() {
            const modal = document.getElementById('requestReviewModal');
            if (modal) {
                modal.hidden = true;
                modal.innerHTML = '';
            }
            document.body.classList.remove('request-modal-open');
        },

        async saveRequest(id) {
            const newStatus = document.getElementById('requestStatus').value;
            const note = document.getElementById('requestNote').value;
            const btn = document.getElementById('saveCaseBtn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Saving...';
            }

            try {
                const response = await fetch(`${API_BASE}/api/v1/requests/admin/${encodeURIComponent(id)}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: newStatus, admin_note: note })
                });

                if (!response.ok) {
                    throw new Error('API save failed');
                }
            } catch (err) {
                // Fallback to local DB
                if (window.SwanDB && window.SwanDB.updateHelpRequest) {
                    window.SwanDB.updateHelpRequest(id, { status: newStatus, admin_note: note });
                }
            }

            Admin.closeRequest();
            await Admin.renderStats();
            await Admin.renderRequests(document.getElementById('adminSearchInput')?.value || '');
        },

        exportCSV() {
            const requests = cachedRequests.length ? cachedRequests : (window.SwanDB ? window.SwanDB.getHelpRequests() : []);
            if (!requests.length) {
                alert('No help requests to export.');
                return;
            }
            const quote = value => '"' + String(value || '').replace(/"/g, '""') + '"';
            const rows = requests.map(req => {
                const reqId = req.reference || req.id;
                const name = req.applicant ? req.applicant.full_name : (req.full_name || '');
                const phone = req.applicant ? req.applicant.mobile : (req.phone || '');
                const email = req.applicant ? req.applicant.email : (req.email || '');
                const addr = req.applicant ? req.applicant.address : (req.address || '');
                const support = req.support_type || (req.request ? req.request.support_type : (req.help_type || ''));
                const amount = req.request ? req.request.amount_required : (req.estimated_amount || '');
                const urgency = req.urgency || (req.request ? req.request.urgency : '');
                const desc = req.request ? req.request.description : (req.description || '');
                const status = req.status || '';
                const note = req.admin_note || '';
                const created = req.created_at || '';
                return [reqId, name, phone, email, addr, support, amount, urgency, desc, status, note, created].map(quote).join(',');
            });

            const blob = new Blob([['Request ID,Name,Phone,Email,Address,Help type,Estimated amount,Urgency,Description,Status,Admin note,Submitted', ...rows].join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Swan_Help_Requests_' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }
    };

    window.SwanAdmin = Admin;
})();
