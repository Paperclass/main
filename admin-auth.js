// Admin Authentication Functions
function initAdminAuth() {
    // Check admin status on auth state change
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in, verify admin status
            const snapshot = await database.ref('admins/' + user.uid).once('value');
            
            if (!snapshot.exists()) {
                // Not an admin, redirect to login
                await firebase.auth().signOut();
                window.location.href = 'admin-login.html';
            }
        } else {
            // User not signed in, redirect to login
            if (window.location.pathname !== '/admin-login.html') {
                window.location.href = 'admin-login.html';
            }
        }
    });
}

// Initialize admin authentication
document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    
    // Initialize admin auth for admin pages
    if (document.querySelector('body.admin')) {
        initAdminAuth();
    }
    
    // Admin logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                window.location.href = 'admin-login.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
});

// Function to create admin users (run once to setup initial admin)
async function createAdminUser(email, password) {
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Add to admins collection
        await database.ref('admins/' + userCredential.user.uid).set({
            email: email,
            createdAt: new Date().toISOString(),
            isSuperAdmin: true
        });
        
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

// Uncomment and run once to create initial admin
// createAdminUser('admin@paperclass.com', 'securePassword123');