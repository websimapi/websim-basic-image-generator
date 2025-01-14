const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentEditId = null;
let currentSearch = '';
let imageCounter = 0;
let currentImage = null;
let currentPage = 1;
const itemsPerPage = 10;

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
      img.username.toLowerCase().includes(searchLower)
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

  // Calculate pagination
  const totalPages = Math.ceil(images.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageImages = images.slice(startIndex, endIndex);

  // Update pagination controls
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;

  if (pageImages.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        ${currentSearch ? 'No images found matching your search' : 'No images available'}
      </div>
    `;
    return;
  }

  galleryEl.innerHTML = pageImages.map(img => `
    <div class="gallery-item">
      <img src="${img.imageUrl}" alt="${img.prompt}" onclick="loadGalleryImage('${img.id}')">
      <div class="metadata">
        <div>${img.prompt}</div>
        <div>by ${img.username}</div>
        <div>${new Date(img.created_at).toLocaleDateString()}</div>
      </div>
      <div class="stats">
        <span>${img.views || 0} views</span>
        <span>${img.uses || 0} uses</span>
      </div>
      ${renderPromptHistory(img)}
      ${img.username === room.party.client.username ? `
        <div class="gallery-item-controls">
          <button class="edit-button" onclick="editImage('${img.id}')">Edit</button>
          <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderPromptHistory(image) {
  if (!image.promptHistory || !image.promptHistory.length) {
    return `
      <div class="prompt-history">
        <div class="prompt-history-header" onclick="togglePromptHistory(this)">
          <span>Prompt History (1)</span>
          <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12">
            <path fill="currentColor" d="M6 8L2 4h8z"/>
          </svg>
        </div>
        <div class="prompt-history-entries" style="display: block;">
          <div class="prompt-history-entry">
            <div>Original prompt: ${image.prompt}</div>
            <div class="by-user">by ${image.username}</div>
            <div class="timestamp">${new Date(image.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Sort prompt history by timestamp to ensure chronological order
  const sortedHistory = [...image.promptHistory].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  return `
    <div class="prompt-history">
      <div class="prompt-history-header" onclick="togglePromptHistory(this)">
        <span>Prompt History (${sortedHistory.length})</span>
        <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12">
          <path fill="currentColor" d="M6 8L2 4h8z"/>
        </svg>
      </div>
      <div class="prompt-history-entries">
        ${sortedHistory.map((entry, index) => `
          <div class="prompt-history-entry">
            <div>
              ${index === 0 ? 'Original prompt: ' : 
                entry.type === 'selection-fill' ? 'Selection fill: ' : 
                entry.type === 'text-edit' ? 'Text edit: ' : 
                'Modified with: '}
              ${entry.prompt}
            </div>
            <div class="by-user">by ${entry.username}</div>
            <div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function showGalleryTab(tab) {
  currentTab = tab;
  currentPage = 1; // Reset to first page when changing tabs
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
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
  generatedImage.id = `generatedImage_${imageCounter++}`;
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

function editImage(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;
  currentEditId = id;
  const dialog = document.getElementById('editPromptDialog');
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('editPromptInput');
  input.value = image.prompt;
  dialog.style.display = 'block';
  overlay.style.display = 'block';
}

async function saveEdit() {
  if (!currentEditId) return;
  const input = document.getElementById('editPromptInput');
  const newPrompt = input.value.trim();
  if (!newPrompt) {
    alert('Please enter a prompt');
    return;
  }
  await room.collection('gallery_images').update(currentEditId, {
    prompt: newPrompt
  });
  cancelEdit();
}

function cancelEdit() {
  currentEditId = null;
  const dialog = document.getElementById('editPromptDialog');
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('editPromptInput');
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
  currentPage = 1; // Reset to first page when filtering
  renderGallery();
}

function changePage(delta) {
  const newPage = currentPage + delta;
  const totalPages = Math.ceil(galleryImages.length / itemsPerPage);
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderGallery();
  }
}

async function generateSelectionFill() {
  // ... existing code ...
  
  generatedImage.onload = async function() {
    // ... existing drawing code ...

    const sourceImage = galleryImages.find(img => img.imageUrl === currentImage.src);
        
    if (sourceImage) {
      await room.collection('gallery_images').update(sourceImage.id, {
        uses: (sourceImage.uses || 0) + 1
      });

      // Get the full history chain by following sourceImageId
      let fullHistory = [];
      let currentImg = sourceImage;
      
      while (currentImg) {
        if (currentImg.promptHistory) {
          fullHistory = [...currentImg.promptHistory, ...fullHistory];
        } else {
          fullHistory.unshift({
            prompt: currentImg.prompt,
            timestamp: currentImg.created_at,
            username: currentImg.username
          });
        }
        currentImg = currentImg.sourceImageId ? 
          galleryImages.find(img => img.id === currentImg.sourceImageId) : 
          null;
      }

      // Add the new modification
      fullHistory.push({
        prompt: `Selection fill: ${fullPrompt}`,
        timestamp: new Date().toISOString(),
        type: 'selection-fill',
        username: room.party.client.username
      });

      // Create the new image with complete history
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'edited-image.png', { type: 'image/png' });
      const imageUrl = await websim.upload(file);
      
      await room.collection('gallery_images').create({
        prompt: fullPrompt,
        title: sourceImage.title || sourceImage.prompt,
        imageUrl: imageUrl,
        views: 0,
        uses: 0,
        modified: true,
        promptHistory: fullHistory,
        sourceImageId: sourceImage.id
      });
    }
  };
}

async function commitText() {
  // ... existing code ...

  const sourceImage = galleryImages.find(img => img.imageUrl === currentImage.src);
      
  if (sourceImage) {
    // Get the full history chain
    let fullHistory = [];
    let currentImg = sourceImage;
    
    while (currentImg) {
      if (currentImg.promptHistory) {
        fullHistory = [...currentImg.promptHistory, ...fullHistory];
      } else {
        fullHistory.unshift({
          prompt: currentImg.prompt,
          timestamp: currentImg.created_at,
          username: currentImg.username
        });
      }
      currentImg = currentImg.sourceImageId ? 
        galleryImages.find(img => img.id === currentImg.sourceImageId) : 
        null;
    }

    // Add the new text modification
    fullHistory.push({
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
      promptHistory: fullHistory,
      sourceImageId: sourceImage.id
    });

    await room.collection('gallery_images').update(sourceImage.id, {
      uses: (sourceImage.uses || 0) + 1
    });
  }
  
  cancelText();
}