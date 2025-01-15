const room = new WebsimSocket();
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

async function initGallery() {
  const galleryImages = await room.collection('gallery_images').getList();
  room.collection('gallery_images').subscribe(images => {
    renderGallery(images);
  });
  renderGallery(galleryImages);
}

function renderGallery(galleryImages) {
  const galleryEl = document.getElementById('gallery');
  let images = [...galleryImages];
  
  images = images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const start = 0;
  const end = 10;
  const paginatedImages = images.slice(start, end);
  
  if (paginatedImages.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        No images available
      </div>
    `;
    return;
  }
  
  galleryEl.innerHTML = paginatedImages.map(img => `
    <div class="gallery-item">
      <div 
        class="gallery-item-image" 
        style="background-image: url('${img.imageUrl}')"
        onclick="loadGalleryImage('${img.id}')"
        role="img" 
        aria-label="${img.prompt}"
      ></div>
      <div class="metadata">
        <div>${img.prompt}</div>
        <div>by ${img.username}</div>
        <div>${new Date(img.created_at).toLocaleDateString()}</div>
      </div>
      <div class="stats">
        <span>${img.views || 0} views</span>
        <span>${img.uses || 0} uses</span>
      </div>
    </div>
  `).join('');
}

function setupImageEditor() {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const editorControls = document.getElementById('editorControls');
  const fillImagePrompt = document.getElementById('fillImagePrompt');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  loadingSpinner.style.display = 'none';
  placeholderText.style.display = 'none';
  if (EDITOR_STATE.currentImage) {
    canvas.width = EDITOR_STATE.currentImage.naturalWidth;
    canvas.height = EDITOR_STATE.currentImage.naturalHeight;
    ctx.drawImage(EDITOR_STATE.currentImage, 0, 0);
    EDITOR_STATE.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    EDITOR_STATE.currentImage.style.display = 'none';
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
  
  updateTextPreview();
}

function updateTextPreview() {
  if (!EDITOR_STATE.textPreview || !EDITOR_STATE.currentTextPosition) return;
  
  const text = document.getElementById('textInput').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSize = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;
  
  EDITOR_STATE.textPreview.style.fontFamily = fontFamily;
  EDITOR_STATE.textPreview.style.fontSize = `${fontSize}px`;
  EDITOR_STATE.textPreview.style.color = color;
  EDITOR_STATE.textPreview.style.pointerEvents = 'none';
  EDITOR_STATE.textPreview.textContent = text || 'Enter text...';
}

window.addEventListener('load', async () => {
  await initGallery();
  setupImageEditor();
});

document.getElementById('promptInput').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    generateImage();
  }
});

document.getElementById('colorPicker').addEventListener('input', function (e) {
  document.getElementById('colorPreview').style.backgroundColor = e.target.value;
  document.getElementById('colorValue').textContent = e.target.value.toUpperCase();
});

document.getElementById('colorPreview').style.backgroundColor = document.getElementById('colorPicker').value;
document.getElementById('colorValue').textContent = document.getElementById('colorPicker').value.toUpperCase();

document.getElementById('textInput').addEventListener('input', updateTextPreview);
document.getElementById('fontFamily').addEventListener('change', updateTextPreview);
document.getElementById('fontSize').addEventListener('input', updateTextPreview);
document.getElementById('textColor').addEventListener('input', updateTextPreview);

document.addEventListener('keydown', function (e) {
  if (e.shiftKey) EDITOR_STATE.isShiftPressed = true;
  if (e.ctrlKey) EDITOR_STATE.isCtrlPressed = true;
});

document.addEventListener('keyup', function (e) {
  if (!e.shiftKey) EDITOR_STATE.isShiftPressed = false;
  if (!e.ctrlKey) EDITOR_STATE.isCtrlPressed = false;
});

function generateImage() {
  const prefixSelect = document.getElementById('prefixPrompt');
  const promptInput = document.getElementById('promptInput');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

  const imageContainer = document.getElementById('imageContainer');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  const saveButton = document.getElementById('saveButton');
  const editorControls = document.getElementById('editorControls');
  const addGalleryButton = document.getElementById('addGalleryButton');

  if (!promptInput.value.trim()) {
    alert('Please enter a prompt!');
    return;
  }

  loadingSpinner.style.display = 'block';
  placeholderText.style.display = 'none';
  saveButton.style.display = 'none';
  addGalleryButton.style.display = 'none';

  const existingImages = imageContainer.querySelectorAll('img');
  existingImages.forEach(img => img.remove());

  const generatedImage = document.createElement('img');
  generatedImage.id = `generatedImage_${Date.now()}`;
  generatedImage.className = 'generated-image';
  generatedImage.style.display = 'none';
  generatedImage.crossOrigin = 'anonymous';
  
  generatedImage.src = fullPrompt;
  generatedImage.alt = fullPrompt;

  generatedImage.onload = async function() {
    loadingSpinner.style.display = 'none';
    generatedImage.style.display = 'block';
    placeholderText.style.display = 'none';
    saveButton.style.display = 'block';
    addGalleryButton.style.display = 'block';
    EDITOR_STATE.currentImage = generatedImage;
    setupImageEditor();
  };

  imageContainer.appendChild(generatedImage);
}