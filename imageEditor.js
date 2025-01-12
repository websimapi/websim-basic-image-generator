let imageCounter = 0;
let currentImage = null;
let originalImageData = null;
let currentSelection = null;
let isShiftPressed = false;
let isCtrlPressed = false;
let selectionCanvas = null;
let selectionCtx = null;
let selectionHistory = []; // Array to store previous selections and their image data
let hiddenLayers = new Set(); // Track which layers are currently hidden

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

  // Store the current selection and its pixels before making them transparent
  const selectionLayer = {
    id: Date.now(),
    selection: new Uint8Array(currentSelection),
    originalPixels: new Uint8Array(pixels), // Store original pixels
    bounds: calculateSelectionBounds(currentSelection, canvas.width, canvas.height)
  };

  // Add to history
  selectionHistory.push(selectionLayer);
  
  // Create UI control for this layer
  addLayerControl(selectionLayer);

  // Make selected pixels transparent
  for (let i = 0; i < currentSelection.length; i++) {
    if (currentSelection[i]) {
      const pixelPos = i * 4;
      pixels[pixelPos + 3] = 0; // Set alpha to 0
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

function calculateSelectionBounds(selection, width, height) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (selection[pos]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  return { minX, minY, maxX, maxY };
}

function addLayerControl(layer) {
  const layerControls = document.getElementById('layerControls');
  if (!layerControls) {
    // Create layer controls container if it doesn't exist
    const container = document.createElement('div');
    container.id = 'layerControls';
    container.className = 'layer-controls';
    document.getElementById('editorControls').appendChild(container);
  }
  
  const layerElement = document.createElement('div');
  layerElement.className = 'layer-item';
  layerElement.innerHTML = `
    <div class="layer-preview"></div>
    <span>Selection ${selectionHistory.length}</span>
    <label class="layer-visibility">
      <input type="checkbox" checked onchange="toggleLayer(${layer.id})">
      <span class="checkbox-custom"></span>
    </label>
  `;
  
  document.getElementById('layerControls').appendChild(layerElement);
  
  // Create mini preview
  const preview = layerElement.querySelector('.layer-preview');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const bounds = layer.bounds;
  
  canvas.width = bounds.maxX - bounds.minX + 1;
  canvas.height = bounds.maxY - bounds.minY + 1;
  
  // Draw preview
  const imageData = new ImageData(
    new Uint8ClampedArray(layer.originalPixels.buffer),
    document.getElementById('editCanvas').width
  );
  ctx.putImageData(imageData, -bounds.minX, -bounds.minY);
  
  preview.appendChild(canvas);
}

function toggleLayer(layerId) {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  
  if (hiddenLayers.has(layerId)) {
    hiddenLayers.delete(layerId);
  } else {
    hiddenLayers.add(layerId);
  }
  
  // Redraw canvas with current visibility settings
  redrawLayers();
}

function redrawLayers() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  
  // Start with original image
  ctx.putImageData(originalImageData, 0, 0);
  
  // Apply each visible layer
  selectionHistory.forEach(layer => {
    if (!hiddenLayers.has(layer.id)) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      for (let i = 0; i < layer.selection.length; i++) {
        if (layer.selection[i]) {
          const pixelPos = i * 4;
          pixels[pixelPos] = layer.originalPixels[pixelPos];
          pixels[pixelPos + 1] = layer.originalPixels[pixelPos + 1];
          pixels[pixelPos + 2] = layer.originalPixels[pixelPos + 2];
          pixels[pixelPos + 3] = layer.originalPixels[pixelPos + 3];
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    }
  });
}