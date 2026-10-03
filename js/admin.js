(function () {
    const escapeHTML = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const validStatuses = ['new', 'reviewing', 'approved', 'closed'];
    let activeStatus = 'all';
    const formatDate = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const Admin = {
        init() { if (!window.SwanAuth.requireAuth('admin')) return; Admin.renderStats(); Admin.renderRequests(); },
        renderStats() {
            const stats = window.SwanDB.getHelpRequestAnalytics();
            Object.entries({ adminRequestsTotal: stats.total, adminRequestsNew: stats.new_count, adminRequestsReviewing: stats.reviewing_count, adminRequestsApproved: stats.approved_count }).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
        },
        filterByStatus(status, button) { activeStatus = status; document.querySelectorAll('[data-status]').forEach(item => item.classList.toggle('active', item === button)); Admin.renderRequests(); },
        renderRequests(searchQuery = '') {
            const tbody = document.getElementById('adminRequestsTableBody'); if (!tbody) return;
            let requests = window.SwanDB.getHelpRequests();
            if (activeStatus !== 'all') requests = requests.filter(request => request.status === activeStatus);
            const query = searchQuery.trim().toLowerCase();
            if (query) requests = requests.filter(request => [request.id, request.full_name, request.phone, request.email, request.help_type].some(value => String(value || '').toLowerCase().includes(query)));
            if (!requests.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="table-empty-state"><p>No help requests match the selected criteria.</p></div></td></tr>'; return; }
            tbody.innerHTML = requests.map(request => `<tr><td><strong>${escapeHTML(request.id)}</strong></td><td><strong>${escapeHTML(request.full_name)}</strong><div style="font-size:12px;color:#64748b;margin-top:3px;">${escapeHTML(request.phone)}${request.email ? ' · ' + escapeHTML(request.email) : ''}</div></td><td><span style="background:rgba(0,102,255,.1);color:#0066ff;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;">${escapeHTML(request.help_type)}</span><div style="font-size:12px;color:#64748b;margin-top:7px;">${request.estimated_amount ? 'Est. ' + escapeHTML(request.estimated_amount) : 'Amount not provided'}</div></td><td><span class="request-urgency ${escapeHTML(request.urgency)}">${escapeHTML(request.urgency)}</span></td><td>${formatDate(request.created_at)}</td><td><span class="status-pill ${escapeHTML(request.status)} no-dot">${escapeHTML(request.status)}</span></td><td><button class="btn-icon-text" onclick="SwanAdmin.openRequest('${escapeHTML(request.id)}')">Review</button></td></tr>`).join('');
        },
        openRequest(id) {
            const request = window.SwanDB.getHelpRequestById(id), modal = document.getElementById('requestReviewModal'); if (!request || !modal) return;
            modal.hidden = false; modal.innerHTML = `<div class="request-review-backdrop" onclick="SwanAdmin.closeRequest()"></div><section class="request-review-card" role="dialog" aria-modal="true" aria-labelledby="reviewTitle"><button class="request-review-close" onclick="SwanAdmin.closeRequest()" aria-label="Close">×</button><span class="panel-eyebrow">${escapeHTML(request.id)}</span><h2 id="reviewTitle">${escapeHTML(request.full_name)}</h2><div class="request-detail-grid"><div><strong>Phone</strong><span>${escapeHTML(request.phone)}</span></div><div><strong>Email</strong><span>${escapeHTML(request.email || 'Not provided')}</span></div><div><strong>Type of help</strong><span>${escapeHTML(request.help_type)}</span></div><div><strong>Urgency</strong><span>${escapeHTML(request.urgency)}</span></div><div class="full"><strong>Location</strong><span>${escapeHTML(request.address || 'Not provided')}</span></div><div class="full"><strong>Estimated amount</strong><span>${escapeHTML(request.estimated_amount || 'Not provided')}</span></div><div class="full"><strong>Situation</strong><p>${escapeHTML(request.description)}</p></div></div><label class="review-field">Case status<select id="requestStatus"><option value="new">New</option><option value="reviewing">Reviewing</option><option value="approved">Approved</option><option value="closed">Closed</option></select></label><label class="review-field">Internal note<textarea id="requestNote" rows="4" maxlength="1500" placeholder="Add a note for the donation/support team.">${escapeHTML(request.admin_note || '')}</textarea></label><button class="help-submit-btn" onclick="SwanAdmin.saveRequest('${escapeHTML(request.id)}')">Save case update</button></section>`;
            modal.querySelector('#requestStatus').value = validStatuses.includes(request.status) ? request.status : 'new'; document.body.classList.add('request-modal-open');
        },
        closeRequest() { const modal = document.getElementById('requestReviewModal'); if (modal) { modal.hidden = true; modal.innerHTML = ''; } document.body.classList.remove('request-modal-open'); },
        saveRequest(id) { window.SwanDB.updateHelpRequest(id, { status: document.getElementById('requestStatus').value, admin_note: document.getElementById('requestNote').value }); Admin.closeRequest(); Admin.renderStats(); Admin.renderRequests(document.getElementById('adminSearchInput')?.value || ''); },
        exportCSV() {
            const requests = window.SwanDB.getHelpRequests(); if (!requests.length) { alert('No help requests to export.'); return; }
            const quote = value => '"' + String(value || '').replace(/"/g, '""') + '"';
            const rows = requests.map(request => [request.id, request.full_name, request.phone, request.email, request.address, request.help_type, request.estimated_amount, request.urgency, request.description, request.status, request.admin_note, request.created_at].map(quote).join(','));
            const blob = new Blob([['Request ID,Name,Phone,Email,Address,Help type,Estimated amount,Urgency,Description,Status,Admin note,Submitted', ...rows].join('\n')], { type: 'text/csv' }); const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'Swan_Help_Requests_' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        }
    };
    window.SwanAdmin = Admin;
})();
