let imageCounter = 0;
let currentImage = null;
let originalImageData = null;
let currentSelection = null;
let isShiftPressed = false;
let isCtrlPressed = false;
let selectionCanvas = null;
let selectionCtx = null;
let textPreview = null;
let currentTextPosition = null;

function setupImageEditor() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const editorControls = document.getElementById('editorControls');
  const fillImagePrompt = document.getElementById('fillImagePrompt');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');

  loadingSpinner.style.display = 'none';
  placeholderText.style.display = 'none';

  if (currentImage) {
    canvas.width = currentImage.naturalWidth;
    canvas.height = currentImage.naturalHeight;
    ctx.drawImage(currentImage, 0, 0);
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    currentImage.style.display = 'none';
    canvas.style.display = 'block';
    editorControls.style.display = 'flex';
  } else {
    canvas.style.display = 'none';
    editorControls.style.display = 'flex';
  }

  fillImagePrompt.style.display = 'none';
  
  if (!canvas.hasEventListener) {
    canvas.addEventListener('click', handleCanvasClick);
    canvas.hasEventListener = true;
  }
}

function handleCanvasClick(e) {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (!isShiftPressed && !isCtrlPressed) {
    currentSelection = null;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const newSelection = magicWandSelect(imageData, Math.round(x), Math.round(y), 32);

  if (isShiftPressed || isCtrlPressed) {
    if (currentSelection) {
      for (let i = 0; i < currentSelection.length; i++) {
        currentSelection[i] = currentSelection[i] || newSelection[i];
      }
    } else {
      currentSelection = newSelection;
    }
  } else {
    currentSelection = newSelection;
  }

  drawSelectionOverlay();
}

function magicWandSelect(imageData, startX, startY, tolerance) {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;
  const visited = new Uint8Array(width * height);
  const selected = new Uint8Array(width * height);
  
  const startPos = (startY * width + startX) * 4;
  const startR = pixels[startPos];
  const startG = pixels[startPos + 1];
  const startB = pixels[startPos + 2];
  
  const stack = [[startX, startY]];
  
  while (stack.length) {
    const [x, y] = stack.pop();
    const pos = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || visited[pos]) {
      continue;
    }
    
    const pixelPos = pos * 4;
    const r = pixels[pixelPos];
    const g = pixels[pixelPos + 1];
    const b = pixels[pixelPos + 2];
    
    const colorDiff = Math.sqrt(
      Math.pow(r - startR, 2) + 
      Math.pow(g - startG, 2) + 
      Math.pow(b - startB, 2)
    );
    
    if (colorDiff <= tolerance) {
      visited[pos] = 1;
      selected[pos] = 1;
      stack.push(
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      );
    }
  }
  
  return selected;
}

function drawSelectionOverlay() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  
  ctx.putImageData(originalImageData, 0, 0);
  
  if (!currentSelection) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (currentSelection[pos]) {
        const isEdge = 
          x > 0 && !currentSelection[pos - 1] || 
          x < width - 1 && !currentSelection[pos + 1] || 
          y > 0 && !currentSelection[pos - width] || 
          y < height - 1 && !currentSelection[pos + width];
          
        if (isEdge) {
          ctx.fillStyle = 'white';
          ctx.fillRect(x - 1, y - 1, 3, 3);
          ctx.strokeStyle = 'black';
          ctx.strokeRect(x - 1, y - 1, 3, 3);
        }
      }
    }
  }
}

function setTool(tool) {
  const canvas = document.getElementById('editCanvas');
  const fillImagePrompt = document.getElementById('fillImagePrompt');
  
  document.querySelectorAll('.tool-button').forEach(btn => 
    btn.classList.remove('active')
  );
  
  const toolButton = document.getElementById(`${tool}Tool`);
  if (toolButton) {
    toolButton.classList.add('active');
  }

  switch (tool) {
    case 'fillSelection':
      if (currentSelection) {
        fillImagePrompt.style.display = 'none';
        fillSelection();
      }
      break;
    case 'setAlpha':
      if (currentSelection) {
        fillImagePrompt.style.display = 'none';
        setSelectionAlpha();
      }
      break;
    case 'fillWithImage':
      if (currentSelection) {
        fillImagePrompt.style.display = 'flex';
      }
      break;
    default:
      fillImagePrompt.style.display = 'none';
  }
  
  canvas.className = tool === 'magicWand' ? 'magic-wand' : '';
}

function fillSelection() {
  if (!currentSelection) return;
  
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  const color = document.getElementById('colorPicker').value;
  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);
  
  for (let i = 0; i < currentSelection.length; i++) {
    if (currentSelection[i]) {
      const pixelPos = i * 4;
      pixels[pixelPos] = r;
      pixels[pixelPos + 1] = g;
      pixels[pixelPos + 2] = b;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  originalImageData = imageData;
}

function setSelectionAlpha() {
  if (!currentSelection) return;
  
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  for (let i = 0; i < currentSelection.length; i++) {
    if (currentSelection[i]) {
      const pixelPos = i * 4;
      pixels[pixelPos + 3] = 0;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  originalImageData = imageData;
}

function clearSelection() {
  currentSelection = null;
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(originalImageData, 0, 0);
}

function resetImage() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(originalImageData, 0, 0);
  currentSelection = null;
}

function handleTextTool(clientX, clientY, x, y) {
  const textControls = document.getElementById('textControls');
  const canvas = document.getElementById('editCanvas');
  const rect = canvas.getBoundingClientRect();
  
  // Remove existing preview
  if (textPreview) {
    textPreview.remove();
  }
  
  // Create new preview at click position
  textPreview = document.createElement('div');
  textPreview.className = 'text-preview';
  textPreview.style.position = 'fixed';
  textPreview.style.left = `${clientX}px`;
  textPreview.style.top = `${clientY}px`;

  // Calculate scale factor between canvas display size and actual size
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Store scale factors with position
  currentTextPosition = { 
    x: x,  
    y: y,
    scaleX,
    scaleY
  };

  document.body.appendChild(textPreview);
  
  // Position controls below preview
  const controlsHeight = 100;
  const controlsWidth = 250;
  
  let top = clientY + 30;
  let left = clientX;
  
  // Adjust vertical position if too close to bottom
  if (top + controlsHeight > window.innerHeight) {
    top = window.innerHeight - controlsHeight - 10;
  }
  
  // Adjust horizontal position if too close to right edge
  if (left + controlsWidth > window.innerWidth) {
    left = window.innerWidth - controlsWidth - 10;
  }
  
  textControls.style.display = 'flex';
  textControls.style.left = `${left}px`;
  textControls.style.top = `${top}px`;
  
  const textInput = document.getElementById('textInput');
  textInput.focus();
  
  updateTextPreview();
}

async function commitText() {
  if (!currentTextPosition) return;
  
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const text = document.getElementById('textInput').value;
  
  if (!text.trim()) {
    cancelText();
    return;
  }
  
  ctx.save();
  
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSize = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;
  
  // Scale the font size based on the canvas scaling
  const scaledFontSize = fontSize * currentTextPosition.scaleX;
  ctx.font = `${scaledFontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';  

  ctx.fillText(text, currentTextPosition.x, currentTextPosition.y);
  
  ctx.restore();
  
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const sourceImage = galleryImages.find(img => img.imageUrl === currentImage.src);
  
  if (sourceImage) {
    const basePromptHistory = [...(sourceImage.promptHistory || [{
      prompt: sourceImage.prompt,
      timestamp: sourceImage.created_at, 
      username: sourceImage.username
    }])];
    
    basePromptHistory.push({
      prompt: `Added text: "${text}" (${fontFamily}, ${fontSize}px, ${color})`,
      timestamp: new Date().toISOString(),
      type: 'text-edit',
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
      promptHistory: basePromptHistory,
      sourceImageId: sourceImage.id
    });

    await room.collection('gallery_images').update(sourceImage.id, {
      uses: (sourceImage.uses || 0) + 1
    });

    currentImage.src = imageUrl;
  }
  
  cancelText();
}

function updateTextPreview() {
  if (!textPreview || !currentTextPosition) return;
  
  const text = document.getElementById('textInput').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSize = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;
  
  textPreview.style.fontFamily = fontFamily;
  textPreview.style.fontSize = `${fontSize}px`;
  textPreview.style.color = color;
  textPreview.style.pointerEvents = 'none';
  textPreview.textContent = text || 'Enter text...';
}

function cancelText() {
  if (textPreview) {
    textPreview.remove();
    textPreview = null;
  }
  currentTextPosition = null;
  document.getElementById('textControls').style.display = 'none';
}