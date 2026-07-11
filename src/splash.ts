import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function runSplashFlow() {
  const statusText = document.getElementById('status-text');
  
  if (statusText) {
    statusText.innerText = 'Checking for updates...';
  }

  let update: Awaited<ReturnType<typeof check>> | null = null;

  try {
    update = await Promise.race([
      check(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Updater check timed out')), 5000)
      )
    ]);
  } catch (err) {
    console.error('Failed to check for updates:', err);
    // Continue even if update fails
  }

    if (update && update.available !== false) {
      console.log(`Update available: ${update.version}`);
      if (statusText) {
        statusText.innerText = `Update v${update.version} is available`;
      }
      
      const spinner = document.getElementById('spinner');
      const updateActions = document.getElementById('update-actions');
      const btnSkip = document.getElementById('btn-skip');
      const btnDownload = document.getElementById('btn-download');

      if (spinner && updateActions && btnSkip && btnDownload) {
        spinner.style.display = 'none';
        updateActions.style.display = 'flex';

        // Disable dragging on the buttons
        btnSkip.classList.remove('drag-region');
        btnDownload.classList.remove('drag-region');

        const userChoice = await new Promise<'download' | 'skip'>((resolve) => {
          btnSkip.onclick = () => resolve('skip');
          btnDownload.onclick = () => resolve('download');
        });

        updateActions.style.display = 'none';
        
        if (userChoice === 'download') {
          spinner.style.display = 'block';
          if (statusText) {
            statusText.innerText = `Downloading update v${update.version}...`;
          }
          let downloaded = 0;
          let contentLength = 0;
          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength || 0;
                console.log(`Started downloading ${event.data.contentLength} bytes`);
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                if (statusText && contentLength > 0) {
                  const percent = Math.round((downloaded / contentLength) * 100);
                  statusText.innerText = `Downloading update: ${percent}%`;
                }
                break;
              case 'Finished':
                console.log('Download finished');
                break;
            }
          });

          console.log('Update installed, restarting...');
          if (statusText) {
            statusText.innerText = 'Restarting...';
          }
          await relaunch();
          return; // App will restart, no need to continue
        } else {
          // Skip was clicked, continue to normal flow
          spinner.style.display = 'block';
        }
      }
    }

  if (statusText) {
    statusText.innerText = 'Syncing Roblox plugin...';
  }

  try {
    // Artificial delay to let the UI paint the new text
    await new Promise(r => setTimeout(r, 600));
    await invoke('sync_roblox_plugin');
  } catch (err) {
    console.error('Failed to sync Roblox plugin:', err);
  }

  if (statusText) {
    statusText.innerText = 'Starting...';
  }

  // Small delay to ensure smooth transition
  setTimeout(async () => {
    try {
      await invoke('close_splashscreen');
    } catch (err) {
      console.error('Failed to close splashscreen:', err);
    }
  }, 800);
}

window.addEventListener('DOMContentLoaded', () => {
  // Wait to ensure the WebView2 has fully painted the first frame on Windows
  setTimeout(() => {
    runSplashFlow();
  }, 1000);
});
