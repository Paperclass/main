// Disable right-click
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            alert('Right-click is disabled on this page.');
        });

        // Disable keyboard shortcuts for viewing source
        document.addEventListener('keydown', function(e) {
            // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') || 
                (e.ctrlKey && e.shiftKey && e.key === 'J') || 
                (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
                alert('Viewing source code is not allowed.');
            }
        });

        // Additional protection: Block iframe content from being opened separately
        if (window.location === window.parent.location) {
            // This is the top window, allow it
        } else {
            // This is inside an iframe, redirect to the main page
            window.top.location = window.location;
        }