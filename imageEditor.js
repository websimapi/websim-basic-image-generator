import { room, currentImage } from './main.js';

const EDITOR_STATE = {
  currentImage: null,
  originalImageData: null,
  currentSelection: null,
  isShiftPressed: false,
  isCtrlPressed: false,
  selectionCanvas: null,
  selectionCtx: null,
  currentTextPosition: null,
  textPreview: null
};

function initializeEditor() {
  setupEventListeners();
}

function setupEventListeners() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  const canvas = document.getElementById('editCanvas');
  if (!canvas.hasEventListener) {
    canvas.addEventListener('click', handleCanvasClick);
    canvas.hasEventListener = true;
  }
}

function handleKeyDown(event) {
  if (event.key === 'Shift') {
    EDITOR_STATE.isShiftPressed = true;
  } else if (event.key === 'Control') {
    EDITOR_STATE.isCtrlPressed = true;
  }
}

function handleKeyUp(event) {
  if (event.key === 'Shift') {
    EDITOR_STATE.isShiftPressed = false;
  } else if (event.key === 'Control') {
    EDITOR_STATE.isCtrlPressed = false;
  }
}

function setupImageEditor(image) {
  EDITOR_STATE.currentImage = image;
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const editorControls = document.getElementById('editorControls');
  const fillImagePrompt = document.getElementById('fillImagePrompt');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  
  loadingSpinner.style.display = 'none';
  placeholderText.style.display = 'none';
  
  if (image) {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    EDITOR_STATE.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    image.style.display = 'none';
    canvas.style.display = 'block';
    editorControls.style.display = 'flex';
  } else {
    canvas.style.display = 'none';
    editorControls.style.display = 'flex';
  }
  
  fillImagePrompt.style.display = 'none';
}

function handleCanvasClick(e) {
  const canvas = document.getElementById('editCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const activeTool = document.querySelector('.tool-button.active');
  if (activeTool && activeTool.id === 'textTool') {
    handleTextTool(e.clientX, e.clientY, x, y);
    return;
  }

  if (!EDITOR_STATE.isShiftPressed && !EDITOR_STATE.isCtrlPressed) {
    EDITOR_STATE.currentSelection = null;
  }
  
  const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const newSelection = magicWandSelect(imageData, Math.round(x), Math.round(y), 32);
  
  if (EDITOR_STATE.isShiftPressed || EDITOR_STATE.isCtrlPressed) {
    if (EDITOR_STATE.currentSelection) {
      for (let i = 0; i < EDITOR_STATE.currentSelection.length; i++) {
        EDITOR_STATE.currentSelection[i] = EDITOR_STATE.currentSelection[i] || newSelection[i];
      }
    } else {
      EDITOR_STATE.currentSelection = newSelection;
    }
  } else {
    EDITOR_STATE.currentSelection = newSelection;
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
    const colorDiff = Math.sqrt(Math.pow(r - startR, 2) + Math.pow(g - startG, 2) + Math.pow(b - startB, 2));
    if (colorDiff <= tolerance) {
      visited[pos] = 1;
      selected[pos] = 1;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  return selected;
}

function drawSelectionOverlay() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(EDITOR_STATE.originalImageData, 0, 0);
  if (!EDITOR_STATE.currentSelection) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (EDITOR_STATE.currentSelection[pos]) {
        const isEdge = x > 0 && !EDITOR_STATE.currentSelection[pos - 1] || x < width - 1 && !EDITOR_STATE.currentSelection[pos + 1] || y > 0 && !EDITOR_STATE.currentSelection[pos - width] || y < height - 1 && !EDITOR_STATE.currentSelection[pos + width];
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
  const textControls = document.getElementById('textControls');
  
  document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
  
  const toolButton = document.getElementById(`${tool}Tool`);
  if (toolButton) {
    toolButton.classList.add('active');
  }

  if (tool === 'fillSelection' && EDITOR_STATE.currentSelection) {
    fillImagePrompt.style.display = 'none';
    fillSelection();
  } else if (tool === 'setAlpha' && EDITOR_STATE.currentSelection) {
    fillImagePrompt.style.display = 'none';
    setSelectionAlpha();
  } else if (tool === 'fillWithImage' && EDITOR_STATE.currentSelection) {
    fillImagePrompt.style.display = 'flex';
  } else if (tool === 'text') {
    canvas.style.cursor = 'text';
  } else {
    fillImagePrompt.style.display = 'none';
    textControls.style.display = 'none';
    canvas.style.cursor = tool === 'magicWand' ? 'crosshair' : 'default';
  }
}

function fillSelection() {
  if (!EDITOR_STATE.currentSelection) return;
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const color = document.getElementById('colorPicker').value;
  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);
  for (let i = 0; i < EDITOR_STATE.currentSelection.length; i++) {
    if (EDITOR_STATE.currentSelection[i]) {
      const pixelPos = i * 4;
      pixels[pixelPos] = r;
      pixels[pixelPos + 1] = g;
      pixels[pixelPos + 2] = b;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  EDITOR_STATE.originalImageData = imageData;
}

function setSelectionAlpha() {
  if (!EDITOR_STATE.currentSelection) return;
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < EDITOR_STATE.currentSelection.length; i++) {
    if (EDITOR_STATE.currentSelection[i]) {
      const pixelPos = i * 4;
      pixels[pixelPos + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  EDITOR_STATE.originalImageData = imageData;
}

function clearSelection() {
  EDITOR_STATE.currentSelection = null;
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(EDITOR_STATE.originalImageData, 0, 0);
}

function resetImage() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  ctx.putImageData(EDITOR_STATE.originalImageData, 0, 0);
  EDITOR_STATE.currentSelection = null;
}

function handleTextTool(clientX, clientY, canvasX, canvasY) {
  const textControls = document.getElementById('textControls');
  const canvas = document.getElementById('editCanvas');
  const rect = canvas.getBoundingClientRect();
  
  if (EDITOR_STATE.textPreview) {
    EDITOR_STATE.textPreview.remove();
  }
  
  EDITOR_STATE.textPreview = document.createElement('div');
  EDITOR_STATE.textPreview.className = 'text-preview';
  EDITOR_STATE.textPreview.style.position = 'fixed';
  EDITOR_STATE.textPreview.style.left = `${clientX}px`;
  EDITOR_STATE.textPreview.style.top = `${clientY}px`;

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  EDITOR_STATE.currentTextPosition = { 
    x: canvasX, 
    y: canvasY,
    scaleX,
    scaleY
  };

  document.body.appendChild(EDITOR_STATE.textPreview);
  
  const controlsHeight = 100; 
  const controlsWidth = 250;  
  
  let top = clientY + 30; 
  let left = clientX;
  
  if (top + controlsHeight > window.innerHeight) {
    top = window.innerHeight - controlsHeight - 10;
  }
  
  if (left + controlsWidth > window.innerWidth) {
    left = window.innerWidth - controlsWidth - 10;
  }
  
  textControls.style.display = 'flex';
  textControls.style.left = `${left}px`;
  textControls.style.top = `${top}px`;
  
  const textInput = document.getElementById('textInput');
  textInput.focus();
}

async function commitText() {
  if (!EDITOR_STATE.currentTextPosition || !EDITOR_STATE.currentImage) return;
  
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
  
  const scaledFontSize = fontSize * EDITOR_STATE.currentTextPosition.scaleX;
  ctx.font = `${scaledFontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';  

  ctx.fillText(text, EDITOR_STATE.currentTextPosition.x, EDITOR_STATE.currentTextPosition.y);
  
  ctx.restore();
  
  EDITOR_STATE.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  cancelText();
}

function cancelText() {
  const textControls = document.getElementById('textControls');
  textControls.style.display = 'none';
  document.getElementById('textInput').value = '';
  
  if (EDITOR_STATE.textPreview) {
    EDITOR_STATE.textPreview.remove();
    EDITOR_STATE.textPreview = null;
  }
  
  EDITOR_STATE.currentTextPosition = null;
}

// Expose functions to global scope
window.setTool = setTool;
window.clearSelection = clearSelection;
window.resetImage = resetImage;
window.commitText = commitText;
window.cancelText = cancelText;

export {
  initializeEditor,
  setupImageEditor,
  EDITOR_STATE
};