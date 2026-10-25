/**
 * Swan Turbines Foundation — Admin Individual Request Detail Script
 * Powers admin-request-detail.html
 */
(function (window, document) {
    'use strict';

    const API_BASE = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';
    let currentRequestId = null;
    let currentRequestData = null;

    const ICONS = {
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        calender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        externalLink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>'
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
            return dt.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
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

    const RequestDetail = {
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

            // Get ID from query params (?id=...)
            const params = new URLSearchParams(window.location.search);
            const reqId = params.get('id');

            if (!reqId) {
                const container = document.getElementById('requestDetailContent');
                if (container) {
                    container.innerHTML = '<div class="adm-empty">'
                        + ICONS.xCircle
                        + '<h3>No Request ID Specified</h3>'
                        + '<p>Please select a help request from the requests overview table.</p>'
                        + '<a href="admin-requests.html" class="btn-primary" style="margin-top:14px;text-decoration:none;">Go to Help Requests</a>'
                        + '</div>';
                }
                const title = document.getElementById('detailHeaderTitle');
                if (title) title.textContent = 'Invalid Request';
                hideLoader();
                return;
            }

            currentRequestId = reqId;
            await RequestDetail.loadDetail(reqId);
            hideLoader();
        },

        loadDetail: async function (id) {
            const container = document.getElementById('requestDetailContent');
            if (!container) return;

            let req = null;
            let loadError = '';
            try {
                const r = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(id));
                if (r.ok) {
                    req = await r.json();
                } else {
                    const body = await r.json().catch(function () { return {}; });
                    loadError = body?.error?.message || `Request could not be loaded (HTTP ${r.status}).`;
                }
            } catch (error) { loadError = error?.message || 'Network error while loading the request.'; }

            if (!req && !loadError && window.SwanDB && window.SwanDB.getHelpRequestById) {
                req = window.SwanDB.getHelpRequestById(id);
            }

            if (!req) {
                container.innerHTML = '<div class="adm-empty">'
                    + ICONS.xCircle
                    + '<h3>' + (loadError ? 'Request Could Not Be Verified' : 'Request Not Found') + '</h3>'
                    + '<p>' + esc(loadError || ('The requested file (' + id + ') could not be located in the database.')) + '</p>'
                    + '<a href="admin-requests.html" class="btn-secondary" style="margin-top:14px;text-decoration:none;">← Return to Requests</a>'
                    + '</div>';
                const title = document.getElementById('detailHeaderTitle');
                if (title) title.textContent = 'Not Found';
                return;
            }

            currentRequestData = req;

            const ap = req.applicant || {};
            const ri = req.request || {};
            const refId = req.reference || req.id || id;
            const name = ap.full_name || req.full_name || 'Applicant';
            const phone = ap.mobile || req.phone || '';
            const email = ap.email || req.email || '';
            const addrStreet = ap.address || req.address || '';
            const addrCity   = ap.city || req.city || '';
            const addrState  = ap.state || req.state || '';
            const addrPin    = ap.pincode || req.pincode || '';
            const fullAddr   = [addrStreet, addrCity, addrState, addrPin].filter(Boolean).join(', ') || 'Address not specified';

            const rawType = ri.support_type || req.support_type || req.help_type || 'other';
            const helpTypeLabels = {
                medical: 'Medical Care & Surgeries',
                education: 'Education & Schooling',
                food: 'Food & Nutrition Packs',
                housing: 'Shelter & Housing Repair',
                emergency: 'Disaster & Emergency Relief',
                community_development: 'Water & Community Sanitation',
                other: 'Humanitarian & General Aid'
            };
            const typeLabel = helpTypeLabels[rawType] || rawType.replace(/_/g, ' ');

            const urgency = (ri.urgency || req.urgency || 'normal').toLowerCase();
            const amountRaw = ri.amount_required || req.estimated_amount || req.amount_required || '';
            const amountFormatted = amountRaw ? (isNaN(Number(amountRaw)) ? amountRaw : '₹ ' + Number(amountRaw).toLocaleString('en-IN')) : 'Not specified';
            const benefics = ri.beneficiaries || req.beneficiaries || 1;
            const desc = ri.description || req.description || 'No detailed background provided.';
            const consentGiven = req.consent !== false;
            const status = (req.status || 'pending').toLowerCase();
            const adminNote = req.admin_note || '';
            const created = req.created_at ? fmt(req.created_at) : '--';
            const updated = req.updated_at ? fmt(req.updated_at) : '--';
            const docCount = req.document_count != null ? req.document_count : (req.document_ids ? req.document_ids.length : 0);
            const targetId = req.id || id;

            // Set Header Title & Badge
            const titleEl = document.getElementById('detailHeaderTitle');
            if (titleEl) {
                titleEl.textContent = name + ' — ' + refId;
            }

            const badgeEl = document.getElementById('detailHeaderBadge');
            if (badgeEl) {
                badgeEl.innerHTML = '<span class="status-pill ' + esc(status) + '" style="font-size:13px;padding:6px 14px;"><span class="status-dot"></span>' + esc(status.replace('_', ' ').toUpperCase()) + '</span>';
            }

            function field(label, value, full) {
                return '<div class="adm-info-field' + (full ? ' full' : '') + '">'
                    + '<div class="adm-field-label">' + label + '</div>'
                    + '<div class="adm-field-value">' + (value || '<span style="color:var(--text-muted);font-style:italic;">Not provided</span>') + '</div>'
                    + '</div>';
            }

            const statusOptions = [
                { val: 'pending', label: 'Pending / Initial Queue', desc: 'Application received and waiting for preliminary check.' },
                { val: 'under_review', label: 'Under Review & Verification', desc: 'Field volunteer visit or telephonic interview in progress.' },
                { val: 'accepted', label: 'Accepted / Approved for Aid', desc: 'Approved for foundation grant and emergency fund release.' },
                { val: 'rejected', label: 'Rejected / Ineligible', desc: 'Does not qualify under current charter guidelines or budget.' }
            ];

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

            container.innerHTML =
                '<div class="adm-detail-grid">'

                // ── LEFT COLUMN: ALL 3 STEPS COMPREHENSIVELY DISPLAYED ─────────
                + '<div class="adm-detail-main-col">'

                // STEP 1 CARD — APPLICANT PERSONAL DETAILS
                + '<div class="adm-card">'
                + '<div class="adm-card-title">'
                + '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;font-size:13px;font-weight:700;">1</span>'
                + '<span>Applicant Personal Information</span>'
                + '</div>'
                + '<div class="adm-info-grid">'
                + field('Full Legal Name', '<strong style="font-size:15px;color:var(--text-primary);">' + esc(name) + '</strong>')
                + field('Contact Mobile Number', phone ? '<a href="tel:' + esc(phone) + '" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">' + ICONS.phone + esc(phone) + '</a>' : '')
                + field('Email Address', email ? '<a href="mailto:' + esc(email) + '" style="display:inline-flex;align-items:center;gap:6px;">' + ICONS.mail + esc(email) + '</a>' : '<span style="color:var(--text-muted);">Not provided</span>')
                + field('City / Town', esc(addrCity))
                + field('State', esc(addrState))
                + (addrPin ? field('Postal PIN Code', esc(addrPin)) : '')
                + field('Complete Residential Address', '<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border);"><span style="color:var(--primary);flex-shrink:0;margin-top:2px;">' + ICONS.mapPin + '</span><span>' + esc(fullAddr) + '</span></div>', true)
                + '</div></div>'

                // STEP 2 CARD — REQUEST DETAILS & FINANCIAL NEED
                + '<div class="adm-card">'
                + '<div class="adm-card-title">'
                + '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;font-size:13px;font-weight:700;">2</span>'
                + '<span>Request Details &amp; Financial Need</span>'
                + '</div>'
                + '<div class="adm-info-grid">'
                + field('Assistance Category', '<span class="support-tag" style="font-size:13px;padding:4px 10px;">' + esc(typeLabel) + '</span>')
                + field('Urgency Classification', '<span class="urgency-badge ' + esc(urgency) + '" style="font-size:13px;padding:4px 10px;">' + esc(urgency.toUpperCase()) + '</span>')
                + field('Estimated Assistance Required', '<div style="color:var(--primary);font-size:18px;font-weight:800;letter-spacing:0.3px;">' + esc(amountFormatted) + '</div>')
                + field('Number of Beneficiaries', '<span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:700;">' + ICONS.users + esc(benefics) + ' person(s)</span>')
                + field('Application Submitted Date', '<span style="display:inline-flex;align-items:center;gap:6px;">' + ICONS.calender + esc(created) + '</span>')
                + field('Last Record Update', esc(updated))
                + '<div class="adm-info-field full">'
                + '<div class="adm-field-label">Detailed Case Narrative &amp; Background</div>'
                + '<div class="adm-desc-box">' + esc(desc) + '</div>'
                + '</div>'
                + '</div></div>'

                // STEP 3 CARD — SUPPORTING DOCUMENTS & CONSENT
                + '<div class="adm-card" id="docsSection">'
                + '<div class="adm-card-title">'
                + '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;font-size:13px;font-weight:700;">3</span>'
                + '<span>Supporting Documents &amp; Legal Consent</span>'
                + '</div>'

                // Consent verification badge
                + '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:8px;margin-bottom:18px;color:#065f46;font-size:13px;font-weight:600;">'
                + '<span style="color:#10b981;flex-shrink:0;">' + ICONS.checkCircle + '</span>'
                + '<span>Applicant confirmed that all details submitted are accurate and consented to verification.</span>'
                + '</div>'

                // Documents Container
                + '<div id="docsContent">'
                + '<div style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:13px;padding:12px;">'
                + ICONS.clock + ' Fetching attached documents from secure storage&hellip;'
                + '</div>'
                + '</div>'
                + '</div>'

                + '</div>'

                // ── RIGHT COLUMN: ADJUDICATION & METADATA ────────────────────
                + '<div class="adm-detail-sidebar-col">'

                // Decision Card
                + '<div class="adm-decision-card">'
                + '<h3>' + ICONS.check + ' Case Adjudication</h3>'
                + '<p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:16px;">Update the workflow status for this application. Changes are recorded in audit logs.</p>'
                + '<div class="adm-status-choices">'
                + statusOptions.map(function (opt) {
                    const active = isSel(opt.val);
                    return '<label class="adm-status-choice ' + (active ? selCls(opt.val) : '') + '" id="choice-' + opt.val + '">'
                        + '<input type="radio" name="detailReqStatus" value="' + opt.val + '" ' + (active ? 'checked' : '') + ' onchange="RequestDetail.onStatusChoiceChange(\'' + opt.val + '\')">'
                        + '<div><div style="font-weight:700;">' + esc(opt.label) + '</div><div style="font-size:11.5px;color:inherit;opacity:0.8;margin-top:2px;">' + esc(opt.desc) + '</div></div>'
                        + '</label>';
                }).join('')
                + '</div>'
                + '<div style="margin-bottom:6px;font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.6px;">Internal Case &amp; Verification Notes</div>'
                + '<textarea class="adm-textarea" id="adminCaseNotes" rows="4" placeholder="Record verification remarks, interview outcomes, or reasons for decision...">' + esc(adminNote) + '</textarea>'
                + '<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">'
                + '<button class="btn-primary" id="saveDecisionBtn" style="width:100%;height:44px;justify-content:center;font-weight:700;" onclick="RequestDetail.saveDecision(\'' + esc(targetId) + '\')">' + ICONS.save + ' Save Case Decision</button>'
                + '<a href="admin-requests.html" class="btn-secondary" style="width:100%;height:38px;justify-content:center;text-decoration:none;display:flex;align-items:center;">Cancel &amp; Return to List</a>'
                + '</div>'
                + '</div>'

                // Metadata Card
                + '<div class="adm-card" style="margin-top:20px;">'
                + '<div style="display:flex;flex-direction:column;gap:14px;font-size:13px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Tracking ID</span>'
                + '<span class="ref-badge" style="font-size:13px;padding:3px 8px;">' + esc(refId) + '</span>'
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
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Submission Date</span>'
                + '<span style="font-weight:600;color:var(--text-primary);">' + esc(created) + '</span>'
                + '</div>'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<span style="color:var(--text-muted);font-weight:700;text-transform:uppercase;font-size:11px;">Attached Files</span>'
                + '<span style="font-weight:700;" id="detailDocCountBadge">' + docCount + ' file(s)</span>'
                + '</div>'
                + '</div></div>'

                + '</div>'
                + '</div>';

            // Now load the documents list asynchronously
            await RequestDetail.loadDocuments(targetId, refId);
        },

        loadDocuments: async function (requestId, refId) {
            const docsContent = document.getElementById('docsContent');
            if (!docsContent) return;

            let docs = [];
            let documentError = '';
            try {
                const r = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(requestId) + '/documents');
                if (r.ok) {
                    docs = await r.json();
                } else {
                    const body = await r.json().catch(function () { return {}; });
                    documentError = body?.error?.message || `Document list could not be loaded (HTTP ${r.status}).`;
                }
            } catch (error) { documentError = error?.message || 'Network error while loading documents.'; }

            if ((!docs || !docs.length) && refId && refId !== requestId) {
                try {
                    const r2 = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(refId) + '/documents');
                    if (r2.ok) {
                        docs = await r2.json();
                    }
                } catch (_) {}
            }

            const badge = document.getElementById('detailDocCountBadge');
            if (badge) {
                badge.textContent = (docs ? docs.length : 0) + ' file(s)';
            }

            if (documentError) {
                if (badge) badge.textContent = 'Unavailable';
                docsContent.innerHTML = '<div style="padding:16px 18px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13.5px;">'
                    + '<strong>Documents could not be verified.</strong> ' + esc(documentError) + ' Refresh the page to retry. This is not the same as “no documents uploaded.”'
                    + '</div>';
                return;
            }
            if (!docs || !docs.length) {
                docsContent.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:10px;background:var(--surface-2);border:1px dashed var(--border);color:var(--text-muted);font-size:13.5px;">'
                    + '<span style="flex-shrink:0;color:var(--text-secondary);">' + ICONS.paperclip + '</span>'
                    + '<div><strong>No documents were uploaded</strong> with this application. You can request supporting documents from the applicant via telephone or email if needed.</div>'
                    + '</div>';
                return;
            }

            function fileIcon(ct) {
                if (!ct) return ICONS.fileText;
                if (ct.includes('pdf')) {
                    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9 9 10 9 11 9"/></svg>';
                }
                if (ct.includes('image')) {
                    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                }
                return ICONS.fileText;
            }

            function fmtSize(bytes) {
                if (!bytes) return '';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / 1048576).toFixed(1) + ' MB';
            }

            docsContent.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">'
                + docs.map(function (doc) {
                    const docId = doc.id || doc._id || '';
                    const dlUrl = API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(requestId) + '/documents/' + encodeURIComponent(docId) + '/download';
                    const fname = esc(doc.original_filename || 'document');
                    const fsize = fmtSize(doc.size_bytes);
                    const mimeType = doc.mime_type || doc.content_type || '';
                    const ftype = esc(mimeType || 'Document');
                    const isImg = mimeType.includes('image');
                    const isPdf = mimeType.includes('pdf');

                    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);gap:16px;flex-wrap:wrap;">'
                        + '<div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1 1 240px;">'
                        + '<span style="flex-shrink:0;width:40px;height:40px;border-radius:8px;background:rgba(10,54,99,0.1);display:flex;align-items:center;justify-content:center;color:var(--primary);">' + fileIcon(mimeType) + '</span>'
                        + '<div style="min-width:0;">'
                        + '<div style="font-weight:700;font-size:13.5px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + fname + '">' + fname + '</div>'
                        + '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:3px;">' + ftype + (fsize ? ' &bull; ' + fsize : '') + '</div>'
                        + '</div></div>'
                        + '<div style="display:flex;align-items:center;gap:8px;">'
                        + (isImg || isPdf ? '<button class="btn-ghost" style="height:34px;padding:0 12px;font-size:12px;" onclick="RequestDetail.previewDocument(\'' + dlUrl + '\', \'' + fname + '\')">' + ICONS.externalLink + ' Preview</button>' : '')
                        + '<button class="btn-primary" style="height:34px;padding:0 14px;font-size:12px;font-weight:700;" onclick="RequestDetail.authDownload(\'' + dlUrl + '\', \'' + fname + '\')">' + ICONS.download + ' Download</button>'
                        + '</div>'
                        + '</div>';
                }).join('')
                + '</div>';
        },

        authDownload: async function (url, filename) {
            try {
                toast('Initiating download...', 'info', 1800);
                const r = await apiFetch(url);
                if (!r.ok) { const body = await r.json().catch(function () { return {}; }); throw new Error(body?.error?.message || 'Download failed (HTTP ' + r.status + ').'); }
                const blob = await r.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename || 'document';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
                toast('Document downloaded successfully!', 'success');
            } catch (e) {
                toast('Download failed: ' + e.message, 'error');
            }
        },

        previewDocument: async function (url, filename) {
            try {
                toast('Opening preview...', 'info', 1800);
                const r = await apiFetch(url);
                if (!r.ok) throw new Error('Unable to open preview');
                const blob = await r.blob();
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
                setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 60000);
            } catch (e) {
                toast('Preview failed: ' + e.message, 'error');
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

            let apiSuccess = false;
            try {
                const r = await apiFetch(API_BASE + '/api/v1/requests/admin/' + encodeURIComponent(id) + '/status', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus, admin_note: noteVal })
                });
                if (r.ok) {
                    apiSuccess = true;
                } else {
                    const body = await r.json().catch(function () { return {}; });
                    throw new Error(body?.error?.message || 'The server rejected the status update (HTTP ' + r.status + ').');
                }
            } catch (error) {
                toast('Case decision was not saved. ' + (error?.message || 'Please retry.'), 'error', 6000);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = ICONS.save + ' Save Case Decision';
                }
                return;
            }

            if (apiSuccess && window.SwanDB && window.SwanDB.updateHelpRequest) {
                window.SwanDB.updateHelpRequest(id, { status: newStatus, admin_note: noteVal });
            }

            toast('Case decision saved successfully!', 'success');

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = ICONS.save + ' Save Case Decision';
            }

            // Reload page view with updated status
            await RequestDetail.loadDetail(id);
        }
    };

    window.RequestDetail = RequestDetail;
})(window, document);
