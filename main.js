// Register service worker and handle installation
// Wrap service worker registration in protocol check
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('ServiceWorker registered:', registration);
      
      // Periodic background sync
      if ('periodicSync' in registration) {
        try {
          registration.periodicSync.register('content-update', {
            minInterval: 24 * 60 * 60 * 1000 // Daily sync
          });
        } catch (error) {
          console.log('Periodic Sync could not be registered:', error);
        }
      }
    })
    .catch(error => {
      console.log('ServiceWorker registration failed:', error);
    });
}

// Background sync for offline operations
function registerBackgroundSync(tag) {
  if ('SyncManager' in window && window.location.protocol !== 'file:') {
    navigator.serviceWorker.ready
      .then(registration => {
        return registration.sync.register(tag);
      })
      .then(() => {
        console.log(`Background sync registered: ${tag}`);
      })
      .catch(err => {
        console.error(`Background sync registration failed: ${err}`);
      });
  }
}

// Handle push notifications
function initializePushNotifications() {
  // Disable for file protocol
  if ('PushManager' in window && window.location.protocol !== 'file:') {
    Notification.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          console.log('Push notifications permission granted');
          subscribeUserToPush();
        }
      });
  }
}

// Subscribe user to push notifications
function subscribeUserToPush() {
  navigator.serviceWorker.ready
    .then(registration => {
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
      };

      return registration.pushManager.subscribe(subscribeOptions);
    })
    .then(pushSubscription => {
      console.log('Push subscription:', JSON.stringify(pushSubscription));
      saveSubscription(pushSubscription);
    })
    .catch(err => {
      console.error('Push subscription failed:', err);
    });
}

// Utility function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Save subscription to server (mock implementation)
function saveSubscription(subscription) {
  // In a real app, you'd send this to your backend
  localStorage.setItem('pushSubscription', JSON.stringify(subscription));
  console.log('Subscription saved locally');
}

// Handle notifications when app is in background
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data && event.data.type === 'NOTIFICATION') {
    new Notification(event.data.title, {
      body: event.data.body,
      icon: '/icon-192x192.png'
    });
  }
});

let deferredPrompt;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show install button
  const installBtn = document.getElementById('editor-text-install-btn');
  if (installBtn) {
    installBtn.style.display = 'block';
  }
});

// Handle install button click
document.getElementById('editor-text-install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  
  // Optionally, send analytics event with outcome of user choice
  console.log(`User response to the install prompt: ${outcome}`);
  
  // Hide the install button
  document.getElementById('editor-text-install-btn').style.display = 'none';
  
  // We've used the prompt, and can't use it again, throw it away
  deferredPrompt = null;
});

// Hide install button when app is already installed
window.addEventListener('appinstalled', () => {
  document.getElementById('editor-text-install-btn').style.display = 'none';
  console.log('PWA was installed');
});

// Initially hide install button
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('editor-text-install-btn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
});
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializePushNotifications();
  
  // Register background sync for offline saves
  document.querySelectorAll('.editor-text-button-action').forEach(button => {
    button.addEventListener('click', () => {
      registerBackgroundSync('save-operation');
    });
  });
});

// Offline status detection
window.addEventListener('online', () => {
  document.body.classList.remove('editor-text-offline');
  console.log('Online - syncing operations');
  // Trigger pending sync operations
  registerBackgroundSync('pending-operations');
});

window.addEventListener('offline', () => {
  document.body.classList.add('editor-text-offline');
  console.log('Offline - queuing operations');
});