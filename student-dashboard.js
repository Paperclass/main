// Student Dashboard Functionality
document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    loadPapers();
    setupEventListeners();
});

function setupEventListeners() {
    // Back buttons
    document.getElementById('backToPapers').addEventListener('click', showPapersView);
    document.getElementById('backToPapersFromRanks').addEventListener('click', showPapersView);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
    
    // Rank filters
    document.querySelectorAll('.rank-filter button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.rank-filter button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterRanks(this.getAttribute('data-filter'));
        });
    });
}

function loadPapers() {
    const papersGrid = document.getElementById('papersGrid');
    papersGrid.innerHTML = '<p>Loading papers...</p>';
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    database.ref('papers').orderByChild('year').equalTo(currentYear.toString()).once('value')
        .then(snapshot => {
            const papers = snapshot.val();
            if (papers) {
                let html = '';
                Object.keys(papers).forEach(paperId => {
                    const paper = papers[paperId];
                    const hasAnswers = checkIfAnswersAvailable(paperId);
                    
                    html += `
                        <div class="paper-card">
                            <h3>${paper.year} - Paper ${paper.paperNumber}</h3>
                            <div class="paper-actions">
                                <button class="btn btn-primary view-paper" data-paper="${paperId}">
                                    <i class="fas fa-file-pdf"></i> Paper
                                </button>
                                ${hasAnswers ? `
                                    <button class="btn btn-outline view-answers" data-paper="${paperId}">
                                        <i class="fas fa-check-circle"></i> Answers
                                    </button>
                                    <button class="btn btn-outline view-ranks" data-paper="${paperId}">
                                        <i class="fas fa-trophy"></i> Ranks
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                papersGrid.innerHTML = html || '<p>No papers available yet.</p>';
                
                // Add event listeners
                document.querySelectorAll('.view-paper').forEach(btn => {
                    btn.addEventListener('click', () => viewPaper(btn.getAttribute('data-paper')));
                });
                
                document.querySelectorAll('.view-answers').forEach(btn => {
                    btn.addEventListener('click', () => viewAnswers(btn.getAttribute('data-paper')));
                });
                
                document.querySelectorAll('.view-ranks').forEach(btn => {
                    btn.addEventListener('click', () => viewRanks(btn.getAttribute('data-paper')));
                });
            } else {
                papersGrid.innerHTML = '<p>No papers available yet.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading papers:', error);
            papersGrid.innerHTML = '<p>Error loading papers. Please try again.</p>';
        });
}

function checkIfAnswersAvailable(paperId) {
    // In a real implementation, you would check if answer submission time has ended
    // For demo purposes, we'll show answers for papers older than 1 day
    return true; // Change this logic based on your requirements
}

function viewPaper(paperId) {
    database.ref(`papers/${paperId}`).once('value').then(snapshot => {
        const paper = snapshot.val();
        if (paper && paper.pdfUrl) {
            document.getElementById('pdfViewTitle').textContent = 
                `${paper.year} - Paper ${paper.paperNumber}`;
            document.getElementById('pdfViewer').src = paper.pdfUrl;
            document.getElementById('dashboardSubtitle').textContent = 
                `Paper ${paper.paperNumber} - Paper`;
            showPdfView();
        } else {
            alert('Paper PDF not available yet.');
        }
    });
}

function viewAnswers(paperId) {
    // In a real app, you would load the answers PDF
    database.ref(`papers/${paperId}`).once('value').then(snapshot => {
        const paper = snapshot.val();
        if (paper) {
            // For demo, we'll use the same PDF
            document.getElementById('pdfViewTitle').textContent = 
                `${paper.year} - Paper ${paper.paperNumber} - Answers`;
            document.getElementById('pdfViewer').src = paper.pdfUrl; // Should be answersUrl
            document.getElementById('dashboardSubtitle').textContent = 
                `Paper ${paper.paperNumber} - Answers`;
            showPdfView();
        } else {
            alert('Answers not available yet.');
        }
    });
}

function viewRanks(paperId) {
    database.ref(`papers/${paperId}`).once('value').then(snapshot => {
        const paper = snapshot.val();
        if (paper) {
            document.getElementById('ranksViewTitle').textContent = 
                `${paper.year} - Paper ${paper.paperNumber} - Ranks`;
            document.getElementById('dashboardSubtitle').textContent = 
                `Paper ${paper.paperNumber} - Ranks`;
            loadRanks(paperId);
            showRanksView();
        }
    });
}

function loadRanks(paperId) {
    const ranksTable = document.getElementById('ranksTableBody');
    ranksTable.innerHTML = '<tr><td colspan="4">Loading ranks...</td></tr>';
    
    // Get current user's district (from their profile)
    const user = firebase.auth().currentUser;
    let userDistrict = 'Nugegoda'; // Default, should come from user profile
    
    // Load answers for this paper
    database.ref('answers').orderByChild('paperId').equalTo(paperId).once('value')
        .then(snapshot => {
            const answers = snapshot.val();
            if (answers) {
                // Convert to array and calculate marks
                let rankedAnswers = [];
                Object.keys(answers).forEach(answerId => {
                    const answer = answers[answerId];
                    const marks = calculateMarks(answer.answers);
                    rankedAnswers.push({
                        ...answer,
                        marks: marks,
                        id: answerId
                    });
                });
                
                // Sort by marks descending
                rankedAnswers.sort((a, b) => b.marks - a.marks);
                
                // Display in table
                let html = '';
                rankedAnswers.forEach((answer, index) => {
                    // Check if this is the current user
                    const isCurrentUser = user && answer.userId === user.uid;
                    const rowClass = isCurrentUser ? 'current-user' : '';
                    
                    html += `
                        <tr class="${rowClass}">
                            <td>${answer.name}</td>
                            <td>${answer.district || 'Unknown'}</td>
                            <td>${answer.marks.toFixed(1)}</td>
                            <td>${index + 1}</td>
                        </tr>
                    `;
                    
                    // Set current user's rank
                    if (isCurrentUser) {
                        document.getElementById('studentRank').textContent = 
                            `${answer.district || 'Unknown'} ${index + 1}`;
                        document.getElementById('studentMarks').textContent = 
                            `Marks: ${answer.marks.toFixed(1)}`;
                    }
                });
                
                ranksTable.innerHTML = html || '<tr><td colspan="4">No ranks available</td></tr>';
            } else {
                ranksTable.innerHTML = '<tr><td colspan="4">No ranks available</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading ranks:', error);
            ranksTable.innerHTML = '<tr><td colspan="4">Error loading ranks</td></tr>';
        });
}

function filterRanks(filter) {
    const rows = document.querySelectorAll('#ranksTableBody tr');
    rows.forEach(row => {
        const district = row.cells[1].textContent.toLowerCase();
        if (filter === 'all' || district.includes(filter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function calculateMarks(answers) {
    // Simple calculation - sum all answer values
    return Object.values(answers).reduce((sum, val) => sum + parseFloat(val), 0);
}

function showPdfView() {
    document.getElementById('papersView').style.display = 'none';
    document.getElementById('ranksView').style.display = 'none';
    document.getElementById('pdfView').style.display = 'block';
}

function showRanksView() {
    document.getElementById('papersView').style.display = 'none';
    document.getElementById('pdfView').style.display = 'none';
    document.getElementById('ranksView').style.display = 'block';
}

function showPapersView() {
    document.getElementById('pdfView').style.display = 'none';
    document.getElementById('ranksView').style.display = 'none';
    document.getElementById('papersView').style.display = 'block';
    document.getElementById('dashboardSubtitle').textContent = 'Latest Papers';
}