function generateSelectionFill() {
  if (!currentSelection) {
    alert('Please make a selection first');
    return;
  }
  
  const prefixSelect = document.getElementById('prefixPrompt');
  const promptInput = document.getElementById('selectionPromptInput');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;
  
  if (!promptInput.value.trim()) {
    alert('Please enter a prompt for the selected region');
    return;
  }

  // Show loading state
  const loadingSpinner = document.getElementById('loadingSpinner');
  loadingSpinner.style.display = 'block';

  // Create new image element for generation
  const generatedImage = document.createElement('img');
  const tempId = `fillImage_${Date.now()}`;
  generatedImage.id = tempId;
  generatedImage.crossOrigin = 'anonymous';
  generatedImage.style.display = 'none';
  
  // Set both src and alt to the full prompt
  generatedImage.src = fullPrompt;
  generatedImage.alt = fullPrompt;
  
  // Track initial src to detect when generation is complete
  const initialSrc = generatedImage.src;

  // When image loads and src has changed (meaning generation is complete)
  generatedImage.onload = function() {
    if (generatedImage.src !== initialSrc) {
      loadingSpinner.style.display = 'none';
      
      const canvas = document.getElementById('editCanvas');
      const ctx = canvas.getContext('2d');

      // Find selection bounds
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const pos = y * canvas.width + x;
          if (currentSelection[pos]) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // Create temporary canvas for scaling generated image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const selectionWidth = maxX - minX + 1;
      const selectionHeight = maxY - minY + 1;
      
      tempCanvas.width = selectionWidth;
      tempCanvas.height = selectionHeight;
      
      // Draw and scale generated image to selection size
      tempCtx.drawImage(generatedImage, 0, 0, selectionWidth, selectionHeight);
      
      // Get scaled image data
      const scaledImageData = tempCtx.getImageData(0, 0, selectionWidth, selectionHeight);
      
      // Get current canvas image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Apply generated image to selection area
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const pos = y * canvas.width + x;
          if (currentSelection[pos]) {
            const scaledX = x - minX;
            const scaledY = y - minY;
            const scaledPos = (scaledY * selectionWidth + scaledX) * 4;
            const targetPos = pos * 4;
            
            pixels[targetPos] = scaledImageData.data[scaledPos];
            pixels[targetPos + 1] = scaledImageData.data[scaledPos + 1];
            pixels[targetPos + 2] = scaledImageData.data[scaledPos + 2];
            pixels[targetPos + 3] = scaledImageData.data[scaledPos + 3];
          }
        }
      }

      // Update canvas with new image data
      ctx.putImageData(imageData, 0, 0);
      originalImageData = imageData;

      // Cleanup
      document.getElementById('fillImagePrompt').style.display = 'none';
      generatedImage.remove();
    }
  };

  // Add image to document (hidden) to begin generation
  document.body.appendChild(generatedImage);
}