/* =========================================================
   SWAN TURBINES FOUNDATION - AUTHENTICATION MODULE (AUTH)
========================================================= */

(function () {
    const SESSION_KEY = 'swan_auth_session_v2';
    const LOGIN_ATTEMPTS_KEY = 'swan_login_attempts_v1';
    const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

    function getAttemptState() {
        try {
            return JSON.parse(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY)) || { count: 0, lockedUntil: 0 };
        } catch (e) {
            return { count: 0, lockedUntil: 0 };
        }
    }

    function saveAttemptState(state) {
        sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(state));
    }

    function safeImageSource(value) {
        const source = String(value || '').trim();
        return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(source) ? source : '';
    }

    const Auth = {
        modalScrollY: 0,

        lockPageScroll: function () {
            if (document.body.classList.contains('auth-modal-open')) return;

            Auth.modalScrollY = window.scrollY;
            document.documentElement.classList.add('auth-modal-open');
            document.body.classList.add('auth-modal-open');
            document.body.style.position = 'fixed';
            document.body.style.top = `-${Auth.modalScrollY}px`;
            document.body.style.width = '100%';
        },

        unlockPageScroll: function () {
            if (!document.body.classList.contains('auth-modal-open')) return;

            document.documentElement.classList.remove('auth-modal-open');
            document.body.classList.remove('auth-modal-open');
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('top');
            document.body.style.removeProperty('width');
            window.scrollTo(0, Auth.modalScrollY);
        },

        // Get currently logged-in user
        getCurrentUser: function () {
            try {
                const sessionData = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
                if (!sessionData) return null;
                const session = JSON.parse(sessionData);
                if (!session.user_id || !session.expires_at || Date.now() >= new Date(session.expires_at).getTime()) {
                    sessionStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(SESSION_KEY);
                    return null;
                }
                const user = window.SwanDB.getUserById(session.user_id);
                if (!user) return null;
                const profile = window.SwanDB.getProfileByUserId(session.user_id);
                if (profile && profile.profile_image && !user.profile_image) {
                    user.profile_image = profile.profile_image;
                }
                return user;
            } catch (e) {
                return null;
            }
        },

        isLoggedIn: function () {
            return !!Auth.getCurrentUser();
        },

        isAdmin: function () {
            const user = Auth.getCurrentUser();
            return user && user.role === 'admin';
        },

        // Password requirements validation
        validatePasswordStrength: function (password) {
            if (password.length < 8) return 'Password must be at least 8 characters long.';
            if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
            if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
            if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
            return null;
        },

        // Registration
        register: function (fullName, email, phone, password, confirmPassword, agreeTerms) {
            if (!fullName || !fullName.trim()) throw new Error('Full Name is required.');
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Please enter a valid email address.');
            if (!phone || phone.trim().length < 7) throw new Error('Please enter a valid phone number.');
            if (!agreeTerms) throw new Error('You must agree to the Terms & Conditions and Privacy Policy.');
            if (password !== confirmPassword) throw new Error('Passwords do not match.');

            const passErr = Auth.validatePasswordStrength(password);
            if (passErr) throw new Error(passErr);

            const existing = window.SwanDB.getUserByEmail(email);
            if (existing) throw new Error('An account with this email address already exists.');

            const newUser = window.SwanDB.createUser({
                full_name: fullName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password_hash: password // In real prod hashed via bcrypt/Supabase Auth
            });

            // Auto login after registration
            Auth.createSession(newUser.id, true);
            return newUser;
        },

        // Login
        login: function (email, password, rememberMe) {
            if (!email || !password) throw new Error('Please enter both email and password.');

            const attempts = getAttemptState();
            if (attempts.lockedUntil > Date.now()) {
                const minutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
                throw new Error(`Too many sign-in attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
            }

            const user = window.SwanDB.getUserByEmail(email);
            if (!user || user.password_hash !== password) {
                const nextAttempts = attempts.lockedUntil && attempts.lockedUntil <= Date.now()
                    ? { count: 0, lockedUntil: 0 }
                    : attempts;
                nextAttempts.count += 1;
                if (nextAttempts.count >= MAX_LOGIN_ATTEMPTS) {
                    nextAttempts.count = 0;
                    nextAttempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
                }
                saveAttemptState(nextAttempts);
                throw new Error('Invalid email or password. Please try again.');
            }

            saveAttemptState({ count: 0, lockedUntil: 0 });
            Auth.createSession(user.id, rememberMe);
            return user;
        },

        // Password Reset Request
        requestPasswordReset: function (email) {
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                throw new Error('Please enter a valid email address.');
            }
            const user = window.SwanDB.getUserByEmail(email);
            if (!user) {
                // For security, don't disclose non-existent accounts, return true
                return true;
            }
            // Simulated reset token sent
            return true;
        },

        // Reset password
        resetPassword: function (email, newPassword) {
            const user = window.SwanDB.getUserByEmail(email);
            if (!user) throw new Error('User not found.');
            const passErr = Auth.validatePasswordStrength(newPassword);
            if (passErr) throw new Error(passErr);

            window.SwanDB.updateUser(user.id, { password_hash: newPassword });
            return true;
        },

        // Session creation
        createSession: function (userId, rememberMe) {
            const now = Date.now();
            const session = {
                user_id: userId,
                logged_at: new Date(now).toISOString(),
                expires_at: new Date(now + SESSION_DURATION_MS).toISOString()
            };
            if (rememberMe) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            } else {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            }
            Auth.updateHeaderUI();
        },

        // Logout
        logout: function () {
            if (!window.confirm('Are you sure you want to log out?')) return;
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
            window.location.href = 'index.html';
        },

        // Page Authorization Guard
        requireAuth: function (requiredRole) {
            const user = Auth.getCurrentUser();
            if (!user) {
                if (requiredRole === 'admin') {
                    window.location.href = 'adminlogin/';
                } else {
                    window.location.href = 'login.html';
                }
                return false;
            }
            if (requiredRole && user.role !== requiredRole) {
                if (requiredRole === 'admin') {
                    alert('Access Denied: You do not have administrator permissions.');
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'index.html';
                }
                return false;
            }
            return true;
        },

        // Header Navigation UI Update
        updateHeaderUI: function () {
            // Public visitors do not need an account: help requests are submitted
            // directly and reviewed in the private administrator portal.
            return;

            const user = Auth.getCurrentUser();
            const navInner = document.querySelector('.site-nav .nav-inner');

            if (navInner) {
                // Find existing start-btn or profile container in nav
                let profileContainer = navInner.querySelector('.nav-profile-container');
                let navStartBtn = navInner.querySelector('.start-btn:not(.admin-logout):not(.donate-btn)');

                if (!user) {
                    // Remove profile container if exists
                    if (profileContainer) profileContainer.remove();

                    // Ensure Get Started button is shown
                    if (!navStartBtn) {
                        navStartBtn = document.createElement('button');
                        navStartBtn.className = 'start-btn';
                        navInner.appendChild(navStartBtn);
                    }
                    navStartBtn.style.display = 'inline-flex';
                    navStartBtn.innerHTML = `Get started <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>`;
                    navStartBtn.onclick = () => {
                        if (typeof animateStartButton === 'function') animateStartButton(navStartBtn);
                        Auth.openAuthModal('login');
                    };
                } else {
                    // Hide or remove old text button in nav
                    if (navStartBtn) navStartBtn.style.display = 'none';

                    // Create or update circular profile avatar button with dropdown
                    if (!profileContainer) {
                        profileContainer = document.createElement('div');
                        profileContainer.className = 'nav-profile-container';
                        navInner.appendChild(profileContainer);
                    }

                    const initial = (user.full_name || 'U').charAt(0).toUpperCase();
                    const imageSource = safeImageSource(user.profile_image);
                    const photoHtml = imageSource
                        ? `<img src="${imageSource}" alt="${user.full_name}">` 
                        : initial;

                    const isAdmin = user.role === 'admin';
                    const badgeText = isAdmin ? 'Admin' : 'Donor';

                    profileContainer.innerHTML = `
                        <button type="button" class="nav-profile-avatar-btn" aria-label="Open profile menu" title="${user.full_name} (${badgeText})">
                            ${photoHtml}
                        </button>
                        <div class="nav-profile-dropdown" role="menu">
                            <div class="nav-profile-user-info">
                                <p class="nav-profile-name">${user.full_name || 'User'}</p>
                                <p class="nav-profile-email">${user.email || ''}</p>
                                <span class="nav-profile-badge">${badgeText}</span>
                            </div>
                            ${isAdmin ? `<button type="button" class="nav-profile-item" onclick="window.location.href='admin.html'">Admin Portal</button>` : ''}
                            <button type="button" class="nav-profile-item" onclick="window.location.href='profile.html'">
                                ${isAdmin ? 'Profile & Signature' : 'Profile'}
                            </button>
                            <button type="button" class="nav-profile-item" onclick="window.location.href='donate.html'">
                                Donate Now
                            </button>
                            <button type="button" class="nav-profile-item logout" onclick="SwanAuth.logout()">
                                Logout
                            </button>
                        </div>
                    `;
                }
            }

            // Remove any obsolete user link from nav-links if present
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                const userLink = navLinks.querySelector('.nav-user-link');
                if (userLink) userLink.remove();
            }

            // Update Mobile Menu dynamic auth buttons
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                let authContainer = mobileMenu.querySelector('.mobile-auth-actions');
                if (!authContainer) {
                    authContainer = document.createElement('div');
                    authContainer.className = 'mobile-auth-actions';
                    mobileMenu.appendChild(authContainer);
                }

                if (!user) {
                    authContainer.innerHTML = `
                        <button class="mobile-auth-btn primary-mobile-btn" onclick="SwanAuth.openAuthModal('login');closeMobileMenu()">Get Started / Login</button>
                    `;
                } else {
                    const initial = (user.full_name || 'U').charAt(0).toUpperCase();
                    const photoHtml = user.profile_image 
                        ? `<img src="${user.profile_image}" alt="${user.full_name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` 
                        : initial;
                    const isAdmin = user.role === 'admin';

                    authContainer.innerHTML = `
                        <div style="padding:10px 14px; background:#f8fafc; border-radius:12px; margin-bottom:8px; display:flex; align-items:center; gap:10px;">
                            <div style="width:36px; height:36px; border-radius:50%; background:#0a3663; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; overflow:hidden;">${photoHtml}</div>
                            <div>
                                <div style="font-weight:600; font-size:13px; color:#0f172a;">${user.full_name}</div>
                                <div style="font-size:11px; color:#64748b;">${isAdmin ? 'Administrator' : user.email}</div>
                            </div>
                        </div>
                        ${isAdmin ? `<button class="mobile-auth-btn secondary-mobile-btn" onclick="window.location.href='admin.html';closeMobileMenu()">Admin Portal</button>` : ''}
                        <button class="mobile-auth-btn secondary-mobile-btn" onclick="window.location.href='profile.html';closeMobileMenu()">${isAdmin ? 'Profile & Signature' : 'Profile'}</button>
                        <button class="mobile-auth-btn logout-mobile-btn" onclick="SwanAuth.logout()">Logout</button>
                    `;
                }
            }
        },

        // Floating Auth Modal UI Popup
        openAuthModal: function (mode, targetIntent) {
            if (targetIntent) {
                Auth.redirectTarget = targetIntent === 'donate' ? 'donate.html' : targetIntent;
            } else {
                Auth.redirectTarget = null;
            }

            let overlay = document.getElementById('authModalOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'authModalOverlay';
                overlay.className = 'auth-modal-overlay';
                overlay.innerHTML = `
                    <div class="auth-card">
                        <button type="button" class="auth-close-btn" onclick="SwanAuth.closeAuthModal()">✕</button>
                        <div id="authModalContent"></div>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
            Auth.renderModalMode(mode || 'login');
            Auth.lockPageScroll();
            overlay.classList.add('open');
        },

        closeAuthModal: function () {
            const overlay = document.getElementById('authModalOverlay');
            if (overlay) overlay.classList.remove('open');
            Auth.unlockPageScroll();
        },

        renderModalMode: function (mode) {
            const container = document.getElementById('authModalContent');
            if (!container) return;

            const isDonationIntent = typeof Auth.redirectTarget === 'string' && Auth.redirectTarget.startsWith('donate.html');

            if (mode === 'login') {
                container.innerHTML = `
                    <div class="auth-header">
                        <h2>${isDonationIntent ? 'Sign In to Donate' : 'Log In'}</h2>
                        <p>${isDonationIntent ? 'Please log in to proceed with your secure donation.' : 'Sign in to your Swan Turbines Foundation account.'}</p>
                    </div>
                    <div class="auth-error-banner" id="modalError"></div>
                    <form class="auth-form" onsubmit="SwanAuth.handleModalSubmit(event, 'login')">
                        <div class="auth-field">
                            <label for="m_email">Email address</label>
                            <div class="auth-input-wrapper">
                                <input type="email" id="m_email" required placeholder="you@example.com">
                            </div>
                        </div>
                        <div class="auth-field">
                            <label for="m_password">Password</label>
                            <div class="auth-input-wrapper">
                                <input type="password" id="m_password" required placeholder="••••••••">
                                <button type="button" class="toggle-password" onclick="SwanAuth.togglePass('m_password', this)">Show</button>
                            </div>
                        </div>
                        <div class="auth-flex-row">
                            <label class="auth-checkbox-label">
                                <input type="checkbox" id="m_remember" checked> Remember me
                            </label>
                            <a href="javascript:void(0)" class="auth-link" onclick="SwanAuth.renderModalMode('forgot')">Forgot password?</a>
                        </div>
                        <button type="submit" class="auth-submit-btn">${isDonationIntent ? 'Log In & Continue to Donate' : 'Log In'}</button>
                    </form>
                    <div class="auth-switch-text">
                        Don't have an account? <a href="javascript:void(0)" class="auth-link" onclick="SwanAuth.renderModalMode('register')">Create an account</a>
                    </div>
                `;
            } else if (mode === 'register') {
                container.innerHTML = `
                    <div class="auth-header">
                        <h2>${isDonationIntent ? 'Create Account & Donate' : 'Create account'}</h2>
                        <p>${isDonationIntent ? 'Register an account to complete your donation and track receipts.' : 'Join as a registered donor to support charity programs.'}</p>
                    </div>
                    <div class="auth-error-banner" id="modalError"></div>
                    <form class="auth-form" onsubmit="SwanAuth.handleModalSubmit(event, 'register')">
                        <div class="auth-field">
                            <label for="m_reg_name">Full Name</label>
                            <div class="auth-input-wrapper"><input type="text" id="m_reg_name" required placeholder="Full Name"></div>
                        </div>
                        <div class="auth-field">
                            <label for="m_reg_email">Email address</label>
                            <div class="auth-input-wrapper"><input type="email" id="m_reg_email" required placeholder="you@example.com"></div>
                        </div>
                        <div class="auth-field">
                            <label for="m_reg_phone">Phone number</label>
                            <div class="auth-input-wrapper"><input type="tel" id="m_reg_phone" required placeholder="+91 98765 43210"></div>
                        </div>
                        <div class="auth-field">
                            <label for="m_reg_pass">Password</label>
                            <div class="auth-input-wrapper">
                                <input type="password" id="m_reg_pass" required placeholder="Min 8 chars, 1 uppercase, 1 digit">
                                <button type="button" class="toggle-password" onclick="SwanAuth.togglePass('m_reg_pass', this)">Show</button>
                            </div>
                        </div>
                        <div class="auth-field">
                            <label for="m_reg_confirm">Confirm Password</label>
                            <div class="auth-input-wrapper"><input type="password" id="m_reg_confirm" required placeholder="Confirm Password"></div>
                        </div>
                        <label class="auth-checkbox-label" style="font-size:12.5px;">
                            <input type="checkbox" id="m_reg_agree" required> I agree to the <a href="terms-and-conditions.html" target="_blank" class="auth-link">Terms</a> & <a href="privacy-policy.html" target="_blank" class="auth-link">Privacy Policy</a>
                        </label>
                        <button type="submit" class="auth-submit-btn">${isDonationIntent ? 'Create Account & Continue' : 'Create Account'}</button>
                    </form>
                    <div class="auth-switch-text">
                        Already have an account? <a href="javascript:void(0)" class="auth-link" onclick="SwanAuth.renderModalMode('login')">Sign In</a>
                    </div>
                `;
            } else if (mode === 'forgot') {
                container.innerHTML = `
                    <div class="auth-header">
                        <h2>Reset Password</h2>
                        <p>Enter your email address to receive password reset instructions.</p>
                    </div>
                    <div class="auth-error-banner" id="modalError"></div>
                    <div class="auth-success-banner" id="modalSuccess"></div>
                    <form class="auth-form" onsubmit="SwanAuth.handleModalSubmit(event, 'forgot')">
                        <div class="auth-field">
                            <label for="m_forgot_email">Email address</label>
                            <div class="auth-input-wrapper"><input type="email" id="m_forgot_email" required placeholder="you@example.com"></div>
                        </div>
                        <button type="submit" class="auth-submit-btn">Send Reset Link</button>
                    </form>
                    <div class="auth-switch-text">
                        Back to <a href="javascript:void(0)" class="auth-link" onclick="SwanAuth.renderModalMode('login')">Sign In</a>
                    </div>
                `;
            }
        },

        togglePass: function (inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Hide';
            } else {
                input.type = 'password';
                btn.textContent = 'Show';
            }
        },

        handleModalSubmit: function (e, mode) {
            e.preventDefault();
            const errBanner = document.getElementById('modalError');
            const succBanner = document.getElementById('modalSuccess');
            if (errBanner) { errBanner.classList.remove('show'); errBanner.textContent = ''; }
            if (succBanner) { succBanner.classList.remove('show'); succBanner.textContent = ''; }

            try {
                if (mode === 'login') {
                    const email = document.getElementById('m_email').value;
                    const pass = document.getElementById('m_password').value;
                    const rem = document.getElementById('m_remember').checked;
                    const user = Auth.login(email, pass, rem);
                    Auth.closeAuthModal();

                    if (Auth.redirectTarget) {
                        const target = Auth.redirectTarget;
                        Auth.redirectTarget = null;
                        window.location.href = target;
                    } else if (user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else if (mode === 'register') {
                    const name = document.getElementById('m_reg_name').value;
                    const email = document.getElementById('m_reg_email').value;
                    const phone = document.getElementById('m_reg_phone').value;
                    const pass = document.getElementById('m_reg_pass').value;
                    const conf = document.getElementById('m_reg_confirm').value;
                    const agree = document.getElementById('m_reg_agree').checked;
                    Auth.register(name, email, phone, pass, conf, agree);
                    Auth.closeAuthModal();

                    if (Auth.redirectTarget) {
                        const target = Auth.redirectTarget;
                        Auth.redirectTarget = null;
                        window.location.href = target;
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else if (mode === 'forgot') {
                    const email = document.getElementById('m_forgot_email').value;
                    Auth.requestPasswordReset(email);
                    if (succBanner) {
                        succBanner.textContent = 'Password reset instructions have been sent to your email address.';
                        succBanner.classList.add('show');
                    }
                }
            } catch (err) {
                if (errBanner) {
                    errBanner.textContent = err.message || 'An error occurred. Please try again.';
                    errBanner.classList.add('show');
                }
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        Auth.updateHeaderUI();
    });

    window.SwanAuth = Auth;
})();
