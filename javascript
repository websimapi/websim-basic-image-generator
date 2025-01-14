async function generateSelectionFill() {
  if (!currentSelection) return;
  
  const canvas = document.getElementById('editCanvas');
  const promptInput = document.getElementById('selectionPromptInput');
  const prompt = promptInput.value;
  
  if (!prompt.trim()) {
    alert('Please enter a prompt for the selected region');
    return;
  }

  const prefixSelect = document.getElementById('prefixPrompt');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${prompt}${suffixSelect.value}`;

  const loadingSpinner = document.getElementById('loadingSpinner');
  loadingSpinner.style.display = 'block';

  const generatedImage = document.createElement('img');
  const tempId = `fillImage_${Date.now()}`;
  generatedImage.id = tempId;  
  generatedImage.crossOrigin = 'anonymous';
  generatedImage.style.display = 'none';
  
  generatedImage.src = fullPrompt;
  generatedImage.alt = fullPrompt;

  // Track the initial src
  const initialSrc = generatedImage.src;

  generatedImage.onload = async function() {
    // Check if src has changed (meaning generation is complete)
    if (generatedImage.src !== initialSrc) {
      loadingSpinner.style.display = 'none';
      
      // Calculate selection bounds
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

      const selectionWidth = maxX - minX + 1;
      const selectionHeight = maxY - minY + 1;

      // Initialize selection canvas if needed
      if (!selectionCanvas) {
        selectionCanvas = document.createElement('canvas');
        selectionCtx = selectionCanvas.getContext('2d');
      }

      // Apply the generated image to the selection
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      selectionCanvas.width = selectionWidth;
      selectionCanvas.height = selectionHeight;
      selectionCtx.drawImage(generatedImage, 0, 0, selectionWidth, selectionHeight);
      
      const scaledImageData = selectionCtx.getImageData(0, 0, selectionWidth, selectionHeight);

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

      // Update gallery with modified image
      const sourceImage = galleryImages.find(img => 
        img.imageUrl === currentImage.src
      );
      
      if (sourceImage) {
        const basePromptHistory = sourceImage.promptHistory || [{
          prompt: sourceImage.prompt,
          timestamp: sourceImage.created_at,
          username: sourceImage.username
        }];
        
        const promptHistory = [...basePromptHistory];
        
        promptHistory.push({
          prompt: `Selection fill with prompt: "${fullPrompt}"`,
          timestamp: new Date().toISOString(),
          type: 'selection-fill',
          username: room.party.client.username
        });
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'edited-image.png', { type: 'image/png' });
        const imageUrl = await websim.upload(file);
        
        await room.collection('gallery_images').create({
          prompt: sourceImage.prompt,
          title: sourceImage.title || sourceImage.prompt,
          imageUrl: imageUrl,
          views: 0,
          uses: 0,
          modified: true,
          promptHistory: promptHistory,
          sourceImageId: sourceImage.id
        });

        await room.collection('gallery_images').update(sourceImage.id, {
          uses: (sourceImage.uses || 0) + 1
        });

        currentImage.src = imageUrl;
      }
      
      // Hide prompt input
      document.getElementById('fillImagePrompt').style.display = 'none';
    }
  };

  // Add image to document
  document.body.appendChild(generatedImage);
}