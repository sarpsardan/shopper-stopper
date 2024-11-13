// Import custom sites handlers
import { addSite, removeSite, getAllSites, initializeSites } from './customBlockedSites.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize custom sites
    await initializeSites();
    
    // Load saved settings when popup opens
    chrome.storage.sync.get('workSchedule', function(data) {
        if (data.workSchedule) {
            Object.keys(data.workSchedule).forEach(day => {
                const schedule = data.workSchedule[day];
                document.getElementById(day).checked = schedule.enabled;
                document.getElementById(`${day}-start`).value = schedule.start;
                document.getElementById(`${day}-end`).value = schedule.end;
            });
        }
    });

    // Display initial custom sites
    displayCustomSites();
});

// Load and display custom sites
async function displayCustomSites() {
    const customSites = getAllSites();
    const sitesList = document.getElementById('customSitesList');
    sitesList.innerHTML = ''; // Clear current list
    
    if (customSites.length === 0) {
        sitesList.innerHTML = '<li style="text-align: center;">No custom sites blocked yet</li>';
    } else {
        customSites.forEach(site => {
            const li = document.createElement('li');
            li.textContent = site;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.style.fontSize = '14px';
            removeButton.style.fontWeight = 'bold';
            removeButton.className = 'remove-site';
            removeButton.onclick = () => handleRemoveSite(site);
            li.appendChild(removeButton);
            sitesList.appendChild(li);
        });
    }
}

// Remove site handler
async function handleRemoveSite(site) {
    await removeSite(site);
    displayCustomSites();
    chrome.runtime.sendMessage({ 
        type: 'customSitesUpdated',
        sites: getAllSites()
    });
}

// Helper function to show messages with different styles
function showMessage(text, type = 'success') {
    const message = document.getElementById('siteAddedMessage');
    message.textContent = text;
    message.style.display = 'block';
    
    // Clear any existing classes
    message.className = '';
    
    // Add appropriate styling class
    switch(type) {
        case 'error':
            message.classList.add('error-message');
            break;
        case 'warning':
            message.classList.add('warning-message');
            break;
        case 'success':
            message.classList.add('success-message');
            break;
    }

    // Hide message after delay
    setTimeout(() => {
        message.style.display = 'none';
    }, 2000);
}

// Add Current Site button functionality
document.getElementById('addCurrentSite').addEventListener('click', async function() {
    try {
        // Get the current tab
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tabs[0]?.url) {
            throw new Error('No valid tab URL found');
        }

        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        
        // Check if it's a valid domain to block
        if (!domain || domain === '') {
            throw new Error('Invalid domain');
        }

        // Skip if trying to block chrome:// or chrome-extension:// URLs
        if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
            showMessage('Cannot block Chrome system pages', 'error');
            return;
        }

        // Get current sites and check if already blocked
        const currentSites = getAllSites();
        if (currentSites.includes(domain)) {
            showMessage('This site is already blocked', 'warning');
            return;
        }

        // Add the new site
        await addSite(domain);
        showMessage(`Added: ${domain}`, 'success');
        displayCustomSites();
        
        // Notify background script
        chrome.runtime.sendMessage({ 
            type: 'customSitesUpdated',
            sites: getAllSites()
        });

    } catch (error) {
        console.error('Error adding site:', error);
        showMessage('Failed to add site. Please try again.', 'error');
    }
});

// Save settings when button is clicked
document.getElementById('save').addEventListener('click', function() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const workSchedule = {};

    days.forEach(day => {
        workSchedule[day] = {
            enabled: document.getElementById(day).checked,
            start: document.getElementById(`${day}-start`).value,
            end: document.getElementById(`${day}-end`).value
        };
    });

    chrome.storage.sync.set({ workSchedule }, function() {
        // Update the background script
        chrome.runtime.sendMessage({ type: 'scheduleUpdated' });
        
        // Show save confirmation
        const button = document.getElementById('save');
        button.textContent = 'Saved!';
        setTimeout(() => {
            button.textContent = 'Save Settings';
        }, 2000);
    });
});