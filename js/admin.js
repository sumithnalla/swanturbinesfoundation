/**
 * Swan Turbines Foundation — Admin Dashboard v3.0
 * Pure SVG icons, Google Ads-style UI/UX, Website CSS aligned
 */
(function () {
    'use strict';

    const esc = function(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const fmt = function(v) {
        try {
            return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (_) {
            return String(v || '--');
        }
    };

    const API_BASE = window.__API_BASE_URL__ || (
        ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000' : ''
    );

    // Fetch wrapper that always attaches the admin JWT token as Authorization header
    function apiFetch(url, options) {
        options = options || {};
        options.credentials = 'include';
        const token = window.SwanAuth && window.SwanAuth.getAdminToken ? window.SwanAuth.getAdminToken() : null;
        if (token) {
            options.headers = Object.assign({ 'Authorization': 'Bearer ' + token }, options.headers || {});
        }
        return fetch(url, options);
    }

    // SVGs helper
    const ICONS = {
        water: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
        education: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        eco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
        hunger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
        medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
        nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 4 5 10 5 10s5-6 5-10a5 5 0 0 0-5-5z"/><circle cx="12" cy="7" r="1.5"/></svg>',
        relief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        women: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
        paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        rupee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>',
        alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        calender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    };

    let cachedRequests = [];
    let currentPage = 'campaigns';
    let currentRequestId = null;
    let searchQuery = '';
    let sortOrder = 'newest';
    let statusFilter = 'all';
    let dateFrom = '';
    let dateTo = '';

    function toast(msg, type, dur) {
        type = type || 'default';
        dur = dur || 3200;
        const c = document.getElementById('admToastContainer');
        if (!c) return;
        const el = document.createElement('div');
        el.className = 'adm-toast ' + type;
        el.innerHTML = msg;
        c.appendChild(el);
        setTimeout(function () {
            el.style.opacity = '0';
            el.style.transition = 'opacity .3s ease';
            setTimeout(function () { el.remove(); }, 320);
        }, dur);
    }

    function hideLoader() {
        const l = document.getElementById('admLoader');
        if (l) {
            l.classList.add('hidden');
            setTimeout(function () { l.remove(); }, 400);
        }
    }

    const NAV_ITEMS = {
        'campaigns':      { title: 'Foundation Campaigns', navId: 'navCampaigns' },
        'requests':       { title: 'Help Requests Overview',  navId: 'navRequests' },
        'request-detail': { title: 'Review Help Request', navId: 'navRequests' },
        'profile':        { title: 'Administrator Profile', navId: 'navProfile' }
    };

    const App = {
        init: async function () {
            if (window.SwanAuth && typeof window.SwanAuth.requireAuth === 'function') {
                if (!window.SwanAuth.requireAuth('admin')) return;
            }

            const user = (window.SwanAuth && window.SwanAuth.getCurrentUser) ? window.SwanAuth.getCurrentUser() : null;
            if (user) {
                const initial = (user.username || user.email || 'A')[0].toUpperCase();
                const name = user.username || user.email || 'Administrator';
                ['sidebarUserInitial', 'topbarProfileBtn', 'profileAvatar'].forEach(function (id) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = initial;
                });
                ['sidebarUserName', 'profileName'].forEach(function (id) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = name;
                });
                ['profileEmail', 'profileEmailRow', 'profileUsername'].forEach(function (id) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = user.email || user.username || 'admin@swanturbinesfoundation.com';
                });
            }

            await App.loadStats();
            App.renderCampaigns();
            App.navigate('campaigns');
            hideLoader();
        },

        navigate: function (page) {
            document.querySelectorAll('.adm-page').forEach(function (p) {
                p.classList.remove('active');
            });
            const pageEl = document.getElementById('page-' + page);
            if (pageEl) pageEl.classList.add('active');

            document.querySelectorAll('.adm-nav-item').forEach(function (n) {
                n.classList.remove('active');
            });

            const info = NAV_ITEMS[page];
            if (info) {
                const t = document.getElementById('admTopbarTitle');
                if (t) t.innerHTML = '<span>' + esc(info.title) + '</span>';
                const n = document.getElementById(info.navId);
                if (n) n.classList.add('active');
            }

            currentPage = page;
            if (page === 'requests') App.loadRequests();
            if (page === 'profile')  App.loadStats();

            const c = document.getElementById('admContent');
            if (c) c.scrollTop = 0;
        },

        refresh: function () {
            if (currentPage === 'campaigns') {
                App.renderCampaigns();
                App.loadStats();
            } else if (currentPage === 'requests') {
                App.loadRequests();
            } else if (currentPage === 'request-detail' && currentRequestId) {
                App.openRequest(currentRequestId);
            } else if (currentPage === 'profile') {
                App.loadStats();
            }
            toast('Dashboard updated', 'info', 2000);
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
            setTxt('statCampPendingReq', pending);
            setTxt('statReqReviewing', reviewing);
            setTxt('statReqAccepted', accepted);

            setTxt('profileStatTotal', total);
            setTxt('profileStatPending', pending);
            setTxt('profileStatAccepted', accepted);

            setTxt('pillCountAll', total);
            setTxt('pillCountPending', pending);
            setTxt('pillCountReviewing', reviewing);
            setTxt('pillCountAccepted', accepted);
            setTxt('pillCountRejected', rejected);

            const badge = document.getElementById('sidebarRequestsBadge');
            if (badge) badge.textContent = pending;
        },

        renderCampaigns: function () {
            const campaigns = [
                { key: 'water', cat: 'Clean Water', name: 'Clean Water Initiative', desc: 'Providing safe drinking water to remote villages through community filtration and sustainable solar borewells.', url: 'campaign-water.html' },
                { key: 'education', cat: 'Education', name: 'Education for All', desc: 'Sponsoring school supplies, digital laboratories, and learning infrastructure for underprivileged rural students.', url: 'campaign-education.html' },
                { key: 'eco', cat: 'Environment', name: 'Eco-Restoration Project', desc: 'Mass tree plantation, waterbody revitalization, and environmental awareness to fight desertification.', url: 'campaign-eco.html' },
                { key: 'hunger', cat: 'Hunger Relief', name: 'End Hunger Campaign', desc: 'Daily nutritional meal distribution and emergency dry ration support for daily-wage families.', url: 'campaign-hunger.html' },
                { key: 'medical', cat: 'Healthcare', name: 'Medical Aid Program', desc: 'Subsidized health camps, emergency surgeries, and free essential medicines for critical patients.', url: 'campaign-medical.html' },
                { key: 'nutrition', cat: 'Child Health', name: 'Nutrition & Maternal Care', desc: 'Combating childhood stunting with fortified supplements, pediatric care, and mother counseling.', url: 'campaign-nutrition.html' },
                { key: 'relief', cat: 'Emergency Aid', name: 'Disaster Relief Fund', desc: 'Rapid humanitarian response providing temporary shelters, emergency food, and medical teams.', url: 'campaign-relief.html' },
                { key: 'women', cat: 'Empowerment', name: 'Women Empowerment', desc: 'Vocational training, micro-enterprise financing, and legal aid helping rural women become self-reliant.', url: 'campaign-women.html' }
            ];

            const grid = document.getElementById('campaignsGrid');
            if (!grid) return;

            grid.innerHTML = campaigns.map(function (c) {
                const iconSvg = ICONS[c.key] || ICONS.eco;
                return '<div class="adm-campaign-card">'
                    + '<div class="adm-campaign-header">'
                    + '<div class="adm-campaign-icon-wrap">' + iconSvg + '</div>'
                    + '<span class="status-pill accepted"><span class="status-dot"></span> Active</span>'
                    + '</div>'
                    + '<div class="adm-campaign-body">'
                    + '<div class="adm-campaign-cat">' + esc(c.cat) + '</div>'
                    + '<div class="adm-campaign-name">' + esc(c.name) + '</div>'
                    + '<div class="adm-campaign-desc">' + esc(c.desc) + '</div>'
                    + '<div class="adm-campaign-footer">'
                    + '<button class="btn-secondary" style="height:32px;font-size:12.5px;" onclick="window.open(\'' + c.url + '\',\'_blank\')">'
                    + 'View Public Page'
                    + '</button>'
                    + '<button class="btn-ghost" style="height:32px;font-size:12.5px;" onclick="AdminApp.filterByCampaign(\'' + esc(c.cat) + '\')">'
                    + 'View Requests'
                    + '</button>'
                    + '</div></div></div>';
            }).join('');
        },

        filterByCampaign: function (category) {
            searchQuery = category;
            const input = document.getElementById('reqSearchInput');
            if (input) input.value = category;
            App.navigate('requests');
        },

        loadRequests: async function () {
            const tbody = document.getElementById('reqTableBody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="7"><div class="adm-empty">' + ICONS.clock + '<h3>Loading requests...</h3><p>Fetching records from backend system.</p></div></td></tr>';

            let apiRequests = [];
            let apiAvailable = false;
            try {
                const url = new URL(API_BASE + '/api/v1/requests/admin', window.location.origin);
                url.searchParams.set('page_size', '500');
                if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
                if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

                const r = await apiFetch(url.toString());
                if (r.ok) {
                    const d = await r.json();
                    apiRequests = d.requests || [];
                    apiAvailable = true;
                }
            } catch (_) {}

            let localRequests = [];
            try {
                if (window.SwanDB && window.SwanDB.getHelpRequests) {
                    localRequests = window.SwanDB.getHelpRequests() || [];
                }
            } catch (_) {}

            // Merge: API records first (no duplicates), then any local-only offline records
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
            App.renderTable();
            App.loadStats();
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
                    const type = r.support_type || (r.request && r.request.support_type) || r.help_type || '';
                    return [ref, name, phone, type].some(function (v) {
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

            const list = App.getFiltered();
            if (cl) cl.textContent = 'Showing ' + list.length + ' request' + (list.length !== 1 ? 's' : '');

            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="adm-empty">'
                    + ICONS.search
                    + '<h3>No help requests found</h3>'
                    + '<p>Try clearing filters or adjusting your search term.</p>'
                    + '<button class="btn-secondary" style="margin-top:12px;" onclick="AdminApp.clearFilters()">Clear All Filters</button>'
                    + '</div></td></tr>';
                return;
            }

            tbody.innerHTML = list.map(function (req) {
                const refId = req.reference || req.id || '--';
                const targetId = req.id || refId;
                const name = (req.applicant && req.applicant.full_name) || req.full_name || 'Anonymous';
                const contact = (req.applicant && req.applicant.mobile) || req.phone || (req.applicant && req.applicant.email) || '';
                const type = req.support_type || (req.request && req.request.support_type) || req.help_type || 'General Support';
                const urgency = (req.urgency || (req.request && req.request.urgency) || 'normal').toLowerCase();
                const status = (req.status || 'pending').toLowerCase();
                const created = req.created_at || '';

                return '<tr onclick="AdminApp.openRequest(\'' + esc(targetId) + '\')">'
                    + '<td><span class="ref-badge">' + esc(refId) + '</span></td>'
                    + '<td><div class="applicant-cell"><span class="applicant-name">' + esc(name) + '</span>'
                    + (contact ? '<span class="applicant-meta">' + esc(contact) + '</span>' : '') + '</div></td>'
                    + '<td><span class="support-tag">' + esc(type) + '</span></td>'
                    + '<td><span class="urgency-badge ' + esc(urgency) + '">' + esc(urgency) + '</span></td>'
                    + '<td>' + (created ? fmt(created) : '--') + '</td>'
                    + '<td><span class="status-pill ' + esc(status) + '"><span class="status-dot"></span>' + esc(status.replace('_', ' ')) + '</span></td>'
                    + '<td><button class="btn-secondary" style="height:32px;font-size:12px;padding:0 12px;" onclick="event.stopPropagation();AdminApp.openRequest(\'' + esc(targetId) + '\')">'
                    + 'Review'
                    + '</button></td>'
                    + '</tr>';
            }).join('');
        },

        onSearch: function (v) {
            searchQuery = v;
            App.renderTable();
        },

        onSort: function (v) {
            sortOrder = v;
            App.renderTable();
        },

        onStatusFilter: function (status, btn) {
            statusFilter = status;
            document.querySelectorAll('.filter-pill').forEach(function (p) {
                p.classList.remove('active');
            });
            if (btn) btn.classList.add('active');
            App.loadRequests();
        },

        onDateFilter: function () {
            dateFrom = document.getElementById('reqDateFrom').value;
            dateTo = document.getElementById('reqDateTo').value;
            App.renderTable();
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

            App.loadRequests();
        },

        openRequest: async function (id) {
            currentRequestId = id;
            App.navigate('request-detail');

            const container = document.getElementById('requestDetailContent');
            if (!container) return;
            container.innerHTML = '<div class="adm-empty">' + ICONS.clock + '<h3>Loading request details...</h3></div>';

            let req = null;
            try {
                const r = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(id));
                if (r.ok) req = await r.json();
            } catch (_) {}

            if (!req) {
                req = cachedRequests.find(function (r) {
                    return String(r.id) === String(id) || String(r.reference) === String(id);
                });
                if (!req && window.SwanDB && window.SwanDB.getHelpRequestById) {
                    req = window.SwanDB.getHelpRequestById(id);
                }
            }

            if (!req) {
                container.innerHTML = '<div class="adm-empty">' + ICONS.xCircle + '<h3>Request not found</h3><p>The requested file could not be located.</p></div>';
                return;
            }

            const ap = req.applicant || {};
            const ri = req.request || {};
            const refId = req.reference || req.id || id;
            const name = ap.full_name || req.full_name || 'Applicant';
            const phone = ap.mobile || req.phone || '';
            const email = ap.email || req.email || '';
            const addrStreet = ap.address || req.address || '';
            const addrCity   = ap.city || '';
            const addrState  = ap.state || '';
            const addrPin    = ap.pincode || '';
            const fullAddr   = [addrStreet, addrCity, addrState, addrPin].filter(Boolean).join(', ') || 'Address not specified';
            const type = ri.support_type || req.support_type || req.help_type || 'General Support';
            const urgency = (ri.urgency || req.urgency || 'normal').toLowerCase();
            const amount = ri.amount_required || req.estimated_amount || req.amount_required || '';
            const benefics = ri.beneficiaries || req.beneficiaries || 1;
            const desc = ri.description || req.description || 'No detailed background provided.';
            const status = (req.status || 'pending').toLowerCase();
            const adminNote = req.admin_note || '';
            const created = req.created_at ? fmt(req.created_at) : '--';
            const updated = req.updated_at ? fmt(req.updated_at) : '--';
            const docCount = req.document_count || (req.document_ids ? req.document_ids.length : 0);
            const targetId = req.id || id;

            // Set header badge
            const hb = document.getElementById('detailHeaderBadge');
            if (hb) {
                hb.innerHTML = '<span class="status-pill ' + esc(status) + '"><span class="status-dot"></span>' + esc(status.replace('_', ' ')) + '</span>';
            }
            const ht = document.getElementById('detailHeaderTitle');
            if (ht) {
                ht.textContent = name + ' (' + refId + ')';
            }

            function isSel(v) {
                if (v === 'pending') return status === 'pending' || status === 'new';
                if (v === 'under_review') return status === 'under_review' || status === 'reviewing';
                if (v === 'accepted') return status === 'accepted' || status === 'approved';
                if (v === 'rejected') return status === 'rejected' || status === 'closed';
                return status === v;
            }

            function selCls(v) {
                const m = { pending: 'sel-pending', under_review: 'sel-reviewing', accepted: 'sel-accepted', rejected: 'sel-rejected' };
                return m[v] || '';
            }

            function field(label, value, full) {
                return '<div class="adm-info-field' + (full ? ' full' : '') + '"><div class="adm-field-label">' + label + '</div><div class="adm-field-value">' + (value || '<span style="color:var(--text-muted);font-style:italic;">Not provided</span>') + '</div></div>';
            }

            const statusOptions = [
                { val: 'pending', label: 'Pending / Initial Review', desc: 'Case received and queued for investigation.' },
                { val: 'under_review', label: 'Under Review & Verification', desc: 'Document verification and volunteer visit scheduled.' },
                { val: 'accepted', label: 'Accepted / Approved for Aid', desc: 'Approved for foundation grant and emergency fund release.' },
                { val: 'rejected', label: 'Rejected / Ineligible', desc: 'Application does not meet trust charter or funding requirements.' }
            ];

            const helpTypeLabels = {
                medical: 'Medical Aid', education: 'Education Support', disaster_relief: 'Disaster Relief',
                nutrition: 'Nutrition / Food', water: 'Water & Sanitation', livelihood: 'Livelihood Support',
                women_empowerment: 'Women Empowerment', environment: 'Environmental Aid', other: 'General / Other'
            };
            const typeLabel = helpTypeLabels[type] || type;

            container.innerHTML =
                '<div class="adm-detail-grid">'

                // ── LEFT COLUMN ──────────────────────────────────────────
                + '<div class="adm-detail-main-col">'

                // STEP 1 — Applicant Personal Details
                + '<div class="adm-card">'
                + '<div class="adm-card-title">' + ICONS.user + ' Step 1 &mdash; Applicant Personal Details</div>'
                + '<div class="adm-info-grid">'
                + field('Full Name', esc(name))
                + field('Contact Number', phone ? '<a href="tel:' + esc(phone) + '" style="display:inline-flex;align-items:center;gap:6px;">' + ICONS.phone + esc(phone) + '</a>' : '')
                + field('Email Address', email ? '<a href="mailto:' + esc(email) + '" style="display:inline-flex;align-items:center;gap:6px;">' + ICONS.mail + esc(email) + '</a>' : '')
                + field('Street / Address', esc(addrStreet))
                + field('City', esc(addrCity))
                + field('State', esc(addrState))
                + (addrPin ? field('PIN Code', esc(addrPin)) : '')
                + field('Full Address', '<span style="display:flex;align-items:flex-start;gap:6px;">' + ICONS.mapPin + esc(fullAddr) + '</span>', true)
                + '</div></div>'

                // STEP 2 — Request Details
                + '<div class="adm-card">'
                + '<div class="adm-card-title">' + ICONS.fileText + ' Step 2 &mdash; Request Details &amp; Financial Need</div>'
                + '<div class="adm-info-grid">'
                + field('Aid Category', '<span class="support-tag">' + esc(typeLabel) + '</span>')
                + field('Urgency Level', '<span class="urgency-badge ' + esc(urgency) + '">' + esc(urgency) + '</span>')
                + field('Estimated Aid Amount', amount ? '<span style="color:var(--primary);font-size:18px;font-weight:700;">&#8377; ' + Number(amount).toLocaleString('en-IN') + '</span>' : '')
                + field('Beneficiaries', '<span style="display:inline-flex;align-items:center;gap:6px;">' + ICONS.users + esc(benefics) + ' person(s)</span>')
                + field('Date Submitted', '<span style="display:inline-flex;align-items:center;gap:6px;">' + ICONS.calender + esc(created) + '</span>')
                + field('Last Updated', esc(updated))
                + '<div class="adm-info-field full"><div class="adm-field-label">Detailed Case Description</div><div class="adm-desc-box">' + esc(desc) + '</div></div>'
                + '</div></div>'

                // STEP 3 — Documents (placeholder, filled async below)
                + '<div class="adm-card" id="docsSection">'
                + '<div class="adm-card-title">' + ICONS.paperclip + ' Step 3 &mdash; Supporting Documents</div>'
                + '<div id="docsContent" style="padding:4px 0;">'
                + (docCount === 0
                    ? '<div style="display:flex;align-items:center;gap:10px;padding:14px;border-radius:8px;background:var(--surface-raised);color:var(--text-muted);font-size:13px;">' + ICONS.paperclip + ' No documents were uploaded with this request.</div>'
                    : '<div style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:13px;">' + ICONS.clock + ' Loading ' + docCount + ' document(s)&hellip;</div>'
                  )
                + '</div></div>'

                + '</div>'

                // ── RIGHT COLUMN ─────────────────────────────────────────
                + '<div class="adm-detail-sidebar-col">'

                // Decision card
                + '<div class="adm-decision-card">'
                + '<h3>' + ICONS.check + ' Case Adjudication</h3>'
                + '<div style="margin-bottom:14px;font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.6px;">Select New Status</div>'
                + '<div class="adm-status-choices">'
                + statusOptions.map(function (opt) {
                    const active = isSel(opt.val);
                    return '<label class="adm-status-choice ' + (active ? selCls(opt.val) : '') + '" id="choice-' + opt.val + '">'
                        + '<input type="radio" name="detailReqStatus" value="' + opt.val + '" ' + (active ? 'checked' : '') + ' onchange="AdminApp.onStatusChoiceChange(\'' + opt.val + '\')">' 
                        + '<div><div style="font-weight:700;">' + esc(opt.label) + '</div><div style="font-size:11.5px;color:inherit;opacity:0.8;">' + esc(opt.desc) + '</div></div>'
                        + '</label>';
                }).join('')
                + '</div>'
                + '<div style="margin-bottom:6px;font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.6px;">Internal Case Notes</div>'
                + '<textarea class="adm-textarea" id="adminCaseNotes" rows="4" placeholder="Record verification remarks, interview outcomes, or reasons for decision...">' + esc(adminNote) + '</textarea>'
                + '<div style="display:flex;flex-direction:column;gap:10px;">'
                + '<button class="btn-primary" id="saveDecisionBtn" style="width:100%;height:44px;justify-content:center;" onclick="AdminApp.saveDecision(\'' + esc(targetId) + '\')">' + ICONS.save + ' Save Case Decision</button>'
                + '<button class="btn-secondary" style="width:100%;height:38px;justify-content:center;" onclick="AdminApp.navigate(\'requests\')">Cancel &amp; Return</button>'
                + '</div>'
                + '</div>'

                // Meta summary card
                + '<div class="adm-card" style="margin-top:20px;">'
                + '<div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Tracking ID</span>'
                + '<span class="ref-badge">' + esc(refId) + '</span>'
                + '</div>'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Current Status</span>'
                + '<span class="status-pill ' + esc(status) + '"><span class="status-dot"></span>' + esc(status.replace('_', ' ')) + '</span>'
                + '</div>'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Urgency</span>'
                + '<span class="urgency-badge ' + esc(urgency) + '">' + esc(urgency) + '</span>'
                + '</div>'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Documents</span>'
                + '<span style="font-weight:600;">' + docCount + ' file(s)</span>'
                + '</div>'
                + '</div></div>'
                + '</div>'

                + '</div>';

            // Asynchronously load documents list if there might be any
            if (docCount > 0) {
                App._loadDocuments(targetId, refId);
            }
        },

        _loadDocuments: async function (requestId, refId) {
            const docsContent = document.getElementById('docsContent');
            if (!docsContent) return;
            let docs = [];
            try {
                const r = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(requestId) + '/documents');
                if (r.ok) docs = await r.json();
            } catch (_) {}

            if (!docs || !docs.length) {
                docsContent.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:14px;border-radius:8px;background:var(--surface-raised);color:var(--text-muted);font-size:13px;">' + ICONS.paperclip + ' No documents found for this request.</div>';
                return;
            }

            function fileIcon(ct) {
                if (!ct) return ICONS.fileText;
                if (ct.includes('pdf')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9 9 10 9 11 9"/></svg>';
                if (ct.includes('image')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                return ICONS.fileText;
            }

            function fmtSize(bytes) {
                if (!bytes) return '';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / 1048576).toFixed(1) + ' MB';
            }

            docsContent.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;">'
                + docs.map(function (doc) {
                    const dlUrl = API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(requestId) + '/documents/' + encodeURIComponent(doc.id || doc._id || '') + '/download';
                    const fname = esc(doc.original_filename || 'document');
                    const fsize = fmtSize(doc.size_bytes);
                    const ftype = esc(doc.content_type || '');
                    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;background:var(--surface-raised);border:1px solid var(--border-subtle);gap:12px;">'
                        + '<div style="display:flex;align-items:center;gap:12px;min-width:0;">'
                        + '<span style="flex-shrink:0;width:36px;height:36px;border-radius:8px;background:var(--primary-alpha,rgba(16,120,220,0.1));display:flex;align-items:center;justify-content:center;color:var(--primary);">' + fileIcon(doc.content_type) + '</span>'
                        + '<div style="min-width:0;">'
                        + '<div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + fname + '">' + fname + '</div>'
                        + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + ftype + (fsize ? ' &bull; ' + fsize : '') + '</div>'
                        + '</div></div>'
                        + '<a href="' + dlUrl + '" target="_blank" onclick="AdminApp._authDownload(event, \'' + dlUrl + '\', \'' + fname + '\')" title="Download" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;background:var(--primary);color:#fff;font-size:12px;font-weight:600;text-decoration:none;border:none;cursor:pointer;">'
                        + ICONS.download + ' Download</a>'
                        + '</div>';
                }).join('')
                + '</div>';
        },

        _authDownload: async function (evt, url, filename) {
            evt.preventDefault();
            try {
                const r = await apiFetch(url);
                if (!r.ok) throw new Error('Download failed');
                const blob = await r.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename || 'document';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
                toast('Document downloaded successfully', 'success');
            } catch (e) {
                toast('Download failed — ' + e.message, 'error');
            }
        },

        onStatusChoiceChange: function (val) {
            const map = { pending: 'sel-pending', under_review: 'sel-reviewing', accepted: 'sel-accepted', rejected: 'sel-rejected' };
            document.querySelectorAll('.adm-status-choice').forEach(function (choice) {
                const inp = choice.querySelector('input[type="radio"]');
                const v = inp ? inp.value : '';
                choice.className = 'adm-status-choice' + (v === val ? ' ' + (map[v] || '') : '');
            });
        },

        saveDecision: async function (id) {
            const btn = document.getElementById('saveDecisionBtn');
            const inp = document.querySelector('input[name="detailReqStatus"]:checked');
            const noteEl = document.getElementById('adminCaseNotes');

            if (!inp) {
                toast('Please choose a status decision', 'error');
                return;
            }

            const newStatus = inp.value;
            const noteVal = noteEl ? noteEl.value : '';

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = ICONS.clock + ' Saving Decision...';
            }

            try {
                const r = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(id) + '/status', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus, admin_note: noteVal })
                });
                if (!r.ok) throw new Error('API update failed');
            } catch (_) {
                if (window.SwanDB && window.SwanDB.updateHelpRequest) {
                    window.SwanDB.updateHelpRequest(id, { status: newStatus, admin_note: noteVal });
                }
            }

            toast('Case decision saved successfully!', 'success');

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = ICONS.save + ' Save Case Decision';
            }

            // Update in cache
            const idx = cachedRequests.findIndex(function (r) {
                return String(r.id) === String(id) || String(r.reference) === String(id);
            });
            if (idx !== -1) {
                cachedRequests[idx].status = newStatus;
                cachedRequests[idx].admin_note = noteVal;
            }

            await App.loadStats();
            App.openRequest(id);
        },

        exportCSV: function () {
            const list = cachedRequests.length ? cachedRequests : (window.SwanDB ? window.SwanDB.getHelpRequests() : []);
            if (!list.length) {
                toast('No requests available to export', 'error');
                return;
            }

            const q = function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; };
            const rows = list.map(function (req) {
                return [
                    req.reference || req.id,
                    (req.applicant && req.applicant.full_name) || req.full_name || '',
                    (req.applicant && req.applicant.mobile) || req.phone || '',
                    (req.applicant && req.applicant.email) || req.email || '',
                    req.support_type || (req.request && req.request.support_type) || req.help_type || '',
                    req.urgency || (req.request && req.request.urgency) || '',
                    req.status || '',
                    req.created_at || ''
                ].map(q).join(',');
            });

            const blob = new Blob([['Reference_ID,Applicant_Name,Mobile,Email,Category,Urgency,Status,Date_Submitted'].concat(rows).join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Swan_Turbines_Requests_' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast('CSV report generated &amp; downloaded', 'success');
        }
    };

    window.AdminApp = App;
    window.SwanAdmin = App;
})();
