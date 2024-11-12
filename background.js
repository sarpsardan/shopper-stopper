let currentRules = {};

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

// New function to handle custom sites
async function updateCustomSiteRules() {
  const response = await chrome.storage.sync.get('customSites');
  const customSites = response.customSites || [];
  
  if (customSites.length > 0) {
    const customRules = customSites.map((site, index) => ({
      id: 10000 + index, // Using high IDs to avoid conflicts with existing rules
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          extensionPath: "/block.html"
        }
      },
      condition: {
        urlFilter: `*://*.${site}/*`,
        resourceTypes: ["main_frame"]
      }
    }));

    // Add these rules to your existing rules
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: customRules.map(rule => rule.id), // Remove old rules
        addRules: customRules // Add new rules
      });
    } catch (error) {
      console.error('Error updating rules:', error);
    }
  }
}

async function updateRules() {
  const shouldBlock = await isWithinWorkHours();
  
  if (shouldBlock) {
    // Enable blocking rules
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["ruleset_1"]
    });
    // Update custom site rules
    await updateCustomSiteRules();
  } else {
    // Disable blocking rules
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ["ruleset_1"]
    });
    // Remove custom site rules
    const response = await chrome.storage.sync.get('customSites');
    const customSites = response.customSites || [];
    if (customSites.length > 0) {
      const ruleIds = customSites.map((_, index) => 10000 + index);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }
  }
}

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
  if (message.type === 'scheduleUpdated') {
    updateRules();
  }
  if (message.type === 'updateCustomSites') {
    updateCustomSiteRules();
  }
});

// Initial check when extension loads
updateRules();