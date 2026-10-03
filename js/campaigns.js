/**
 * Swan Turbines Foundation — Public Campaigns Dynamic Loader
 * Enriches static campaign cards with live database metrics from GET /api/v1/campaigns.
 * Gracefully preserves existing cards if API is unreachable.
 */

(function () {
    'use strict';

    const API_BASE = window.__API_BASE_URL__ || (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : ''
    );

    const SwanCampaigns = {
        async init() {
            const grid = document.querySelector('.campaign-grid');
            if (!grid) return;

            try {
                const response = await fetch(`${API_BASE}/api/v1/campaigns?limit=50`);
                if (!response.ok) return;

                const data = await response.json();
                const items = data.campaigns || data.items || [];
                if (!items.length) return;

                // Map live campaigns by slug for quick lookup
                const campaignMap = new Map();
                items.forEach(c => {
                    if (c.slug) campaignMap.set(c.slug.toLowerCase(), c);
                    if (c.title) campaignMap.set(c.title.toLowerCase().trim(), c);
                });

                // Update existing DOM articles where matched
                const articles = grid.querySelectorAll('article.campaign');
                const matchedSlugs = new Set();

                articles.forEach(article => {
                    const titleEl = article.querySelector('h3');
                    if (!titleEl) return;
                    const titleText = titleEl.textContent.toLowerCase().trim();

                    // Find matching campaign
                    let matched = campaignMap.get(titleText);
                    if (!matched) {
                        for (const [key, c] of campaignMap.entries()) {
                            if (titleText.includes(key) || key.includes(titleText)) {
                                matched = c;
                                break;
                            }
                        }
                    }

                    if (matched) {
                        matchedSlugs.add(matched.slug);
                        this.updateArticle(article, matched);
                    }
                });

                // If there are newly created campaigns from admin that aren't in the static HTML, append them
                items.forEach(c => {
                    if (!matchedSlugs.has(c.slug)) {
                        const newCard = this.renderNewCard(c);
                        grid.appendChild(newCard);
                    }
                });

            } catch (err) {
                // Non-blocking offline fallback
                console.info('[SwanCampaigns] Using static campaign fallback:', err.message);
            }
        },

        updateArticle(article, campaign) {
            // Update status badge
            const statusEl = article.querySelector('.campaign-status');
            if (statusEl && campaign.status) {
                statusEl.textContent = campaign.status.toUpperCase();
            }

            // Calculate progress
            const target = campaign.target_amount || 0;
            const raised = campaign.raised_amount || 0;
            const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

            // Update progress bar
            const progressSpan = article.querySelector('.campaign-progress span');
            if (progressSpan) {
                progressSpan.style.width = `${pct}%`;
            }

            // Update footer metrics
            const footer = article.querySelector('.campaign-footer');
            if (footer) {
                const spans = footer.querySelectorAll('span');
                if (spans.length >= 2) {
                    spans[0].textContent = `₹${raised.toLocaleString('en-IN')} raised`;
                    spans[1].textContent = `${pct}%`;
                }
            }
        },

        renderNewCard(campaign) {
            const article = document.createElement('article');
            article.className = 'campaign';

            const target = campaign.target_amount || 0;
            const raised = campaign.raised_amount || 0;
            const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
            const imgUrl = campaign.image_url || 'swan_foundation_img/Clean%20Water%20%26%20Sanitation%20Initiative.png';

            article.innerHTML = `
                <div class="campaign-img">
                    <img src="${imgUrl}" alt="${campaign.title}">
                </div>
                <div class="campaign-body">
                    <span class="campaign-status">${(campaign.status || 'ACTIVE').toUpperCase()}</span>
                    <h3>${campaign.title}</h3>
                    <p>${campaign.short_description || campaign.description || ''}</p>
                    <div class="campaign-progress">
                        <span style="width:${pct}%"></span>
                    </div>
                    <div class="campaign-footer">
                        <span>₹${raised.toLocaleString('en-IN')} raised</span>
                        <span>${pct}%</span>
                    </div>
                    <button class="campaign-explore" type="button" onclick="openDonation()">Donate to this fund <span aria-hidden="true">&#8594;</span></button>
                </div>
            `;
            return article;
        }
    };

    window.SwanCampaigns = SwanCampaigns;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SwanCampaigns.init());
    } else {
        SwanCampaigns.init();
    }
})();
