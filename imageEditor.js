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
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const activeTool = document.querySelector('.tool-button.active');
  if (activeTool && activeTool.id === 'textTool') {
    const textControls = document.getElementById('textControls');
    textControls.style.display = 'flex';
    textControls.style.position = 'fixed';
    textControls.style.left = `${e.clientX}px`;
    textControls.style.top = `${e.clientY + 20}px`;
    
    currentTextPosition = { 
      x,
      y,
      screenX: e.clientX,
      screenY: e.clientY
    };
    
    const textInput = document.getElementById('textInput');
    textInput.focus();
    
    if (textPreview) {
      textPreview.remove();
    }
    
    textPreview = document.createElement('div');
    textPreview.className = 'text-preview';
    textPreview.style.position = 'fixed';
    textPreview.style.left = `${e.clientX}px`;
    textPreview.style.top = `${e.clientY}px`;
    document.body.appendChild(textPreview);
    
    updateTextPreview();
    return;
  }

  if (!isShiftPressed && !isCtrlPressed) {
    currentSelection = null;
  }

  const ctx = canvas.getContext('2d');
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

function updateTextPreview() {
  if (!textPreview || !currentTextPosition) return;
  
  const text = document.getElementById('textInput').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSize = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;
  
  textPreview.textContent = text || 'Enter text...';
  textPreview.style.fontFamily = fontFamily;
  textPreview.style.fontSize = `${fontSize}px`;
  textPreview.style.color = color;
  textPreview.style.position = 'fixed'; 
  textPreview.style.left = `${currentTextPosition.screenX}px`;
  textPreview.style.top = `${currentTextPosition.screenY}px`;
}

function handleCanvasMouseMove(e) {
  const activeTool = document.querySelector('.tool-button.active');
  if (activeTool && activeTool.id === 'textTool') {
    return; 
  }
  // ... other mouse move handling ...
}

function commitText() {
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
  const fontSize = parseInt(document.getElementById('fontSize').value); 
  const color = document.getElementById('textColor').value;
  
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  
  ctx.fillText(text, currentTextPosition.x, currentTextPosition.y);
  
  ctx.restore();
}

function cancelText() {
  if (textPreview) {
    textPreview.remove();
  }
  currentTextPosition = null;
  const textControls = document.getElementById('textControls');
  textControls.style.display = 'none';
}