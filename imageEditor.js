let imageCounter = 0;
let currentImage = null;
let originalImageData = null;
let currentSelection = null;
let isShiftPressed = false;
let isCtrlPressed = false;
let selectionCanvas = null;
let selectionCtx = null;
let isPlacingText = false;
let textPlacementX = 0;
let textPlacementY = 0;
let currentTextObj = null;
let textObjects = [];
let selectedTextObj = null;

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

  initTextInput();
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

function initTextInput() {
  const canvas = document.getElementById('editCanvas');
  
  canvas.addEventListener('click', function(e) {
    if (!isPlacingText) return;
    
    const rect = canvas.getBoundingClientRect();
    textPlacementX = (e.clientX - rect.left) * (canvas.width / rect.width);
    textPlacementY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    createTextInput();
    isPlacingText = false;
    canvas.style.cursor = 'default';
  });
}

function createTextInput() {
  const container = document.createElement('div');
  container.className = 'text-input-container';
  container.style.position = 'absolute';
  container.style.left = `${textPlacementX}px`;
  container.style.top = `${textPlacementY}px`;
  
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'text-overlay-input';
  textInput.placeholder = 'Type your text...';
  
  const controls = document.createElement('div');
  controls.className = 'text-controls';
  
  const fontSelect = document.createElement('select');
  fontSelect.innerHTML = `
    <option value="Arial">Arial</option>
    <option value="Times New Roman">Times New Roman</option>
    <option value="Courier New">Courier New</option>
    <option value="Georgia">Georgia</option>
    <option value="Verdana">Verdana</option>
  `;
  
  const fontSizeInput = document.createElement('input');
  fontSizeInput.type = 'number';
  fontSizeInput.value = '24';
  fontSizeInput.min = '8';
  fontSizeInput.max = '72';
  
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#000000';
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply';
  
  controls.appendChild(fontSelect);
  controls.appendChild(fontSizeInput);
  controls.appendChild(colorInput);
  controls.appendChild(applyButton);
  
  container.appendChild(textInput);
  container.appendChild(controls);
  
  document.getElementById('imageContainer').appendChild(container);
  
  currentTextObj = {
    x: textPlacementX,
    y: textPlacementY,
    text: '',
    font: 'Arial',
    size: 24,
    color: '#000000'
  };
  
  // Event listeners for live preview
  textInput.addEventListener('input', function(e) {
    currentTextObj.text = e.target.value;
    redrawCanvas();
  });
  
  fontSelect.addEventListener('change', function(e) {
    currentTextObj.font = e.target.value;
    redrawCanvas();
  });
  
  fontSizeInput.addEventListener('input', function(e) {
    currentTextObj.size = parseInt(e.target.value);
    redrawCanvas();
  });
  
  colorInput.addEventListener('input', function(e) {
    currentTextObj.color = e.target.value;
    redrawCanvas();
  });
  
  applyButton.addEventListener('click', function() {
    if (currentTextObj.text.trim()) {
      textObjects.push({...currentTextObj});
      container.remove();
      redrawCanvas();
      updateOriginalImageData();
    }
  });
  
  textInput.focus();
}

function redrawCanvas() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  
  // Restore the original image
  ctx.putImageData(originalImageData, 0, 0);
  
  // Draw all text objects
  textObjects.forEach(drawTextObject);
  
  // Draw current text being edited
  if (currentTextObj) {
    drawTextObject(currentTextObj);
  }

  // Draw selection overlay if available
  drawSelectionOverlay();
}

function drawTextObject(textObj) {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  
  ctx.font = `${textObj.size}px ${textObj.font}`;
  ctx.fillStyle = textObj.color;
  ctx.fillText(textObj.text, textObj.x, textObj.y);
}

function updateOriginalImageData() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

  isPlacingText = tool === 'text';
  canvas.style.cursor = isPlacingText ? 'text' : 'default';
  
  switch (tool) {
    case 'text':
      fillImagePrompt.style.display = 'none';
      break;
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
  redrawCanvas();
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
  redrawCanvas();
}

function clearSelection() {
  currentSelection = null;
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(originalImageData, 0, 0);
  redrawCanvas();
}

function resetImage() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(originalImageData, 0, 0);
  currentSelection = null;
  redrawCanvas();
}