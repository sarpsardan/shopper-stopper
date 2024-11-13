// customBlockedSites.js
let customBlockedSites = [];

// Initialize sites from storage
export async function initializeSites() {
    try {
        const data = await chrome.storage.sync.get('customSites');
        customBlockedSites = data.customSites || [];
        return customBlockedSites;
    } catch (error) {
        console.error('Error initializing sites:', error);
        return [];
    }
}

export async function addSite(domain) {
    try {
        if (!customBlockedSites.includes(domain)) {
            customBlockedSites.push(domain);
            await chrome.storage.sync.set({ customSites: customBlockedSites });
        }
        return customBlockedSites;
    } catch (error) {
        console.error('Error adding site:', error);
        return customBlockedSites;
    }
}

export async function removeSite(domain) {
    try {
        customBlockedSites = customBlockedSites.filter(site => site !== domain);
        await chrome.storage.sync.set({ customSites: customBlockedSites });
        return customBlockedSites;
    } catch (error) {
        console.error('Error removing site:', error);
        return customBlockedSites;
    }
}

export function getAllSites() {
    return customBlockedSites;
}

export async function clearSites() {
    try {
        customBlockedSites = [];
        await chrome.storage.sync.set({ customSites: [] });
        return customBlockedSites;
    } catch (error) {
        console.error('Error clearing sites:', error);
        return customBlockedSites;
    }
}

// Initialize sites when the module is loaded
initializeSites();