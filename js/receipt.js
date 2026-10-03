/* =========================================================
   SWAN TURBINES FOUNDATION - MONOCHROME A4 LEGAL CERTIFICATE
========================================================= */

(function () {
    const escapeHTML = (value) => String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const Receipt = {
        openReceiptModal: function (donationId) {
            let donation = window.SwanDB ? window.SwanDB.getDonationById(donationId) : null;
            
            if (!donation && typeof donationId === 'object' && donationId !== null) {
                donation = donationId;
            }

            if (!donation) {
                return;
            }

            // Do not disclose a registered donor's receipt to another signed-in donor.
            const currentUser = window.SwanAuth ? window.SwanAuth.getCurrentUser() : null;
            if (donation.donor_id && currentUser && currentUser.role !== 'admin' && donation.donor_id !== currentUser.id) {
                return;
            }

            const donor = (window.SwanDB && donation.donor_id) ? window.SwanDB.getUserById(donation.donor_id) : null;
            const profile = (window.SwanDB && donation.donor_id) ? window.SwanDB.getProfileByUserId(donation.donor_id) : null;

            const donorName = donor ? donor.full_name : (donation.donor_name || 'Valued Donor');
            const donorEmail = donor ? donor.email : (donation.donor_email || 'N/A');
            const donorPhone = donor ? (donor.phone || 'N/A') : (donation.donor_phone || 'N/A');
            const donorAddress = (profile && profile.address) ? profile.address : 'Registered Donor Address On Record';
            const donorPan = (profile && profile.pan_number) ? profile.pan_number : (donation.donor_pan || 'N/A (Standard Exemption)');
            const adminUser = window.SwanDB ? window.SwanDB.getUsers().find(user => user.role === 'admin') : null;
            const adminProfile = adminUser && window.SwanDB ? window.SwanDB.getProfileByUserId(adminUser.id) : null;
            const signatureCandidate = (adminProfile && adminProfile.signature_image) ? adminProfile.signature_image : '';
            const adminSignature = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(signatureCandidate) ? signatureCandidate : '';

            let modal = document.getElementById('receiptModalOverlay');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'receiptModalOverlay';
                modal.className = 'auth-modal-overlay';
                document.body.appendChild(modal);
            }

            const formattedDate = new Date(donation.donation_date || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            const formattedAmount = new Intl.NumberFormat('en-IN', {
                style: 'currency', currency: 'INR', maximumFractionDigits: 0
            }).format(donation.amount);

            modal.innerHTML = `
                <div class="receipt-modal-card monochrome-a4-doc">
                    <button type="button" class="auth-close-btn" onclick="SwanReceipt.closeReceiptModal()">✕</button>
                    
                    <div class="a4-certificate-inner">
                        <!-- Formal Header: Logo colored, rest monochrome -->
                        <div class="a4-header-row">
                            <div class="a4-logo-box">
                                <img src="logo.png" alt="Swan Turbines Foundation" class="a4-brand-logo">
                            </div>
                            <div class="a4-org-details">
                                <h1 class="a4-trust-title">SWAN TURBINES FOUNDATION</h1>
                                <p class="a4-trust-type">A PUBLIC CHARITABLE TRUST REGISTERED UNDER THE INDIAN TRUSTS ACT, 1882</p>
                                <p class="a4-trust-meta">Trust Reg. No: <strong>204/2026</strong> &nbsp;|&nbsp; 80G Tax Deductible Status: <strong>AAATS2042F26</strong> &nbsp;|&nbsp; PAN: <strong>AAATS2042F</strong></p>
                                <p class="a4-trust-address">Registered Office: Plot No. 42, HMT Colony, Kukatpally, Hyderabad, Telangana - 500085, India</p>
                            </div>
                        </div>

                        <div class="a4-divider-double"></div>

                        <div class="a4-doc-title-box">
                            <span class="a4-doc-title">OFFICIAL DONATION RECEIPT & 80G TAX COMPLIANCE CERTIFICATE</span>
                        </div>

                        <!-- Data Fields Grid -->
                        <table class="a4-details-table">
                            <tr>
                                <td style="width: 25%;"><strong>Certificate No:</strong></td>
                                <td style="width: 25%;">${escapeHTML(donation.receipt_number || donation.id)}</td>
                                <td style="width: 25%;"><strong>Issue Date:</strong></td>
                                <td style="width: 25%;">${formattedDate}</td>
                            </tr>
                            <tr>
                                <td><strong>Donor Name:</strong></td>
                                <td><strong>${escapeHTML(donorName.toUpperCase())}</strong></td>
                                <td><strong>Donor PAN:</strong></td>
                                <td><strong>${escapeHTML(donorPan)}</strong></td>
                            </tr>
                            <tr>
                                <td><strong>Donor Email:</strong></td>
                                <td>${escapeHTML(donorEmail)}</td>
                                <td><strong>Donor Phone:</strong></td>
                                <td>${escapeHTML(donorPhone)}</td>
                            </tr>
                            <tr>
                                <td><strong>Donor Address:</strong></td>
                                <td colspan="3">${escapeHTML(donorAddress)}</td>
                            </tr>
                            <tr>
                                <td><strong>Payment Method:</strong></td>
                                <td>${escapeHTML(donation.payment_method || 'Electronic Wire / Gateway')}</td>
                                <td><strong>Transaction Ref ID:</strong></td>
                                <td>${escapeHTML(donation.transaction_id || ('TXN-' + donation.id))}</td>
                            </tr>
                            <tr class="a4-highlight-row">
                                <td><strong>Contribution Amount:</strong></td>
                                <td colspan="3">
                                    <span class="a4-amount-bold">${formattedAmount}</span>
                                    <span class="a4-amount-words"> (Indian Rupees verified voluntary tax-deductible contribution)</span>
                                </td>
                            </tr>
                        </table>

                        <!-- Terms and Conditions Section after Payment -->
                        <div class="a4-terms-section">
                            <h4 class="a4-terms-heading">STATUTORY TERMS & COMPLIANCE ACKNOWLEDGEMENT</h4>
                            <ol class="a4-terms-list">
                                <li><strong>1. Voluntary Contribution:</strong> The donor confirms this contribution is made voluntarily from lawful sources without any direct commercial consideration or return of goods/services.</li>
                                <li><strong>2. 80G Income Tax Benefit:</strong> This certificate is an admissible statutory document for claiming income tax deduction under Section 80G(5)(vi) of the Income Tax Act, 1961.</li>
                                <li><strong>3. Purpose Allocation:</strong> All funds are exclusively utilized towards charitable welfare, hunger eradication, relief aid, and education initiatives managed by the Trust.</li>
                                <li><strong>4. Non-Refundable Policy:</strong> Contributions once credited are irrevocable and non-refundable, except in cases of verified technical duplicate billing reported within 7 days.</li>
                                <li><strong>5. Statutory Governance:</strong> Issued in accordance with the official bylaws of Swan Turbines Foundation under jurisdiction of Hyderabad, Telangana.</li>
                            </ol>
                        </div>

                        <!-- Dual Signature & Seal Placement -->
                        <div class="a4-signatures-row">
                            <!-- Donor Signature block (if uploaded, otherwise signature placeholder) -->
                            <div class="a4-sign-box">
                                <div class="a4-sig-image-container">
                                    <span class="a4-sig-verified-text">Digitally Authenticated<br>via OTP / Email Account</span>
                                </div>
                                <div class="a4-sig-line"></div>
                                <div class="a4-sig-name">${escapeHTML(donorName)}</div>
                                <div class="a4-sig-title">Donor / Authorized Contributor</div>
                            </div>

                            <!-- Official Seal in middle -->
                            <div class="a4-seal-box">
                                <div class="a4-stamp-circle">
                                    <span>SWAN TURBINES FOUNDATION</span>
                                    <strong>SEAL OF TRUST</strong>
                                    <small>REGD NO. 204/2026</small>
                                </div>
                            </div>

                            <!-- Managing Life Trustee Signature -->
                            <div class="a4-sign-box">
                                <div class="a4-sig-image-container">
                                    ${adminSignature ? `<img src="${adminSignature}" alt="Authorized trustee signature" class="a4-uploaded-sig">` : `<div class="a4-trustee-sig-text">Satyanarayana P.</div>`}
                                </div>
                                <div class="a4-sig-line"></div>
                                <div class="a4-sig-name">Sri Pothumarthi Satyanarayana</div>
                                <div class="a4-sig-title">Managing Life Trustee & Authorized Signatory</div>
                                <div class="a4-sig-org">Swan Turbines Foundation</div>
                            </div>
                        </div>

                        <div class="a4-footer-note">
                            This is a system-generated, legally compliant electronic tax receipt certificate issued under the official authority of Swan Turbines Foundation.
                        </div>
                    </div>

                    <div class="receipt-actions no-print">
                        <button type="button" class="btn-secondary" onclick="SwanReceipt.closeReceiptModal()">Close Document</button>
                        <button type="button" class="btn-primary-action" onclick="window.print()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            Print A4 Certificate / Save as PDF
                        </button>
                    </div>
                </div>
            `;

            modal.classList.add('open');
        },

        closeReceiptModal: function () {
            const modal = document.getElementById('receiptModalOverlay');
            if (modal) modal.classList.remove('open');
        }
    };

    window.SwanReceipt = Receipt;
})();
