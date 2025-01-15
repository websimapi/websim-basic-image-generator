// State management
let galleryImages = [];
let currentTab = 'recent';
let currentPage = 1;
let itemsPerPage = 10;
let currentEditId = null;
let currentSearch = '';
let currentUserFilter = null;
let currentEditTitleId = null;

// Gallery initialization and subscription
async function initGallery() {
  galleryImages = await room.collection('gallery_images').getList();
  room.collection('gallery_images').subscribe(images => {
    galleryImages = images;
    renderGallery();
  });
  renderGallery();
}

// Gallery rendering
function renderGallery() {
  const galleryEl = document.getElementById('gallery');
  let images = [...galleryImages];

  // Filter images based on user selections
  if (currentUserFilter) {
    images = images.filter(img => {
      const isCreator = img.username === currentUserFilter;
      const hasModifications = img.promptHistory?.some(entry => 
        entry.username === currentUserFilter
      );
      return isCreator || hasModifications;
    });
  } else if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    images = images.filter(img => 
      img.title.toLowerCase().includes(searchLower) || 
      img.prompt.toLowerCase().includes(searchLower) || 
      img.username.toLowerCase().includes(searchLower)
    );
  }

  if (currentUserFilter) {
    document.getElementById('userFilterInfo').style.display = 'flex';
    document.getElementById('userFilterName').textContent = currentUserFilter;
  } else {
    document.getElementById('userFilterInfo').style.display = 'none';
  }

  // Sort images based on current tab
  switch (currentTab) {
    case 'popular':
      images.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'my':
      images = images.filter(img => {
        const isOriginalCreator = img.username === room.party.client.username;
        const hasModifications = img.promptHistory?.some(entry => 
          entry.username === room.party.client.username && 
          entry.timestamp !== img.created_at
        );
        return isOriginalCreator || hasModifications;
      });
      break;
    default:
      images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Pagination
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedImages = images.slice(start, end);

  if (paginatedImages.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        ${currentUserFilter ? 'No images found by this user' : currentSearch ? 'No images found matching your search' : 'No images available'}
      </div>
    `;
    document.getElementById('prevPage').disabled = true;
    document.getElementById('nextPage').disabled = true;
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(images.length / itemsPerPage)}`;
    return;
  }

  // Render images
  galleryEl.innerHTML = paginatedImages.map(img => createGalleryItemHTML(img)).join('');

  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === Math.ceil(images.length / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(images.length / itemsPerPage)}`;
}

// Create gallery item HTML
function createGalleryItemHTML(img) {
  return `
    <div class="gallery-item">
      <div 
        class="gallery-item-image" 
        style="background-image: url('${img.imageUrl}')"
        onclick="loadGalleryImage('${img.id}')"
        role="img" 
        aria-label="${img.prompt}"
      ></div>
      <div class="metadata">
        <div class="image-title" ${img.username === room.party.client.username ? 'onclick="editTitle(\'' + img.id + '\')"' : ''}>
          ${img.title || img.prompt}
          ${img.username === room.party.client.username ? '<span class="edit-icon">✎</span>' : ''}
        </div>
        <div>${img.modified ? '(Remix)' : ''}</div>
        <div class="prompt-history">
          ${renderPromptHistory(img)}
        </div>
        <div>by <span class="username-link" onclick="showUserGallery('${img.username}')">${img.username}</span></div>
        <div>${new Date(img.created_at).toLocaleDateString()}</div>
      </div>
      <div class="stats">
        <span>${img.views || 0} views</span>
        <span>${img.uses || 0} uses</span>
      </div>
      ${img.username === room.party.client.username ? `
        <div class="gallery-item-controls">
          <button class="edit-button" onclick="editImage('${img.id}')" title="Edit Image">
            <!-- Custom SVG icon for edit -->
            <svg viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm16.71-13.04a1.004 1.004 0 0 0-1.42 0l-2.34 2.34 3.75 3.75 2.34-2.34a1.004 1.004 0 0 0 0-1.42l-2.33-2.33z"/>
            </svg>
          </button>
          <button class="delete-button" onclick="deleteImage('${img.id}')" title="Delete Image">
            <!-- Custom SVG icon for delete -->
            <svg viewBox="0 0 24 24">
              <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z"/>
            </svg>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// Load gallery image into editor
async function loadGalleryImage(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;

  updateImageStats(id, image);
  loadImageIntoEditor(image);
}

// Update image stats
async function updateImageStats(id, image) {
  await room.collection('gallery_images').update(id, {
    views: (image.views || 0) + 1,
    uses: (image.uses || 0) + 1
  });
}

// Utility functions
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
            <div class="by-user">by <span class="username-link" onclick="showUserGallery('${image.username}')">${image.username}</span></div>
            <div class="timestamp">${new Date(image.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="prompt-history">
      <div class="prompt-history-header" onclick="togglePromptHistory(this)">
        <span>Prompt History (${image.promptHistory.length})</span>
        <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12">
          <path fill="currentColor" d="M6 8L2 4h8z"/>
        </svg>
      </div>
      <div class="prompt-history-entries">
        ${image.promptHistory.map((entry, index) => `
          <div class="prompt-history-entry">
            <div>
              ${index === 0 ? 'Original prompt: ' : 
                entry.type === 'selection-fill' ? 'Selection fill: ' : 
                entry.type === 'text-edit' ? 'Text edit: ' : 
                'Modified with: '}
              ${entry.prompt}
            </div>
            <div class="by-user">by <span class="username-link" onclick="showUserGallery('${entry.username || image.username}')">${entry.username || image.username}</span></div>
            <div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function togglePromptHistory(header) {
  const historyDiv = header.parentElement;
  historyDiv.classList.toggle('expanded');
  const entriesDiv = historyDiv.querySelector('.prompt-history-entries');
  if (historyDiv.classList.contains('expanded')) {
    entriesDiv.style.display = 'block';
  } else {
    entriesDiv.style.display = 'none';
  }
}

function showUserGallery(username) {
  currentUserFilter = username;
  currentPage = 1;  // Reset to first page
  renderGallery();
}

function clearUserFilter() {
  currentUserFilter = null;
  renderGallery();
}

function editTitle(id) {
  const image = galleryImages.find(img => img.id === id);
  
  currentEditTitleId = id;
  const dialog = document.getElementById('editTitleDialog');
  const input = document.getElementById('editTitleInput');
  input.value = image.title || image.prompt;
  dialog.style.display = 'block';
}

async function saveTitleEdit() {
  if (!currentEditTitleId) return;
  
  const input = document.getElementById('editTitleInput');
  const newTitle = input.value.trim();
  
  if (!newTitle) {
    alert('Please enter a title');
    return;
  }
  
  await room.collection('gallery_images').update(currentEditTitleId, {
    title: newTitle
  });
  
  cancelTitleEdit();
}

function cancelTitleEdit() {
  currentEditTitleId = null;
  const dialog = document.getElementById('editTitleDialog');
  const input = document.getElementById('editTitleInput');
  input.value = '';
  dialog.style.display = 'none';
}

// Gallery controls
function showGalleryTab(tab) {
  currentTab = tab;
  currentPage = 1; // Reset to first page when changing tabs
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
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
    prompt: newPrompt,
    title: newPrompt
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

// Image editor
function loadImageIntoEditor(image) {
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
  generatedImage.dataset.galleryId = image.id;
  
  imageContainer.appendChild(generatedImage);

  generatedImage.onload = function () {
    setupImageEditor();
  };

  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';
  EDITOR_STATE.currentImage = generatedImage;
}

// Setup image editor
function setupImageEditor() {
  // Setup image editor logic here
}