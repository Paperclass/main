// Admin Paper Management System
let currentPage = 1;
const resultsPerPage = 10;
let allAnswers = [];
let filteredAnswers = [];

document.addEventListener('DOMContentLoaded', () => {
    checkTheme();
    setupTabNavigation();
    initCreatePaperForm();
    initAnswerViewer();
    setupPagination();
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
            class: document.getElementById('paperClass').value,
            subject: document.getElementById('paperSubject').value,
            paperNumber: document.getElementById('paperNumber').value,
            questions: parseInt(document.getElementById('questionCount').value),
            answerKey: answerKey,
            createdAt: new Date().toISOString(),
            createdBy: 'admin' // Replace with actual admin ID
        };

        // Generate paper ID
        const paperId = `${paperData.year}_${paperData.class.replace(/\s+/g, '')}_${paperData.subject}_${paperData.paperNumber}`;
        
        // Handle file upload (in a real app, you would upload to Firebase Storage)
        const pdfFile = document.getElementById('paperPdf').files[0];
        if (pdfFile) {
            // In a real implementation, upload to Firebase Storage and get URL
            paperData.pdfUrl = `papers/${paperId}.pdf`;
        }

        try {
            // Save paper to Firebase
            await database.ref(`papers/${paperId}`).set(paperData);
            
            // Save answer key separately for easy access
            await database.ref(`answerKeys/${paperId}`).set(answerKey);
            
            alert('Paper created successfully!');
            form.reset();
        } catch (error) {
            console.error('Error creating paper:', error);
            alert('Error creating paper. Please try again.');
        }
    });
}

function initAnswerViewer() {
    loadFilterOptions();
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('exportResults').addEventListener('click', exportResults);
    loadAllAnswers();
}

async function loadAllAnswers() {
    try {
        // Load all answers with student details
        const snapshot = await database.ref('answers').once('value');
        const answers = snapshot.val();
        
        allAnswers = [];
        if (answers) {
            // Convert to array and add paper details
            const paperSnapshot = await database.ref('papers').once('value');
            const papers = paperSnapshot.val();
            
            Object.keys(answers).forEach(answerId => {
                const answer = answers[answerId];
                const paper = papers[answer.paperId] || {};
                
                // Calculate score and marks
                const { score, marks } = calculateResults(answer.answers, answer.paperId);
                
                allAnswers.push({
                    id: answerId,
                    ...answer,
                    paperName: `${paper.subject} - ${paper.year}`,
                    score: score,
                    marks: marks,
                    rank: 0 // Will be calculated after sorting
                });
            });
            
            // Calculate ranks
            calculateRanks(allAnswers);
            filteredAnswers = [...allAnswers];
            displayResults();
            updateSummary();
        } else {
            document.getElementById('answersTableBody').innerHTML = 
                '<tr><td colspan="9">No answers found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading answers:', error);
        alert('Error loading answers. Please try again.');
    }
}

async function calculateResults(studentAnswers, paperId) {
    try {
        // Get answer key
        const snapshot = await database.ref(`answerKeys/${paperId}`).once('value');
        const answerKey = snapshot.val() || {};
        
        let correctCount = 0;
        let totalMarks = 0;
        
        // Compare student answers with answer key
        Object.keys(studentAnswers).forEach(question => {
            if (answerKey[question] && 
                studentAnswers[question] === answerKey[question]) {
                correctCount++;
            }
            totalMarks += parseFloat(studentAnswers[question]) || 0;
        });
        
        const totalQuestions = Object.keys(answerKey).length;
        const score = totalQuestions > 0 ? 
            ((correctCount / totalQuestions) * 100).toFixed(2) : 0;
            
        return { score, marks: totalMarks.toFixed(1) };
    } catch (error) {
        console.error('Error calculating results:', error);
        return { score: 0, marks: 0 };
    }
}

function calculateRanks(answers) {
    // Sort by marks descending
    answers.sort((a, b) => b.marks - a.marks);
    
    // Assign ranks
    let currentRank = 1;
    answers.forEach((answer, index) => {
        if (index > 0 && answer.marks < answers[index - 1].marks) {
            currentRank = index + 1;
        }
        answer.rank = currentRank;
    });
}

function applyFilters() {
    const year = document.getElementById('filterYear').value;
    const paperClass = document.getElementById('filterClass').value;
    const paper = document.getElementById('filterPaper').value;
    
    filteredAnswers = allAnswers.filter(answer => {
        return (!year || answer.year === year) &&
               (!paperClass || answer.class === paperClass) &&
               (!paper || answer.paperId === paper);
    });
    
    currentPage = 1;
    displayResults();
    updateSummary();
}

function displayResults() {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const paginatedAnswers = filteredAnswers.slice(startIndex, endIndex);
    
    const tableBody = document.getElementById('answersTableBody');
    
    if (paginatedAnswers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9">No results found</td></tr>';
        return;
    }
    
    let html = '';
    paginatedAnswers.forEach(answer => {
        html += `
            <tr>
                <td>${answer.rank}</td>
                <td>${answer.name}</td>
                <td>${answer.school || '-'}</td>
                <td>${answer.class || '-'}</td>
                <td>${answer.district || '-'}</td>
                <td>${answer.paperName || '-'}</td>
                <td>${answer.score}%</td>
                <td>${answer.marks}</td>
                <td>
                    <button class="btn btn-sm btn-outline view-details" data-id="${answer.id}">
                        <i class="fas fa-eye"></i>
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
    
    // Update pagination controls
    updatePaginationControls();
}

function updateSummary() {
    document.getElementById('totalStudents').textContent = filteredAnswers.length;
    
    if (filteredAnswers.length > 0) {
        const totalScore = filteredAnswers.reduce((sum, answer) => 
            sum + parseFloat(answer.score), 0);
        const averageScore = (totalScore / filteredAnswers.length).toFixed(2);
        
        const highestScore = Math.max(...filteredAnswers.map(answer => parseFloat(answer.score)));
        
        document.getElementById('averageScore').textContent = averageScore + '%';
        document.getElementById('highestScore').textContent = highestScore + '%';
    } else {
        document.getElementById('averageScore').textContent = '0%';
        document.getElementById('highestScore').textContent = '0%';
    }
}

function setupPagination() {
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayResults();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredAnswers.length / resultsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayResults();
        }
    });
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredAnswers.length / resultsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

async function loadFilterOptions() {
    try {
        // Load years
        const years = [...new Set(allAnswers.map(answer => answer.year))].sort();
        const yearSelect = document.getElementById('filterYear');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        
        // Load classes
        const classes = [...new Set(allAnswers.map(answer => answer.class))].sort();
        const classSelect = document.getElementById('filterClass');
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            classSelect.appendChild(option);
        });
        
        // Load papers
        const paperSnapshot = await database.ref('papers').once('value');
        const papers = paperSnapshot.val();
        const paperSelect = document.getElementById('filterPaper');
        
        if (papers) {
            Object.keys(papers).forEach(paperId => {
                const paper = papers[paperId];
                const option = document.createElement('option');
                option.value = paperId;
                option.textContent = `${paper.year} - ${paper.class} - ${paper.subject}`;
                paperSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

function viewAnswerDetails(answerId) {
    const answer = allAnswers.find(a => a.id === answerId);
    if (!answer) return;
    
    // In a real app, this would show a modal with detailed view
    const details = `
        Student: ${answer.name}
        School: ${answer.school}
        Class: ${answer.class}
        District: ${answer.district}
        Paper: ${answer.paperName}
        Score: ${answer.score}%
        Marks: ${answer.marks}
        Rank: ${answer.rank}
        
        Answers:
        ${JSON.stringify(answer.answers, null, 2)}
    `;
    
    alert(details);
}

function exportResults() {
    // In a real app, implement CSV export
    alert('Export functionality would generate a CSV file with all filtered results');
}