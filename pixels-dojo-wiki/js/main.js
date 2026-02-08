// Main JavaScript for Pixels Dojo

// Modal Functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Login functionality will be implemented with backend integration');
            closeLoginModal();
        });
    }
    
    // Load market data
    loadMarketData();
    
    // Load posts
    loadRecentPosts();
    loadTopPosts();
    
    // Search functionality
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

// Market Data Functions
async function loadMarketData() {
    try {
        // Placeholder - Replace with actual API calls
        document.getElementById('pixel-price').textContent = '$0.1234';
        document.getElementById('staking-apr').textContent = '12.5%';
        
        // Example API integration (commented out):
        /*
        const priceResponse = await fetch('API_ENDPOINT_FOR_PIXEL_PRICE');
        const priceData = await priceResponse.json();
        document.getElementById('pixel-price').textContent = `$${priceData.price}`;
        
        const aprResponse = await fetch('https://staking.pixels.xyz/api/apr');
        const aprData = await aprResponse.json();
        document.getElementById('staking-apr').textContent = `${aprData.apr}%`;
        */
    } catch (error) {
        console.error('Error loading market data:', error);
        document.getElementById('pixel-price').textContent = 'N/A';
        document.getElementById('staking-apr').textContent = 'N/A';
    }
}

// Load Recent Posts
function loadRecentPosts() {
    const recentPostsContainer = document.getElementById('recent-posts');
    if (!recentPostsContainer) return;
    
    // Sample posts - Replace with actual content loading
    const samplePosts = [
        {
            title: "Complete Beginner's Guide to Pixels Online",
            author: "PixelMaster",
            date: "2025-02-01",
            excerpt: "Everything you need to know to start your journey in Pixels Online. Learn the basics, understand the economy, and get your first earnings.",
            tags: ["beginner", "guide", "getting-started"],
            upvotes: 245,
            link: "pages/getting-started.html"
        },
        {
            title: "Maximizing Your $PIXEL Earnings Through Staking",
            author: "CryptoGuru",
            date: "2025-02-03",
            excerpt: "A comprehensive guide to staking your $PIXEL tokens and understanding APR, rewards, and withdrawal strategies.",
            tags: ["staking", "earn", "finance"],
            upvotes: 189,
            link: "pages/staking.html"
        },
        {
            title: "Farming 101: From Seeds to Profits",
            author: "FarmKing",
            date: "2025-02-05",
            excerpt: "Master the art of farming in Pixels. Learn crop cycles, optimal planting strategies, and how to maximize your harvest profits.",
            tags: ["farming", "beginner", "strategy"],
            upvotes: 156,
            link: "pages/farming-guide.html"
        }
    ];
    
    samplePosts.forEach(post => {
        const postElement = createPostCard(post);
        recentPostsContainer.appendChild(postElement);
    });
}

// Load Top Posts
function loadTopPosts() {
    const topPostsContainer = document.getElementById('top-posts');
    if (!topPostsContainer) return;
    
    // Sample top posts
    const topPosts = [
        {
            title: "NFT Land Ownership: Complete Strategy Guide",
            author: "LandLord",
            date: "2025-01-28",
            excerpt: "Everything about NFT lands - purchasing, managing, and profiting from your virtual property.",
            tags: ["NFT", "land", "advanced"],
            upvotes: 312,
            link: "pages/nft-lands.html"
        },
        {
            title: "VIP Membership: Is It Worth It?",
            author: "PixelAnalyst",
            date: "2025-01-30",
            excerpt: "In-depth analysis of VIP benefits, costs, and ROI calculations to help you decide.",
            tags: ["VIP", "strategy", "finance"],
            upvotes: 267,
            link: "pages/vip-guide.html"
        },
        {
            title: "Complete Mining & Stoneshaping Guide",
            author: "MinerPro",
            date: "2025-02-02",
            excerpt: "Master mining techniques, understand resource spawns, and optimize your stoneshaping workflow.",
            tags: ["mining", "stoneshaping", "intermediate"],
            upvotes: 198,
            link: "pages/mining-guide.html"
        }
    ];
    
    topPosts.forEach(post => {
        const postElement = createPostCard(post);
        topPostsContainer.appendChild(postElement);
    });
}

// Create Post Card Element
function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    card.innerHTML = `
        <h3><a href="${post.link}">${post.title}</a></h3>
        <div class="post-meta">
            <span>👤 ${post.author}</span>
            <span>📅 ${post.date}</span>
        </div>
        <p class="post-excerpt">${post.excerpt}</p>
        <div class="post-footer">
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="upvotes">
                <span>👍 ${post.upvotes}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Search Handler
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.toLowerCase();
    
    if (query.length < 2) return;
    
    searchTimeout = setTimeout(() => {
        // Implement search functionality
        console.log('Searching for:', query);
        // This would typically search through your content files
        // and display results
    }, 300);
}

// Utility function to format dates
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Check if user is logged in
function isLoggedIn() {
    // Check localStorage or session for login status
    return localStorage.getItem('pixelDojoUser') !== null;
}

// Update UI based on login status
function updateUIForUser() {
    if (isLoggedIn()) {
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.textContent = 'Dashboard';
            loginBtn.onclick = () => window.location.href = 'pages/dashboard.html';
        }
    }
}

// Call on page load
updateUIForUser();
