/**
 * Swan Turbines Foundation — Admin Help Requests Page Script
 * Powers admin-requests.html
 */
(function (window, document) {
    'use strict';

    const API_BASE = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';
    let cachedRequests = [];
    let searchQuery = '';
    let statusFilter = 'all';
    let sortOrder = 'newest';
    let dateFrom = '';
    let dateTo = '';

    const ICONS = {
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };

    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function fmt(d) {
        if (!d) return '--';
        try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return d;
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (_) {
            return d;
        }
    }

    function showLoader() {
        const el = document.getElementById('admLoader');
        if (el) el.classList.remove('hidden');
    }

    function hideLoader() {
        const el = document.getElementById('admLoader');
        if (el) el.classList.add('hidden');
    }

    function toast(msg, type, dur) {
        const c = document.getElementById('admToastContainer');
        if (!c) return;
        const t = document.createElement('div');
        t.className = 'adm-toast ' + (type || 'info');
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-10px)';
            setTimeout(function () { t.remove(); }, 300);
        }, dur || 3200);
    }

    async function apiFetch(url, opts) {
        opts = opts || {};
        if (window.SwanAuth && window.SwanAuth.authorizedFetch) return window.SwanAuth.authorizedFetch(url, opts);
        return fetch(url, opts);
    }

    const ReqPage = {
        init: async function () {
            if (window.SwanAuth && typeof window.SwanAuth.requireAuth === 'function') {
                if (!window.SwanAuth.requireAuth('admin')) return;
            }

            const user = (window.SwanAuth && window.SwanAuth.getCurrentUser) ? window.SwanAuth.getCurrentUser() : null;
            if (user) {
                const initial = (user.username || user.email || 'A')[0].toUpperCase();
                const name = user.username || user.email || 'Administrator';
                ['sidebarUserInitial', 'topbarProfileBtn'].forEach(function (id) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = initial;
                });
                const nameEl = document.getElementById('sidebarUserName');
                if (nameEl) nameEl.textContent = name;
            }

            // Check URL parameters for preset search or status
            const params = new URLSearchParams(window.location.search);
            if (params.get('search')) {
                searchQuery = params.get('search');
                const sInp = document.getElementById('reqSearchInput');
                if (sInp) sInp.value = searchQuery;
            }
            if (params.get('status')) {
                statusFilter = params.get('status');
                document.querySelectorAll('.filter-pill').forEach(function (p) {
                    p.classList.toggle('active', p.getAttribute('data-status') === statusFilter);
                });
            }

            await ReqPage.loadRequests();
            hideLoader();
        },

        loadStats: async function () {
            let total = 0, pending = 0, reviewing = 0, accepted = 0, rejected = 0;

            if (cachedRequests.length > 0) {
                total = cachedRequests.length;
                cachedRequests.forEach(function (r) {
                    const s = (r.status || 'pending').toLowerCase();
                    if (s === 'pending' || s === 'new') pending++;
                    else if (s === 'under_review' || s === 'reviewing') reviewing++;
                    else if (s === 'accepted' || s === 'approved') accepted++;
                    else if (s === 'rejected' || s === 'closed') rejected++;
                    else pending++;
                });
            } else {
                try {
                    const r = await apiFetch(API_BASE + '/api/v1/requests/admin/stats');
                    if (r.ok) {
                        const d = await r.json();
                        const c = d.by_status || {};
                        total = d.total || 0;
                        pending = c.pending || c.new || 0;
                        reviewing = c.under_review || c.reviewing || 0;
                        accepted = c.accepted || c.approved || 0;
                        rejected = c.rejected || c.closed || 0;
                    }
                } catch (_) {
                    if (window.SwanDB && window.SwanDB.getHelpRequestAnalytics) {
                        const s = window.SwanDB.getHelpRequestAnalytics();
                        total = s.total || 0;
                        pending = s.new_count || 0;
                        reviewing = s.reviewing_count || 0;
                        accepted = s.approved_count || 0;
                        rejected = (s.total || 0) - (pending + reviewing + accepted);
                        if (rejected < 0) rejected = 0;
                    }
                }
            }

            function setTxt(id, val) {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            }

            setTxt('statReqTotal', total);
            setTxt('statReqPending', pending);
            setTxt('statReqReviewing', reviewing);
            setTxt('statReqAccepted', accepted);

            setTxt('pillCountAll', total);
            setTxt('pillCountPending', pending);
            setTxt('pillCountReviewing', reviewing);
            setTxt('pillCountAccepted', accepted);
            setTxt('pillCountRejected', rejected);

            const badge = document.getElementById('sidebarRequestsBadge');
            if (badge) badge.textContent = pending;
        },

        loadRequests: async function () {
            const tbody = document.getElementById('reqTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="adm-empty">' + ICONS.clock + '<h3>Loading requests...</h3><p>Fetching records from backend system.</p></div></td></tr>';
            }

            let apiRequests = [];
            try {
                const url = new URL(API_BASE + '/api/v1/requests/admin', window.location.origin);
                url.searchParams.set('page_size', '50');
                if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
                if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

                const r = await apiFetch(url.toString());
                if (r.ok) {
                    const d = await r.json();
                    apiRequests = d.requests || [];
                }
            } catch (_) {}

            let localRequests = [];
            try {
                if (window.SwanDB && window.SwanDB.getHelpRequests) {
                    localRequests = window.SwanDB.getHelpRequests() || [];
                }
            } catch (_) {}

            // Merge API and local DB deduplicating by reference / id
            const seen = new Set();
            const merged = [];

            apiRequests.forEach(function (r) {
                const key = r.reference || r._id || r.id;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    if (r.reference) seen.add(r.reference);
                    if (r.id) seen.add(r.id);
                    merged.push(r);
                }
            });

            localRequests.forEach(function (r) {
                const key = r.reference || r.id;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    merged.push(r);
                }
            });

            cachedRequests = merged;
            ReqPage.renderTable();
            ReqPage.loadStats();
        },

        getFiltered: function () {
            let list = cachedRequests.slice();

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                list = list.filter(function (r) {
                    const ref = r.reference || r.id || '';
                    const name = (r.applicant && r.applicant.full_name) || r.full_name || '';
                    const phone = (r.applicant && r.applicant.mobile) || r.phone || '';
                    const email = (r.applicant && r.applicant.email) || r.email || '';
                    const type = r.support_type || (r.request && r.request.support_type) || r.help_type || '';
                    return [ref, name, phone, email, type].some(function (v) {
                        return String(v).toLowerCase().indexOf(q) > -1;
                    });
                });
            }

            // Status filter
            if (statusFilter !== 'all') {
                list = list.filter(function (r) {
                    const s = (r.status || '').toLowerCase();
                    if (statusFilter === 'pending') return s === 'pending' || s === 'new';
                    if (statusFilter === 'under_review') return s === 'under_review' || s === 'reviewing';
                    if (statusFilter === 'accepted') return s === 'accepted' || s === 'approved';
                    if (statusFilter === 'rejected') return s === 'rejected' || s === 'closed';
                    return s === statusFilter;
                });
            }

            // Date filtering
            if (dateFrom || dateTo) {
                const from = dateFrom ? new Date(dateFrom) : null;
                const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
                list = list.filter(function (r) {
                    const d = new Date(r.created_at || 0);
                    if (from && d < from) return false;
                    if (to && d > to) return false;
                    return true;
                });
            }

            // Sorting
            list.sort(function (a, b) {
                const da = new Date(a.created_at || 0).getTime();
                const db = new Date(b.created_at || 0).getTime();
                return sortOrder === 'oldest' ? (da - db) : (db - da);
            });

            return list;
        },

        renderTable: function () {
            const tbody = document.getElementById('reqTableBody');
            const cl = document.getElementById('reqCountLabel');
            if (!tbody) return;

            const list = ReqPage.getFiltered();
            if (cl) cl.textContent = 'Showing ' + list.length + ' request' + (list.length !== 1 ? 's' : '');

            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="adm-empty">'
                    + ICONS.search
                    + '<h3>No help requests found</h3>'
                    + '<p>Try clearing filters or adjusting your search term.</p>'
                    + '<button class="btn-secondary" style="margin-top:12px;" onclick="ReqPage.clearFilters()">Clear All Filters</button>'
                    + '</div></td></tr>';
                return;
            }

            const helpTypeLabels = {
                medical: 'Medical Care', education: 'Education', food: 'Food Relief',
                housing: 'Housing & Shelter', emergency: 'Disaster Relief',
                community_development: 'Water & Sanitation', other: 'General Aid'
            };

            tbody.innerHTML = list.map(function (req) {
                const refId = req.reference || req.id || '--';
                const targetId = req.id || refId;
                const name = (req.applicant && req.applicant.full_name) || req.full_name || 'Applicant';
                const phone = (req.applicant && req.applicant.mobile) || req.phone || '';
                const email = (req.applicant && req.applicant.email) || req.email || '';
                const contact = phone || email || '';
                const rawType = req.support_type || (req.request && req.request.support_type) || req.help_type || 'other';
                const typeLabel = helpTypeLabels[rawType] || rawType.replace(/_/g, ' ');
                const urgency = (req.urgency || (req.request && req.request.urgency) || 'normal').toLowerCase();
                const status = (req.status || 'pending').toLowerCase();
                const created = req.created_at || '';

                return '<tr onclick="ReqPage.openRequest(\'' + esc(targetId) + '\')">'
                    + '<td><span class="ref-badge">' + esc(refId) + '</span></td>'
                    + '<td><div class="applicant-cell"><span class="applicant-name">' + esc(name) + '</span>'
                    + (contact ? '<span class="applicant-meta">' + esc(contact) + '</span>' : '') + '</div></td>'
                    + '<td><span class="support-tag">' + esc(typeLabel) + '</span></td>'
                    + '<td><span class="urgency-badge ' + esc(urgency) + '">' + esc(urgency) + '</span></td>'
                    + '<td>' + (created ? fmt(created) : '--') + '</td>'
                    + '<td><span class="status-pill ' + esc(status) + '"><span class="status-dot"></span>' + esc(status.replace('_', ' ')) + '</span></td>'
                    + '<td><button class="btn-secondary" style="height:32px;font-size:12px;padding:0 12px;" onclick="event.stopPropagation();ReqPage.openRequest(\'' + esc(targetId) + '\')">'
                    + 'Review'
                    + '</button></td>'
                    + '</tr>';
            }).join('');
        },

        openRequest: function (id) {
            // Navigate directly to the separate dedicated detail page!
            window.location.href = 'admin-request-detail.html?id=' + encodeURIComponent(id);
        },

        onSearch: function (v) {
            searchQuery = v;
            ReqPage.renderTable();
        },

        onSort: function (v) {
            sortOrder = v;
            ReqPage.renderTable();
        },

        onStatusFilter: function (status, btn) {
            statusFilter = status;
            document.querySelectorAll('.filter-pill').forEach(function (p) {
                p.classList.remove('active');
            });
            if (btn) btn.classList.add('active');
            ReqPage.renderTable();
        },

        onDateFilter: function () {
            dateFrom = document.getElementById('reqDateFrom').value;
            dateTo = document.getElementById('reqDateTo').value;
            ReqPage.renderTable();
        },

        clearFilters: function () {
            searchQuery = '';
            sortOrder = 'newest';
            statusFilter = 'all';
            dateFrom = '';
            dateTo = '';

            const sInp = document.getElementById('reqSearchInput');
            if (sInp) sInp.value = '';
            const dFrom = document.getElementById('reqDateFrom');
            if (dFrom) dFrom.value = '';
            const dTo = document.getElementById('reqDateTo');
            if (dTo) dTo.value = '';
            const sortSel = document.getElementById('reqSortSelect');
            if (sortSel) sortSel.value = 'newest';

            document.querySelectorAll('.filter-pill').forEach(function (p) {
                p.classList.toggle('active', p.getAttribute('data-status') === 'all');
            });

            ReqPage.renderTable();
        },

        exportCSV: function () {
            const list = ReqPage.getFiltered();
            if (!list.length) {
                toast('No records to export', 'error');
                return;
            }
            const headers = ['Tracking ID', 'Applicant Name', 'Phone', 'Email', 'City', 'State', 'Support Category', 'Urgency', 'Amount Requested', 'Beneficiaries', 'Status', 'Date Submitted'];
            const rows = list.map(function (r) {
                const ap = r.applicant || {};
                const ri = r.request || {};
                return [
                    r.reference || r.id || '',
                    ap.full_name || r.full_name || '',
                    ap.mobile || r.phone || '',
                    ap.email || r.email || '',
                    ap.city || r.city || '',
                    ap.state || r.state || '',
                    r.support_type || ri.support_type || r.help_type || '',
                    r.urgency || ri.urgency || '',
                    ri.amount_required || r.estimated_amount || '',
                    ri.beneficiaries || r.beneficiaries || 1,
                    r.status || 'pending',
                    r.created_at || ''
                ].map(function (v) {
                    return '"' + String(v).replace(/"/g, '""') + '"';
                }).join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'Swan_Help_Requests_' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast('CSV exported successfully', 'success');
        }
    };

    window.ReqPage = ReqPage;
})(window, document);
