(async function () {
    'use strict';
    if (!window.SwanAuth?.requireAuth('admin')) return;
    const API = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';
    const content = document.getElementById('contactMessagesContent');
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = date => new Date(date).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) + ' IST';
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const mobile = value => String(value || '').replace(/[^+\d]/g, '');
    try {
        if (document.body.dataset.contactView === 'detail' && !id) throw new Error('Select a message from the contact list.');
        const response = await SwanAuth.authorizedFetch(API + '/api/v1/contact/admin' + (id ? '/' + encodeURIComponent(id) : '?page=' + page));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Messages could not be loaded.');
        if (id) {
            const phone = mobile(data.mobile);
            content.innerHTML = '<div class="adm-page-header"><div><h1>Contact Message</h1><p>Review the message submitted to Swan Turbines Foundation.</p></div></div>'
                + '<div class="adm-detail-header-card"><div class="adm-detail-headline"><a class="btn-secondary" href="admin-contacts.html">← All Messages</a><div><div class="adm-field-label">Contact submission</div><h2 class="contact-detail-name">' + esc(data.full_name) + '</h2></div></div><span class="status-pill under_review"><span class="status-dot"></span>Received</span></div>'
                + '<div class="adm-detail-grid contact-detail-grid"><div class="adm-detail-main-col"><section class="adm-card"><h3 class="adm-card-title">Sender details</h3><div class="adm-info-grid">'
                + '<div class="adm-info-field"><div class="adm-field-label">Full name</div><div class="adm-field-value">' + esc(data.full_name) + '</div></div>'
                + '<div class="adm-info-field"><div class="adm-field-label">Submitted</div><div class="adm-field-value">' + esc(fmt(data.created_at)) + '</div></div>'
                + '<div class="adm-info-field"><div class="adm-field-label">Email address</div><div class="adm-field-value"><a href="mailto:' + esc(data.email) + '">' + esc(data.email) + '</a></div></div>'
                + '<div class="adm-info-field"><div class="adm-field-label">Mobile number</div><div class="adm-field-value">' + (phone ? '<a href="tel:' + esc(phone) + '">' + esc(data.mobile) + '</a>' : 'Not provided') + '</div></div>'
                + '</div></section><section class="adm-card"><h3 class="adm-card-title">Message</h3><div class="adm-desc-box contact-message-body">' + esc(data.message) + '</div></section></div>'
                + '<aside class="adm-detail-sidebar-col"><section class="adm-card contact-action-card"><h3 class="adm-card-title">Respond</h3><p>Use your email client or phone to reply to this contact.</p><a class="btn-primary" href="mailto:' + esc(data.email) + '?subject=' + encodeURIComponent('Swan Turbines Foundation — your message') + '">Reply by Email</a>'
                + (phone ? '<a class="btn-secondary" href="tel:' + esc(phone) + '">Call ' + esc(data.full_name) + '</a>' : '') + '<div class="contact-submission-meta"><span>Submission ID</span><code>' + esc(data.id) + '</code></div></section></aside></div>';
        } else {
            content.innerHTML = '<div class="adm-page active"><div class="adm-page-header"><div><h1>Contact Messages</h1><p>' + Number(data.total || 0) + ' messages · all times in India Standard Time (IST)</p></div><div class="contact-list-tools"><label class="contact-search-label" for="contactSearch">Search messages</label><input class="adm-search-input contact-search" id="contactSearch" type="search" placeholder="Name, email, mobile, or message"></div></div>'
                + '<div class="table-card-shell"><div class="table-responsive-wrapper"><table class="custom-data-table contact-data-table"><thead><tr><th>Contact</th><th>Mobile</th><th>Message</th><th>Submitted (IST)</th><th>View</th></tr></thead><tbody>'
                + data.messages.map(m => '<tr data-search="' + esc([m.full_name,m.email,m.mobile,m.message].join(' ').toLowerCase()) + '"><td><div class="applicant-cell"><span class="applicant-name">' + esc(m.full_name) + '</span><span class="applicant-meta">' + esc(m.email) + '</span></div></td><td>' + (m.mobile ? '<a href="tel:' + esc(mobile(m.mobile)) + '">' + esc(m.mobile) + '</a>' : '<span class="text-muted">Not provided</span>') + '</td><td><span class="contact-message-preview">' + esc(m.message) + '</span></td><td class="contact-date-cell">' + esc(fmt(m.created_at)) + '</td><td><a class="btn-secondary contact-view-button" href="admin-contact-detail.html?id=' + encodeURIComponent(m.id) + '">View message</a></td></tr>').join('')
                + '</tbody></table>' + (!data.total ? '<div class="adm-empty"><h3>No messages yet</h3><p>New website contact submissions will appear here.</p></div>' : '') + '</div><div class="contact-table-footer"><span>Page ' + page + ' of ' + Math.max(1,Math.ceil(data.total/(data.page_size||50))) + '</span><nav aria-label="Message pages">' + (page>1?'<a class="btn-secondary" href="?page='+(page-1)+'">← Previous</a>':'') + (page*(data.page_size||50)<data.total?'<a class="btn-secondary" href="?page='+(page+1)+'">Next →</a>':'') + '</nav></div></div></div>';
            const search=document.getElementById('contactSearch');
            search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();content.querySelectorAll('tbody tr').forEach(row=>{row.hidden=!row.dataset.search.includes(q);});});
        }
    } catch (error) {
        content.innerHTML = '<div class="adm-card" role="alert"><h2>Messages could not be loaded</h2><p>' + esc(error.message) + '</p><a class="btn-secondary" href="admin-contacts.html">Return to messages</a></div>';
    }
})();
