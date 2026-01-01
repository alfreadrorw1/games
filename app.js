// ============================================
// GAME CENTER - COMPLETE ENHANCED VERSION
// ============================================

// Global Variables
let unsubscribeGames = null;
let unsubscribeOnline = null;
let unsubscribeAdmins = null;
let currentUser = null;
let isAdmin = false;
let gameToDelete = null;
let onlineUsers = 0;
let onlineAdmins = 0;
let totalGames = 0;
let connectionStatus = false;

const ADMIN_KEY = "alfread123";
const MAX_GAMES_PER_PAGE = 12;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const adminStatus = document.getElementById('adminStatus');
const addGameForm = document.getElementById('addGameForm');
const clearFormBtn = document.getElementById('clearFormBtn');
const gamesContainer = document.getElementById('gamesContainer');
const emptyState = document.getElementById('emptyState');
const gameDetailsModal = document.getElementById('gameDetailsModal');
const confirmDeleteModal = document.getElementById('confirmDeleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const gameToDeleteInfo = document.getElementById('gameToDeleteInfo');

// Stats Elements
const onlineCountEl = document.getElementById('onlineCount');
const gameCountEl = document.getElementById('gameCount');
const adminCountEl = document.getElementById('adminCount');
const totalGamesEl = document.getElementById('totalGames');
const lastUpdatedEl = document.getElementById('lastUpdated');
const footerOnlineCount = document.getElementById('footerOnlineCount');
const footerGameCount = document.getElementById('footerGameCount');
const footerAdminCount = document.getElementById('footerAdminCount');
const connectionDot = document.getElementById('connectionDot');
const connectionStatusEl = document.getElementById('connectionStatus');
const latencyEl = document.getElementById('latency');

// Search and Filter Elements
const gameSearch = document.getElementById('gameSearch');
const categoryFilter = document.getElementById('categoryFilter');
const sortGamesBtn = document.getElementById('sortGames');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreDiv = document.getElementById('loadMore');

// Activity Elements
const activityFeed = document.getElementById('activityFeed');
const lastUpdateTime = document.getElementById('lastUpdateTime');
const viewsCount = document.getElementById('viewsCount');

// Quick Actions
const refreshGamesBtn = document.getElementById('refreshGames');
const viewAnalyticsBtn = document.getElementById('viewAnalytics');
const exportGamesBtn = document.getElementById('exportGames');
const previewGameBtn = document.getElementById('previewGameBtn');
const demoGameBtn = document.getElementById('demoGameBtn');
const refreshListBtn = document.getElementById('refreshListBtn');
const scrollToTopBtn = document.getElementById('scrollToTop');

// Game Data
let allGames = [];
let filteredGames = [];
let currentPage = 1;
let sortOrder = 'desc';

// Initialize App
async function initializeApp() {
    console.log("🚀 Initializing Game Center Platform...");
    
    try {
        // Setup event listeners
        setupEventListeners();
        
        // Initialize Firebase Auth
        await initializeFirebaseAuth();
        
        // Setup Firestore listeners
        setupGamesListener();
        setupOnlineUsersListener();
        setupAdminListener();
        
        // Initialize connection monitoring
        monitorConnection();
        
        // Update UI
        updateFirebaseStatus(true);
        
        // Add to activity log
        addActivity('System initialized successfully', 'success');
        
        console.log("✅ App initialized successfully");
        
    } catch (error) {
        console.error("❌ App initialization failed:", error);
        showNotification('Failed to initialize application: ' + error.message, 'error');
        updateFirebaseStatus(false);
    }
}

// Initialize Firebase Auth
async function initializeFirebaseAuth() {
    try {
        // Sign in anonymously
        const userCredential = await auth.signInAnonymously();
        currentUser = userCredential.user;
        
        console.log("👤 Anonymous user signed in:", currentUser.uid);
        
        // Set as non-admin by default
        isAdmin = false;
        updateUIForGuest();
        
        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                console.log("🔄 User state:", user.isAnonymous ? "Anonymous" : "Authenticated", user.uid);
            } else {
                // Auto sign in anonymous
                auth.signInAnonymously();
            }
        });
        
    } catch (error) {
        console.error("❌ Anonymous auth failed:", error);
        throw error;
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Login/Logout
    loginBtn.addEventListener('click', openLoginModal);
    logoutBtn.addEventListener('click', handleLogout);
    loginForm.addEventListener('submit', handleAdminLogin);
    
    // Game Form
    addGameForm.addEventListener('submit', handleAddGame);
    clearFormBtn.addEventListener('click', clearAddGameForm);
    previewGameBtn.addEventListener('click', previewGame);
    
    // Search and Filter
    gameSearch.addEventListener('input', filterGames);
    categoryFilter.addEventListener('change', filterGames);
    sortGamesBtn.addEventListener('click', toggleSortOrder);
    loadMoreBtn.addEventListener('click', loadMoreGames);
    
    // Quick Actions
    refreshGamesBtn.addEventListener('click', refreshGamesList);
    viewAnalyticsBtn.addEventListener('click', showAnalytics);
    exportGamesBtn.addEventListener('click', exportGamesList);
    demoGameBtn.addEventListener('click', addDemoGame);
    refreshListBtn.addEventListener('click', refreshGamesList);
    
    // Modal Controls
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Key visibility toggle
    const keyToggle = document.getElementById('keyToggle');
    if (keyToggle) {
        keyToggle.addEventListener('click', toggleKeyVisibility);
    }
    
    // Form real-time validation
    const gameDescription = document.getElementById('gameDescription');
    if (gameDescription) {
        gameDescription.addEventListener('input', updateCharCounter);
    }
    
    const gameLink = document.getElementById('gameLink');
    if (gameLink) {
        gameLink.addEventListener('input', updateUrlPreview);
    }
    
    const gameIcon = document.getElementById('gameIcon');
    if (gameIcon) {
        gameIcon.addEventListener('change', updateIconPreview);
    }
    
    // Confirm Delete
    confirmDeleteBtn.addEventListener('click', handleDeleteGame);
    
    // Scroll to top
    scrollToTopBtn.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', handleScroll);
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Check admin session
    const savedAdmin = localStorage.getItem('isAdmin');
    if (savedAdmin === 'true') {
        isAdmin = true;
        updateUIForAdmin();
        updateAdminOnlineStatus(true);
    }
}

// Setup Online Users Listener
function setupOnlineUsersListener() {
    try {
        const onlineRef = db.collection('stats').doc('onlineUsers');
        
        unsubscribeOnline = onlineRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                onlineUsers = data.total || 0;
                updateOnlineCounters();
                
                // Update user's presence
                updateUserPresence();
            } else {
                // Initialize if not exists
                onlineRef.set({ 
                    total: 1,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }, (error) => {
            console.error("Online users listener error:", error);
            updateFirebaseStatus(false);
        });
        
        // Setup user presence cleanup
        setupPresenceCleanup();
        
    } catch (error) {
        console.error("Error setting up online users listener:", error);
    }
}

// Setup Admin Listener
function setupAdminListener() {
    try {
        const adminsRef = db.collection('stats').doc('admins');
        
        unsubscribeAdmins = adminsRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                onlineAdmins = data.online || 0;
                updateAdminCounters();
            }
        }, (error) => {
            console.error("Admins listener error:", error);
        });
        
    } catch (error) {
        console.error("Error setting up admin listener:", error);
    }
}

// Update User Presence
function updateUserPresence() {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('onlineUsers').doc(currentUser.uid);
        const userData = {
            uid: currentUser.uid,
            isAdmin: isAdmin,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        };
        
        // Update user presence
        userRef.set(userData);
        
        // Cleanup on disconnect
        userRef.onDisconnect().delete();
        
    } catch (error) {
        console.error("Error updating user presence:", error);
    }
}

// Setup Presence Cleanup
function setupPresenceCleanup() {
    // Cleanup old entries periodically
    setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
            const oldUsers = await db.collection('onlineUsers')
                .where('lastSeen', '<', cutoff)
                .get();
            
            const batch = db.batch();
            oldUsers.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
        } catch (error) {
            console.error("Error cleaning up old users:", error);
        }
    }, 60000); // Run every minute
}

// Update Admin Online Status
async function updateAdminOnlineStatus(online) {
    if (!isAdmin) return;
    
    try {
        const adminsRef = db.collection('stats').doc('admins');
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(adminsRef);
            let currentCount = 0;
            
            if (doc.exists) {
                currentCount = doc.data().online || 0;
            }
            
            const newCount = online ? currentCount + 1 : Math.max(0, currentCount - 1);
            transaction.set(adminsRef, { 
                online: newCount,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
        
    } catch (error) {
        console.error("Error updating admin online status:", error);
    }
}

// Setup Games Listener
function setupGamesListener() {
    if (unsubscribeGames) {
        unsubscribeGames();
    }
    
    try {
        unsubscribeGames = db.collection('games')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                console.log(`🎮 Received ${snapshot.size} games from Firestore`);
                
                allGames = [];
                snapshot.forEach((doc) => {
                    const game = doc.data();
                    game.id = doc.id;
                    allGames.push(game);
                });
                
                totalGames = allGames.length;
                updateGameCounters();
                
                lastUpdatedEl.textContent = 'Just now';
                lastUpdateTime.textContent = new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                if (allGames.length === 0) {
                    showEmptyState();
                    return;
                }
                
                hideEmptyState();
                filterGames();
                
                // Update views count
                updateViewsCount();
                
            }, (error) => {
                console.error("Games listener error:", error);
                showNotification('Failed to load games: ' + error.message, 'error');
                updateFirebaseStatus(false);
            });
            
        console.log("✅ Games listener setup successful");
        
    } catch (error) {
        console.error("Error setting up games listener:", error);
        showNotification('Error setting up database listener', 'error');
    }
}

// Update Views Count
async function updateViewsCount() {
    try {
        const statsRef = db.collection('stats').doc('views');
        const today = new Date().toDateString();
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(statsRef);
            const data = doc.exists ? doc.data() : {};
            
            if (!data[today]) {
                data[today] = 0;
            }
            
            data[today] += 1;
            data.total = (data.total || 0) + 1;
            data.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            
            transaction.set(statsRef, data);
            
            // Update UI
            viewsCount.textContent = data[today];
        });
        
    } catch (error) {
        console.error("Error updating views count:", error);
    }
}

// Filter Games
function filterGames() {
    const searchTerm = gameSearch.value.toLowerCase().trim();
    const category = categoryFilter.value;
    
    filteredGames = allGames.filter(game => {
        // Search filter
        const matchesSearch = !searchTerm || 
            game.namaGame.toLowerCase().includes(searchTerm) ||
            game.deskripsiGame.toLowerCase().includes(searchTerm);
        
        // Category filter
        const matchesCategory = !category || game.category === category;
        
        return matchesSearch && matchesCategory;
    });
    
    // Apply sorting
    sortGames();
    
    // Reset pagination
    currentPage = 1;
    
    // Render games
    renderGames();
    
    // Show/hide load more button
    if (filteredGames.length > currentPage * MAX_GAMES_PER_PAGE) {
        loadMoreDiv.style.display = 'block';
    } else {
        loadMoreDiv.style.display = 'none';
    }
}

// Sort Games
function sortGames() {
    filteredGames.sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.namaGame.localeCompare(b.namaGame);
        } else {
            return b.createdAt - a.createdAt;
        }
    });
}

// Toggle Sort Order
function toggleSortOrder() {
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    sortGamesBtn.innerHTML = sortOrder === 'desc' 
        ? '<i class="fas fa-sort-amount-down"></i> Newest First'
        : '<i class="fas fa-sort-amount-up"></i> A-Z';
    sortGames();
    renderGames();
}

// Render Games
function renderGames() {
    gamesContainer.innerHTML = '';
    
    const startIndex = (currentPage - 1) * MAX_GAMES_PER_PAGE;
    const endIndex = startIndex + MAX_GAMES_PER_PAGE;
    const gamesToShow = filteredGames.slice(startIndex, endIndex);
    
    if (gamesToShow.length === 0 && currentPage === 1) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    gamesToShow.forEach((game) => {
        const gameCard = createGameCard(game);
        gamesContainer.appendChild(gameCard);
    });
    
    // Update load more button visibility
    if (filteredGames.length > endIndex) {
        loadMoreDiv.style.display = 'block';
    } else {
        loadMoreDiv.style.display = 'none';
    }
}

// Create Game Card - FIXED VERSION
function createGameCard(game) {
    const gameCard = document.createElement('div');
    gameCard.className = 'game-card';
    gameCard.dataset.id = game.id;
    gameCard.dataset.admin = isAdmin.toString(); // Tambahkan data atribut untuk status admin
    
    // Format timestamp
    let timeAgo = 'Just now';
    let exactDate = '';
    
    if (game.createdAt) {
        const date = game.createdAt.toDate();
        timeAgo = formatTimeAgo(date);
        exactDate = date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Buat game card dengan tombol admin yang selalu ada tapi bisa diatur visibility-nya
    gameCard.innerHTML = `
        ${game.category ? `<span class="game-category ${game.category}">${game.category}</span>` : ''}
        <div class="game-header">
            <div class="game-icon">${game.iconGame || '🎮'}</div>
            <h3 class="game-title">${game.namaGame}</h3>
        </div>
        <p class="game-description">${game.deskripsiGame}</p>
        <a href="${game.linkGame}" target="_blank" rel="noopener noreferrer" class="play-link">
            <button class="btn-play">
                <i class="fas fa-gamepad"></i> PLAY NOW
                <i class="fas fa-external-link-alt"></i>
            </button>
        </a>
        <div class="game-actions" id="admin-actions-${game.id}">
            <button class="btn-action info" onclick="viewGameDetails('${game.id}')">
                <i class="fas fa-info-circle"></i> Details
            </button>
            <button class="btn-action edit" onclick="editGame('${game.id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-action delete" onclick="confirmDeleteGame('${game.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
        <div class="game-meta">
            <span title="${exactDate}">
                <i class="far fa-clock"></i> ${timeAgo}
            </span>
            <span>
                <i class="fas fa-user-shield"></i> ${game.createdByName || 'Admin'}
            </span>
        </div>
    `;
    
    // Atur visibility tombol admin berdasarkan status
    const actionsDiv = gameCard.querySelector('.game-actions');
    if (actionsDiv) {
        if (isAdmin) {
            actionsDiv.style.display = 'flex';
            actionsDiv.style.opacity = '1';
            actionsDiv.style.transform = 'translateY(0)';
        } else {
            actionsDiv.style.display = 'none';
        }
    }
    
    return gameCard;
}

// Load More Games
function loadMoreGames() {
    currentPage++;
    renderGames();
    
    // Smooth scroll to new games
    setTimeout(() => {
        const newGames = document.querySelectorAll('.game-card');
        if (newGames.length > 0) {
            newGames[newGames.length - 1].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }, 100);
}

// Handle Admin Login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const adminKey = document.getElementById('adminKey').value;
    
    if (!adminKey) {
        showNotification('Please enter admin access code!', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = loginForm.querySelector('.btn-login');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    submitBtn.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (adminKey === ADMIN_KEY) {
            // SUCCESS
            isAdmin = true;
            localStorage.setItem('isAdmin', 'true');
            
            closeAllModals();
            
            updateUIForAdmin();
            updateAdminOnlineStatus(true);
            
            // Refresh tombol admin di semua game cards
            refreshAdminButtons();
            
            addActivity('Logged in as Admin', 'success');
            showNotification('Successfully logged in as Admin!', 'success');
            
        } else {
            throw new Error('Invalid admin access code!');
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
        
        // Shake animation
        const keyInput = document.getElementById('adminKey');
        keyInput.classList.add('shake');
        setTimeout(() => keyInput.classList.remove('shake'), 500);
        
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Logout
function handleLogout() {
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    updateUIForGuest();
    updateAdminOnlineStatus(false);
    
    // Refresh tombol admin di semua game cards
    refreshAdminButtons();
    
    addActivity('Logged out from Admin mode', 'info');
    showNotification('Logged out from Admin mode', 'info');
}

// Refresh admin buttons on all game cards
function refreshAdminButtons() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        const actionsDiv = card.querySelector('.game-actions');
        if (actionsDiv) {
            if (isAdmin) {
                actionsDiv.style.display = 'flex';
                // Tambahkan animasi untuk transisi yang smooth
                setTimeout(() => {
                    actionsDiv.style.opacity = '1';
                    actionsDiv.style.transform = 'translateY(0)';
                }, 10);
            } else {
                actionsDiv.style.display = 'none';
            }
        }
    });
}

// Handle Add Game
async function handleAddGame(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('Please login as admin first!', 'error');
        openLoginModal();
        return;
    }
    
    // Get form values
    const gameName = document.getElementById('gameName').value.trim();
    const gameDescription = document.getElementById('gameDescription').value.trim();
    const gameIcon = document.getElementById('gameIcon').value;
    const gameLink = document.getElementById('gameLink').value.trim();
    const gameCategory = document.getElementById('gameCategory').value;
    
    // Validation
    if (!gameName || !gameDescription || !gameIcon || !gameLink) {
        showNotification('Please fill all required fields!', 'error');
        return;
    }
    
    if (!isValidUrl(gameLink)) {
        showNotification('Invalid game URL! Please use http:// or https://', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = addGameForm.querySelector('.btn-add');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;
    
    try {
        const newGame = {
            namaGame: gameName,
            deskripsiGame: gameDescription,
            iconGame: gameIcon,
            linkGame: gameLink,
            category: gameCategory || 'action',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            createdByName: 'Admin',
            createdByAnonymous: currentUser.isAnonymous,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            plays: 0
        };
        
        await db.collection('games').add(newGame);
        
        clearAddGameForm();
        
        addActivity(`Added new game: "${gameName}"`, 'success');
        showNotification('Game added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding game:', error);
        showNotification('Failed to add game: ' + error.message, 'error');
        addActivity('Failed to add game', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Confirm Delete Game
function confirmDeleteGame(gameId) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;
    
    gameToDelete = gameId;
    
    gameToDeleteInfo.innerHTML = `
        <h4>${game.namaGame}</h4>
        <p>${game.deskripsiGame.substring(0, 100)}...</p>
        <small>Added: ${game.createdAt ? game.createdAt.toDate().toLocaleDateString() : 'Unknown'}</small>
    `;
    
    confirmDeleteModal.style.display = 'flex';
}

// Handle Delete Game
async function handleDeleteGame() {
    if (!gameToDelete || !isAdmin) return;
    
    try {
        await db.collection('games').doc(gameToDelete).delete();
        
        const game = allGames.find(g => g.id === gameToDelete);
        addActivity(`Deleted game: "${game?.namaGame || 'Unknown'}"`, 'warning');
        showNotification('Game deleted successfully!', 'success');
        
        closeAllModals();
        gameToDelete = null;
        
    } catch (error) {
        console.error('Error deleting game:', error);
        showNotification('Failed to delete game: ' + error.message, 'error');
        addActivity('Failed to delete game', 'error');
    }
}

// View Game Details
function viewGameDetails(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;
    
    const date = game.createdAt ? game.createdAt.toDate() : new Date();
    const formattedDate = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('gameDetailsContent').innerHTML = `
        <div class="game-details-header">
            <div class="game-details-icon">${game.iconGame || '🎮'}</div>
            <div class="game-details-title">
                <h3>${game.namaGame}</h3>
                <span class="game-details-category">${game.category || 'Uncategorized'}</span>
            </div>
        </div>
        
        <div class="game-details-section">
            <h4><i class="fas fa-align-left"></i> Description</h4>
            <p>${game.deskripsiGame}</p>
        </div>
        
        <div class="game-details-section">
            <h4><i class="fas fa-link"></i> Game URL</h4>
            <a href="${game.linkGame}" target="_blank" class="game-url">${game.linkGame}</a>
        </div>
        
        <div class="game-details-meta">
            <div class="meta-item">
                <i class="far fa-calendar"></i>
                <span>Added: ${formattedDate}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-user-shield"></i>
                <span>Added by: ${game.createdByName || 'Admin'}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-eye"></i>
                <span>Views: ${game.views || 0}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-gamepad"></i>
                <span>Plays: ${game.plays || 0}</span>
            </div>
        </div>
        
        <div class="game-details-actions">
            <a href="${game.linkGame}" target="_blank" class="btn-play-large">
                <i class="fas fa-gamepad"></i> Play Game Now
            </a>
            ${isAdmin ? `
            <button class="btn-edit" onclick="editGame('${game.id}')">
                <i class="fas fa-edit"></i> Edit Game
            </button>
            ` : ''}
        </div>
    `;
    
    gameDetailsModal.style.display = 'flex';
}

// Edit Game (Placeholder - Implement as needed)
function editGame(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;
    
    showNotification('Edit feature coming soon!', 'info');
    // Implement edit functionality here
}

// Preview Game
function previewGame() {
    const gameName = document.getElementById('gameName').value.trim();
    const gameDescription = document.getElementById('gameDescription').value.trim();
    const gameIcon = document.getElementById('gameIcon').value;
    const gameLink = document.getElementById('gameLink').value.trim();
    const gameCategory = document.getElementById('gameCategory').value;
    
    if (!gameName || !gameDescription || !gameIcon || !gameLink) {
        showNotification('Please fill all fields to preview', 'warning');
        return;
    }
    
    document.getElementById('gameDetailsContent').innerHTML = `
        <div class="game-details-header">
            <div class="game-details-icon">${gameIcon}</div>
            <div class="game-details-title">
                <h3>${gameName}</h3>
                <span class="game-details-category">${gameCategory || 'Uncategorized'}</span>
            </div>
        </div>
        
        <div class="game-details-section">
            <h4><i class="fas fa-align-left"></i> Description</h4>
            <p>${gameDescription}</p>
        </div>
        
        <div class="game-details-section">
            <h4><i class="fas fa-link"></i> Game URL</h4>
            <a href="${gameLink}" target="_blank" class="game-url">${gameLink}</a>
        </div>
        
        <div class="game-details-actions">
            <a href="${gameLink}" target="_blank" class="btn-play-large">
                <i class="fas fa-gamepad"></i> Test Game Link
            </a>
        </div>
        
        <div class="preview-note">
            <i class="fas fa-info-circle"></i>
            <p>This is a preview. The game has not been added to the database yet.</p>
        </div>
    `;
    
    gameDetailsModal.style.display = 'flex';
}

// Add Demo Game
async function addDemoGame() {
    if (!isAdmin) {
        showNotification('Please login as admin first!', 'error');
        openLoginModal();
        return;
    }
    
    const demoGames = [
        {
            namaGame: 'Epic Battle Arena',
            deskripsiGame: 'Engage in intense multiplayer battles in this action-packed arena game. Team up with friends or go solo in various game modes.',
            iconGame: '⚔️',
            linkGame: 'https://example.com/epic-battle',
            category: 'action'
        },
        {
            namaGame: 'Puzzle Quest',
            deskripsiGame: 'Solve challenging puzzles and unlock mysteries in this addictive puzzle adventure game. Perfect for casual gamers.',
            iconGame: '🧩',
            linkGame: 'https://example.com/puzzle-quest',
            category: 'puzzle'
        },
        {
            namaGame: 'Space Racers',
            deskripsiGame: 'Race through space in futuristic ships. Compete with players worldwide in this high-speed racing game.',
            iconGame: '🏎️',
            linkGame: 'https://example.com/space-racers',
            category: 'racing'
        }
    ];
    
    const demoGame = demoGames[Math.floor(Math.random() * demoGames.length)];
    
    try {
        const newGame = {
            ...demoGame,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            createdByName: 'Admin',
            createdByAnonymous: currentUser.isAnonymous,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            plays: 0
        };
        
        await db.collection('games').add(newGame);
        
        addActivity(`Added demo game: "${demoGame.namaGame}"`, 'success');
        showNotification('Demo game added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding demo game:', error);
        showNotification('Failed to add demo game: ' + error.message, 'error');
    }
}

// Update UI for Admin
function updateUIForAdmin() {
    console.log('👑 Updating UI for admin');
    
    adminPanel.style.display = 'block';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'flex';
    
    const statusDot = adminStatus.querySelector('.status-dot');
    const statusText = adminStatus.querySelector('.status-text');
    
    statusDot.classList.add('online');
    statusText.innerHTML = '<i class="fas fa-user-shield"></i> Admin Mode';
    adminStatus.title = 'Admin mode active - Full access granted';
    
    // Update admin status untuk semua game cards
    setTimeout(() => {
        refreshAdminButtons();
    }, 100);
}

// Update UI for Guest
function updateUIForGuest() {
    console.log('👤 Updating UI for guest');
    
    adminPanel.style.display = 'none';
    loginBtn.style.display = 'flex';
    logoutBtn.style.display = 'none';
    
    const statusDot = adminStatus.querySelector('.status-dot');
    const statusText = adminStatus.querySelector('.status-text');
    
    statusDot.classList.remove('online');
    statusText.innerHTML = '<i class="fas fa-user"></i> Guest Mode';
    adminStatus.title = 'Guest mode - View only access';
    
    // Update admin status untuk semua game cards
    setTimeout(() => {
        refreshAdminButtons();
    }, 100);
}

// Update Counters
function updateOnlineCounters() {
    onlineCountEl.textContent = onlineUsers;
    footerOnlineCount.textContent = onlineUsers;
    
    onlineCountEl.classList.add('count-up');
    footerOnlineCount.classList.add('count-up');
    
    setTimeout(() => {
        onlineCountEl.classList.remove('count-up');
        footerOnlineCount.classList.remove('count-up');
    }, 500);
}

function updateGameCounters() {
    gameCountEl.textContent = totalGames;
    footerGameCount.textContent = totalGames;
    totalGamesEl.textContent = `${totalGames} game${totalGames !== 1 ? 's' : ''}`;
}

function updateAdminCounters() {
    adminCountEl.textContent = onlineAdmins;
    footerAdminCount.textContent = onlineAdmins;
}

// Monitor Connection
function monitorConnection() {
    let lastPing = Date.now();
    let latency = 0;
    
    // Ping Firebase
    setInterval(async () => {
        const start = Date.now();
        
        try {
            await db.collection('stats').doc('ping').set({
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            latency = Date.now() - start;
            connectionStatus = true;
            
            latencyEl.textContent = `Ping: ${latency}ms`;
            connectionDot.className = 'status-dot connected';
            connectionStatusEl.textContent = 'Connected';
            
        } catch (error) {
            connectionStatus = false;
            connectionDot.className = 'status-dot disconnected';
            connectionStatusEl.textContent = 'Disconnected';
            latencyEl.textContent = 'Ping: -- ms';
        }
    }, 5000);
}

// Update Firebase Status
function updateFirebaseStatus(connected) {
    const connectionDot = document.getElementById('connectionDot');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (connected) {
        connectionDot.className = 'status-dot connected';
        connectionStatus.textContent = 'Connected';
    } else {
        connectionDot.className = 'status-dot disconnected';
        connectionStatus.textContent = 'Disconnected';
    }
}

// Add Activity
function addActivity(message, type = 'info') {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    let icon = 'info-circle';
    let color = 'var(--info)';
    
    switch (type) {
        case 'success':
            icon = 'check-circle';
            color = 'var(--success)';
            break;
        case 'error':
            icon = 'exclamation-circle';
            color = 'var(--danger)';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            color = 'var(--warning)';
            break;
    }
    
    activityItem.innerHTML = `
        <div class="activity-icon" style="background: ${color}20; color: ${color};">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="activity-content">
            <p>${message}</p>
            <span class="activity-time">
                <i class="far fa-clock"></i> ${new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </span>
        </div>
    `;
    
    activityFeed.insertBefore(activityItem, activityFeed.firstChild);
    
    // Limit activities to 10
    if (activityFeed.children.length > 10) {
        activityFeed.removeChild(activityFeed.lastChild);
    }
}

// Refresh Games List
function refreshGamesList() {
    if (unsubscribeGames) unsubscribeGames();
    setupGamesListener();
    showNotification('Refreshing games list...', 'info');
}

// Show Analytics
function showAnalytics() {
    showNotification('Analytics feature coming soon!', 'info');
}

// Export Games List
function exportGamesList() {
    const csv = [
        ['Name', 'Description', 'URL', 'Category', 'Created At'],
        ...allGames.map(game => [
            game.namaGame,
            game.deskripsiGame,
            game.linkGame,
            game.category || 'Uncategorized',
            game.createdAt ? game.createdAt.toDate().toLocaleString() : 'Unknown'
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `games-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showNotification('Games list exported successfully!', 'success');
    addActivity('Exported games list', 'info');
}

// Clear Add Game Form
function clearAddGameForm() {
    addGameForm.reset();
    updateCharCounter();
    hideUrlPreview();
    updateIconPreview();
    showNotification('Form cleared successfully', 'info');
}

// Utility Functions
function toggleKeyVisibility() {
    const keyInput = document.getElementById('adminKey');
    const icon = keyToggle.querySelector('i');
    
    if (!keyInput || !icon) return;
    
    if (keyInput.type === 'password') {
        keyInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
        keyToggle.title = 'Hide code';
    } else {
        keyInput.type = 'password';
        icon.className = 'fas fa-eye';
        keyToggle.title = 'Show code';
    }
}

function updateCharCounter() {
    const textarea = document.getElementById('gameDescription');
    const charCount = document.getElementById('charCount');
    
    if (textarea && charCount) {
        const count = textarea.value.length;
        charCount.textContent = count;
        
        if (count > 500) {
            charCount.style.color = 'var(--danger)';
        } else if (count > 400) {
            charCount.style.color = 'var(--warning)';
        } else {
            charCount.style.color = 'var(--text-gray)';
        }
    }
}

function updateUrlPreview() {
    const urlInput = document.getElementById('gameLink');
    const urlPreview = document.getElementById('urlPreview');
    
    if (urlInput && urlPreview) {
        const url = urlInput.value.trim();
        
        if (url && isValidUrl(url)) {
            urlPreview.textContent = url;
            urlPreview.classList.add('show');
        } else {
            urlPreview.classList.remove('show');
        }
    }
}

function updateIconPreview() {
    const iconSelect = document.getElementById('gameIcon');
    const iconPreview = document.getElementById('iconPreview');
    
    if (iconSelect && iconPreview) {
        iconPreview.textContent = iconSelect.value || '🎮';
    }
}

function hideUrlPreview() {
    const urlPreview = document.getElementById('urlPreview');
    if (urlPreview) {
        urlPreview.classList.remove('show');
    }
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week ago';
    if (weeks < 4) return `${weeks} weeks ago`;
    
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
    });
}

// Modal Functions
function openLoginModal() {
    loginModal.style.display = 'flex';
    document.getElementById('adminKey').focus();
}

function closeAllModals() {
    loginModal.style.display = 'none';
    gameDetailsModal.style.display = 'none';
    confirmDeleteModal.style.display = 'none';
    
    loginForm.reset();
    hidePassword();
    
    gameToDelete = null;
}

function hidePassword() {
    const keyInput = document.getElementById('adminKey');
    const icon = keyToggle.querySelector('i');
    
    if (keyInput && icon) {
        keyInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Scroll Functions
function handleScroll() {
    if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/Hide Empty State
function showEmptyState() {
    emptyState.style.display = 'block';
    gamesContainer.innerHTML = '';
    loadMoreDiv.style.display = 'none';
}

function hideEmptyState() {
    emptyState.style.display = 'none';
}

// Notification System
function showNotification(message, type = 'info') {
    const container = document.querySelector('.notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info-circle';
    switch (type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'notificationSlideOut 0.3s forwards';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'notificationSlideOut 0.3s forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM loaded, initializing app...");
    initializeApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeGames) unsubscribeGames();
    if (unsubscribeOnline) unsubscribeOnline();
    if (unsubscribeAdmins) unsubscribeAdmins;
    
    if (isAdmin) {
        updateAdminOnlineStatus(false);
    }
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    .shake {
        animation: shake 0.5s;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .count-up {
        animation: countUp 0.5s ease-out;
    }
    
    @keyframes countUp {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .game-details-header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .game-details-icon {
        font-size: 4rem;
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 20px;
    }
    
    .game-details-title h3 {
        font-size: 1.8rem;
        color: var(--text-lighter);
        margin-bottom: 8px;
    }
    
    .game-details-category {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary-blue);
        padding: 6px 15px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .game-details-section {
        margin-bottom: 25px;
    }
    
    .game-details-section h4 {
        color: var(--text-lighter);
        font-size: 1.1rem;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .game-details-section p {
        color: var(--text-light);
        line-height: 1.6;
    }
    
    .game-url {
        color: var(--primary-blue);
        text-decoration: none;
        word-break: break-all;
        display: block;
        padding: 12px 15px;
        background: rgba(99, 102, 241, 0.05);
        border-radius: var(--radius-sm);
        border: 1px solid rgba(99, 102, 241, 0.1);
        transition: var(--transition);
    }
    
    .game-url:hover {
        background: rgba(99, 102, 241, 0.1);
        border-color: var(--primary-blue);
    }
    
    .game-details-meta {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin: 30px 0;
    }
    
    .meta-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: var(--radius-sm);
        color: var(--text-light);
        font-size: 0.9rem;
    }
    
    .meta-item i {
        color: var(--primary-blue);
        font-size: 1.1rem;
    }
    
    .game-details-actions {
        display: flex;
        gap: 15px;
        margin-top: 30px;
    }
    
    .btn-play-large {
        flex: 1;
        background: var(--gradient-primary);
        color: var(--text-white);
        text-decoration: none;
        padding: 18px 30px;
        border-radius: var(--radius);
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        transition: var(--transition);
        text-align: center;
    }
    
    .btn-play-large:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
    }
    
    .btn-edit {
        flex: 1;
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning);
        border: 2px solid rgba(245, 158, 11, 0.2);
        padding: 18px 30px;
        border-radius: var(--radius);
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
    }
    
    .btn-edit:hover {
        background: rgba(245, 158, 11, 0.2);
        border-color: var(--warning);
        transform: translateY(-3px);
    }
    
    .preview-note {
        margin-top: 25px;
        padding: 15px;
        background: rgba(245, 158, 11, 0.1);
        border-radius: var(--radius-sm);
        border-left: 4px solid var(--warning);
        display: flex;
        gap: 12px;
        align-items: flex-start;
    }
    
    .preview-note i {
        color: var(--warning);
        font-size: 1.2rem;
        margin-top: 2px;
    }
    
    .preview-note p {
        color: var(--text-light);
        font-size: 0.9rem;
        margin: 0;
        line-height: 1.5;
    }
    
    @keyframes notificationSlideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* Game categories colors */
    .game-category.action { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .game-category.adventure { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .game-category.puzzle { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
    .game-category.racing { background: rgba(249, 115, 22, 0.1); color: #f97316; }
    .game-category.sports { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .game-category.strategy { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .game-category.arcade { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
    .game-category.multiplayer { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
    
    /* Perbaikan untuk game-actions */
    .game-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        transition: all 0.3s ease;
        opacity: 1;
        transform: translateY(0);
    }
    
    .game-card:hover .game-actions {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);