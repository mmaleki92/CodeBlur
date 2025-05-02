// @ts-check

(function () {
  // Get vscode API
  const vscode = acquireVsCodeApi();

  // Initialize UI
  const applyBlurButton = document.getElementById('apply-blur');
  const removeBlurButton = document.getElementById('remove-blur');
  const increaseBlurButton = document.getElementById('increase-blur');
  const decreaseBlurButton = document.getElementById('decrease-blur');
  const clearAllBlurButton = document.getElementById('clear-all-blur');
  const blurStats = document.getElementById('blur-stats');

  // Add event listeners
  applyBlurButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'applyBlur' });
  });

  removeBlurButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'removeBlur' });
  });

  increaseBlurButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'increaseBlur' });
  });

  decreaseBlurButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'decreaseBlur' });
  });

  clearAllBlurButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'clearAllBlur' });
  });

  // Handle messages from the extension
  window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
      case 'blurDataUpdated':
        updateBlurStats(message.data);
        break;
    }
  });

  function updateBlurStats(blurData) {
    // Clear the stats element
    blurStats.innerHTML = '';

    // Check if there are any blur effects
    const totalFiles = Object.keys(blurData).length;
    if (totalFiles === 0) {
      blurStats.innerHTML = '<p>No blur effects applied</p>';
      return;
    }

    // Count total blurred regions and get average intensity
    let totalRegions = 0;
    let totalIntensity = 0;

    for (const filePath in blurData) {
      const regions = Object.keys(blurData[filePath]).length;
      totalRegions += regions;
      
      for (const region in blurData[filePath]) {
        totalIntensity += blurData[filePath][region].intensity;
      }
    }

    const avgIntensity = totalRegions > 0 ? (totalIntensity / totalRegions).toFixed(2) : 0;

    // Display stats
    const statsHtml = `
      <p><strong>Files with blur:</strong> ${totalFiles}</p>
      <p><strong>Blurred regions:</strong> ${totalRegions}</p>
      <p><strong>Avg. intensity:</strong> ${avgIntensity}</p>
    `;

    blurStats.innerHTML = statsHtml;
  }
})();