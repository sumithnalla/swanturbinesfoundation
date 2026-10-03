
/* =========================================================
   LOADER
========================================================= */

function initLoaderBrandRing() {
    document.querySelectorAll('.loader-logo').forEach(loaderLogo => {
        if (loaderLogo.dataset.brandRingInitialized === 'true') return;

        const logoImage = loaderLogo.querySelector('img');
        if (!logoImage) return;

        loaderLogo.dataset.brandRingInitialized = 'true';
        loaderLogo.setAttribute('aria-label', 'Swan Turbains Foundation is loading');

        // Remove the old wordmark while retaining the accessible image label.
        Array.from(loaderLogo.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
        });

        const ring = document.createElement('div');
        ring.className = 'loader-brand-ring';
        ring.setAttribute('aria-hidden', 'true');

        const text = 'SWAN TURBAINS FOUNDATION';
        Array.from(text).forEach((letter, index) => {
            const character = document.createElement('span');
            character.textContent = letter === ' ' ? '\u00a0' : letter;
            character.style.setProperty('--angle', `${(360 / text.length) * index}deg`);
            ring.appendChild(character);
        });

        loaderLogo.appendChild(ring);
    });
}

initLoaderBrandRing();

function hideLoader() {
    const loader = document.getElementById("loader");
    if (!loader || loader.classList.contains("hide")) return;
    loader.classList.add("hide");
}

// Do not leave the mobile loader visible while remote images are still loading.
window.addEventListener("DOMContentLoaded", () => window.setTimeout(hideLoader, 850), { once: true });
window.addEventListener("load", () => window.setTimeout(hideLoader, 350), { once: true });


/* =========================================================
   NAVBAR SCROLL
========================================================= */

window.addEventListener("scroll", () => {

    const nav = document.getElementById("navbar");
    if (!nav) return;

    const currentPath = window.location.pathname;
    const pageId = currentPath.split('/').pop().replace('.html', '') || 'home';
    const isHome = (pageId === 'index' || pageId === 'home');

    if (!isHome) {

        nav.classList.add("scrolled");

    } else if (window.scrollY > 40) {

        nav.classList.add("scrolled");

    } else {

        nav.classList.remove("scrolled");

    }

});





/* =========================================================
   INITIAL ACTIVE NAV
========================================================= */

function setActiveNav() {
    const currentPath = window.location.pathname;
    const pageId = currentPath.split('/').pop().replace('.html', '') || 'home';
    const navPageId = pageId === 'index' ? 'home' : pageId;

    document.querySelectorAll(".nav-links button").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.page === navPageId) {
            btn.classList.add("active");
        }
    });

    // Force navbar background on inner pages
    const nav = document.getElementById("navbar");
    if (!nav) return;
    if (navPageId !== "home") {
        nav.classList.add("scrolled");
    } else if (window.scrollY <= 40) {
        nav.classList.remove("scrolled");
    }
}

window.addEventListener("DOMContentLoaded", setActiveNav);

function initNavBackButton() {
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    const isHomePage = pageName === 'index.html' || pageName === '';
    const navInner = document.querySelector('.nav-inner');

    if (!navInner || isHomePage) return;

    if (document.body.classList.contains('campaign-detail-page')) {
        navInner.querySelector('.nav-back-button')?.remove();
        return;
    }

    let backButton = navInner.querySelector('.nav-back-button');
    if (!backButton) {
        backButton = document.createElement('button');
        backButton.className = 'nav-back-button';
        backButton.type = 'button';
        backButton.title = 'Go back';
        backButton.setAttribute('aria-label', 'Go back');
        backButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>';
        navInner.prepend(backButton);
    }

    backButton.removeAttribute('onclick');
    backButton.addEventListener('click', () => {
        if (document.body.classList.contains('campaign-detail-page')) {
            window.location.href = 'campaigns.html';
        } else if (pageName === 'campaigns.html' || pageName === 'campaigns') {
            window.location.href = 'index.html';
        } else if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    });
}

window.addEventListener("DOMContentLoaded", initNavBackButton);


/* =========================================================
   MOBILE MENU
========================================================= */

function initMobileMenuButton() {
    const button = document.querySelector(".menu-btn");
    if (!button) return;

    button.type = "button";
    button.setAttribute("aria-controls", "mobileMenu");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation menu");
    button.innerHTML = '<span class="menu-btn-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
}

window.addEventListener("DOMContentLoaded", initMobileMenuButton);

function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    const button = document.querySelector(".menu-btn");
    if (!menu || !button) return;

    const isOpen = menu.classList.toggle("is-open");
    button.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");

}

function closeMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    const button = document.querySelector(".menu-btn");
    if (!menu || !button) return;

    menu.classList.remove("is-open");
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation menu");

}


/* =========================================================
   DONATION PAGE
========================================================= */

function animateStartButton(button) {
    if (!button || !button.classList || !button.classList.contains("start-btn")) return false;

    button.classList.add("is-animating");
    return true;
}

function openDonation(button) {
    const trigger = button || document.activeElement;
    if (animateStartButton(trigger)) {
        window.setTimeout(() => { window.location.href = 'request-help.html'; }, 220);
    } else {
        window.location.href = 'request-help.html';
    }

}

// Retire the public donation and account CTAs across the existing public pages.
// Their action now routes people to the confidential help-request form instead.
function replacePublicDonationActions() {
    const pageName = window.location.pathname.split('/').pop();
    if (pageName === 'donate.html' || pageName === 'donation-details.html') {
        window.location.replace('request-help.html');
        return;
    }

    const isPrivatePage = document.body.classList.contains('admin-dashboard-page') || document.body.classList.contains('admin-login-page');
    if (!isPrivatePage) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && !Array.from(navLinks.querySelectorAll('button, a')).some(item => /request help/i.test(item.textContent))) {
            const requestLink = document.createElement('button');
            requestLink.type = 'button';
            requestLink.textContent = 'Request Help';
            requestLink.onclick = () => { window.location.href = 'request-help.html'; };
            navLinks.appendChild(requestLink);
        }
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && !Array.from(mobileMenu.querySelectorAll('button, a')).some(item => /request help/i.test(item.textContent))) {
            const requestLink = document.createElement('button');
            requestLink.type = 'button';
            requestLink.textContent = 'Request Help';
            requestLink.onclick = () => { window.location.href = 'request-help.html'; };
            mobileMenu.appendChild(requestLink);
        }
    }

    const updateLabel = (element, label) => {
        let replaced = false;
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && /donate|get started/i.test(node.nodeValue)) {
                node.nodeValue = node.nodeValue.replace(/donate now|donate to this fund|donate|get started/ig, label);
                replaced = true;
            }
        });
        if (!replaced && /donate|get started/i.test(element.textContent)) element.setAttribute('aria-label', label);
    };

    document.querySelectorAll('button, a').forEach(element => {
        const onClick = element.getAttribute('onclick') || '';
        const href = element.getAttribute('href') || '';
        const text = element.textContent || '';
        if (/openDonation|donate\.html|donation-details\.html/i.test(onClick + ' ' + href)) {
            updateLabel(element, 'Request Help');
            element.removeAttribute('onclick');
            if (element.tagName === 'A') element.setAttribute('href', 'request-help.html');
            else element.addEventListener('click', () => { window.location.href = 'request-help.html'; });
        } else if (/donate to this fund/i.test(text)) {
            updateLabel(element, 'Explore this work');
        }
    });
    document.querySelectorAll('#donationModal').forEach(modal => modal.remove());
}

window.addEventListener('DOMContentLoaded', replacePublicDonationActions);

function goBackFromCampaign(button) {
    const sourcePage = new URLSearchParams(window.location.search).get("from");
    window.location.href = sourcePage === "home" ? "index.html" : "campaigns.html";
}

function closeDonation() {
    const modal = document.getElementById("donationModal");
    if (modal) modal.classList.remove("open");

}


/* =========================================================
   DONATION WIZARD
========================================================= */

function initDonationWizard() {
    const wizard = document.querySelector(".donation-wizard");
    if (!wizard) return;

    let wizardStep = 1;
    let currentDonationRecord = null;
    const amountInput = document.getElementById("donationAmount");
    const amountButtons = wizard.querySelectorAll("[data-donation-amount]");
    const panels = wizard.querySelectorAll(".donation-panel");
    const steps = wizard.querySelectorAll(".wizard-step");
    const previousButton = document.getElementById("wizardPrevious");
    const nextButton = document.getElementById("wizardNext");

    const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR", maximumFractionDigits: 0
    }).format(amount);

    function selectWizardAmount(button) {
        amountButtons.forEach(item => item.classList.remove("selected"));
        button.classList.add("selected");
        amountInput.value = button.dataset.donationAmount;
    }

    // Pre-select amount if passed via URL (e.g., from donation-details.html?amount=1000)
    const urlParams = new URLSearchParams(window.location.search);
    const paramAmount = urlParams.get("amount");
    if (paramAmount && amountInput) {
        amountInput.value = paramAmount;
        let matched = false;
        amountButtons.forEach(btn => {
            if (btn.dataset.donationAmount === paramAmount) {
                btn.classList.add("selected");
                matched = true;
            } else {
                btn.classList.remove("selected");
            }
        });
        if (!matched) {
            amountButtons.forEach(btn => btn.classList.remove("selected"));
        }
    }

    function validateStep(step) {
        const panel = wizard.querySelector(`[data-step-panel="${step}"]`);
        if (step === 1) {
            const amount = Number(amountInput.value);
            amountInput.setCustomValidity(Number.isFinite(amount) && amount >= 1 ? "" : "Enter a donation amount of at least ₹1.");
        } else if (step === 3) {
            const consentCheck = document.getElementById("donateConsentCheck");
            if (consentCheck && !consentCheck.checked) {
                alert("Please agree to the Terms & Conditions and Privacy Policy before completing your donation.");
                return false;
            }
        }
        return Array.from(panel.querySelectorAll("input[required]")).every(field => field.reportValidity());
    }

    function autofillUserIfLoggedIn() {
        if (window.SwanAuth && window.SwanAuth.isLoggedIn()) {
            const user = window.SwanAuth.getCurrentUser();
            const nameField = document.getElementById("donorName");
            const emailField = document.getElementById("donorEmail");
            const phoneField = document.getElementById("donorPhone");

            if (nameField && !nameField.value) nameField.value = user.full_name;
            if (emailField && !emailField.value) emailField.value = user.email;
            if (phoneField && !phoneField.value && user.phone) phoneField.value = user.phone;
        }
    }

    function renderReceipt(record) {
        document.getElementById("receiptAmount").textContent = formatCurrency(Number(record ? record.amount : amountInput.value));
        document.getElementById("receiptDonor").textContent = document.getElementById("donorName").value.trim();
        document.getElementById("receiptEmail").textContent = document.getElementById("donorEmail").value.trim();
        document.getElementById("receiptNumber").textContent = record ? record.receipt_number : `STF-${Date.now().toString().slice(-8)}`;

        const receiptPanel = wizard.querySelector(".receipt-panel");
        if (receiptPanel && record) {
            let dashboardBtn = receiptPanel.querySelector(".receipt-dashboard-btn");
            if (!dashboardBtn) {
                dashboardBtn = document.createElement("button");
                dashboardBtn.className = "btn-primary-action";
                dashboardBtn.style.marginTop = "15px";
                dashboardBtn.textContent = "View in Donor Dashboard →";
                dashboardBtn.onclick = () => window.location.href = "dashboard.html";
                receiptPanel.appendChild(dashboardBtn);
            }
        }
    }

    function showStep(step) {
        if (step === 2) {
            autofillUserIfLoggedIn();
        }

        if (step === 4) {
            // Gate: user must be logged in before we process the payment
            if (window.SwanAuth && !window.SwanAuth.isLoggedIn()) {
                // Redirect to login page with return URL so user lands back on donate.html after login
                const redirectUrl = encodeURIComponent(window.location.href);
                window.location.href = 'login.html?redirect=' + redirectUrl;
                return;
            }

            const currentUser = window.SwanAuth ? window.SwanAuth.getCurrentUser() : null;
            const donorName = document.getElementById("donorName").value.trim();
            const donorEmail = document.getElementById("donorEmail").value.trim();
            const donorPhone = document.getElementById("donorPhone").value.trim();

            if (window.SwanDB) {
                const urlParams = new URLSearchParams(window.location.search);
                const campaignName = urlParams.get('campaign') || 'General Donation';

                currentDonationRecord = window.SwanDB.createDonation({
                    donor_id: currentUser ? currentUser.id : 'user_guest_' + Date.now(),
                    donor_name: donorName,
                    donor_email: donorEmail,
                    donor_phone: donorPhone,
                    amount: Number(amountInput.value),
                    campaign: campaignName,
                    payment_method: 'Credit Card / UPI',
                    payment_status: 'successful'
                });
            }
        }

        wizardStep = step;
        panels.forEach(panel => panel.hidden = Number(panel.dataset.stepPanel) !== step);
        steps.forEach(item => {
            const itemStep = Number(item.dataset.wizardStep);
            item.classList.toggle("is-active", itemStep === step);
            item.classList.toggle("is-complete", itemStep < step);
            item.setAttribute("aria-current", itemStep === step ? "step" : "false");
        });
        previousButton.hidden = step === 1 || step === 4;
        nextButton.hidden = step === 4;
        nextButton.innerHTML = step === 3 ? "Confirm donation <span aria-hidden=\"true\">→</span>" : "Continue <span aria-hidden=\"true\">→</span>";

        if (step === 4) {
            renderReceipt(currentDonationRecord);
            wizard.querySelectorAll("#cardNumber, #cardExpiry, #cardCvv, #cardholderName").forEach(field => field.value = "");
        }
        wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    amountButtons.forEach(button => button.addEventListener("click", () => selectWizardAmount(button)));
    amountInput.addEventListener("input", () => amountButtons.forEach(item => item.classList.remove("selected")));
    previousButton.addEventListener("click", () => showStep(wizardStep - 1));
    nextButton.addEventListener("click", () => {
        if (validateStep(wizardStep)) showStep(wizardStep + 1);
    });

    const cardNumber = document.getElementById("cardNumber");
    const cardExpiry = document.getElementById("cardExpiry");
    if (cardNumber) {
        cardNumber.addEventListener("input", () => {
            cardNumber.value = cardNumber.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
        });
    }
    if (cardExpiry) {
        cardExpiry.addEventListener("input", () => {
            const numbers = cardExpiry.value.replace(/\D/g, "").slice(0, 4);
            cardExpiry.value = numbers.length > 2 ? `${numbers.slice(0, 2)}/${numbers.slice(2)}` : numbers;
        });
    }
}

window.addEventListener("DOMContentLoaded", initDonationWizard);

window.addEventListener("DOMContentLoaded", () => {
    const detailPage = document.body.classList.contains("campaign-detail-page");
    if (!detailPage) return;

    const backLink = document.querySelector(".campaign-detail-back");
    if (backLink) {
        backLink.remove();
    }

    const status = document.querySelector(".campaign-detail-copy .campaign-status");
    if (status) status.remove();

    const detailImage = document.querySelector(".campaign-detail-image");
    const firstImage = detailImage && detailImage.querySelector("img");
    if (detailImage && firstImage) {
        const secondImage = firstImage.cloneNode();
        const secondSources = {
            "campaign-hunger.html": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1400&q=90",
            "campaign-relief.html": "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1400&q=90",
            "campaign-education.html": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=90",
            "campaign-water.html": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1400&q=90"
        };
        const pageName = window.location.pathname.split("/").pop();
        secondImage.src = secondSources[pageName];
        secondImage.alt = `${firstImage.alt} alternate view`;

        const firstLayer = document.createElement("div");
        firstLayer.className = "pixel-swap__layer";
        firstLayer.dataset.visible = "true";
        firstLayer.style.zIndex = "2";
        firstLayer.appendChild(firstImage);

        const secondLayer = document.createElement("div");
        secondLayer.className = "pixel-swap__layer";
        secondLayer.dataset.visible = "false";
        secondLayer.style.zIndex = "1";
        secondLayer.appendChild(secondImage);

        const pixelGrid = document.createElement("div");
        pixelGrid.className = "pixel-swap__grid";
        pixelGrid.setAttribute("aria-hidden", "true");

        detailImage.classList.add("pixel-swap", "campaign-image-swap");
        detailImage.dataset.trigger = "hover";
        detailImage.dataset.pixelSize = "64";
        detailImage.dataset.duration = "1400";
        detailImage.dataset.pixelDuration = "450";
        detailImage.dataset.pixelScale = "0.35";
        detailImage.dataset.pattern = "random";
        detailImage.dataset.fade = "true";
        detailImage.replaceChildren(firstLayer, secondLayer, pixelGrid);
        if (window.initPixelSwaps) window.initPixelSwaps();
    }

    const existingActions = document.querySelector(".campaign-detail-actions");
    if (!existingActions) {
        const donateButton = document.querySelector(".campaign-detail-copy .start-btn, .campaign-detail-copy .campaign-donate-button");
        if (donateButton) {
            donateButton.outerHTML = `
                <div class="campaign-detail-actions">
                    <button class="campaign-back-button" type="button" onclick="goBackFromCampaign(this)" aria-label="Go back to campaigns">
                        <span class="campaign-back-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </span>
                        <span>Back</span>
                    </button>
                    <button class="campaign-donate-button" type="button" onclick="openDonation(this)">
                        <span>Donate Now</span>
                        <span class="campaign-donate-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        </span>
                    </button>
                </div>`;
        }
    } else {
        const oldDonate = existingActions.querySelector(".start-btn");
        if (oldDonate) {
            oldDonate.outerHTML = `<button class="campaign-donate-button" type="button" onclick="openDonation(this)"><span>Donate Now</span><span class="campaign-donate-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>`;
        }
    }

    const factSection = document.querySelector(".campaign-detail-facts");
    const counters = Array.from(document.querySelectorAll(".campaign-detail-fact strong"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const counterData = counters.map(counter => {
        const match = counter.textContent.trim().match(/^(.*?)([\d,]+(?:\.\d+)?)(.*)$/);
        return match ? { counter, prefix: match[1], target: Number(match[2].replace(/,/g, "")), suffix: match[3] } : null;
    }).filter(Boolean);

    let countersAnimated = false;

    function animateCampaignCounters() {
        if (countersAnimated) return;
        countersAnimated = true;
        counterData.forEach(({ counter, prefix, target, suffix }, index) => {
            const duration = 1200;
            const delay = index * 120;

            if (reducedMotion) return;

            counter.textContent = `${prefix}0${suffix}`;
            window.setTimeout(() => {
                const startedAt = performance.now();

                function updateCounter(now) {
                    const progress = Math.min(1, (now - startedAt) / duration);
                    const easedProgress = 1 - Math.pow(1 - progress, 3);
                    counter.textContent = `${prefix}${Math.round(target * easedProgress).toLocaleString("en-IN")}${suffix}`;
                    if (progress < 1) window.requestAnimationFrame(updateCounter);
                }

                window.requestAnimationFrame(updateCounter);
            }, delay);
        });
    }

    if (reducedMotion || !counterData.length) return;

    if (!factSection || !window.IntersectionObserver) {
        animateCampaignCounters();
    } else {
        const counterObserver = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            animateCampaignCounters();
            counterObserver.disconnect();
        }, { threshold: 0.25 });
        counterObserver.observe(factSection);
    }

    document.addEventListener("pointerdown", event => {
        const campaignButton = event.target.closest(".campaign-donate-button");
        document.querySelectorAll(".campaign-donate-button.is-animating").forEach(button => {
            if (button !== campaignButton) button.classList.remove("is-animating");
        });
        if (campaignButton) campaignButton.classList.add("is-animating");
    });
});
window.addEventListener("DOMContentLoaded", () => {
    const startButtons = Array.from(document.querySelectorAll(".start-btn"));

    function resetStartButtons(exceptButton) {
        startButtons.forEach(button => {
            if (button !== exceptButton) button.classList.remove("is-animating");
        });
    }

    document.addEventListener("pointerdown", event => {
        const button = event.target.closest(".start-btn");

        resetStartButtons(button);
        if (button && window.matchMedia("(hover: none)").matches) animateStartButton(button);
    });

    document.addEventListener("pointerup", event => {
        if (!event.target.closest(".start-btn")) resetStartButtons();
    });

    startButtons.forEach(button => {
        button.addEventListener("pointerleave", () => button.classList.remove("is-animating"));
        button.addEventListener("blur", () => button.classList.remove("is-animating"));
    });
});


/* =========================================================
   AMOUNT SELECTOR
========================================================= */

function selectAmount(button) {

    document
        .querySelectorAll(".amount")
        .forEach(item => {

            item.classList.remove("selected");

        });

    button.classList.add("selected");

    document
        .getElementById("customAmount")
        .value =
        button.innerText.replace("₹", "").replace(",", "");

}


/* =========================================================
   DONATION ACTION
========================================================= */

function processDonation() {

    const amount =
        document.getElementById("customAmount").value;

    if (!amount || Number(amount) <= 0) {

        alert("Please select or enter a donation amount.");

        return;

    }

    /*
       CONNECT YOUR PAYMENT GATEWAY HERE.
 
       Example:
       Razorpay
       Stripe
       PayU
       Cashfree
       etc.
    */

    alert(
        "Donation amount selected: ₹" +
        Number(amount).toLocaleString("en-IN") +
        "\n\nConnect your payment gateway here."
    );

}


/* =========================================================
   CONTACT FORM
========================================================= */

async function submitContact(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const alertBox = document.getElementById('contactFormAlert');
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending message...';

    const formData = new FormData(form);
    const firstName = (formData.get('first_name') || '').trim();
    const lastName = (formData.get('last_name') || '').trim();
    const email = (formData.get('email') || '').trim();
    const message = (formData.get('message') || '').trim();

    const API_BASE = window.__API_BASE_URL__ || (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : ''
    );

    try {
        const response = await fetch(`${API_BASE}/api/v1/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: '',
                subject: 'General inquiry from website contact form',
                message: message
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error((errData.error && errData.error.message) || 'Failed to send message');
        }

        if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = '#ecfdf5';
            alertBox.style.color = '#065f46';
            alertBox.style.border = '1px solid #a7f3d0';
            alertBox.textContent = 'Thank you for reaching out to Swan Turbines Foundation. We have received your message and will respond shortly.';
        } else {
            alert('Thank you for contacting Swan Turbines Foundation. Your message has been received.');
        }
        form.reset();
    } catch (err) {
        if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = '#fef2f2';
            alertBox.style.color = '#991b1b';
            alertBox.style.border = '1px solid #fecaca';
            alertBox.textContent = err.message || 'Unable to send message at this time. Please try again.';
        } else {
            alert(err.message || 'Unable to send message at this time.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}


/* =========================================================
   STEPPER
========================================================= */

let currentStep = 1;

const steps = [

    {
        number: "Step 01",
        title: "Choose a cause",
        text:
            "Explore campaigns and find a cause that connects with you."
    },

    {
        number: "Step 02",
        title: "Make your contribution",
        text:
            "Choose an amount that feels right and support the campaign."
    },

    {
        number: "Step 03",
        title: "Your support reaches people",
        text:
            "Your contribution helps provide meaningful humanitarian assistance."
    },

    {
        number: "Step 04",
        title: "Create lasting impact",
        text:
            "Together, we help communities move toward a brighter future."
    }

];


function renderStep() {

    const step =
        steps[currentStep - 1];

    const content =
        document.getElementById("stepContent");

    content.style.animation = "none";

    void content.offsetWidth;

    content.style.animation = "stepIn .5s ease";


    content.innerHTML = `

        <div class="step-number">
            ${step.number}
        </div>

        <h2>
            ${step.title}
        </h2>

        <p>
            ${step.text}
        </p>

    `;


    for (let i = 1; i <= 4; i++) {

        document
            .getElementById("circle" + i)
            .classList.toggle(
                "active",
                i <= currentStep
            );

    }

    for (let i = 1; i <= 3; i++) {

        document
            .getElementById("line" + i)
            .classList.toggle(
                "active",
                i < currentStep
            );

    }

}


function nextStep() {

    if (currentStep < 4) {

        currentStep++;

        renderStep();

    } else {

        currentStep = 1;

        renderStep();

    }

}


function previousStep() {

    if (currentStep > 1) {

        currentStep--;

        renderStep();

    }

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function initReveal() {

    const elements =
        document.querySelectorAll(".reveal");

    const observer =
        new IntersectionObserver(

            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("show");

                    }

                });

            },

            {
                threshold: .12
            }

        );


    elements.forEach(element => {

        if (!element.classList.contains("show")) {

            observer.observe(element);

        }

    });

}

initReveal();


/* =========================================================
   KEYBOARD ESCAPE
========================================================= */

document.addEventListener("keydown", e => {

    if (e.key === "Escape") {

        closeDonation();
        closeMobileMenu();

    }

});


/* =========================================================
   CLOSE MODAL OUTSIDE
========================================================= */

document
    .getElementById("donationModal")
    ?.addEventListener("click", e => {

        if (e.target.id === "donationModal") {

            closeDonation();

        }

    });


/* =========================================================
   SCROLL STACK CARDS (HERO ANIMATION)
========================================================= */

function initScrollStack() {
    const scroller = document.querySelector('.scroll-stack-scroller');
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll('.scroll-stack-card'));
    if (!cards.length) return;

    const heroIntro = document.querySelector('.hero-grid');
    const stackInner = scroller.querySelector('.scroll-stack-inner');
    const mobileBreakpoint = window.matchMedia('(max-width: 850px)');
    let animationFrame = null;
    let isStackNearby = true;
    const lastCardState = new WeakMap();

    function getStackBaseTop(isMobile, isSmallMobile) {
        if (!isMobile) return 92;

        // Keep every card below the sticky hero copy and its Donate button.
        // The value is calculated only on load/resize, never while scrolling.
        const heroTop = isSmallMobile ? 76 : 82;
        const heroHeight = heroIntro ? heroIntro.offsetHeight : 260;
        const clearance = isSmallMobile ? 20 : 24;

        return heroTop + heroHeight + clearance;
    }

    function getMobileCardHeight(baseTop, isSmallMobile) {
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const minimumHeight = isSmallMobile ? 220 : 250;
        const maximumHeight = isSmallMobile ? 320 : 360;
        const bottomClearance = isSmallMobile ? 12 : 16;

        // Fit the active card in the visible viewport beneath the pinned hero.
        return Math.min(maximumHeight, Math.max(minimumHeight, viewportHeight - baseTop - bottomClearance));
    }

    function applyStackPositions() {
        const isMobile = mobileBreakpoint.matches;
        const isSmallMobile = window.innerWidth <= 480;
        const baseTop = getStackBaseTop(isMobile, isSmallMobile);
        const step = isSmallMobile ? 10 : (isMobile ? 12 : 16);
        const mobileCardHeight = isMobile ? getMobileCardHeight(baseTop, isSmallMobile) : null;

        cards.forEach((card, index) => {
            card.style.position = 'sticky';
            card.style.top = `${baseTop + index * step}px`;
            card.style.zIndex = index + 1;
            if (mobileCardHeight) {
                card.style.height = `${mobileCardHeight}px`;
            } else {
                card.style.removeProperty('height');
            }
        });
    }

    applyStackPositions();

    function updateCardTransforms() {
        animationFrame = null;
        if (!isStackNearby) return;

        const isMobile = mobileBreakpoint.matches;
        const isSmallMobile = window.innerWidth <= 480;
        const baseTop = getStackBaseTop(isMobile, isSmallMobile);
        const step = isSmallMobile ? 10 : (isMobile ? 12 : 16);

        cards.forEach((card, i) => {
            const rect = card.getBoundingClientRect();
            const targetTop = baseTop + i * step;

            if (rect.top <= targetTop + 4) {
                const nextCard = cards[i + 1];
                if (nextCard) {
                    const nextRect = nextCard.getBoundingClientRect();
                    // A longer range on touch screens keeps the stack readable
                    // and avoids an abrupt scale change during a short flick.
                    const scrollRange = card.offsetHeight * (isMobile ? 1.12 : 1);
                    const progress = Math.max(0, Math.min(1, (targetTop + scrollRange - nextRect.top) / scrollRange));
                    const scale = 1 - (progress * (isMobile ? 0.045 : 0.06));
                    const clampedScale = Math.max(isMobile ? 0.955 : 0.94, Math.min(1, scale));
                    const previousState = lastCardState.get(card);

                    if (previousState !== clampedScale) {
                        card.style.transform = `translate3d(0, 0, 0) scale(${clampedScale.toFixed(3)})`;
                        lastCardState.set(card, clampedScale);
                    }
                } else {
                    if (lastCardState.get(card) !== 1) {
                        card.style.transform = 'translate3d(0, 0, 0) scale(1)';
                        lastCardState.set(card, 1);
                    }
                }
            } else {
                if (lastCardState.get(card) !== 1) {
                    card.style.transform = 'translate3d(0, 0, 0) scale(1)';
                    lastCardState.set(card, 1);
                }
            }
        });

        if (!heroIntro) return;

        const finalCard = cards[cards.length - 1];
        if (!isMobile || !finalCard || !stackInner) {
            heroIntro.style.removeProperty('transform');
            return;
        }

        // The fourth card marks the end of the pinned hero.  Its normal
        // document position gives us a stable release point even while it is
        // sticky, so the hero copy follows the scroll without jumping.
        const finalCardTop = stackInner.getBoundingClientRect().top + window.scrollY + finalCard.offsetTop;
        const finalCardTarget = baseTop + ((cards.length - 1) * step);
        const releaseStart = finalCardTop - finalCardTarget;
        const releaseDistance = Math.max(0, window.scrollY - releaseStart);
        const releaseOffset = -Math.min(releaseDistance, heroIntro.offsetHeight + 24);

        heroIntro.style.transform = `translateY(${releaseOffset}px)`;
    }

    function requestCardTransformUpdate() {
        if (!isStackNearby || animationFrame !== null) return;
        animationFrame = window.requestAnimationFrame(updateCardTransforms);
    }

    const stackObserver = new IntersectionObserver(entries => {
        isStackNearby = entries[0].isIntersecting;
        if (isStackNearby) requestCardTransformUpdate();
    }, { rootMargin: '700px 0px' });

    stackObserver.observe(scroller);
    window.addEventListener('scroll', requestCardTransformUpdate, { passive: true });
    window.addEventListener('resize', () => {
        applyStackPositions();
        requestCardTransformUpdate();
    }, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            applyStackPositions();
            requestCardTransformUpdate();
        }, { passive: true });
    }

    updateCardTransforms();
}

window.addEventListener("DOMContentLoaded", initScrollStack);


/* =========================================================
   PIXEL SWAP ENGINE (vanilla JS port)
========================================================= */

(function () {
    const MAX_PIXELS = 220;
    const KEYFRAME_STEPS = 14;

    const PATTERNS = {
        random: () => null,
        center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
        edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
        'left-to-right': x => x,
        'right-to-left': x => 1 - x,
        'top-to-bottom': (_x, y) => y,
        'bottom-to-top': (_x, y) => 1 - y,
        diagonal: (x, y) => (x + y) / 2,
        spiral: (x, y) => {
            const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
            const radius = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
            return (angle + radius) % 1;
        }
    };

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const noise = s => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

    function makeEasing(value) {
        const match = /cubic-bezier\(([^)]+)\)/.exec(value);
        const pts = match ? match[1].split(',').map(Number) : [0.25, 0.1, 0.25, 1];
        const [x1, y1, x2, y2] = pts;
        if (x1 === y1 && x2 === y2) return p => p;
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
        const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
        return p => {
            let t = p;
            for (let i = 0; i < 5; i++) {
                const slope = (3 * ax * t + 2 * bx) * t + cx;
                if (!slope) break;
                t -= (((ax * t + bx) * t + cx) * t - p) / slope;
            }
            t = clamp(t, 0, 1);
            return ((ay * t + by) * t + cy) * t;
        };
    }

    function coverScale(size, gap, radius) {
        const p = clamp(radius, 0, 50) / 100;
        const corner = Math.SQRT1_2 / (Math.SQRT2 * (0.5 - p) + p);
        return ((size + gap) / size) * Math.max(1, corner);
    }

    function buildGrid(w, h, pixelSize, gapVal, pattern, randomness) {
        let size = pixelSize;
        let cols = Math.max(1, Math.ceil((w + gapVal) / (size + gapVal)));
        let rows = Math.max(1, Math.ceil((h + gapVal) / (size + gapVal)));
        if (cols * rows > MAX_PIXELS) {
            size = Math.ceil(size * Math.sqrt((cols * rows) / MAX_PIXELS));
            cols = Math.max(1, Math.ceil((w + gapVal) / (size + gapVal)));
            rows = Math.max(1, Math.ceil((h + gapVal) / (size + gapVal)));
        }
        const stride = size + gapVal;
        const ox = (w - (cols * stride - gapVal)) / 2;
        const oy = (h - (rows * stride - gapVal)) / 2;
        const order = PATTERNS[pattern] ?? PATTERNS.random;
        const mix = clamp(randomness, 0, 1);
        const pixels = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const x = cols <= 1 ? 0.5 : c / (cols - 1);
                const y = rows <= 1 ? 0.5 : r / (rows - 1);
                const base = order(x, y);
                const rand = noise(idx + 1);
                pixels.push({
                    id: idx,
                    left: ox + c * stride,
                    top: oy + r * stride,
                    offset: base === null ? rand : base * (1 - mix) + rand * mix
                });
            }
        }
        return { pixels, size, gap: gapVal, width: w, height: h };
    }

    function buildKeyframes(ease, startScale, endScale, spin, fade) {
        const win = [], cnt = [];
        for (let s = 0; s <= KEYFRAME_STEPS; s++) {
            const p = s / KEYFRAME_STEPS;
            const e = ease(p);
            const sc = startScale + (endScale - startScale) * e;
            const angle = spin * (1 - e);
            win.push({ offset: p, opacity: fade ? Math.min(1, e * 1.6) : 1, transform: `rotate(${angle}deg) scale(${sc})` });
            cnt.push({ offset: p, transform: `scale(${1 / sc}) rotate(${-angle}deg)` });
        }
        return { window: win, content: cnt };
    }

    function initPixelSwap(container) {
        const trigger = container.dataset.trigger || 'hover';
        const pixelSize = parseInt(container.dataset.pixelSize) || 64;
        const duration = parseInt(container.dataset.duration) || 1400;
        const pixelDuration = parseInt(container.dataset.pixelDuration) || 450;
        const pixelScaleVal = parseFloat(container.dataset.pixelScale) || 0.35;
        const pixelSpin = parseFloat(container.dataset.pixelSpin) || 0;
        const pixelRadius = parseFloat(container.dataset.pixelRadius) || 0;
        const pattern = container.dataset.pattern || 'random';
        const fade = container.dataset.fade !== 'false';
        const gapVal = parseInt(container.dataset.gap) || 0;
        const randomness = parseFloat(container.dataset.randomness) || 0;
        const easing = container.dataset.easing || 'cubic-bezier(0.22, 1, 0.36, 1)';

        const layers = container.querySelectorAll('.pixel-swap__layer');
        const gridEl = container.querySelector('.pixel-swap__grid');
        if (layers.length < 2 || !gridEl) return;

        let active = false;
        let transitioning = false;
        let animations = [];
        let timer = 0;

        function stopAll() {
            animations.forEach(a => a.cancel());
            animations = [];
            gridEl.innerHTML = '';
            if (timer) { clearTimeout(timer); timer = 0; }
        }

        function setShown(isActive) {
            active = isActive;
            layers[0].dataset.visible = !isActive ? 'true' : 'false';
            layers[0].style.zIndex = !isActive ? 2 : 1;
            layers[0].setAttribute('aria-hidden', isActive ? 'true' : 'false');
            layers[1].dataset.visible = isActive ? 'true' : 'false';
            layers[1].style.zIndex = isActive ? 2 : 1;
            layers[1].setAttribute('aria-hidden', !isActive ? 'true' : 'false');
            container.dataset.active = isActive;
        }

        function runTransition(toActive) {
            if (transitioning) { stopAll(); }
            transitioning = true;
            container.dataset.transitioning = 'true';

            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) { transitioning = false; return; }

            const grid = buildGrid(w, h, Math.max(8, pixelSize), Math.max(0, gapVal), pattern, randomness);
            const source = layers[toActive ? 1 : 0];

            const total = Math.max(200, duration);
            const pixMs = clamp(pixelDuration, 60, total);
            const spread = Math.max(0, total - pixMs);
            const endSc = coverScale(grid.size, grid.gap, pixelRadius);
            const kf = buildKeyframes(
                makeEasing(easing),
                clamp(pixelScaleVal, 0.05, 1) * endSc,
                endSc,
                pixelSpin,
                fade
            );

            gridEl.innerHTML = '';
            grid.pixels.forEach((px, i) => {
                const pixelEl = document.createElement('div');
                pixelEl.className = 'pixel-swap__pixel';
                pixelEl.style.left = px.left + 'px';
                pixelEl.style.top = px.top + 'px';
                pixelEl.style.width = grid.size + 'px';
                pixelEl.style.height = grid.size + 'px';
                pixelEl.style.borderRadius = clamp(pixelRadius, 0, 50) + '%';

                const content = document.createElement('div');
                content.className = 'pixel-swap__pixel-content';
                content.style.left = (-px.left) + 'px';
                content.style.top = (-px.top) + 'px';
                content.style.width = grid.width + 'px';
                content.style.height = grid.height + 'px';
                const originX = px.left + grid.size / 2;
                const originY = px.top + grid.size / 2;
                content.style.transformOrigin = originX + 'px ' + originY + 'px';

                const clone = source.cloneNode(true);
                clone.dataset.visible = 'true';
                clone.removeAttribute('aria-hidden');
                clone.style.visibility = 'visible';
                clone.style.opacity = '1';
                clone.style.pointerEvents = 'none';
                content.appendChild(clone);
                pixelEl.appendChild(content);
                gridEl.appendChild(pixelEl);

                const timing = { duration: pixMs, delay: px.offset * spread, easing: 'linear', fill: 'both' };
                animations.push(
                    pixelEl.animate(kf.window, timing),
                    content.animate(kf.content, timing)
                );
            });

            timer = setTimeout(() => {
                stopAll();
                setShown(toActive);
                transitioning = false;
                container.dataset.transitioning = 'false';
            }, total);
        }

        const targetEl = container.closest('.about-card') || container.closest('.about-image') || container;

        if (trigger === 'hover') {
            targetEl.addEventListener('mouseenter', () => { if (!active) runTransition(true); });
            targetEl.addEventListener('mouseleave', () => { if (active) runTransition(false); });
            container.addEventListener('focus', () => { if (!active) runTransition(true); });
            container.addEventListener('blur', () => { if (active) runTransition(false); });
            container.tabIndex = 0;
        } else if (trigger === 'click') {
            targetEl.addEventListener('click', () => runTransition(!active));
            container.tabIndex = 0;
            container.setAttribute('role', 'button');
        }

        setShown(false);
    }

    window.initPixelSwaps = () => {
        document.querySelectorAll('.pixel-swap:not([data-pixel-initialized])').forEach(container => {
            initPixelSwap(container);
            container.dataset.pixelInitialized = 'true';
        });
    };

    document.addEventListener('DOMContentLoaded', window.initPixelSwaps);
})();


/* =========================================================
   TEXT PRESSURE ANIMATION ENGINE
========================================================= */

function initTextPressure() {
    const containers = document.querySelectorAll('.text-pressure-container');
    if (!containers.length) return;

    containers.forEach(container => {
        const text = container.dataset.text || 'SWAN TURBANS';
        const chars = text.split('');

        container.innerHTML = '';
        const titleEl = document.createElement('h1');
        titleEl.className = 'text-pressure-title';

        const spanEls = [];
        chars.forEach(char => {
            const span = document.createElement('span');
            span.dataset.char = char;
            if (char === ' ') {
                span.innerHTML = '&nbsp;';
            } else {
                span.textContent = char;
            }
            titleEl.appendChild(span);
            spanEls.push(span);
        });

        container.appendChild(titleEl);

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let isVisible = false;

        function updateMouse(e) {
            cursorX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            cursorY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        }

        window.addEventListener('mousemove', updateMouse, { passive: true });
        window.addEventListener('touchmove', updateMouse, { passive: true });

        const rect = container.getBoundingClientRect();
        mouseX = rect.left + rect.width / 2;
        mouseY = rect.top + rect.height / 2;
        cursorX = mouseX;
        cursorY = mouseY;

        function animate() {
            if (!isVisible) {
                requestAnimationFrame(animate);
                return;
            }

            mouseX += (cursorX - mouseX) / 12;
            mouseY += (cursorY - mouseY) / 12;

            if (titleEl) {
                const titleRect = titleEl.getBoundingClientRect();
                const maxDist = Math.max(120, titleRect.width / 2);

                spanEls.forEach(span => {
                    const rect = span.getBoundingClientRect();
                    const charCenter = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };

                    const dx = mouseX - charCenter.x;
                    const dy = mouseY - charCenter.y;
                    const d = Math.sqrt(dx * dx + dy * dy);

                    const getAttr = (distance, maxD, minVal, maxVal) => {
                        const val = maxVal - Math.abs((maxVal * distance) / maxD);
                        return Math.max(minVal, val + minVal);
                    };

                    const wdth = Math.floor(getAttr(d, maxDist, 25, 151));
                    const wght = Math.floor(getAttr(d, maxDist, 100, 900));
                    const italVal = (getAttr(d, maxDist, 0, 1)).toFixed(2);

                    const fontVar = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;
                    if (span.style.fontVariationSettings !== fontVar) {
                        span.style.fontVariationSettings = fontVar;
                    }
                });
            }

            requestAnimationFrame(animate);
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(([entry]) => {
                isVisible = entry.isIntersecting;
            }, { threshold: 0.1 });
            observer.observe(container);
        } else {
            isVisible = true;
        }

        animate();
    });
}

window.addEventListener('DOMContentLoaded', initTextPressure);


/* =========================================================
   TEXT TYPE HEADINGS
========================================================= */

function initTextTypeHeadings() {
    const headingSelector = [
        '.hero-title',
        '.page-heading > h1',
        '.campaign-detail-copy > h1',
        '.about-page-content h2',
        '.about-text > h2',
        '.contact-section h2',
        '.section-title h2',
        '.step-content h2'
    ].join(', ');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll(headingSelector).forEach(heading => {
        if (heading.dataset.textTypeInitialized === 'true') return;

        const directSpans = Array.from(heading.querySelectorAll(':scope > span'));
        const headingCopy = heading.cloneNode(true);
        headingCopy.querySelectorAll('br').forEach(lineBreak => lineBreak.replaceWith('[[TEXT_TYPE_BREAK]]'));
        const fullText = (directSpans.length > 1
            ? directSpans.map(span => span.textContent.trim()).join('\n')
            : headingCopy.textContent
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\[\[TEXT_TYPE_BREAK\]\]/g, '\n'));

        if (!fullText) return;

        heading.dataset.textTypeInitialized = 'true';
        heading.classList.add('text-type-heading');
        heading.setAttribute('aria-label', fullText.replace(/\n/g, ' '));

        const content = document.createElement('span');
        content.className = 'text-type__content';
        const cursor = document.createElement('span');
        cursor.className = 'text-type__cursor';
        cursor.setAttribute('aria-hidden', 'true');
        cursor.textContent = heading.classList.contains('hero-title') ? '' : '_';
        heading.replaceChildren(content, cursor);

        const showCompleteText = () => {
            content.textContent = fullText;
            cursor.remove();
        };

        if (reduceMotion) {
            showCompleteText();
            return;
        }

        let charIndex = 0;
        let typeTimer;
        let hasStarted = false;

        const typeNextCharacter = () => {
            content.textContent = fullText.slice(0, charIndex + 1);
            charIndex += 1;

            if (charIndex < fullText.length) {
                typeTimer = window.setTimeout(typeNextCharacter, 75);
            } else {
                cursor.remove();
            }
        };

        const startTyping = () => {
            if (hasStarted) return;
            hasStarted = true;
            const initialDelay = heading.classList.contains('hero-title') ? 250 : 0;
            typeTimer = window.setTimeout(typeNextCharacter, initialDelay);
        };

        if (!('IntersectionObserver' in window)) {
            startTyping();
            return;
        }

        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            startTyping();
        }, { threshold: 0.1 });

        observer.observe(heading);
        window.addEventListener('pagehide', () => window.clearTimeout(typeTimer), { once: true });
    });
}

window.addEventListener('DOMContentLoaded', initTextTypeHeadings);


/* =========================================================
   BLUR TEXT ANIMATION & DECRYPTED TEXT ANIMATION
========================================================= */

function initBlurText() {
    const blurElements = document.querySelectorAll('.blur-text-element');
    blurElements.forEach(el => {
        const text = el.dataset.blurText || el.textContent.trim();
        const words = text.split(' ');
        el.innerHTML = words.map((word, i) => 
            `<span class="blur-word" style="--word-index: ${i}; transition-delay: ${i * 0.12}s;">${word}</span>`
        ).join(' ');

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                el.classList.add('blur-text-animated');
                observer.unobserve(el);
            }
        }, { threshold: 0.1 });
        observer.observe(el);
    });
}

function triggerDecryptedText(card) {
    if (!card) return;
    const targetParagraphs = card.querySelectorAll('.trustee-vision-box p, .trustee-responsibilities p, .trustee-designation');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+';
    
    targetParagraphs.forEach(p => {
        if (p.dataset.isDecrypting === "true") return;
        
        const originalText = p.dataset.originalText || p.textContent.trim();
        if (!p.dataset.originalText) {
            p.dataset.originalText = originalText;
        }
        
        p.dataset.isDecrypting = "true";
        let iteration = 0;
        const maxIterations = 7;
        const speed = 35;
        
        const interval = setInterval(() => {
            p.textContent = originalText
                .split('')
                .map((char, index) => {
                    if (char === ' ' || char === '\n' || char === '"' || char === '—') return char;
                    if (index < (iteration / maxIterations) * originalText.length) {
                        return originalText[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join('');
                
            iteration++;
            
            if (iteration > maxIterations + 8) {
                clearInterval(interval);
                p.textContent = originalText;
                delete p.dataset.isDecrypting;
            }
        }, speed);
    });
}

/* =========================================================
   TRUSTEE ACCORDION GALLERY
========================================================= */

function initTrusteeGallery() {
    document.querySelectorAll('.trustee-gallery').forEach(gallery => {
        const panels = Array.from(gallery.querySelectorAll('.trustee-panel'));
        if (!panels.length) return;

        const initialIndex = Math.min(Math.max(Number(gallery.dataset.defaultIndex) || 0, 0), panels.length - 1);

        const setActive = index => {
            panels.forEach((panel, panelIndex) => {
                const active = panelIndex === index;
                panel.classList.toggle('is-active', active);
                panel.setAttribute('aria-current', active ? 'true' : 'false');
            });

            const activePanel = panels[index];
            if (activePanel) {
                const trusteeId = activePanel.dataset.trusteeId;
                const cards = document.querySelectorAll('.trustee-details-card');
                cards.forEach(card => {
                    const matches = card.dataset.detailsFor === trusteeId;
                    const isNewlyActive = matches && !card.classList.contains('is-active');
                    card.classList.toggle('is-active', matches);
                    if (matches && isNewlyActive) {
                        triggerDecryptedText(card);
                    }
                });
            }
        };

        setActive(initialIndex);

        panels.forEach((panel, index) => {
            panel.addEventListener('mouseenter', () => {
                if (window.matchMedia('(hover: hover)').matches) setActive(index);
            });

            panel.addEventListener('click', () => setActive(index));
            panel.addEventListener('focus', () => setActive(index));

            panel.addEventListener('keydown', event => {
                let nextIndex = null;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % panels.length;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + panels.length) % panels.length;
                if (nextIndex === null) return;

                event.preventDefault();
                setActive(nextIndex);
                panels[nextIndex].focus();
            });
        });
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initBlurText();
    initTrusteeGallery();
});
