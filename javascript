let room;
let galleryImages = [];
let currentTab = 'recent';
let currentPage = 1;
let itemsPerPage = 12;
let currentEditId = null;
let currentSearch = '';
let currentImage = null;
let originalImageData = null;
let currentSelection = null;
let isShiftPressed = false;
let isCtrlPressed = false;
let selectionCanvas = null;
let selectionCtx = null;
let promptHistory = [];

async function initGallery() {
  galleryImages = await room.collection('gallery_images').getList();
  room.collection('gallery_images').subscribe(images => {
    galleryImages = images;
    renderGallery();
  });
  renderGallery();
}

function renderGallery() {
  const galleryEl = document.getElementById('gallery');
  let images = [...galleryImages];
  
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    images = images.filter(img => 
      img.prompt.toLowerCase().includes(searchLower) || 
      img.username.toLowerCase().includes(searchLower) ||
      (img.title && img.title.toLowerCase().includes(searchLower))
    );
  }

  switch (currentTab) {
    case 'popular':
      images.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'my':
      images = images.filter(img => img.username === room.party.client.username);
      break;
    default:
      images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedImages = images.slice(start, end);

  if (paginatedImages.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        ${currentSearch ? 'No images found matching your search' : 'No images available'}
      </div>
    `;
    document.getElementById('prevPage').disabled = true;
    document.getElementById('nextPage').disabled = true;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(images.length / itemsPerPage)}`;
    return;
  }

  galleryEl.innerHTML = paginatedImages.map(img => `
    <div class="gallery-item">
      <img src="${img.imageUrl}" alt="${img.prompt}" onclick="loadGalleryImage('${img.id}')">
      <div class="metadata">
        <div class="title" ${img.username === room.party.client.username ? 'onclick="editTitle(\'' + img.id + '\')"' : ''}>
          ${img.title || 'Untitled'} 
          ${img.username === room.party.client.username ? '<span class="edit-icon">✎</span>' : ''}
        </div>
        <div class="creator">by <img src="https://images.websim.ai/avatar/${img.username}" class="avatar" alt="${img.username}"> ${img.username}</div>
        <div>${new Date(img.created_at).toLocaleDateString()}</div>
        <div class="prompt-history">
          <details>
            <summary>Prompt History</summary>
            <ol>
              ${(img.promptHistory || []).map((entry, i) => `
                <li class="history-entry ${entry.type}">
                  <div class="entry-header">
                    <span class="entry-type">${entry.type === 'original' ? 'Original' : 'Selection Fill'}</span>
                    <span class="entry-user">
                      <img src="https://images.websim.ai/avatar/${entry.username}" class="avatar" alt="${entry.username}">
                      ${entry.username}
                    </span>
                    <span class="entry-date">${new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div class="entry-prompt">${entry.prompt}</div>
                  ${entry.parentId ? `
                    <div class="entry-parent">
                      <a href="#" onclick="loadGalleryImage('${entry.parentId}'); return false;">
                        View Original Image
                      </a>
                    </div>
                  ` : ''}
                </li>
              `).join('')}
            </ol>
          </details>
        </div>
      </div>
      <div class="stats">
        <span>${img.views || 0} views</span>
        <span>${img.uses || 0} uses</span>
      </div>
      ${img.username === room.party.client.username ? `
        <div class="gallery-item-controls">
          <button class="edit-button" onclick="editTitle('${img.id}')">Edit Title</button>
          <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === Math.ceil(images.length / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(images.length / itemsPerPage)}`;
}

async function showGalleryTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
}

function changePage(delta) {
  currentPage += delta;
  renderGallery();
}

async function loadGalleryImage(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;
  await room.collection('gallery_images').update(id, {
    views: (image.views || 0) + 1
  });
  const imageContainer = document.getElementById('imageContainer');
  const existingImages = imageContainer.querySelectorAll('img');
  existingImages.forEach(img => img.remove());
  const generatedImage = document.createElement('img');
  generatedImage.id = `generatedImage_${Date.now()}`;
  generatedImage.className = 'generated-image';
  generatedImage.style.display = 'none';
  generatedImage.crossOrigin = 'anonymous';
  generatedImage.src = image.imageUrl;
  generatedImage.alt = image.prompt;
  imageContainer.appendChild(generatedImage);
  currentImage = generatedImage;
  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';
  currentImage.onload = function () {
    setupImageEditor();
  };
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
        const isEdge = x > 0 && !currentSelection[pos - 1] || x < width - 1 && !currentSelection[pos + 1] || y > 0 && !currentSelection[pos - width] || y < height - 1 && !currentSelection[pos + width];
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
  
  document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
  
  const toolButton = document.getElementById(`${tool}Tool`);
  if (toolButton) {
    toolButton.classList.add('active');
  }

  if (tool === 'fillSelection' && currentSelection) {
    fillImagePrompt.style.display = 'none';
    fillSelection();
  } else if (tool === 'setAlpha' && currentSelection) {
    fillImagePrompt.style.display = 'none';
    setSelectionAlpha();
  } else if (tool === 'fillWithImage' && currentSelection) {
    fillImagePrompt.style.display = 'flex';
  } else {
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

function saveImage() {
  const canvas = document.getElementById('editCanvas');
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function addToGallery() {
  const canvas = document.getElementById('editCanvas');
  const promptInput = document.getElementById('promptInput');
  const prefixSelect = document.getElementById('prefixPrompt');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;
  
  try {
    // Convert canvas to blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
    
    // Create a File object from the blob
    const file = new File([blob], 'edited-image.png', { type: 'image/png' });
    
    // Upload the file and get the URL
    const imageUrl = await websim.upload(file);
    
    // Add to gallery with the uploaded URL
    await room.collection('gallery_images').create({
      title: promptInput.value.trim().substring(0, 50),
      prompt: fullPrompt,
      imageUrl: imageUrl,
      views: 0,
      uses: 0,
      modified: true, 
      promptHistory: [{
        type: 'original',
        prompt: fullPrompt,
        timestamp: new Date().toISOString(),
        username: room.party.client.username,
        avatarUrl: room.party.client.avatarUrl
      }]
    });
    
    alert('Image added to gallery successfully!');
    
  } catch (error) {
    console.error('Error adding to gallery:', error);
    alert('Failed to add image to gallery. Please try again.');
  }
}

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

  // Clear existing images
  const existingImages = imageContainer.querySelectorAll('img');
  existingImages.forEach(img => img.remove());

  const generatedImage = document.createElement('img');
  generatedImage.id = `generatedImage_${Date.now()}`;
  generatedImage.className = 'generated-image';
  generatedImage.style.display = 'none';
  generatedImage.crossOrigin = 'anonymous';
  
  // Set proper src and alt
  generatedImage.src = fullPrompt;
  generatedImage.alt = fullPrompt;

  // When image loads (generation complete)
  generatedImage.onload = async function() {
    // Check if the src has changed (meaning generation is complete)
    const parentImage = {
      promptHistory: [],
      id: generatedImage.id
    };
    const promptHistory = parentImage ? [...(parentImage.promptHistory || [])] : [];
    promptHistory.push({
      type: 'original',
      prompt: fullPrompt,
      timestamp: new Date().toISOString(),
      username: room.party.client.username,
      avatarUrl: room.party.client.avatarUrl
    });

    loadingSpinner.style.display = 'none';
    generatedImage.style.display = 'block';
    placeholderText.style.display = 'none';
    saveButton.style.display = 'block';
    addGalleryButton.style.display = 'block';
    currentImage = generatedImage;
    
    try {
      // Add to gallery with the final generation URL
      await room.collection('gallery_images').create({
        title: promptInput.value.trim().substring(0, 50),
        prompt: fullPrompt,
        imageUrl: generatedImage.src, 
        views: 0,
        uses: 0,
        modified: false,
        promptHistory: promptHistory
      });
      
      setupImageEditor();
      
    } catch (error) {
      console.error('Error processing generated image:', error);
      alert('Failed to process generated image. Please try again.');
    }
  };

  imageContainer.appendChild(generatedImage);
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    try {
      // Upload the file directly
      const imageUrl = await websim.upload(file);
      
      // Create temporary image to get dimensions
      const uploadedImage = new Image();
      uploadedImage.onload = function() {
        currentImage = uploadedImage;
        setupImageEditor();
      };
      uploadedImage.src = URL.createObjectURL(file);
      
      // Add to gallery with uploaded URL
      await room.collection('gallery_images').create({
        imageUrl: imageUrl,
        prompt: file.name,
        views: 0,
        uses: 0,
        modified: false
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  }
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

  // Get the parent image
  let parentImage = null;
  if (currentImage && currentImage.id) {
    const image = galleryImages.find(img => img.imageUrl === currentImage.src);
    if (image) {
      parentImage = image;
    }
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
  
  // Set proper src and alt
  generatedImage.src = fullPrompt;
  generatedImage.alt = fullPrompt;

  // When image loads (generation complete)
  generatedImage.onload = async function() {
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

    // Save prompt history
    const promptHistory = parentImage ? [...(parentImage.promptHistory || [])] : [];
    promptHistory.push({
      type: 'selection',
      prompt: fullPrompt,
      timestamp: new Date().toISOString(),
      username: room.party.client.username,
      avatarUrl: room.party.client.avatarUrl,
      parentId: parentImage ? parentImage.id : null
    });

    // Update the parent image with new prompt history
    if (parentImage) {
      await room.collection('gallery_images').update(parentImage.id, {
        promptHistory: promptHistory
      });
    }

    // Cleanup
    document.getElementById('fillImagePrompt').style.display = 'none';
    generatedImage.remove();
  };

  // Add image to document (hidden) to begin generation
  document.body.appendChild(generatedImage);
}

document.addEventListener('keydown', function (e) {
  if (e.shiftKey) isShiftPressed = true;
  if (e.ctrlKey) isCtrlPressed = true;
});

document.addEventListener('keyup', function (e) {
  if (!e.shiftKey) isShiftPressed = false;
  if (!e.ctrlKey) isCtrlPressed = false;
});

function editTitle(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;
  currentEditId = id;
  const dialog = document.getElementById('editTitleDialog');
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('editTitleInput');
  input.value = image.title || '';
  dialog.style.display = 'block';
  overlay.style.display = 'block';
}

async function saveEdit() {
  if (!currentEditId) return;
  const input = document.getElementById('editTitleInput');
  const newTitle = input.value.trim();
  if (!newTitle) {
    alert('Please enter a title');
    return;
  }
  await room.collection('gallery_images').update(currentEditId, {
    title: newTitle
  });
  cancelEdit();
}

function cancelEdit() {
  currentEditId = null;
  const dialog = document.getElementById('editTitleDialog');
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('editTitleInput');
  input.value = '';
  dialog.style.display = 'none';
  overlay.style.display = 'none';
}

async function deleteImage(id) {
  if (!confirm('Are you sure you want to delete this image?')) return;
  await room.collection('gallery_images').delete(id);
}

function filterGallery() {
  const searchInput = document.getElementById('gallerySearch');
  currentSearch = searchInput.value.trim();
  renderGallery();
}

window.addEventListener('load', async () => {
  room = new WebsimSocket();
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