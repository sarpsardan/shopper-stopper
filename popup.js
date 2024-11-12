document.addEventListener('DOMContentLoaded', function() {
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

  // New code: Add Current Site button functionality
  document.getElementById('addCurrentSite').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        
        // Get existing custom sites
        chrome.storage.sync.get('customSites', function(data) {
          const customSites = data.customSites || [];
          
          // Add new site if it's not already in the list
          if (!customSites.includes(domain)) {
            customSites.push(domain);
            chrome.storage.sync.set({ customSites }, function() {
              // Show success message
              const message = document.getElementById('siteAddedMessage');
              message.style.display = 'block';
              message.textContent = `Added: ${domain}`;
              setTimeout(() => {
                message.style.display = 'none';
              }, 2000);

              // Update blocking rules
              chrome.runtime.sendMessage({ 
                type: 'updateCustomSites', 
                sites: customSites 
              });
            });
          } else {
            // Show already added message
            const message = document.getElementById('siteAddedMessage');
            message.style.display = 'block';
            message.textContent = 'This site is already blocked';
            setTimeout(() => {
              message.style.display = 'none';
            }, 2000);
          }
        });
      }
    });
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
});