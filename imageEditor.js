let imageCounter = 0;
let currentImage = null;
let originalImageData = null;
let currentSelection = null;
let isShiftPressed = false;
let isCtrlPressed = false;
let selectionCanvas = null;
let selectionCtx = null;
let layers = [];
let activeLayer = null;

class Layer {
  constructor(canvas, zIndex = 0) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.zIndex = zIndex;
    this.visible = true;
  }

  show() {
    this.visible = true;
    this.canvas.style.display = 'block';
  }

  hide() {
    this.visible = false;
    this.canvas.style.display = 'none';
  }

  setZIndex(index) {
    this.zIndex = index;
    this.canvas.style.zIndex = index;
  }
}

function createLayer() {
  const container = document.getElementById('canvasContainer');
  const canvas = document.createElement('canvas');
  canvas.className = 'editor-canvas';
  canvas.width = currentImage.naturalWidth;
  canvas.height = currentImage.naturalHeight;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  container.appendChild(canvas);
  
  const layer = new Layer(canvas, layers.length);
  layers.push(layer);
  return layer;
}

function setupImageEditor() {
  const container = document.getElementById('canvasContainer');
  container.innerHTML = ''; // Clear existing canvases
  layers = []; // Reset layers

  const editorControls = document.getElementById('editorControls');
  const fillImagePrompt = document.getElementById('fillImagePrompt');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');

  loadingSpinner.style.display = 'none';
  placeholderText.style.display = 'none';

  if (currentImage) {
    // Create base layer with original image
    const baseLayer = createLayer();
    baseLayer.ctx.drawImage(currentImage, 0, 0);
    originalImageData = baseLayer.ctx.getImageData(0, 0, baseLayer.canvas.width, baseLayer.canvas.height);
    
    currentImage.style.display = 'none';
    container.style.display = 'block';
    editorControls.style.display = 'flex';
    
    // Set active layer to base layer
    activeLayer = baseLayer;
  } else {
    container.style.display = 'none';
    editorControls.style.display = 'flex';
  }

  fillImagePrompt.style.display = 'none';
  
  // Add click handler to base layer only
  if (!layers[0].canvas.hasEventListener) {
    layers[0].canvas.addEventListener('click', handleCanvasClick);
    layers[0].canvas.hasEventListener = true;
  }
}

function handleCanvasClick(e) {
  const canvas = layers[0].canvas;
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
  if (!currentSelection) return;
  
  // Create or get overlay layer
  let overlayLayer = layers.find(l => l.canvas.id === 'selectionOverlay');
  if (!overlayLayer) {
    const newLayer = createLayer();
    newLayer.canvas.id = 'selectionOverlay';
    newLayer.setZIndex(layers.length - 1);
    overlayLayer = newLayer;
  }

  const ctx = overlayLayer.ctx;
  ctx.clearRect(0, 0, overlayLayer.canvas.width, overlayLayer.canvas.height);

  const width = overlayLayer.canvas.width;
  const height = overlayLayer.canvas.height;
  
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
  const canvas = layers[0].canvas;
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
  
  // Create new layer for filled area
  const newLayer = createLayer();
  newLayer.setZIndex(layers.length - 1);
  
  const imageData = newLayer.ctx.getImageData(0, 0, newLayer.canvas.width, newLayer.canvas.height);
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
      pixels[pixelPos + 3] = 255; // Full opacity
    }
  }
  
  newLayer.ctx.putImageData(imageData, 0, 0);
  activeLayer = newLayer;
}

function setSelectionAlpha() {
  if (!currentSelection) return;

  // Create new layer for transparent area
  const newLayer = createLayer();
  newLayer.setZIndex(layers.length - 1);
  
  // Copy current canvas state to new layer
  newLayer.ctx.drawImage(layers[0].canvas, 0, 0);
  
  // Clear selected area in new layer
  const imageData = newLayer.ctx.getImageData(0, 0, newLayer.canvas.width, newLayer.canvas.height);
  const pixels = imageData.data;
  
  for (let i = 0; i < currentSelection.length; i++) {
    if (currentSelection[i]) {
      const pixelPos = i * 4;
      pixels[pixelPos + 3] = 0; // Set alpha to 0
    }
  }
  
  newLayer.ctx.putImageData(imageData, 0, 0);
  activeLayer = newLayer;
}

function generateSelectionFill() {
  if (!currentSelection) {
    alert('Please make a selection first');
    return;
  }
  
  const prompt = document.getElementById('selectionPromptInput').value.trim();
  if (!prompt) {
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

  generatedImage.onload = function() {
    loadingSpinner.style.display = 'none';
    
    // Create new layer for generated content
    const newLayer = createLayer();
    newLayer.setZIndex(layers.length - 1);
    const ctx = newLayer.ctx;

    // Find selection bounds
    let minX = newLayer.canvas.width;
    let minY = newLayer.canvas.height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < newLayer.canvas.height; y++) {
      for (let x = 0; x < newLayer.canvas.width; x++) {
        const pos = y * newLayer.canvas.width + x;
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
    
    // Create temporary canvas for scaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = selectionWidth;
    tempCanvas.height = selectionHeight;
    
    tempCtx.drawImage(generatedImage, 0, 0, selectionWidth, selectionHeight);
    const scaledImageData = tempCtx.getImageData(0, 0, selectionWidth, selectionHeight);
    
    const imageData = ctx.getImageData(0, 0, newLayer.canvas.width, newLayer.canvas.height);
    const pixels = imageData.data;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pos = y * newLayer.canvas.width + x;
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
    activeLayer = newLayer;

    document.getElementById('fillImagePrompt').style.display = 'none';
    generatedImage.remove();
    tempCanvas.remove();
  };

  document.body.appendChild(generatedImage);
}

function combineLayersToCanvas() {
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = layers[0].canvas.width;
  combinedCanvas.height = layers[0].canvas.height;
  const ctx = combinedCanvas.getContext('2d');

  // Draw layers in order of z-index
  layers
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach(layer => {
      if (layer.visible) {
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });

  return combinedCanvas;
}

async function saveImage() {
  const combinedCanvas = combineLayersToCanvas();
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = combinedCanvas.toDataURL('image/png');
  link.click();
}

async function addToGallery() {
  const combinedCanvas = combineLayersToCanvas();
  const promptInput = document.getElementById('promptInput');
  const prefixSelect = document.getElementById('prefixPrompt');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;
  
  try {
    // Convert combined canvas to blob
    const blob = await new Promise(resolve => {
      combinedCanvas.toBlob(resolve, 'image/png');
    });
    
    // Create a File object
    const file = new File([blob], 'edited-image.png', { type: 'image/png' });
    
    // Upload the combined image
    const imageUrl = await websim.upload(file);
    
    // Add to gallery
    await room.collection('gallery_images').create({
      prompt: fullPrompt,
      imageUrl: imageUrl,
      views: 0,
      uses: 0,
      modified: true
    });
    
    alert('Image added to gallery successfully!');
    
  } catch (error) {
    console.error('Error adding to gallery:', error);
    alert('Failed to add image to gallery. Please try again.');
  }
}