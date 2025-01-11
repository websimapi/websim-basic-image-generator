function generateSelectionFill() {
  if (!currentSelection) return;
  const canvas = document.getElementById('editCanvas');
  const prompt = document.getElementById('selectionPromptInput').value;
  const loadingSpinner = document.getElementById('loadingSpinner');
  
  if (!prompt.trim()) {
    alert('Please enter a prompt for the selected region');
    return;
  }

  // Show loading state
  loadingSpinner.style.display = 'block';

  // Calculate selection bounds
  let minX = canvas.width,
    minY = canvas.height,
    maxX = 0,
    maxY = 0;

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

  const selectionWidth = maxX - minX + 1;
  const selectionHeight = maxY - minY + 1;

  // Create a new image element for generation
  const fillImage = document.createElement('img');
  fillImage.id = `fillImage_${imageCounter++}`;
  fillImage.crossOrigin = 'anonymous';
  fillImage.style.display = 'none';
  fillImage.src = prompt;
  fillImage.alt = prompt;

  fillImage.onload = function() {
    loadingSpinner.style.display = 'none';

    // Create temporary canvas for scaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = selectionWidth;
    tempCanvas.height = selectionHeight;

    // Draw and scale the generated image
    tempCtx.drawImage(fillImage, 0, 0, selectionWidth, selectionHeight);

    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const scaledImageData = tempCtx.getImageData(0, 0, selectionWidth, selectionHeight);

      // Copy pixels only in selected region
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

      ctx.putImageData(imageData, 0, 0);
      originalImageData = imageData;
      
      // Update the fill image prompt UI
      document.getElementById('fillImagePrompt').style.display = 'none';
      document.getElementById('selectionPromptInput').value = '';
      
      // Cleanup
      fillImage.remove();
      tempCanvas.remove();

    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process the generated image. Please try again.');
      loadingSpinner.style.display = 'none';
    }
  };

  fillImage.onerror = function() {
    console.error('Failed to load generated image');
    loadingSpinner.style.display = 'none';
    alert('Failed to generate the image. Please try again.');
  };

  // Add the image to the document temporarily
  document.body.appendChild(fillImage);
}