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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const themeToggle = document.getElementById('themeToggle');
const answerForm = document.getElementById('answerForm');
const questionsContainer = document.getElementById('questionsContainer');

// Theme toggle functionality
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// Check for saved theme preference
function checkTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = themeToggle.querySelector('i');
        icon.classList.replace('fa-moon', 'fa-sun');
    }
}

// Get paper ID from URL
function getPaperIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('paperId');
}

// Load paper details and questions
function loadPaperQuestions() {
    const paperId = getPaperIdFromUrl();
    if (!paperId) {
        alert('Invalid paper link');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('paperId').value = paperId;

    // Load paper details
    database.ref('papers/' + paperId).once('value').then(snapshot => {
        const paper = snapshot.val();
        if (!paper) {
            alert('Paper not found');
            window.location.href = 'index.html';
            return;
        }

        // Display paper header info
        document.getElementById('paperTitle').textContent = paper.title || 'Untitled Paper';
        document.getElementById('paperYear').textContent = paper.year || '----';
        document.getElementById('paperNumber').textContent = paper.paperNumber || '--';
        document.getElementById('paperSubject').textContent = paper.subject || 'Not specified';

        // Handle multiple mediums
        let mediums = [];
        if (paper.mediums) {
            mediums = paper.mediums;
            document.getElementById('paperMediums').textContent = mediums.join(', ');
        } else if (paper.medium) {
            mediums = [paper.medium];
            document.getElementById('paperMediums').textContent = paper.medium;
        } else {
            document.getElementById('paperMediums').textContent = 'Not specified';
        }

        // Show medium selection if multiple options
        if (mediums.length > 1) {
            const mediumOptions = document.getElementById('mediumOptions');
            mediumOptions.innerHTML = '';
            
            mediums.forEach(medium => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'medium-btn btn btn-outline-primary';
                btn.textContent = medium;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.medium-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('selectedMedium').value = medium;
                    loadQuestionsForMedium(paperId, medium);
                });
                mediumOptions.appendChild(btn);
            });
            
            document.getElementById('mediumSelection').style.display = 'block';
        } else if (mediums.length === 1) {
            // Only one medium, select it automatically
            document.getElementById('selectedMedium').value = mediums[0];
            loadQuestionsForMedium(paperId, mediums[0]);
        }

        // Set up countdown timer
        if (paper.closeTime) {
            setupTimer(paper.closeTime);
        } else {
            document.getElementById('timerSection').style.display = 'none';
        }
    }).catch(error => {
        console.error('Error loading paper:', error);
        alert('Error loading paper. Please try again.');
    });
}

// Load questions for selected medium
function loadQuestionsForMedium(paperId, medium) {
    database.ref(`papers/${paperId}/questions`).once('value').then(snapshot => {
        const allQuestions = snapshot.val() || {};
        
        // Filter questions by medium if available
        let questions = {};
        if (allQuestions[medium]) {
            questions = allQuestions[medium];
        } else {
            questions = allQuestions;
        }

        // Display answer sheet
        questionsContainer.innerHTML = '';
        let questionCount = 0;

        for (const [qNum, question] of Object.entries(questions)) {
            questionCount++;
            const row = document.createElement('tr');
            row.className = 'question-item';
            row.dataset.questionNumber = qNum;
            row.innerHTML = `
                <td>${qNum}</td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="1" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="2" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="3" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="4" required></td>
                <td><input type="radio" class="answer-radio" name="q${qNum}" value="5" required></td>
            `;
            questionsContainer.appendChild(row);
        }

        // Show answer section and submit button
        document.getElementById('answerSection').style.display = 'block';
        document.getElementById('submitBtn').style.display = 'block';

        // Add visual feedback for answered questions
        document.querySelectorAll('.answer-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                const questionNumber = this.name.substring(1);
                const questionRow = document.querySelector(`tr[data-question-number="${questionNumber}"]`);
                if (questionRow) {
                    questionRow.classList.add('answered');
                }
            });
        });
    }).catch(error => {
        console.error('Error loading questions:', error);
        alert('Error loading questions. Please try again.');
    });
}

// Set up countdown timer
function setupTimer(closeTime) {
    const countDownDate = new Date(closeTime).getTime();
    
    const timer = setInterval(function() {
        const now = new Date().getTime();
        const distance = countDownDate - now;
        
        if (distance < 0) {
            clearInterval(timer);
            document.getElementById('timeRemaining').textContent = "TIME EXPIRED";
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('timerSection').className = 'timer alert alert-danger';
            return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('timeRemaining').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (distance < 600000) { // 10 minutes remaining
            document.getElementById('timerSection').className = 'timer alert alert-danger';
        } else if (distance < 1800000) { // 30 minutes remaining
            document.getElementById('timerSection').className = 'timer alert alert-warning';
        }
    }, 1000);
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();
    
    const paperId = document.getElementById('paperId').value;
    const medium = document.getElementById('selectedMedium').value;
    const nic = document.getElementById('nic').value.trim();
    const name = document.getElementById('name').value.trim();
    const district = document.getElementById('district').value;
    const studentClass = document.getElementById('class').value;
    const school = document.getElementById('school').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Validate required fields
    if (!nic || !name || !district || !studentClass) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }
    
    if (!medium) {
        alert('Please select a medium first');
        return;
    }
    
    // Check if time has expired
    if (document.getElementById('timeRemaining').textContent === "TIME EXPIRED") {
        alert('The submission time has expired. Your answers cannot be submitted.');
        return;
    }
    
    // Get all answers
    const answers = {};
    const questionInputs = document.querySelectorAll('input[type="radio"]:checked');
    
    questionInputs.forEach(input => {
        const qNum = input.name.substring(1); // Remove 'q' prefix
        answers[qNum] = input.value;
    });
    
    // Check if all questions are answered
    const totalQuestions = document.querySelectorAll('.question-item').length;
    if (Object.keys(answers).length < totalQuestions) {
        alert('Please answer all questions before submitting.');
        return;
    }
    
    // Disable submit button to prevent duplicate submissions
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
    
    // Calculate score
    database.ref(`papers/${paperId}/questions`).once('value').then(snapshot => {
        const allQuestions = snapshot.val() || {};
        
        // Get questions for the selected medium
        let questions = {};
        if (allQuestions[medium]) {
            questions = allQuestions[medium];
        } else {
            questions = allQuestions;
        }
        
        let score = 0;
        let totalPossible = 0;
        
        for (const [qNum, question] of Object.entries(questions)) {
            totalPossible += question.marks || 0;
            if (answers[qNum] && answers[qNum] === question.answer) {
                score += question.marks || 0;
            }
        }
        
        // Prepare submission data
        const submission = {
            name,
            nic,
            district,
            class: studentClass,
            school: school || '',
            phone: phone || '',
            medium,
            answers,
            score,
            totalPossible,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Submit data
        return database.ref(`submissions/${paperId}/${nic}`).set(submission);
    }).then(() => {
        alert('Answers submitted successfully!');
        window.location.href = `results.html?paperId=${paperId}&nic=${nic}`;
    }).catch(error => {
        console.error('Submission error:', error);
        alert(`Error: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Answers';
    });
}

// Check if user is registered and auto-fill info
function checkRegisteredUser() {
    const nic = localStorage.getItem('userNIC');
    if (nic) {
        database.ref('users/' + nic).once('value').then(snapshot => {
            const user = snapshot.val();
            if (user) {
                document.getElementById('nic').value = nic;
                document.getElementById('name').value = user.name || '';
                document.getElementById('district').value = user.district || '';
                document.getElementById('class').value = user.class || '';
                document.getElementById('school').value = user.school || '';
                document.getElementById('phone').value = user.phone || '';
            }
        });
    }
}

// Event listeners
themeToggle.addEventListener('click', toggleTheme);
answerForm.addEventListener('submit', handleSubmit);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    checkRegisteredUser();
    loadPaperQuestions();
});