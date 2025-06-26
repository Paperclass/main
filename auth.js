// Authentication Functions
document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    
    // Initialize forms if they exist
    if (document.getElementById('registrationForm')) {
        initRegistrationForm();
    }
    
    if (document.getElementById('loginForm')) {
        initLoginForm();
    }
});

function initRegistrationForm() {
    const form = document.getElementById('registrationForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('contactNumber').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        // Create user with phone and password
        try {
            // Create Firebase auth user
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(
                `${phone}@paperclass.com`, // Using phone as email prefix
                password
            );
            
            // Save additional user data to database
            const userData = {
                name: document.getElementById('name').value,
                school: document.getElementById('school').value,
                nicNumber: document.getElementById('nicNumber').value,
                contactNumber: phone,
                medium: document.querySelector('input[name="medium"]:checked').value,
                district: document.getElementById('district').value,
                class: document.getElementById('class').value,
                createdAt: new Date().toISOString()
            };
            
            await database.ref('users/' + userCredential.user.uid).set(userData);
            
            alert('Registration successful! You can now login.');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: ' + error.message);
        }
    });
}

function initLoginForm() {
    const form = document.getElementById('loginForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('loginPhone').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            // Login with phone (stored as email) and password
            await firebase.auth().signInWithEmailAndPassword(
                `${phone}@paperclass.com`,
                password
            );
            
            alert('Login successful!');
            window.location.href = 'dashboard.html'; // Redirect to student dashboard
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    });
}

// Check if user is logged in (for other pages)
function checkAuthState() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            console.log('User logged in:', user.uid);
        } else {
            // User is signed out
            console.log('User not logged in');
        }
    });
}