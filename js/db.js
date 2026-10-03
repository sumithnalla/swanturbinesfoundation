/* =========================================================
   SWAN TURBINES FOUNDATION - DATA ACCESS LAYER (DB)
========================================================= */

(function () {
    const STORAGE_USERS = 'swan_db_users_v2';
    const STORAGE_PROFILES = 'swan_db_profiles_v2';
    const STORAGE_DONATIONS = 'swan_db_donations_v2';
    const STORAGE_HELP_REQUESTS = 'swan_db_help_requests_v1';
    const VALID_STATUSES = new Set(['successful', 'pending', 'failed', 'refunded']);
    const VALID_HELP_STATUSES = new Set(['new', 'reviewing', 'approved', 'closed']);

    function cleanText(value, maxLength) {
        return String(value == null ? '' : value)
            .replace(/[\u0000-\u001F\u007F]/g, '')
            .trim()
            .slice(0, maxLength);
    }

    function cleanAmount(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
            throw new Error('Please enter a valid donation amount.');
        }
        return Math.round(amount * 100) / 100;
    }

    function cleanImageData(value) {
        const image = String(value == null ? '' : value).trim();
        if (!image) return '';
        const allowedImage = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
        return image.length <= 2100000 && allowedImage.test(image) ? image : '';
    }

    // Initial seed data
    const SEED_USERS = [
        {
            id: 'user_admin_001',
            full_name: 'Foundation Administrator',
            email: 'admin@swanturbines.org',
            phone: '+91 98765 43210',
            password_hash: 'Admin@123',
            role: 'admin',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z'
        },
        {
            id: 'user_donor_101',
            full_name: 'Rajesh Sharma',
            email: 'donor@example.com',
            phone: '+91 91234 56789',
            password_hash: 'Donor@123',
            role: 'donor',
            created_at: '2026-01-15T10:30:00.000Z',
            updated_at: '2026-01-15T10:30:00.000Z'
        }
    ];

    const SEED_PROFILES = [
        {
            id: 'prof_101',
            user_id: 'user_donor_101',
            address: 'Plot 42, Jubilee Hills, Hyderabad - 500033',
            pan_number: 'ABCDE1234F',
            created_at: '2026-01-15T10:30:00.000Z',
            updated_at: '2026-01-15T10:30:00.000Z'
        }
    ];

    const SEED_DONATIONS = [
        {
            id: 'STF-88401201',
            donor_id: 'user_donor_101',
            amount: 5000,
            currency: 'INR',
            campaign: 'Clean Water Initiative',
            donation_date: '2026-02-10T14:20:00.000Z',
            payment_method: 'UPI',
            transaction_id: 'TXN_SWAN_98241029',
            payment_status: 'successful',
            receipt_number: 'STF-2026-00101',
            created_at: '2026-02-10T14:20:00.000Z',
            updated_at: '2026-02-10T14:20:00.000Z'
        },
        {
            id: 'STF-88401202',
            donor_id: 'user_donor_101',
            amount: 2500,
            currency: 'INR',
            campaign: 'Education For All',
            donation_date: '2026-02-20T11:15:00.000Z',
            payment_method: 'Credit Card',
            transaction_id: 'TXN_SWAN_98241098',
            payment_status: 'successful',
            receipt_number: 'STF-2026-00102',
            created_at: '2026-02-20T11:15:00.000Z',
            updated_at: '2026-02-20T11:15:00.000Z'
        }
    ];

    function getItem(key, defaultVal) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultVal;
        } catch (e) {
            console.error('Storage error', e);
            return defaultVal;
        }
    }

    function setItem(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error('Storage save error', e);
        }
    }

    function initDB() {
        if (!localStorage.getItem(STORAGE_USERS)) setItem(STORAGE_USERS, SEED_USERS);
        if (!localStorage.getItem(STORAGE_PROFILES)) setItem(STORAGE_PROFILES, SEED_PROFILES);
        if (!localStorage.getItem(STORAGE_DONATIONS)) setItem(STORAGE_DONATIONS, SEED_DONATIONS);
        if (!localStorage.getItem(STORAGE_HELP_REQUESTS)) setItem(STORAGE_HELP_REQUESTS, []);
    }

    initDB();

    const DB = {
        getUsers: () => getItem(STORAGE_USERS, []),

        getUserById: (id) => {
            return DB.getUsers().find(u => u.id === id) || null;
        },

        getUserByEmail: (email) => {
            if (!email) return null;
            return DB.getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
        },

        createUser: (userObj) => {
            const users = DB.getUsers();
            const newUser = {
                id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                role: 'donor',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // Keep privilege-bearing and system-managed fields out of
                // public registration payloads.
                full_name: cleanText(userObj.full_name, 120),
                email: cleanText(userObj.email, 254).toLowerCase(),
                phone: cleanText(userObj.phone, 32),
                password_hash: String(userObj.password_hash || '')
            };
            users.push(newUser);
            setItem(STORAGE_USERS, users);

            DB.createProfile({ user_id: newUser.id, address: '', pan_number: '' });

            return newUser;
        },

        updateUser: (id, updates) => {
            const users = DB.getUsers();
            const idx = users.findIndex(u => u.id === id);
            if (idx === -1) return null;
            const allowedUpdates = {};
            if (Object.prototype.hasOwnProperty.call(updates, 'full_name')) allowedUpdates.full_name = cleanText(updates.full_name, 120);
            if (Object.prototype.hasOwnProperty.call(updates, 'phone')) allowedUpdates.phone = cleanText(updates.phone, 32);
            if (Object.prototype.hasOwnProperty.call(updates, 'password_hash')) allowedUpdates.password_hash = String(updates.password_hash || '');
            if (Object.prototype.hasOwnProperty.call(updates, 'profile_image')) allowedUpdates.profile_image = cleanImageData(updates.profile_image);
            users[idx] = { ...users[idx], ...allowedUpdates, updated_at: new Date().toISOString() };
            setItem(STORAGE_USERS, users);
            return users[idx];
        },

        getProfiles: () => getItem(STORAGE_PROFILES, []),

        getProfileByUserId: (userId) => {
            return DB.getProfiles().find(p => p.user_id === userId) || null;
        },

        createProfile: (profileObj) => {
            const profiles = DB.getProfiles();
            const newProf = {
                id: 'prof_' + Date.now(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...profileObj
            };
            profiles.push(newProf);
            setItem(STORAGE_PROFILES, profiles);
            return newProf;
        },

        updateProfile: (userId, updates) => {
            const profiles = DB.getProfiles();
            let prof = profiles.find(p => p.user_id === userId);
            if (!prof) {
                return DB.createProfile({
                    user_id: userId,
                    address: cleanText(updates.address, 300),
                    pan_number: cleanText(updates.pan_number, 16).toUpperCase(),
                    profile_image: cleanImageData(updates.profile_image),
                    signature_image: cleanImageData(updates.signature_image)
                });
            }
            const idx = profiles.findIndex(p => p.user_id === userId);
            const allowedUpdates = {
                address: Object.prototype.hasOwnProperty.call(updates, 'address') ? cleanText(updates.address, 300) : profiles[idx].address,
                pan_number: Object.prototype.hasOwnProperty.call(updates, 'pan_number') ? cleanText(updates.pan_number, 16).toUpperCase() : profiles[idx].pan_number,
                profile_image: Object.prototype.hasOwnProperty.call(updates, 'profile_image') ? cleanImageData(updates.profile_image) : profiles[idx].profile_image,
                signature_image: Object.prototype.hasOwnProperty.call(updates, 'signature_image') ? cleanImageData(updates.signature_image) : profiles[idx].signature_image
            };
            profiles[idx] = { ...profiles[idx], ...allowedUpdates, updated_at: new Date().toISOString() };
            setItem(STORAGE_PROFILES, profiles);
            return profiles[idx];
        },

        getDonations: () => getItem(STORAGE_DONATIONS, []),

        getDonationsByUserId: (userId) => {
            return DB.getDonations()
                .filter(d => d.donor_id === userId)
                .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date));
        },

        getDonationById: (id) => {
            return DB.getDonations().find(d => d.id === id) || null;
        },

        createDonation: (donationObj) => {
            const donations = DB.getDonations();
            const now = new Date();
            const newDonation = {
                id: 'STF-' + Math.floor(10000000 + Math.random() * 90000000),
                currency: 'INR',
                donation_date: now.toISOString(),
                payment_status: VALID_STATUSES.has(donationObj.payment_status) ? donationObj.payment_status : 'successful',
                transaction_id: 'TXN_SWAN_' + Math.floor(10000000 + Math.random() * 90000000),
                receipt_number: 'STF-' + now.getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000),
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                // Explicitly keep only donation data; callers cannot supply
                // identifiers, timestamps, receipt numbers, or other system fields.
                donor_id: cleanText(donationObj.donor_id, 80),
                donor_name: cleanText(donationObj.donor_name, 120),
                donor_email: cleanText(donationObj.donor_email, 254).toLowerCase(),
                donor_phone: cleanText(donationObj.donor_phone, 32),
                amount: cleanAmount(donationObj.amount),
                campaign: cleanText(donationObj.campaign || 'General Donation', 120),
                payment_method: cleanText(donationObj.payment_method || 'UPI / Card', 40)
            };
            donations.unshift(newDonation);
            setItem(STORAGE_DONATIONS, donations);
            return newDonation;
        },

        updateDonationStatus: (id, newStatus) => {
            if (!VALID_STATUSES.has(newStatus)) return null;
            const donations = DB.getDonations();
            const idx = donations.findIndex(d => d.id === id);
            if (idx === -1) return null;
            donations[idx].payment_status = newStatus;
            donations[idx].updated_at = new Date().toISOString();
            setItem(STORAGE_DONATIONS, donations);
            return donations[idx];
        },

        getHelpRequests: () => getItem(STORAGE_HELP_REQUESTS, [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),

        getHelpRequestById: (id) => DB.getHelpRequests().find(request => request.id === id) || null,

        createHelpRequest: (requestObj) => {
            const fullName = cleanText(requestObj.full_name, 120);
            const phone = cleanText(requestObj.phone, 32);
            const email = cleanText(requestObj.email, 254).toLowerCase();
            const description = cleanText(requestObj.description, 2500);

            if (!fullName || !phone || !description) {
                throw new Error('Please provide your name, phone number, and a description of the help you need.');
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Please enter a valid email address.');
            }

            const requests = getItem(STORAGE_HELP_REQUESTS, []);
            const now = new Date().toISOString();
            const newRequest = {
                id: 'HELP-' + Math.floor(100000 + Math.random() * 900000),
                full_name: fullName,
                phone,
                email,
                address: cleanText(requestObj.address, 300),
                help_type: cleanText(requestObj.help_type, 80) || 'Other support',
                estimated_amount: cleanText(requestObj.estimated_amount, 40),
                urgency: ['low', 'medium', 'high', 'critical'].includes(requestObj.urgency) ? requestObj.urgency : 'medium',
                description,
                consent: Boolean(requestObj.consent),
                status: 'new',
                admin_note: '',
                created_at: now,
                updated_at: now
            };
            requests.unshift(newRequest);
            setItem(STORAGE_HELP_REQUESTS, requests);
            return newRequest;
        },

        updateHelpRequest: (id, updates) => {
            const requests = getItem(STORAGE_HELP_REQUESTS, []);
            const index = requests.findIndex(request => request.id === id);
            if (index === -1) return null;
            if (Object.prototype.hasOwnProperty.call(updates, 'status') && VALID_HELP_STATUSES.has(updates.status)) {
                requests[index].status = updates.status;
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'admin_note')) {
                requests[index].admin_note = cleanText(updates.admin_note, 1500);
            }
            requests[index].updated_at = new Date().toISOString();
            setItem(STORAGE_HELP_REQUESTS, requests);
            return requests[index];
        },

        getHelpRequestAnalytics: () => {
            const requests = DB.getHelpRequests();
            return {
                total: requests.length,
                new_count: requests.filter(request => request.status === 'new').length,
                reviewing_count: requests.filter(request => request.status === 'reviewing').length,
                approved_count: requests.filter(request => request.status === 'approved').length
            };
        },

        getAnalytics: () => {
            const donations = DB.getDonations();
            const users = DB.getUsers().filter(u => u.role === 'donor');

            const successfulDonations = donations.filter(d => d.payment_status === 'successful');
            const totalDonated = successfulDonations.reduce((sum, d) => sum + Number(d.amount), 0);

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const thisMonthDonations = successfulDonations.filter(d => {
                const date = new Date(d.donation_date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            }).reduce((sum, d) => sum + Number(d.amount), 0);

            return {
                total_donated: totalDonated,
                total_donors: users.length,
                successful_count: successfulDonations.length,
                this_month_donated: thisMonthDonations,
                all_donations_count: donations.length
            };
        }
    };

    window.SwanDB = DB;
})();
