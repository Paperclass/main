// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD5SRZWB-QwMg7wmyTjcvHZqP-mEdlll_M",
    authDomain: "paper-class-1ab19.firebaseapp.com",
    databaseURL: "https://paper-class-1ab19-default-rtdb.firebaseio.com",
    projectId: "paper-class-1ab19",
    storageBucket: "paper-class-1ab19.firebasestorage.app",
    messagingSenderId: "83634677566",
    appId: "1:83634677566:web:fb4f7a1fd869c3e82e2e6f"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const themeToggle = document.getElementById('themeToggle');
const answersContainer = document.getElementById('answersContainer');
const answerSheetForm = document.getElementById('answerSheetForm');

// Generate answer items
function generateAnswerItems() {
    let html = '';
    for (let i = 1; i <= 15; i++) {
        html += `
            <div class="answer-item">
                <h3>Question ${i}</h3>
                <div class="rating-options">
                    <div class="rating-option">
                        <input type="radio" id="q${i}-1" name="q${i}" value="1.0" required>
                        <label for="q${i}-1">1.0</label>
                    </div>
                    <div class="rating-option">
                        <input type="radio" id="q${i}-2" name="q${i}" value="2.0">
                        <label for="q${i}-2">2.0</label>
                    </div>
                    <div class="rating-option">
                        <input type="radio" id="q${i}-3" name="q${i}" value="3.0">
                        <label for="q${i}-3">3.0</label>
                    </div>
                    <div class="rating-option">
                        <input type="radio" id="q${i}-4" name="q${i}" value="4.0">
                        <label for="q${i}-4">4.0</label>
                    </div>
                    <div class="rating-option">
                        <input type="radio" id="q${i}-5" name="q${i}" value="5.0">
                        <label for="q${i}-5">5.0</label>
                    </div>
                </div>
            </div>
        `;
    }
    answersContainer.innerHTML = html;
}

// Toggle dark/light mode
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// Check for saved theme preference
function checkTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = themeToggle.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// Form submission
function handleSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const formData = {
        name: document.getElementById('name').value,
        school: document.getElementById('school').value,
        micNumber: document.getElementById('micNumber').value,
        contactNumber: document.getElementById('contactNumber').value,
        medium: document.querySelector('input[name="medium"]:checked').value,
        district: document.getElementById('district').value,
        class: document.getElementById('class').value,
        answers: {},
        timestamp: new Date().toISOString()
    };

    // Get answers
    for (let i = 1; i <= 15; i++) {
        formData.answers[`q${i}`] = document.querySelector(`input[name="q${i}"]:checked`).value;
    }

    // Save to Firebase
    const newAnswerKey = database.ref().child('answers').push().key;
    const updates = {};
    updates['/answers/' + newAnswerKey] = formData;

    database.ref().update(updates)
        .then(() => {
            alert('Your answers have been submitted successfully!');
            answerSheetForm.reset();
        })
        .catch((error) => {
            console.error('Error saving data:', error);
            alert('There was an error submitting your answers. Please try again.');
        });
}

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
answerSheetForm.addEventListener('submit', handleSubmit);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    generateAnswerItems();
    checkTheme();
});

