// Import custom sites handlers
import { getAllSites, initializeSites } from './customBlockedSites.js';

function isWithinWorkHours() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('workSchedule', function(data) {
      if (!data.workSchedule) {
        resolve(false);
        return;
      }

      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = days[now.getDay()];
      const schedule = data.workSchedule[today];

      if (!schedule || !schedule.enabled) {
        resolve(false);
        return;
      }

      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMinute] = schedule.start.split(':').map(Number);
      const [endHour, endMinute] = schedule.end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      resolve(currentTime >= startTime && currentTime <= endTime);
    });
  });
}

async function updateRules() {
  try {
    const shouldBlock = await isWithinWorkHours();
    
    // Initialize and get custom sites
    await initializeSites();
    const customSites = getAllSites();

    // Get existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);

    // Remove existing dynamic rules
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }

    if (shouldBlock) {
      // Always enable default rules from rules.json during work hours
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ["ruleset_1"]
      });

      // Add custom sites as dynamic rules if any exist
      if (customSites.length > 0) {
        const customRules = customSites.map((site, index) => {
          const urlFilter = site.includes('www.') ? 
            `*://${site}/*` : 
            `*://*.${site}/*`;
        
          return [
            {
              id: index + 1000, // Start from 1000 to avoid conflicts with default rules
              priority: 1,
              action: {
                type: "redirect",
                redirect: { extensionPath: "/block.html" }
              },
              condition: {
                urlFilter: `*://${site}/*`,
                resourceTypes: ["main_frame"]
              }
            },
            {
              id: index + 2000, // Additional rule for non-www variant
              priority: 1,
              action: {
                type: "redirect",
                redirect: { extensionPath: "/block.html" }
              },
              condition: {
                urlFilter: `*://${site.replace('www.', '')}/*`,
                resourceTypes: ["main_frame"]
              }
            }
          ];
        }).flat();

        // Add the custom rules
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds,
          addRules: customRules
        });
      }
    } else {
      // Outside work hours - disable everything
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ["ruleset_1"]
      });
      
      // Remove any custom rules
      if (existingRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingRuleIds
        });
      }
    }
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

// Initialize when extension loads
chrome.runtime.onInstalled.addListener(async () => {
  await initializeSites();
  await updateRules();
});

// Check time every minute
chrome.alarms.create('checkTime', { periodInMinutes: 1 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTime') {
    updateRules();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'scheduleUpdated' || message.type === 'customSitesUpdated') {
    updateRules();
  }
});

// Update rules when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    updateRules();
  }
});
