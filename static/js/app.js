// App State
let state = {
    releases: [],
    filteredReleases: [],
    activeFilter: 'all',
    searchQuery: '',
    isLoading: false,
    lastUpdated: null
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-btn');
const timelineList = document.getElementById('timeline-list');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const lastUpdatedText = document.getElementById('last-updated-text');

// Stat Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const charCount = document.getElementById('char-count');
const charProgress = document.getElementById('char-progress');

// Circumference of SVG Progress circle: 2 * PI * r = 2 * 3.14159 * 14 ≈ 87.96
const CIRCUMFERENCE = 2 * Math.PI * 14;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initProgressRing();
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        filterAndRender();
    });

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.dataset.filter;
            filterAndRender();
        });
    });

    // Close Modal
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Textarea character count
    tweetTextarea.addEventListener('input', updateTweetCharCount);

    // Copy Tweet
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);

    // Submit Tweet
    submitTweetBtn.addEventListener('click', postTweet);
}

// Fetch Releases from Backend
async function fetchReleases() {
    if (state.isLoading) return;
    
    setLoading(true);
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Parse and process releases
        state.releases = data.map(entry => {
            const parsed = parseReleaseContent(entry.content);
            return {
                id: entry.id,
                title: entry.title, // Usually the date, e.g. "June 17, 2026"
                updated: entry.updated,
                link: entry.link,
                rawContent: entry.content,
                type: parsed.type,
                contentHtml: parsed.html,
                snippet: parsed.snippet
            };
        });

        state.lastUpdated = new Date();
        updateLastUpdatedTime();
        updateStats();
        filterAndRender();
        
    } catch (error) {
        console.error('Error fetching releases:', error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Parse raw HTML content from feed to extract type (Feature, Announcement, etc.)
function parseReleaseContent(rawHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    
    // Look for type indicators, usually the first H3
    const h3 = doc.querySelector('h3');
    let type = 'general';
    
    if (h3) {
        const extractedType = h3.textContent.trim().toLowerCase();
        // Categorize based on text
        if (extractedType.includes('feature')) {
            type = 'feature';
        } else if (extractedType.includes('announcement')) {
            type = 'announcement';
        } else if (extractedType.includes('deprecation') || extractedType.includes('deprecated')) {
            type = 'deprecation';
        } else if (extractedType.includes('fix')) {
            type = 'fix';
        }
        // Remove H3 so we don't display it twice in the body
        h3.remove();
    }
    
    // Create clean text snippet for tweet drafting
    let textContent = doc.body.textContent || doc.body.innerText || '';
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    return {
        type: type,
        html: doc.body.innerHTML,
        snippet: textContent
    };
}

// UI State Toggles
function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        refreshBtn.classList.add('spinning');
        refreshBtn.disabled = true;
        loadingState.classList.remove('hidden');
        timelineList.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        refreshBtn.classList.remove('spinning');
        refreshBtn.disabled = false;
        loadingState.classList.add('hidden');
    }
}

function showError(msg) {
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = msg;
    timelineList.classList.add('hidden');
    emptyState.classList.add('hidden');
}

// Filter and Render Timeline
function filterAndRender() {
    state.filteredReleases = state.releases.filter(release => {
        // Filter by badge type
        const matchesType = state.activeFilter === 'all' || release.type === state.activeFilter;
        
        // Filter by search query
        const matchesSearch = !state.searchQuery || 
            release.title.toLowerCase().includes(state.searchQuery) ||
            release.type.toLowerCase().includes(state.searchQuery) ||
            release.snippet.toLowerCase().includes(state.searchQuery);
            
        return matchesType && matchesSearch;
    });

    renderTimeline();
}

// Render the Timeline to DOM
function renderTimeline() {
    timelineList.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        if (!state.isLoading) {
            emptyState.classList.remove('hidden');
            timelineList.classList.add('hidden');
        }
        return;
    }
    
    emptyState.classList.add('hidden');
    timelineList.classList.remove('hidden');
    
    state.filteredReleases.forEach((release, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.dataset.type = release.type;
        item.style.animationDelay = `${index * 0.05}s`;
        
        // Format Date nicely
        let displayDate = release.title;
        try {
            if (release.updated) {
                const dateObj = new Date(release.updated);
                displayDate = dateObj.toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        } catch (e) {
            console.error('Date parsing error', e);
        }

        item.innerHTML = `
            <div class="timeline-node"></div>
            <div class="release-card">
                <div class="card-header">
                    <div class="release-meta">
                        <span class="badge ${release.type}">${release.type}</span>
                        <span class="release-date">${displayDate}</span>
                    </div>
                    <div class="card-actions">
                        <button class="share-action-btn" data-id="${release.id}">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Share</span>
                        </button>
                        ${release.link ? `
                            <a href="${release.link}" target="_blank" class="external-link-btn" title="View official release page">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                </svg>
                            </a>
                        ` : ''}
                    </div>
                </div>
                <div class="card-body">
                    ${release.contentHtml}
                </div>
            </div>
        `;
        
        // Add Share Click Event
        const shareBtn = item.querySelector('.share-action-btn');
        shareBtn.addEventListener('click', () => openTweetModal(release));
        
        timelineList.appendChild(item);
    });
}

// Update Stats
function updateStats() {
    statTotal.textContent = state.releases.length;
    statFeatures.textContent = state.releases.filter(r => r.type === 'feature').length;
}

// Update Last Updated Timestamp
function updateLastUpdatedTime() {
    if (!state.lastUpdated) return;
    const timeString = state.lastUpdated.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdatedText.textContent = `Last sync: ${timeString}`;
}

// --- Tweet Modal Logic ---

function initProgressRing() {
    charProgress.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    charProgress.style.strokeDashoffset = CIRCUMFERENCE;
}

function openTweetModal(release) {
    // Generate draft text
    let displayDate = release.title;
    try {
        if (release.updated) {
            const dateObj = new Date(release.updated);
            displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
    } catch(e){}

    // Create a beautiful, concise summary snippet from the text content
    let snippet = release.snippet;
    const maxSnippetLength = 120;
    if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength) + '...';
    }

    const hashtag = release.type === 'feature' ? '#BigQueryFeature' : '#BigQuery';
    const draftText = `🚀 New Google Cloud BigQuery Update (${displayDate})!\n\n"${snippet}"\n\nRead details: ${release.link}\n#GoogleCloud ${hashtag}`;
    
    tweetTextarea.value = draftText;
    updateTweetCharCount();
    
    // Reset copy button status
    copyTweetBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy Text</span>
    `;
    copyTweetBtn.classList.remove('btn-success');
    
    tweetModal.classList.remove('hidden');
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
}

function updateTweetCharCount() {
    const text = tweetTextarea.value;
    const len = text.length;
    const remaining = 280 - len;
    
    charCount.textContent = remaining;
    
    // Update progress ring
    const percent = Math.min(len / 280, 1);
    const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
    charProgress.style.strokeDashoffset = offset;
    
    // Coloring classes for progress ring
    if (remaining < 0) {
        charProgress.style.stroke = '#ef4444'; // Red
        charCount.style.color = '#ef4444';
        submitTweetBtn.disabled = true;
    } else if (remaining < 30) {
        charProgress.style.stroke = '#f59e0b'; // Amber
        charCount.style.color = '#f59e0b';
        submitTweetBtn.disabled = false;
    } else {
        charProgress.style.stroke = '#38bdf8'; // Blue-sky
        charCount.style.color = 'var(--text-secondary)';
        submitTweetBtn.disabled = false;
    }

    if (len === 0) {
        submitTweetBtn.disabled = true;
    }
}

async function copyTweetToClipboard() {
    try {
        await navigator.clipboard.writeText(tweetTextarea.value);
        
        // Visual feedback
        copyTweetBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16" style="color: var(--feature-color);">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: var(--feature-color);">Copied!</span>
        `;
        
        setTimeout(() => {
            copyTweetBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy Text</span>
            `;
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy to clipboard', err);
    }
}

function postTweet() {
    const text = tweetTextarea.value;
    if (text.length > 0 && text.length <= 280) {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        closeTweetModal();
    }
}
