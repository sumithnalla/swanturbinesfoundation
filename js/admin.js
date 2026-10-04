/**
 * Swan Turbines Foundation - Admin Portal v2.0
 * Google Ads-style dashboard: Campaigns + Requests + Profile
 */
(function () {
    'use strict';

    const esc = v => String(v == null ? '' : v)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

    const fmt = v => {
        try { return new Date(v).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}); }
        catch(_) { return String(v||'--'); }
    };

    const API_BASE = window.__API_BASE_URL__ || (
        ['localhost','127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000' : ''
    );

    let cachedRequests = [];
    let currentPage = 'campaigns';
    let currentRequestId = null;
    let searchQuery = '';
    let sortOrder = 'newest';
    let statusFilter = 'all';
    let dateFrom = '';
    let dateTo = '';

    function toast(msg, type, dur) {
        type = type || 'default'; dur = dur || 3000;
        const c = document.getElementById('admToastContainer');
        if (!c) return;
        const el = document.createElement('div');
        el.className = 'adm-toast ' + type;
        const icons = {success:'check_circle',error:'error',info:'info',default:'notifications'};
        el.textContent = msg;
        c.appendChild(el);
        setTimeout(function() {
            el.style.opacity = '0'; el.style.transition = 'opacity .3s';
            setTimeout(function() { el.remove(); }, 350);
        }, dur);
    }

    function hideLoader() {
        var l = document.getElementById('admLoader');
        if (l) { l.classList.add('hidden'); setTimeout(function(){ l.remove(); }, 450); }
    }

    var NAV_ITEMS = {
        'campaigns':      {title:'Campaigns',      navId:'navCampaigns'},
        'requests':       {title:'Help Requests',  navId:'navRequests'},
        'request-detail': {title:'Request Detail', navId:'navRequests'},
        'profile':        {title:'My Profile',     navId:'navProfile'},
    };

    var App = {
        init: async function() {
            if (!window.SwanAuth || !window.SwanAuth.requireAuth('admin')) return;
            var user = window.SwanAuth.getCurrentUser ? window.SwanAuth.getCurrentUser() : null;
            if (user) {
                var initial = (user.username || user.email || 'A')[0].toUpperCase();
                var name = user.username || user.email || 'Administrator';
                ['sidebarUserInitial','topbarProfileBtn','profileAvatar'].forEach(function(id){
                    var el = document.getElementById(id);
                    if (el) el.textContent = initial;
                });
                ['sidebarUserName','profileName'].forEach(function(id){
                    var el = document.getElementById(id);
                    if (el) el.textContent = name;
                });
                ['profileEmail','profileEmailRow','profileUsername'].forEach(function(id){
                    var el = document.getElementById(id);
                    if (el) el.textContent = user.email || user.username || 'admin';
                });
            }
            await App.loadStats();
            App.renderCampaigns();
            App.navigate('campaigns');
            hideLoader();
        },

        navigate: function(page) {
            document.querySelectorAll('.adm-page').forEach(function(p){ p.classList.remove('active'); });
            var pageEl = document.getElementById('page-'+page);
            if (pageEl) pageEl.classList.add('active');
            document.querySelectorAll('.adm-nav-item').forEach(function(n){ n.classList.remove('active'); });
            var info = NAV_ITEMS[page];
            if (info) {
                var t = document.getElementById('admTopbarTitle');
                if (t) t.textContent = info.title;
                var n = document.getElementById(info.navId);
                if (n) n.classList.add('active');
            }
            currentPage = page;
            if (page === 'requests') App.loadRequests();
            if (page === 'profile')  App.loadStats();
            var c = document.getElementById('admContent');
            if (c) c.scrollTop = 0;
        },

        refresh: function() {
            if (currentPage === 'campaigns') App.renderCampaigns();
            else if (currentPage === 'requests') App.loadRequests();
            else if (currentPage === 'request-detail' && currentRequestId) App.openRequest(currentRequestId);
            else if (currentPage === 'profile') App.loadStats();
        },

        loadStats: async function() {
            var total=0,pending=0,reviewing=0,accepted=0;
            try {
                var r = await fetch(API_BASE+'/api/v1/requests/admin/stats', {credentials:'include'});
                if (r.ok) {
                    var d = await r.json(); var c = d.by_status||{};
                    total=d.total||0; pending=c.pending||c.new||0;
                    reviewing=c.under_review||c.reviewing||0; accepted=c.accepted||c.approved||0;
                }
            } catch(_) {
                if (window.SwanDB && window.SwanDB.getHelpRequestAnalytics) {
                    var s = window.SwanDB.getHelpRequestAnalytics();
                    total=s.total||0; pending=s.new_count||0; reviewing=s.reviewing_count||0; accepted=s.approved_count||0;
                }
            }
            function set(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
            set('statReqTotal',total); set('statReqPending',pending);
            set('statReqReviewing',reviewing); set('statReqAccepted',accepted);
            set('profileStatTotal',total); set('profileStatPending',pending); set('profileStatAccepted',accepted);
            var badge = document.getElementById('sidebarRequestsBadge');
            if (badge) badge.textContent = pending;
        },

        renderCampaigns: function() {
            var campaigns = [
                {icon:'💧',cat:'Water',name:'Clean Water Initiative',desc:'Providing access to clean drinking water in underserved communities through bore wells and filtration systems.',url:'campaign-water.html'},
                {icon:'📚',cat:'Education',name:'Education for All',desc:'Supporting children in rural areas with scholarships, school supplies, and digital learning resources.',url:'campaign-education.html'},
                {icon:'🌱',cat:'Eco',name:'Eco-Restoration Project',desc:'Planting trees and restoring ecosystems to combat climate change and protect biodiversity.',url:'campaign-eco.html'},
                {icon:'🍚',cat:'Hunger',name:'End Hunger Campaign',desc:'Delivering nutritious meals and food packages to families facing food insecurity.',url:'campaign-hunger.html'},
                {icon:'🏥',cat:'Medical',name:'Medical Aid Program',desc:'Offering free medical consultations, medicines, and surgical procedures for those who cannot afford healthcare.',url:'campaign-medical.html'},
                {icon:'🥦',cat:'Nutrition',name:'Nutrition & Child Health',desc:'Fighting malnutrition among children under 5 with supplemental feeding and health monitoring.',url:'campaign-nutrition.html'},
                {icon:'🏠',cat:'Relief',name:'Disaster Relief Fund',desc:'Rapid response aid including emergency shelter, food, and essential supplies for disaster-hit communities.',url:'campaign-relief.html'},
                {icon:'♀️',cat:'Women',name:'Women Empowerment',desc:'Skill-building workshops, micro-finance, and legal support to help women achieve financial independence.',url:'campaign-women.html'},
            ];
            var grid = document.getElementById('campaignsGrid');
            if (!grid) return;
            grid.innerHTML = campaigns.map(function(c) {
                return '<div class="adm-campaign-card" onclick="window.open(\''+c.url+'\',\'_blank\')">'
                    +'<div class="adm-campaign-img-placeholder">'+c.icon+'</div>'
                    +'<div class="adm-campaign-body">'
                    +'<div class="adm-campaign-category">'+esc(c.cat)+'</div>'
                    +'<div class="adm-campaign-name">'+esc(c.name)+'</div>'
                    +'<div class="adm-campaign-desc">'+esc(c.desc)+'</div>'
                    +'<div class="adm-campaign-footer">'
                    +'<span class="adm-campaign-status active">Active</span>'
                    +'<button class="btn-ghost" style="padding:6px 12px;font-size:12px;" onclick="event.stopPropagation();window.open(\''+c.url+'\',\'_blank\')">View</button>'
                    +'</div></div></div>';
            }).join('');
        },

        loadRequests: async function() {
            var tbody = document.getElementById('reqTableBody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="7"><div class="adm-empty"><div class="empty-icon">⏳</div><h3>Loading...</h3></div></td></tr>';
            var requests = [];
            try {
                var url = new URL(API_BASE+'/api/v1/requests/admin', window.location.origin);
                url.searchParams.set('page_size','200');
                if (statusFilter !== 'all') url.searchParams.set('status',statusFilter);
                if (searchQuery.trim()) url.searchParams.set('search',searchQuery.trim());
                var r = await fetch(url.toString(), {credentials:'include'});
                if (r.ok) { var d = await r.json(); requests = d.requests||[]; }
                else throw new Error('err');
            } catch(_) {
                if (window.SwanDB && window.SwanDB.getHelpRequests) requests = window.SwanDB.getHelpRequests()||[];
            }
            cachedRequests = requests;
            App.renderTable();
            App.loadStats();
        },

        getFiltered: function() {
            var list = cachedRequests.slice();
            if (searchQuery.trim()) {
                var q = searchQuery.trim().toLowerCase();
                list = list.filter(function(r){
                    return [r.reference||r.id||'', (r.applicant&&r.applicant.full_name)||r.full_name||'',
                        r.support_type||(r.request&&r.request.support_type)||r.help_type||'']
                        .some(function(v){ return String(v).toLowerCase().indexOf(q)>-1; });
                });
            }
            if (statusFilter !== 'all') {
                list = list.filter(function(r){
                    var s = (r.status||'').toLowerCase();
                    if(statusFilter==='pending') return s==='pending'||s==='new';
                    if(statusFilter==='under_review') return s==='under_review'||s==='reviewing';
                    if(statusFilter==='accepted') return s==='accepted'||s==='approved';
                    if(statusFilter==='rejected') return s==='rejected'||s==='closed';
                    return s===statusFilter;
                });
            }
            if (dateFrom||dateTo) {
                var from = dateFrom ? new Date(dateFrom) : null;
                var to   = dateTo   ? new Date(dateTo+'T23:59:59') : null;
                list = list.filter(function(r){
                    var d = new Date(r.created_at||0);
                    if(from&&d<from) return false;
                    if(to&&d>to) return false;
                    return true;
                });
            }
            list.sort(function(a,b){
                var da=new Date(a.created_at||0).getTime(), db=new Date(b.created_at||0).getTime();
                return sortOrder==='oldest' ? da-db : db-da;
            });
            return list;
        },

        renderTable: function() {
            var tbody = document.getElementById('reqTableBody');
            var cl = document.getElementById('reqCountLabel');
            if (!tbody) return;
            var list = App.getFiltered();
            if (cl) cl.textContent = list.length + ' request'+(list.length!==1?'s':'');
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="adm-empty"><div class="empty-icon">📭</div><h3>No requests found</h3><p>Try adjusting search or filters.</p></div></td></tr>';
                return;
            }
            tbody.innerHTML = list.map(function(req){
                var id=req.reference||req.id||'--';
                var tid=req.id||id;
                var name=(req.applicant&&req.applicant.full_name)||req.full_name||'Anonymous';
                var contact=(req.applicant&&req.applicant.mobile)||req.phone||'';
                var type=req.support_type||(req.request&&req.request.support_type)||req.help_type||'Support';
                var urgency=req.urgency||(req.request&&req.request.urgency)||'normal';
                var status=req.status||'pending';
                var created=req.created_at||'';
                return '<tr onclick="AdminApp.openRequest(\''+esc(tid)+'\')">'
                    +'<td><strong style="font-family:monospace;font-size:12px;">'+esc(id)+'</strong></td>'
                    +'<td><strong>'+esc(name)+'</strong>'+(contact?'<div class="sub">'+esc(contact)+'</div>':'')+'</td>'
                    +'<td><span class="support-chip">'+esc(type)+'</span></td>'
                    +'<td><span class="adm-urgency '+esc(urgency)+'">'+esc(urgency)+'</span></td>'
                    +'<td>'+(created?fmt(created):'--')+'</td>'
                    +'<td><span class="adm-pill '+esc(status)+'">'+esc(status.replace('_',' '))+'</span></td>'
                    +'<td><button class="btn-ghost" style="padding:6px 12px;font-size:12px;" onclick="event.stopPropagation();AdminApp.openRequest(\''+esc(tid)+'\')">Review</button></td>'
                    +'</tr>';
            }).join('');
        },

        onSearch: function(v) { searchQuery=v; App.renderTable(); },
        onSort: function(v) { sortOrder=v; App.renderTable(); },
        onStatusFilter: function(v) { statusFilter=v; App.loadRequests(); },
        onDateFilter: function() {
            dateFrom=document.getElementById('reqDateFrom').value;
            dateTo=document.getElementById('reqDateTo').value;
            App.renderTable();
        },
        clearFilters: function() {
            searchQuery=''; sortOrder='newest'; statusFilter='all'; dateFrom=''; dateTo='';
            ['reqSearchInput','reqDateFrom','reqDateTo'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
            var ss=document.getElementById('reqSortSelect'); if(ss) ss.value='newest';
            var sf=document.getElementById('reqStatusSelect'); if(sf) sf.value='all';
            App.loadRequests();
        },

        openRequest: async function(id) {
            currentRequestId = id;
            App.navigate('request-detail');
            var container = document.getElementById('requestDetailContent');
            if (!container) return;
            container.innerHTML = '<div class="adm-empty"><div class="empty-icon">⏳</div><h3>Loading...</h3></div>';
            var req = null;
            try {
                var r = await fetch(API_BASE+'/api/v1/requests/admin/'+encodeURIComponent(id), {credentials:'include'});
                if (r.ok) req = await r.json();
            } catch(_){}
            if (!req) {
                req = cachedRequests.find(function(r){ return String(r.id)===String(id)||String(r.reference)===String(id); });
                if (!req && window.SwanDB && window.SwanDB.getHelpRequestById) req = window.SwanDB.getHelpRequestById(id);
            }
            if (!req) {
                container.innerHTML = '<div class="adm-empty"><div class="empty-icon">❌</div><h3>Request not found</h3></div>';
                return;
            }
            var ap=req.applicant||{}, ri=req.request||{};
            var refId=req.reference||req.id||id;
            var name=ap.full_name||req.full_name||'Applicant';
            var phone=ap.mobile||req.phone||'';
            var email=ap.email||req.email||'';
            var address=[ap.address,ap.city,ap.state].filter(Boolean).join(', ')||req.address||'';
            var type=ri.support_type||req.support_type||req.help_type||'Support';
            var urgency=ri.urgency||req.urgency||'normal';
            var amount=ri.amount_required||req.estimated_amount||req.amount_required||'';
            var benefics=ri.beneficiaries||req.beneficiaries||1;
            var desc=ri.description||req.description||'No description provided.';
            var status=req.status||'pending';
            var adminNote=req.admin_note||'';
            var created=req.created_at?fmt(req.created_at):'--';
            var targetId=req.id||id;

            function isSel(v) {
                if(v==='pending') return status==='pending'||status==='new';
                if(v==='under_review') return status==='under_review'||status==='reviewing';
                if(v==='accepted') return status==='accepted'||status==='approved';
                if(v==='rejected') return status==='rejected'||status==='closed';
                return status===v;
            }
            function selCls(v) {
                var m={pending:'sel-pending',under_review:'sel-reviewing',accepted:'sel-accepted',rejected:'sel-rejected'};
                return m[v]||'';
            }

            var statuses = [
                {val:'pending',label:'⏳ Pending / Needs Review'},
                {val:'under_review',label:'🔍 Under Review'},
                {val:'accepted',label:'✅ Accepted / Approved for Aid'},
                {val:'rejected',label:'❌ Rejected / Closed'},
            ];

            container.innerHTML =
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">'
                +'<span style="font-family:monospace;font-size:13px;background:var(--primary-light);color:var(--primary);padding:4px 14px;border-radius:999px;font-weight:700;">'+esc(refId)+'</span>'
                +'<h2 style="font-size:22px;font-weight:700;color:var(--text-primary);">'+esc(name)+'</h2>'
                +'<span class="adm-pill '+esc(status)+'">'+esc(status.replace('_',' '))+'</span>'
                +'<span style="font-size:13px;color:var(--text-secondary);margin-left:auto;">Submitted '+created+'</span>'
                +'</div>'
                +'<div class="adm-detail-grid">'
                // Detail info cards
                +'<div class="adm-detail-info">'
                +'<div class="adm-info-card">'
                +'<div class="adm-info-card-title">👤 Applicant Information</div>'
                +'<div class="adm-info-grid">'
                +'<div class="adm-info-field"><div class="adm-field-label">Full Name</div><div class="adm-field-value">'+esc(name)+'</div></div>'
                +'<div class="adm-info-field"><div class="adm-field-label">Phone</div><div class="adm-field-value">'+(phone?'<a href="tel:'+esc(phone)+'">📞 '+esc(phone)+'</a>':'--')+'</div></div>'
                +'<div class="adm-info-field"><div class="adm-field-label">Email</div><div class="adm-field-value">'+(email?'<a href="mailto:'+esc(email)+'">✉️ '+esc(email)+'</a>':'--')+'</div></div>'
                +'<div class="adm-info-field"><div class="adm-field-label">People Benefiting</div><div class="adm-field-value">👥 '+esc(benefics)+' person(s)</div></div>'
                +'<div class="adm-info-field full"><div class="adm-field-label">Address</div><div class="adm-field-value">📍 '+(esc(address)||'--')+'</div></div>'
                +'</div></div>'
                +'<div class="adm-info-card">'
                +'<div class="adm-info-card-title">📋 Request Details</div>'
                +'<div class="adm-info-grid">'
                +'<div class="adm-info-field"><div class="adm-field-label">Support Category</div><div class="adm-field-value"><span class="support-chip">'+esc(type)+'</span></div></div>'
                +'<div class="adm-info-field"><div class="adm-field-label">Urgency</div><div class="adm-field-value"><span class="adm-urgency '+esc(urgency)+'">'+esc(urgency)+'</span></div></div>'
                +'<div class="adm-info-field"><div class="adm-field-label">Amount Required</div><div class="adm-field-value" style="color:var(--success);font-weight:700;font-size:15px;">'+(amount?'Rs '+esc(amount):'--')+'</div></div>'
                +'<div class="adm-info-field"><div class="adm-field-label">Submitted On</div><div class="adm-field-value">'+created+'</div></div>'
                +'<div class="adm-info-field full"><div class="adm-field-label">Situation &amp; Background</div><div class="adm-desc-box">'+esc(desc)+'</div></div>'
                +'</div></div>'
                +'</div>'
                // Action sidebar
                +'<div class="adm-action-sidebar">'
                +'<div class="adm-action-card">'
                +'<h3>⚡ Case Decision</h3>'
                +'<div class="adm-form-row"><label class="adm-form-label">Update Status</label>'
                +'<div class="adm-status-selector">'
                +statuses.map(function(s){
                    var active = isSel(s.val);
                    return '<label class="adm-status-opt '+(active?selCls(s.val):'')+'" id="opt-'+s.val+'">'
                        +'<input type="radio" name="reqStatus" value="'+s.val+'" '+(active?'checked':'')
                        +' style="margin:0;" onchange="AdminApp.onStatusOptChange(\''+s.val+'\')">'
                        +s.label+'</label>';
                }).join('')
                +'</div></div>'
                +'<div class="adm-form-row"><label class="adm-form-label">Internal Notes</label>'
                +'<textarea class="adm-form-control textarea" id="adminNoteInput" rows="4" placeholder="Add case notes...">'
                +esc(adminNote)+'</textarea></div>'
                +'<div class="adm-action-btns">'
                +'<button class="btn-primary" id="saveRequestBtn" onclick="AdminApp.saveRequest(\''+esc(targetId)+'\')">💾 Save Changes</button>'
                +'<button class="btn-ghost" onclick="AdminApp.navigate(\'requests\')">Cancel</button>'
                +'</div></div>'
                +'<div class="adm-action-card"><h3>📎 Quick Info</h3>'
                +'<div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">'
                +'<div style="display:flex;justify-content:space-between;align-items:center;">'
                +'<span style="color:var(--text-hint);font-weight:600;text-transform:uppercase;font-size:11px;">Status</span>'
                +'<span class="adm-pill '+esc(status)+'">'+esc(status.replace('_',' '))+'</span></div>'
                +'<div style="display:flex;justify-content:space-between;align-items:center;">'
                +'<span style="color:var(--text-hint);font-weight:600;text-transform:uppercase;font-size:11px;">ID</span>'
                +'<code style="font-size:12px;background:var(--surface-2);padding:2px 8px;border-radius:4px;">'+esc(refId)+'</code></div>'
                +'<div style="display:flex;justify-content:space-between;align-items:center;">'
                +'<span style="color:var(--text-hint);font-weight:600;text-transform:uppercase;font-size:11px;">Urgency</span>'
                +'<span class="adm-urgency '+esc(urgency)+'">'+esc(urgency)+'</span></div>'
                +'</div></div>'
                +'</div>'
                +'</div>';
        },

        onStatusOptChange: function(val) {
            var map = {pending:'sel-pending',under_review:'sel-reviewing',accepted:'sel-accepted',rejected:'sel-rejected'};
            document.querySelectorAll('.adm-status-opt').forEach(function(opt){
                var inp = opt.querySelector('input[type="radio"]');
                var v = inp ? inp.value : '';
                opt.className = 'adm-status-opt' + (v===val ? ' '+(map[v]||'') : '');
            });
        },

        saveRequest: async function(id) {
            var btn = document.getElementById('saveRequestBtn');
            var inp = document.querySelector('input[name="reqStatus"]:checked');
            var note = document.getElementById('adminNoteInput');
            if (!inp) { toast('Please select a status.','error'); return; }
            var newStatus = inp.value;
            var noteVal = note ? note.value : '';
            if (btn) { btn.disabled=true; btn.textContent='⏳ Saving...'; }
            try {
                var r = await fetch(API_BASE+'/api/v1/requests/admin/'+encodeURIComponent(id)+'/status', {
                    method:'PATCH', headers:{'Content-Type':'application/json'},
                    credentials:'include',
                    body: JSON.stringify({status:newStatus,admin_note:noteVal})
                });
                if (!r.ok) throw new Error('err');
            } catch(_) {
                if (window.SwanDB && window.SwanDB.updateHelpRequest) window.SwanDB.updateHelpRequest(id,{status:newStatus,admin_note:noteVal});
            }
            toast('Request updated!','success');
            if (btn) { btn.disabled=false; btn.textContent='💾 Save Changes'; }
            await App.loadStats();
            var idx = cachedRequests.findIndex(function(r){ return String(r.id)===String(id); });
            if (idx!==-1) { cachedRequests[idx].status=newStatus; cachedRequests[idx].admin_note=noteVal; }
        },

        exportCSV: function() {
            var list = cachedRequests.length ? cachedRequests : (window.SwanDB ? window.SwanDB.getHelpRequests() : []);
            if (!list.length) { toast('No requests to export.','error'); return; }
            var q = function(v){ return '"'+String(v||'').replace(/"/g,'""')+'"'; };
            var rows = list.map(function(req){
                return [req.reference||req.id,'',
                    (req.applicant&&req.applicant.full_name)||req.full_name||'',
                    (req.applicant&&req.applicant.mobile)||req.phone||'',
                    (req.applicant&&req.applicant.email)||req.email||'',
                    req.support_type||(req.request&&req.request.support_type)||req.help_type||'',
                    req.urgency||(req.request&&req.request.urgency)||'',
                    req.status||'',req.created_at||''
                ].map(q).join(',');
            });
            var blob = new Blob([['ID,REF,Name,Phone,Email,Type,Urgency,Status,Date'].concat(rows).join('\n')],{type:'text/csv'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href=url; a.download='Swan_Requests_'+new Date().toISOString().slice(0,10)+'.csv';
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            toast('CSV exported!','success');
        }
    };

    window.AdminApp = App;
    window.SwanAdmin = App;
})();
