// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD5SRZWB-QwMg7wmyTjcvHZqP-mEdlll_M",
    authDomain: "paper-class-1ab19.firebaseapp.com",
    databaseURL: "https://paper-class-1ab19-default-rtdb.firebaseio.com",
    projectId: "paper-class-1ab19",
    storageBucket: "paper-class-1ab19.appspot.com",
    messagingSenderId: "83634677566",
    appId: "1:83634677566:web:fb4f7a1fd869c3e82e2e6f"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const authBtn = document.getElementById('authBtn');
const themeToggle = document.getElementById('themeToggle');
const yearFilter = document.getElementById('yearFilter');
let loginModal = null;
if (document.getElementById('loginModal')) {
    loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
}

// Tab navigation
const sections = {
    papers: document.getElementById('papersSection'),
    ranks: document.getElementById('ranksSection'),
    stats: document.getElementById('statsSection')
};

const tabs = {
    papers: document.getElementById('papersTab'),
    ranks: document.getElementById('ranksTab'),
    stats: document.getElementById('statsTab')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    checkTheme();
    initAuthState();
    setupEventListeners();
});

function updateUserProfile() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    const profileSpinner = document.getElementById('profileSpinner');
    const profileError = document.getElementById('profileError');
    const profileSuccess = document.getElementById('profileSuccess');

    // Show loading state
    profileSpinner.classList.remove('d-none');
    profileError.classList.add('d-none');
    profileSuccess.classList.add('d-none');

    const updatedData = {
        name: document.getElementById('profileName').value,
        nic: document.getElementById('profileNic').value,
        class: document.getElementById('profileClass').value,
        registeredYear: document.getElementById('profileYear').value
    };

    database.ref('users/' + user.uid).update(updatedData)
        .then(() => {
            // Update local storage
            const updatedUser = { ...user, ...updatedData };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            // Update UI
            updateUserUI(auth.currentUser, updatedData);
            
            // Show success
            profileSuccess.textContent = 'Profile updated successfully!';
            profileSuccess.classList.remove('d-none');
        })
        .catch(error => {
            console.error('Profile update error:', error);
            profileError.textContent = 'Failed to update profile. Please try again.';
            profileError.classList.remove('d-none');
        })
        .finally(() => {
            profileSpinner.classList.add('d-none');
        });
}

// Profile form submission
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        updateUserProfile();
    });
}

function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Year filter
    if (yearFilter) {
        yearFilter.addEventListener('change', function() {
            loadPapers(this.value);
        });
    }
    
    // Tab navigation
    if (tabs.papers) tabs.papers.addEventListener('click', () => showSection('papers'));
    if (tabs.ranks) tabs.ranks.addEventListener('click', () => showSection('ranks'));
    if (tabs.stats) tabs.stats.addEventListener('click', () => {
        if (checkAuthForStats()) showSection('stats');
    });
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // Auth button
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('currentUser'));
            
            if (user) {
                logoutUser();
            } else {
                const modal = new bootstrap.Modal(document.getElementById('loginModal'));
                modal.show();
            }
        });
    }
}

function initAuthState() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            try {
                const snapshot = await database.ref('users/' + user.uid).once('value');
                let userData = snapshot.val();
                
                if (!userData) {
                    // Initialize default user data if not found
                    userData = {
                        name: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        nic: '',
                        class: '',
                        registeredYear: new Date().getFullYear().toString()
                    };
                    await database.ref('users/' + user.uid).set(userData);
                }
                
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    ...userData
                }));
                
                updateUserUI(user, userData);
                loadInitialContent(userData.registeredYear);
                
            } catch (error) {
                console.error("Error handling user data:", error);
                showToast("Error loading your account", 'danger');
                logoutUser();
            }
        } else {
            showPublicContent();
            localStorage.removeItem('currentUser');
        }
    });
}

function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="spinner-border"></div>
        <p>${message}</p>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function handlePostLogin(user) {
    // Show loading state immediately
    if (authBtn) {
        authBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Loading...';
        authBtn.disabled = true;
    }
    
    database.ref('users/' + user.uid).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                updateUserUI(user, userData);
                loadInitialContent(userData.registeredYear);
                showToast(`Welcome back, ${userData.name || 'Student'}!`, 'success');
            } else {
                console.error("User data not found");
                showToast("Your account data couldn't be loaded", 'danger');
                logoutUser();
            }
        })
        .catch(error => {
            console.error("Error loading user data:", error);
            showToast("Error loading your account data", 'danger');
            logoutUser();
        });
}

function showToast(message, type = 'info') {
    const toastContainer = document.createElement('div');
    toastContainer.className = `toast-container position-fixed top-0 end-0 p-3`;
    toastContainer.style.zIndex = '1100';
    
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type} border-0`;
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toastContainer.remove(), 300);
    }, 5000);
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginSpinner = document.getElementById('loginSpinner');
    const loginError = document.getElementById('loginError');
    
    // Validate inputs
    if (!email || !password) {
        showError(loginError, 'Please enter both email and password');
        return;
    }
    
    // Show loading state
    loginSpinner?.classList.remove('d-none');
    loginError?.classList.add('d-none');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const snapshot = await database.ref('users/' + userCredential.user.uid).once('value');
        let userData = snapshot.val();
        
        if (!userData) {
            // Initialize user data if not found
            await database.ref('users/' + userCredential.user.uid).set({
                name: email.split('@')[0], // Default name
                email: email,
                nic: '',
                class: '',
                registeredYear: new Date().getFullYear().toString()
            });
            
            // Reload the data
            const newSnapshot = await database.ref('users/' + userCredential.user.uid).once('value');
            userData = newSnapshot.val();
        }
        
        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            ...userData
        }));
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        modal?.hide();
        
        // Show welcome message
        showToast(`Welcome, ${userData.name || 'User'}!`, 'success');
        
        // Update UI
        updateUserUI(userCredential.user, userData);
        
        // Load user-specific content
        loadInitialContent(userData.registeredYear);
        
    } catch (error) {
        console.error('Login failed:', error);
        showError(loginError, getAuthErrorMessage(error));
    } finally {
        loginSpinner?.classList.add('d-none');
    }
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('d-none');
    element.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.classList.remove('show');
        setTimeout(() => element.classList.add('d-none'), 300);
    }, 5000);
}

function getAuthErrorMessage(error) {
    switch(error.code) {
        case 'auth/invalid-email': return 'Invalid email address';
        case 'auth/user-disabled': return 'Account disabled';
        case 'auth/user-not-found': return 'No account found with this email';
        case 'auth/wrong-password': return 'Incorrect password';
        case 'auth/too-many-requests': return 'Too many attempts. Try again later';
        case 'auth/operation-not-allowed': return 'Email/password login disabled';
        case 'auth/email-already-in-use': return 'Email already in use';
        case 'auth/weak-password': return 'Password should be at least 6 characters';
        default: return error.message.replace('Firebase: ', '');
    }
}

function updateUserUI(user, userData) {
    const userObj = {
        uid: user.uid,
        email: user.email,
        name: userData.name,
        nic: userData.nic,
        class: userData.class,
        registeredYear: userData.registeredYear
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userObj));

    // Replace auth button with profile dropdown
    if (authBtn && authBtn.parentElement) {
        authBtn.parentElement.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-success dropdown-toggle d-flex align-items-center" 
                        id="userDropdown" data-bs-toggle="dropdown">
                    <i class="bi bi-person-check me-2"></i>
                    <span id="userNameDisplay">${userData.name || 'User'}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><h6 class="dropdown-header">Logged in as ${user.email}</h6></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="profileBtn">
                        <i class="bi bi-person me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item text-danger" href="#" id="logoutBtn">
                        <i class="bi bi-box-arrow-right me-2"></i>Logout
                    </a></li>
                </ul>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
        document.getElementById('profileBtn')?.addEventListener('click', showProfileModal);
    }
    
    // Enable protected sections
    if (tabs.stats) tabs.stats.classList.remove('disabled');
    if (tabs.ranks) tabs.ranks.classList.remove('disabled');
}

function showProfileModal() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileNic').value = user.nic || '';
    document.getElementById('profileClass').value = user.class || '';
    document.getElementById('profileYear').value = user.registeredYear || '';
    
    profileModal.show();
}

function logoutUser(e) {
    if (e) {
        e.preventDefault();
        if (!confirm('Are you sure you want to log out?')) return;
    }
    
    // Show loading state
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.innerHTML = `
            <button class="btn btn-secondary d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Logging out...
            </button>
        `;
    }
    
    auth.signOut().then(() => {
        localStorage.removeItem('currentUser');
        showPublicContent();
        showToast('Logged out successfully', 'success');
    }).catch(error => {
        console.error('Logout error:', error);
        showToast('Logout failed. Please try again.', 'danger');
    });
}

function showPublicContent() {
    if (authBtn) {
        authBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i> Login';
        authBtn.classList.remove('btn-success');
        authBtn.classList.add('btn-outline-light');
    }

    // Disable protected sections
    if (tabs.stats) tabs.stats.classList.add('disabled');
    if (tabs.ranks) tabs.ranks.classList.add('disabled');
    
    loadPapers();
}

function loadInitialContent(userYear) {
    // Ensure sections are properly initialized
    if (!sections.papers || !tabs.papers) {
        setTimeout(() => showSection('papers'), 500);
        return;
    }
    
    showSection('papers');
    if (userYear && yearFilter) {
        yearFilter.value = userYear;
        // Add small delay to ensure UI is ready
        setTimeout(() => loadPapers(userYear), 300);
    } else {
        loadPapers();
    }
}

function showSection(section) {
    Object.values(sections).forEach(sec => {
        if (sec) {
            sec.style.display = 'none';
            sec.classList.remove('fade-in');
        }
    });
    
    Object.values(tabs).forEach(tab => {
        if (tab) tab.classList.remove('active');
    });
    
    if (sections[section]) {
        sections[section].style.display = 'block';
        setTimeout(() => sections[section].classList.add('fade-in'), 10);
    }
    if (tabs[section]) tabs[section].classList.add('active');
    
    if (section === 'papers') loadPapers(yearFilter?.value);
    else if (section === 'ranks') loadPapersForRankings();
    else if (section === 'stats' && checkAuthForStats()) loadUserStats();
}

function checkAuthForStats() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        showToast('Please login to view stats', 'warning');
        return false;
    }
    return true;
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle?.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        if (icon) {
            icon.classList.replace('fa-moon', 'fa-sun');
        }
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun me-2"></i> Light Mode';
    } else {
        if (icon) {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon me-2"></i> Dark Mode';
    }
}

function checkTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun me-2"></i> Light Mode';
    }
}

function loadPapers(selectedYear = '') {
    const availablePapers = document.getElementById('availablePapers');
    const viewAnswers = document.getElementById('viewAnswers');
    
    if (availablePapers) {
        availablePapers.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary"></div>
            </div>
        `;
    }
    
    if (viewAnswers) {
        viewAnswers.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary"></div>
            </div>
        `;
    }
    
    database.ref('papers').once('value').then(snapshot => {
        const papers = snapshot.val() || {};
        const now = Date.now();
        
        let availableHtml = '';
        let answersHtml = '';
        let hasAvailable = false;
        let hasAnswers = false;
        
        Object.entries(papers).forEach(([id, paper]) => {
            if (selectedYear && paper.year !== selectedYear) return;
            
            const card = createPaperCard(id, paper);
            const openTime = new Date(paper.openTime).getTime();
            const closeTime = new Date(paper.closeTime).getTime();
            
            if (now >= openTime && now <= closeTime) {
                availableHtml += card;
                hasAvailable = true;
            } else if (now > closeTime) {
                answersHtml += card;
                hasAnswers = true;
            }
        });
        
        if (availablePapers) {
            availablePapers.innerHTML = hasAvailable ? availableHtml : 
                '<div class="col-12 text-center py-4">No available papers</div>';
        }
        
        if (viewAnswers) {
            viewAnswers.innerHTML = hasAnswers ? answersHtml : 
                '<div class="col-12 text-center py-4">No papers with answers</div>';
        }
        
        addPaperCardEventListeners();
    }).catch(error => {
        console.error('Error loading papers:', error);
        if (availablePapers) {
            availablePapers.innerHTML = '<div class="col-12 text-center py-4 text-danger">Error loading papers</div>';
        }
    });
}

function createPaperCard(id, paper) {
    const isAvailable = isPaperAvailable(paper);
    const isClosed = isPaperClosed(paper);
    
    let buttons = '';
    if (isAvailable) {
        buttons = `
            <button class="btn btn-outline-primary download-paper-btn" data-id="${id}">
                <i class="bi bi-download me-1"></i> Download
            </button>
            <a href="student-paper.html?paperId=${id}" class="btn btn-primary">
                <i class="bi bi-pencil-square me-1"></i> Submit
            </a>
        `;
    } else if (isClosed) {
        buttons = `
            <button class="btn btn-outline-primary download-paper-btn" data-id="${id}">
                <i class="bi bi-download me-1"></i> Download
            </button>
            <button class="btn btn-outline-success download-answers-btn" data-id="${id}">
                <i class="bi bi-file-earmark-text me-1"></i> Answers
            </button>
            <button class="btn btn-primary view-ranks-btn" data-id="${id}">
                <i class="bi bi-trophy me-1"></i> Ranks
            </button>
        `;
    }
    
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card paper-card">
                <div class="card-body">
                    <h5 class="card-title">${paper.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${paper.year} - ${paper.subject}</h6>
                    <p class="card-text text-muted small">
                        ${isAvailable ? 
                            `Available until ${new Date(paper.closeTime).toLocaleString()}` : 
                            `Closed on ${new Date(paper.closeTime).toLocaleString()}`}
                    </p>
                    <div class="btn-group w-100">
                        ${buttons}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function isPaperAvailable(paper) {
    const now = Date.now();
    return now >= new Date(paper.openTime).getTime() && 
           now <= new Date(paper.closeTime).getTime();
}

function isPaperClosed(paper) {
    return Date.now() > new Date(paper.closeTime).getTime();
}

function addPaperCardEventListeners() {
    document.querySelectorAll('.download-paper-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            downloadPaper(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.download-answers-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            downloadAnswers(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.view-ranks-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showSection('ranks');
            const rankFilter = document.getElementById('rankPaperFilter');
            if (rankFilter) rankFilter.value = this.getAttribute('data-id');
            loadRankings(this.getAttribute('data-id'));
        });
    });
}

function downloadPaper(paperId) {
    database.ref(`papers/${paperId}/pdfUrl`).once('value').then(snapshot => {
        const url = snapshot.val();
        if (url) window.open(url, '_blank');
        else showToast('Paper not available', 'warning');
    }).catch(error => {
        console.error('Download error:', error);
        showToast('Download failed', 'danger');
    });
}

function downloadAnswers(paperId) {
    database.ref(`papers/${paperId}/answerKeyUrl`).once('value').then(snapshot => {
        const url = snapshot.val();
        if (url) window.open(url, '_blank');
        else showToast('Answers not available', 'warning');
    }).catch(error => {
        console.error('Download error:', error);
        showToast('Download failed', 'danger');
    });
}

function loadPapersForRankings() {
    const filter = document.getElementById('rankPaperFilter');
    if (!filter) return;
    
    filter.innerHTML = '<option value="">Select Paper</option>';
    
    database.ref('papers').once('value').then(snapshot => {
        const papers = snapshot.val() || {};
        const now = Date.now();
        
        Object.entries(papers).forEach(([id, paper]) => {
            if (now > new Date(paper.closeTime).getTime()) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${paper.title} (${paper.year})`;
                filter.appendChild(option);
            }
        });
        
        filter.addEventListener('change', function() {
            if (this.value) loadRankings(this.value);
        });
    }).catch(error => {
        console.error('Error loading papers:', error);
    });
}

function loadRankings(paperId) {
    if (!paperId) return;
    
    const overallRankings = document.getElementById('overallRankings');
    const classRankings = document.getElementById('classRankings');
    const userRankInfo = document.getElementById('userRankInfo');
    const classFilter = document.getElementById('classFilter');
    
    if (overallRankings) {
        overallRankings.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner-border"></div></td></tr>';
    }
    if (classRankings) {
        classRankings.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner-border"></div></td></tr>';
    }
    if (userRankInfo) {
        userRankInfo.style.display = 'none';
    }
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.class && classFilter) {
        classFilter.value = user.class;
    }
    
    Promise.all([
        database.ref(`papers/${paperId}`).once('value'),
        database.ref(`submissions/${paperId}`).once('value')
    ]).then(([paperSnapshot, submissionsSnapshot]) => {
        const paper = paperSnapshot.val();
        const submissions = submissionsSnapshot.val() || {};
        
        let submissionsArray = Object.entries(submissions).map(([nic, sub]) => ({ nic, ...sub }));
        submissionsArray.sort((a, b) => b.score - a.score);
        
        // Calculate ranks
        let rank = 1;
        submissionsArray.forEach((sub, i) => {
            if (i > 0 && sub.score < submissionsArray[i-1].score) rank = i + 1;
            sub.rank = rank;
        });
        
        if (overallRankings) {
            displayRankings(overallRankings, submissionsArray.slice(0, 100), paper, user);
        }
        
        const selectedClass = classFilter?.value;
        const classSubmissions = selectedClass ? 
            submissionsArray.filter(sub => sub.class === selectedClass) : submissionsArray;
        
        if (classRankings) {
            displayRankings(classRankings, classSubmissions.slice(0, 100), paper, user);
        }
        
        if (user) {
            const userSubmission = submissionsArray.find(sub => sub.nic === user.nic);
            if (userSubmission && userRankInfo) {
                showUserRank(userSubmission, paper, classSubmissions, selectedClass);
            }
        }
        
        if (classFilter) {
            classFilter.addEventListener('change', function() {
                const selectedClass = this.value;
                const filtered = selectedClass ? 
                    submissionsArray.filter(sub => sub.class === selectedClass) : submissionsArray;
                if (classRankings) {
                    displayRankings(classRankings, filtered.slice(0, 100), paper, user);
                }
                
                if (user) {
                    const userSubmission = submissionsArray.find(sub => sub.nic === user.nic);
                    if (userSubmission && userRankInfo) {
                        showUserRank(userSubmission, paper, filtered, selectedClass);
                    }
                }
            });
        }
        
    }).catch(error => {
        console.error('Error loading rankings:', error);
        if (overallRankings) {
            overallRankings.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading rankings</td></tr>';
        }
    });
}

function displayRankings(element, submissions, paper, user) {
    if (submissions.length === 0) {
        element.innerHTML = '<tr><td colspan="3" class="text-center">No submissions found</td></tr>';
        return;
    }

    let html = '';
    submissions.forEach(sub => {
        const isUser = user && user.nic === sub.nic;
        const percentage = ((sub.score / paper.totalMarks) * 100).toFixed(1);
        
        html += `
            <tr class="${isUser ? 'user-rank' : ''}">
                <td>${sub.rank}</td>
                <td>${sub.name}</td>
                <td>${sub.score}/${paper.totalMarks} (${percentage}%)</td>
            </tr>
        `;
    });
    
    element.innerHTML = html;
}

function showUserRank(submission, paper, classSubmissions, classGroup) {
    const percentage = ((submission.score / paper.totalMarks) * 100).toFixed(1);
    const classRank = classSubmissions.findIndex(sub => sub.nic === submission.nic) + 1;
    const userRankInfo = document.getElementById('userRankInfo');
    const userRankDetails = document.getElementById('userRankDetails');
    
    if (!userRankInfo || !userRankDetails) return;
    
    userRankDetails.innerHTML = `
        <p><strong>Paper:</strong> ${paper.title} (${paper.year})</p>
        <p><strong>Score:</strong> ${submission.score}/${paper.totalMarks} (${percentage}%)</p>
        <p><strong>Rank:</strong> ${submission.rank}</p>
        ${classGroup ? `<p><strong>Class Rank:</strong> ${classRank} (${classGroup})</p>` : ''}
    `;
    userRankInfo.style.display = 'block';
}

// Stats section functions
async function loadUserStats() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        showToast('Please login to view stats', 'warning');
        return;
    }

    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;

    // Show loading state
    statsSection.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Loading your statistics...</p>
        </div>
    `;

    try {
        // Build the stats UI directly
        statsSection.innerHTML = `
            <h2 class="section-title">
                <i class="bi bi-graph-up me-2"></i> My Statistics
            </h2>
            
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="stats-card">
                        <div class="stat-value" id="totalPapersTaken">0</div>
                        <div class="stat-label">Papers Taken</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stats-card">
                        <div class="stat-value" id="averageScore">0%</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stats-card">
                        <div class="stat-value" id="bestRank">N/A</div>
                        <div class="stat-label">Best Rank</div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <i class="bi bi-graph-up me-2"></i> Performance Chart
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas id="performanceChart" height="300"></canvas>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <i class="bi bi-list-check me-2"></i> My Submissions
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Paper</th>
                                    <th>Year</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                    <th>Rank</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="mySubmissions"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Now load the actual data
        const [papersSnapshot, submissionsSnapshot] = await Promise.all([
            database.ref('papers').once('value'),
            database.ref('submissions').once('value')
        ]);

        const papers = papersSnapshot.val() || {};
        const allSubmissions = submissionsSnapshot.val() || {};
        const userSubmissions = [];

        // Process all submissions to find the user's submissions
        Object.entries(allSubmissions).forEach(([paperId, paperSubmissions]) => {
            if (paperSubmissions && papers[paperId]) {
                Object.entries(paperSubmissions).forEach(([nic, submission]) => {
                    if (nic === user.nic) {
                        userSubmissions.push({
                            paperId,
                            paperTitle: papers[paperId].title,
                            paperYear: papers[paperId].year,
                            score: submission.score,
                            totalMarks: papers[paperId].totalMarks,
                            rank: submission.rank || 'N/A',
                            timestamp: submission.timestamp || 0
                        });
                    }
                });
            }
        });

        // Update the UI with the collected data
        updateStatsUI(userSubmissions);

    } catch (error) {
        console.error('Error loading stats:', error);
        showStatsError(error.message || 'Failed to load stats data');
    }
}

// Update stats UI with data
function updateStatsUI(submissions) {
    if (submissions.length === 0) {
        document.getElementById('mySubmissions').innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="bi bi-info-circle me-2"></i>
                        No submissions found
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Update stats cards
    document.getElementById('totalPapersTaken').textContent = submissions.length;
    
    const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
    const totalPossible = submissions.reduce((sum, sub) => sum + sub.totalMarks, 0);
    const averagePercentage = ((totalScore / totalPossible) * 100).toFixed(1);
    document.getElementById('averageScore').textContent = `${averagePercentage}%`;
    
    const validRanks = submissions.filter(sub => typeof sub.rank === 'number');
    const bestRank = validRanks.length > 0 ? Math.min(...validRanks.map(sub => sub.rank)) : 'N/A';
    document.getElementById('bestRank').textContent = bestRank;

    // Update submissions table
    const sortedSubmissions = [...submissions].sort((a, b) => b.timestamp - a.timestamp);
    const tableBody = document.getElementById('mySubmissions');
    
    tableBody.innerHTML = sortedSubmissions.map(sub => {
        const percentage = ((sub.score / sub.totalMarks) * 100).toFixed(1);
        const date = sub.timestamp ? new Date(sub.timestamp).toLocaleDateString() : 'N/A';
        
        return `
            <tr>
                <td>${sub.paperTitle}</td>
                <td>${sub.paperYear}</td>
                <td>${sub.score}/${sub.totalMarks} (${percentage}%)</td>
                <td>${date}</td>
                <td>${sub.rank || 'N/A'}</td>
                <td>
                    <a href="results.html?paperId=${sub.paperId}&nic=${sub.nic}" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-eye"></i> View
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    // Initialize performance chart
    initializePerformanceChart(sortedSubmissions);
}

// Initialize the performance chart
function initializePerformanceChart(submissions) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: submissions.map(sub => `${sub.paperTitle} (${sub.paperYear})`),
            datasets: [{
                label: 'Score (%)',
                data: submissions.map(sub => Math.round((sub.score / sub.totalMarks) * 100)),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Score (%)'
                    }
                }
            }
        }
    });
}

function showStatsError(message) {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;
    
    statsSection.innerHTML = `
        <div class="alert alert-danger">
            <h4><i class="bi bi-exclamation-triangle me-2"></i> Error Loading Stats</h4>
            <p>${message}</p>
            <button onclick="loadUserStats()" class="btn btn-sm btn-primary mt-2">
                <i class="bi bi-arrow-repeat me-1"></i> Try Again
            </button>
        </div>
    `;
}
function loadStatsData(user) {
    const timeout = setTimeout(() => {
        showStatsError('Request timed out. Please try again.');
    }, 10000);

    Promise.all([
        database.ref('papers').once('value'),
        database.ref('submissions').once('value')
    ]).then(([papersSnapshot, submissionsSnapshot]) => {
        clearTimeout(timeout);
        
        const papers = papersSnapshot.val() || {};
        const allSubmissions = submissionsSnapshot.val() || {};
        const userSubmissions = [];

        // Process all submissions to find the user's submissions
        Object.entries(allSubmissions).forEach(([paperId, paperSubmissions]) => {
            if (paperSubmissions && papers[paperId]) {
                Object.entries(paperSubmissions).forEach(([nic, submission]) => {
                    if (nic === user.nic) {
                        userSubmissions.push({
                            paperId,
                            paperTitle: papers[paperId].title,
                            paperYear: papers[paperId].year,
                            score: submission.score,
                            totalMarks: papers[paperId].totalMarks,
                            timestamp: submission.timestamp || 0
                        });
                    }
                });
            }
        });

        // Update the UI with the collected data
        updateStatsUI(userSubmissions);
    }).catch(error => {
        clearTimeout(timeout);
        showStatsError(error.message || 'Failed to load data');
        console.error('Stats loading error:', error);
    });
}


function updateStatsUI(submissions) {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;

    // Handle empty state
    if (submissions.length === 0) {
        statsSection.innerHTML = `
            <div class="alert alert-info">
                <h4><i class="bi bi-info-circle me-2"></i> No Statistics Available</h4>
                <p>You haven't submitted any papers yet.</p>
            </div>
        `;
        return;
    }

    // Calculate basic statistics
    const totalPapers = submissions.length;
    const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
    const totalPossible = submissions.reduce((sum, sub) => sum + sub.totalMarks, 0);
    const averagePercentage = ((totalScore / totalPossible) * 100).toFixed(1);

    // Update the stats cards
    document.getElementById('totalPapersTaken').textContent = totalPapers;
    document.getElementById('averageScore').textContent = `${averagePercentage}%`;

    // Initialize the chart
    initializePerformanceChart(submissions);

    // Render the submissions table
    renderSubmissionsTable(submissions);
}

function initializePerformanceChart(submissions) {
    const ctx = document.createElement('canvas');
    ctx.id = 'performanceChart';
    ctx.height = 300;
    
    const chartContainer = document.querySelector('#statsSection .row');
    if (!chartContainer) return;
    
    // Create a card for the chart
    const chartCard = document.createElement('div');
    chartCard.className = 'col-md-12 mb-4';
    chartCard.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <i class="bi bi-graph-up me-2"></i> Performance Overview
            </div>
            <div class="card-body">
                <div class="chart-container">
                    <!-- Chart will be rendered here -->
                </div>
            </div>
        </div>
    `;
    
    // Insert after the stats cards
    chartContainer.appendChild(chartCard);
    
    // Get the container for the chart
    const container = chartCard.querySelector('.chart-container');
    container.appendChild(ctx);
    
    // Prepare data for the chart
    const sortedSubmissions = [...submissions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const labels = sortedSubmissions.map(sub => 
        `${sub.paperTitle} (${sub.paperYear})`
    );
    
    const scores = sortedSubmissions.map(sub => 
        Math.round((sub.score / sub.totalMarks) * 100)
    );
    
    const ranks = sortedSubmissions.map(sub => {
        if (typeof sub.rank === 'number') return sub.rank;
        return null; // For 'N/A' ranks
    });

    // Create the chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Score (%)',
                    data: scores,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Rank',
                    data: ranks,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.3,
                    yAxisID: 'y1',
                    hidden: ranks.every(r => r === null) // Hide if no rank data
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Score (%)'
                    },
                    min: 0,
                    max: 100
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Rank'
                    },
                    min: 1,
                    reverse: true,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                // Score tooltip
                                const submission = sortedSubmissions[context.dataIndex];
                                label += `${submission.score}/${submission.totalMarks} (${context.raw}%)`;
                            } else {
                                // Rank tooltip
                                label += context.raw || 'N/A';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function showStatsError(message) {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;
    
    statsSection.innerHTML = `
        <div class="alert alert-danger">
            <h4>Error Loading Stats</h4>
            <p>${message}</p>
            <button onclick="loadUserStats()" class="btn btn-sm btn-primary mt-2">
                Retry
            </button>
        </div>
    `;
}

function renderSubmissionsTable(submissions) {
    const tableBody = document.getElementById('mySubmissions');
    if (!tableBody) return;

    // Sort submissions by timestamp (newest first)
    const sortedSubmissions = [...submissions].sort((a, b) => b.timestamp - a.timestamp);

    let html = '';
    sortedSubmissions.forEach(sub => {
        const percentage = ((sub.score / sub.totalMarks) * 100).toFixed(1);
        const date = sub.timestamp ? new Date(sub.timestamp).toLocaleDateString() : 'N/A';

        html += `
            <tr>
                <td>${sub.paperTitle}</td>
                <td>${sub.paperYear}</td>
                <td>${sub.score}/${sub.totalMarks} (${percentage}%)</td>
                <td>${date}</td>
                <td>${sub.rank || 'N/A'}</td>
                <td>
                    <a href="results.html?paperId=${sub.paperId}&nic=${sub.nic}" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-eye"></i> View
                    </a>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html || `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="alert alert-info mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    No submissions found
                </div>
            </td>
        </tr>
    `;
}


function showStatsError(message) {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;
    
    statsSection.innerHTML = `
        <div class="alert alert-danger">
            <h4><i class="bi bi-exclamation-triangle me-2"></i> Error Loading Stats</h4>
            <p>${message}</p>
            <button onclick="loadUserStats()" class="btn btn-sm btn-primary mt-2">
                <i class="bi bi-arrow-repeat me-1"></i> Try Again
            </button>
        </div>
    `;
}
