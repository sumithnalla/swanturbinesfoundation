/* Production help-request wizard: no local mock records or false confirmations. */
(function () {
    'use strict';
    const API = window.__API_BASE_URL__ || 'https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api';
    const form = document.getElementById('helpRequestForm');
    const button = document.getElementById('submitHelpBtn');
    const draftKey = 'swan_help_draft_v1';
    let step = 1, files = [], busy = false, pending = null, key = '';
    const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const get = name => form.elements.namedItem(name);
    const val = name => String(get(name)?.value || '').trim();
    const safe = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const types = {'application/pdf':/\.pdf$/i,'image/jpeg':/\.jpe?g$/i,'image/png':/\.png$/i,'image/webp':/\.webp$/i};
    function saveDraft() {
        const values = {};
        for (const field of form.elements) if (field.name && field.type !== 'file') values[field.name] = field.type === 'checkbox' ? field.checked : field.value;
        try { sessionStorage.setItem(draftKey, JSON.stringify({values, key, pending, step})); } catch (_) {}
    }
    function count() { document.getElementById('descriptionCount').textContent = get('description').value.length + ' / 1,000 characters'; }
    const wizard = {
        showError(text) {
            const el = document.getElementById('helpFormMessage');
            el.className = 'help-form-message error'; el.textContent = text;
        },
        validateStep(n) {
            get('phone').setCustomValidity(/^[0-9]{10}$/.test(val('phone')) ? '' : 'Enter exactly 10 digits, without spaces or country code.');
            get('email').setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')) ? '' : 'Enter a valid email address.');
            get('description').setCustomValidity(val('description').length >= 10 && val('description').length <= 1000 ? '' : 'Enter 10–1,000 characters.');
            for (const field of document.querySelectorAll('#stepSection' + n + ' input, #stepSection' + n + ' select, #stepSection' + n + ' textarea')) {
                if (!field.checkValidity()) { wizard.showError(field.validationMessage); field.reportValidity(); return false; }
            }
            return true;
        },
        goToStep(n, restore) {
            if (busy) return;
            if (!restore && n > step && !wizard.validateStep(step)) return;
            step = n;
            for (let i = 1; i <= 3; i++) {
                document.getElementById('stepSection' + i).classList.toggle('active', i === step);
                document.getElementById('pillStep' + i).className = 'step-pill' + (i === step ? ' active' : i < step ? ' completed' : '');
            }
            document.getElementById('helpFormMessage').className = 'help-form-message';
            saveDraft();
        },
        handleFileSelect(event) {
            if (busy) return;
            const selected = Array.from(event.target.files || []);
            if (files.length + selected.length > 3) return wizard.showError('Choose at most three documents in total.');
            if (selected.some(f => !types[f.type]?.test(f.name) || !f.size || f.size > 10 * 1024 * 1024)) return wizard.showError('Use non-empty PDF, JPG, PNG or WEBP files, up to 10 MB each.');
            for (const file of selected) if (!files.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) files.push(file);
            document.getElementById('fileInput').value = '';
            wizard.renderFileList();
        },
        removeFile(i) { if (!busy) { files.splice(i, 1); wizard.renderFileList(); } },
        renderFileList() {
            document.getElementById('selectedFilesList').innerHTML = files.map((f,i) => '<div class="file-item"><span><strong>' + safe(f.name) + '</strong> (' + (f.size / 1024).toFixed(1) + ' KB)</span><button type="button" class="file-remove" aria-label="Remove document" onclick="HelpWizard.removeFile(' + i + ')">×</button></div>').join('');
        },
        resetForm() {
            if (busy) return;
            form.reset(); files = []; pending = null; key = newKey();
            for (const field of form.elements) { field.disabled = false; if (field.setCustomValidity) field.setCustomValidity(''); }
            wizard.renderFileList(); wizard.goToStep(1, true); count();
            button.textContent = 'Submit Application →';
            try { sessionStorage.removeItem(draftKey); } catch (_) {}
        },
        copyReference() { navigator.clipboard.writeText(document.getElementById('successRefNumber').textContent); }
    };
    window.HelpWizard = wizard;
    form.noValidate = true;
    key = newKey();
    try {
        const draft = JSON.parse(sessionStorage.getItem(draftKey));
        if (draft && !history.state?.swanHelpCompleted) {
            for (const [name, value] of Object.entries(draft.values || {})) { const field = get(name); if (field) { if (field.type === 'checkbox') field.checked = value; else field.value = value; } }
            key = draft.key || key; pending = draft.pending || null; step = draft.step || 1;
        }
    } catch (_) {}
    wizard.goToStep(step, true); count();
    form.addEventListener('input', () => { count(); saveDraft(); });
    window.addEventListener('pageshow', () => {
        if (history.state?.swanHelpCompleted) { wizard.resetForm(); history.replaceState({...history.state,swanHelpCompleted:false}, ''); }
    });
    const dropzone = document.getElementById('dropzoneBox');
    dropzone.addEventListener('dragover', e => e.preventDefault());
    dropzone.addEventListener('drop', e => { e.preventDefault(); wizard.handleFileSelect({target:{files:e.dataTransfer.files}}); });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        for (let n = 1; n <= 3; n++) if (!wizard.validateStep(n)) { wizard.goToStep(n, true); return; }
        busy = true; button.disabled = true;
        document.getElementById('submissionProgress').hidden = false;
        button.textContent = pending ? 'Uploading documents…' : 'Submitting application…';
        saveDraft();
        const payload = {submission_key:key,applicant:{full_name:val('full_name'),mobile:val('phone'),email:val('email'),address:val('address'),city:val('city'),state:val('state')},request:{support_type:val('help_type'),description:val('description'),beneficiaries:Number(val('beneficiaries')),amount_required:val('estimated_amount'),urgency:val('urgency')},consent:true};
        for (const field of form.elements) field.disabled = true;
        let completed = false;
        try {
            if (!pending) {
                const response = await fetch(API + '/api/v1/requests', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
                const result = await response.json();
                if (!response.ok) throw new Error(result.error?.message || 'Submission was not confirmed. Please retry.');
                if (!result.id || !result.reference || !result.document_upload_token) throw new Error('Incomplete confirmation. Please retry this submission.');
                pending = result; saveDraft();
            }
            if (files.length) {
                button.textContent = 'Uploading documents…';
                const body = new FormData(); files.forEach(file => body.append('files',file));
                const response = await fetch(API + '/api/v1/requests/' + encodeURIComponent(pending.id) + '/documents', {method:'POST',headers:{'X-Request-Upload-Token':pending.document_upload_token},body});
                const result = await response.json();
                if (!response.ok || result.uploaded?.length !== files.length) throw new Error('Application ' + pending.reference + ' is saved, but documents are not fully confirmed. ' + (result.error?.message || 'Retry document upload; do not create another application.'));
            }
            const reference = pending.reference;
            completed = true;
            history.replaceState({...history.state,swanHelpCompleted:true}, '');
            try { sessionStorage.removeItem(draftKey); } catch (_) {}
            form.reset(); files = []; pending = null; wizard.renderFileList(); count();
            window.location.assign('requests-thank-you.html?reference=' + encodeURIComponent(reference));
        } catch (error) { wizard.showError(error.message || 'Network error. Retry this submission.'); saveDraft(); }
        finally {
            busy = false;
            document.getElementById('submissionProgress').hidden = true;
            for (const field of form.elements) field.disabled = completed;
            button.textContent = pending ? 'Retry Document Upload →' : 'Submit Application →';
        }
    });
})();
