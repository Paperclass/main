// Admin Paper Management
document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
    initCreatePaperForm();
    loadPapersList();
    loadAnswersTable();
});

function initCreatePaperForm() {
    const form = document.getElementById('createPaperForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate answer key
        let answerKey = {};
        try {
            answerKey = JSON.parse(document.getElementById('answerKey').value);
        } catch (e) {
            alert('Invalid JSON format for answer key');
            return;
        }

        const paperData = {
            year: document.getElementById('paperYear').value,
            paperNumber: document.getElementById('paperNumber').value,
            questions: parseInt(document.getElementById('questionCount').value),
            answerKey: answerKey,
            createdAt: new Date().toISOString(),
            createdBy: firebase.auth().currentUser.uid
        };

        // Generate paper ID
        const paperId = `${paperData.year}_${paperData.paperNumber}`;
        
        // Handle file upload
        const pdfFile = document.getElementById('paperPdf').files[0];
        if (pdfFile) {
            try {
                // Upload to Firebase Storage
                const storageRef = firebase.storage().ref(`papers/${paperId}.pdf`);
                await storageRef.put(pdfFile);
                
                // Get download URL
                paperData.pdfUrl = await storageRef.getDownloadURL();
            } catch (error) {
                console.error('Error uploading PDF:', error);
                alert('Error uploading PDF. Please try again.');
                return;
            }
        }

        try {
            // Save paper to Firebase
            await database.ref(`papers/${paperId}`).set(paperData);
            
            // Save answer key separately for easy access
            await database.ref(`answerKeys/${paperId}`).set(answerKey);
            
            alert('Paper created successfully!');
            form.reset();
            loadPapersList();
        } catch (error) {
            console.error('Error creating paper:', error);
            alert('Error creating paper. Please try again.');
        }
    });
}

function loadPapersList() {
    const papersList = document.getElementById('papersList');
    papersList.innerHTML = '<p>Loading papers...</p>';
    
    database.ref('papers').once('value').then(snapshot => {
        const papers = snapshot.val();
        if (papers) {
            let html = '';
            Object.keys(papers).forEach(paperId => {
                const paper = papers[paperId];
                html += `
                    <div class="paper-card">
                        <h3>${paper.year} - Paper ${paper.paperNumber}</h3>
                        <p>Questions: ${paper.questions}</p>
                        <p>Created: ${new Date(paper.createdAt).toLocaleDateString()}</p>
                        <div class="paper-actions">
                            <a href="${paper.pdfUrl}" target="_blank" class="btn btn-outline btn-sm">
                                <i class="fas fa-eye"></i> View PDF
                            </a>
                            <button class="btn btn-outline btn-sm view-answers" data-paper="${paperId}">
                                <i class="fas fa-check-circle"></i> View Answers
                            </button>
                        </div>
                    </div>
                `;
            });
            papersList.innerHTML = html || '<p>No papers found.</p>';
            
            // Add event listeners to view answers buttons
            document.querySelectorAll('.view-answers').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('filterPaper').value = btn.getAttribute('data-paper');
                    document.querySelector('.sidebar li[data-tab="view-answers"]').click();
                    applyFilters();
                });
            });
        } else {
            papersList.innerHTML = '<p>No papers found.</p>';
        }
    });
}

function loadAnswersTable() {
    const answersTable = document.getElementById('answersTableBody');
    answersTable.innerHTML = '<tr><td colspan="8">Loading answers...</td></tr>';
    
    // Load filter options
    loadFilterOptions();
    
    // Apply filters when button clicked
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    
    // Load all answers initially
    loadAllAnswers();
}

async function loadAllAnswers() {
    try {
        const snapshot = await database.ref('answers').once('value');
        const answers = snapshot.val();
        
        if (answers) {
            // Convert to array and add paper details
            const paperSnapshot = await database.ref('papers').once('value');
            const papers = paperSnapshot.val();
            
            let allAnswers = [];
            Object.keys(answers).forEach(answerId => {
                const answer = answers[answerId];
                const paper = papers[answer.paperId] || {};
                
                // Calculate score and marks
                const { score, marks } = calculateResults(answer.answers, answer.paperId);
                
                allAnswers.push({
                    id: answerId,
                    ...answer,
                    paperName: `${paper.year} - Paper ${paper.paperNumber}`,
                    paperYear: paper.year,
                    score: score,
                    marks: marks,
                    rank: 0
                });
            });
            
            // Calculate ranks
            calculateRanks(allAnswers);
            window.allAnswers = allAnswers; // Store for filtering
            applyFilters();
        } else {
            document.getElementById('answersTableBody').innerHTML = 
                '<tr><td colspan="8">No answers found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading answers:', error);
    }
}

function applyFilters() {
    const year = document.getElementById('filterYear').value;
    const paper = document.getElementById('filterPaper').value;
    
    const filtered = window.allAnswers.filter(answer => {
        return (!year || answer.paperYear === year) &&
               (!paper || answer.paperId === paper);
    });
    
    displayAnswers(filtered);
}

function displayAnswers(answers) {
    const tableBody = document.getElementById('answersTableBody');
    
    if (!answers || answers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No answers found</td></tr>';
        return;
    }
    
    // Sort by marks descending
    answers.sort((a, b) => b.marks - a.marks);
    
    let html = '';
    answers.forEach((answer, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${answer.name}</td>
                <td>${answer.school || '-'}</td>
                <td>${answer.paperYear || '-'}</td>
                <td>${answer.paperName || '-'}</td>
                <td>${answer.score}%</td>
                <td>${answer.marks}</td>
                <td>
                    <button class="btn btn-sm btn-outline view-details" data-id="${answer.id}">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', () => viewAnswerDetails(btn.getAttribute('data-id')));
    });
}

async function loadFilterOptions() {
    // Load years
    const yearSelect = document.getElementById('filterYear');
    const paperSelect = document.getElementById('filterPaper');
    
    try {
        const papersSnapshot = await database.ref('papers').once('value');
        const papers = papersSnapshot.val();
        
        if (papers) {
            const years = new Set();
            
            Object.keys(papers).forEach(paperId => {
                const paper = papers[paperId];
                years.add(paper.year);
                
                // Add to paper filter
                const option = document.createElement('option');
                option.value = paperId;
                option.textContent = `${paper.year} - Paper ${paper.paperNumber}`;
                paperSelect.appendChild(option);
            });
            
            // Add years to filter
            Array.from(years).sort().forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Helper functions
function calculateResults(studentAnswers, paperId) {
    // This should be implemented to compare with answer key
    // Simplified version for demo:
    let total = 0;
    let count = 0;
    
    for (const [q, ans] of Object.entries(studentAnswers)) {
        total += parseFloat(ans) || 0;
        count++;
    }
    
    const marks = total.toFixed(1);
    const score = count > 0 ? ((total / (count * 5)) * 100).toFixed(2) : 0;
    
    return { score, marks };
}

function calculateRanks(answers) {
    answers.sort((a, b) => b.marks - a.marks);
    answers.forEach((answer, index) => {
        answer.rank = index + 1;
    });
}

function viewAnswerDetails(answerId) {
    const answer = window.allAnswers.find(a => a.id === answerId);
    if (!answer) return;
    
    alert(`Detailed view for: ${answer.name}\n\n` +
          `School: ${answer.school || 'N/A'}\n` +
          `Paper: ${answer.paperName || 'N/A'}\n` +
          `Score: ${answer.score}%\n` +
          `Marks: ${answer.marks}\n` +
          `Rank: ${answer.rank}\n\n` +
          `Answers:\n${JSON.stringify(answer.answers, null, 2)}`);
}