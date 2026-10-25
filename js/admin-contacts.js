(async function () {
    'use strict';
    if (!window.SwanAuth?.requireAuth('admin')) return;
    const API = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';
    const content = document.getElementById('contactMessagesContent');
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = date => new Date(date).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}) + ' IST';
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const page = Math.max(1, Number(params.get('page')) || 1);
    try {
        if (document.body.dataset.contactView === 'detail' && !id) throw new Error('Select a message from the contact list.');
        const response = await SwanAuth.authorizedFetch(API + '/api/v1/contact/admin' + (id ? '/' + encodeURIComponent(id) : '?page=' + page));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Messages could not be loaded.');
        if (id) {
            content.innerHTML = '<a class="btn-secondary" href="admin-contacts.html">← All messages</a><article class="adm-card" style="margin-top:20px"><h2>' + esc(data.full_name) + '</h2><dl><dt>Email</dt><dd>' + esc(data.email) + '</dd><dt>Mobile number</dt><dd>' + esc(data.mobile || 'Not collected on this historical message') + '</dd><dt>Submitted</dt><dd>' + esc(fmt(data.created_at)) + '</dd></dl><h3>Message</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(data.message) + '</p></article>';
        } else {
            content.innerHTML = '<p>' + data.total + ' messages · all times in India Standard Time (IST)</p><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Full Name</th><th>Email</th><th>Mobile</th><th>Message</th><th>Submitted Date / Time (IST)</th><th>View</th></tr></thead><tbody>' + data.messages.map(m => '<tr><td>' + esc(m.full_name) + '</td><td>' + esc(m.email) + '</td><td>' + esc(m.mobile || 'Not collected') + '</td><td style="max-width:260px;overflow-wrap:anywhere">' + esc(m.message.slice(0,100)) + (m.message.length>100?'…':'') + '</td><td>' + esc(fmt(m.created_at)) + '</td><td><a class="btn-secondary" href="admin-contact-detail.html?id=' + encodeURIComponent(m.id) + '">View message</a></td></tr>').join('') + '</tbody></table></div>' + (!data.total ? '<p>No messages received yet.</p>' : '') + '<nav style="display:flex;gap:20px;margin-top:20px" aria-label="Message pages">' + (page>1?'<a href="?page='+(page-1)+'">← Previous</a>':'') + '<span>Page '+page+'</span>' + (page*data.page_size<data.total?'<a href="?page='+(page+1)+'">Next →</a>':'') + '</nav>';
        }
    } catch (error) {
        content.innerHTML = '<div role="alert" class="adm-card"><h2>Messages could not be loaded</h2><p>' + esc(error.message) + '</p><a href="admin-contacts.html">Return to messages</a></div>';
    }
})();
