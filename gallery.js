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

async function renderGallery() {
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
      <div class="gallery-image" 
           style="background-image: url('${img.imageUrl}')"
           onclick="loadGalleryImage('${img.id}')">
      </div>
      <div class="metadata">
        <div class="title" ${img.username === room.party.client.username ? 'onclick="editTitle(\'' + img.id + '\')"' : ''}>
          ${img.title || 'Untitled'} 
          ${img.username === room.party.client.username ? '<span class="edit-icon">✎</span>' : ''}
        </div>
        <div>by ${img.username}</div>
        <div>${new Date(img.created_at).toLocaleDateString()}</div>
        <div class="prompt-history">
          <details>
            <summary>Prompt History</summary>
            <ol>
              ${(img.promptHistory || []).map((entry, i) => `
                <li>
                  ${entry.type === 'original' ? '<strong>Original:</strong>' : '<strong>Selection Fill:</strong>'}
                  ${entry.prompt}
                  <span class="prompt-date">${new Date(entry.timestamp).toLocaleString()}</span>
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

async function loadGalleryImage(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;
  
  await room.collection('gallery_images').update(id, {
    views: (image.views || 0) + 1
  });

  const imageContainer = document.getElementById('imageContainer');
  const existingImages = imageContainer.querySelectorAll('.gallery-generated-image, img');
  existingImages.forEach(img => img.remove());

  const generatedImage = document.createElement('div');
  generatedImage.id = `generatedImage_${Date.now()}`;
  generatedImage.className = 'gallery-generated-image';
  generatedImage.style.backgroundImage = `url('${image.imageUrl}')`;

  imageContainer.appendChild(generatedImage);
  currentImage = generatedImage;

  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';

  // Load the image to set up the editor
  const tempImg = new Image();
  tempImg.onload = function () {
    setupImageEditor(tempImg);
  };
  tempImg.crossOrigin = 'anonymous';
  tempImg.src = image.imageUrl;
}

function setupImageEditor(tempImg) {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const editorControls = document.getElementById('editorControls');
  const fillImagePrompt = document.getElementById('fillImagePrompt');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  loadingSpinner.style.display = 'none';
  placeholderText.style.display = 'none';
  if (tempImg) {
    canvas.width = tempImg.naturalWidth;
    canvas.height = tempImg.naturalHeight;
    ctx.drawImage(tempImg, 0, 0);
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (currentImage) currentImage.style.display = 'none';
    canvas.style.display = 'block';
    editorControls.style.display = 'flex';
  } else {
    canvas.style.display = 'none';
    editorControls.style.display = 'none';
  }
  fillImagePrompt.style.display = 'none';
  if (!canvas.hasEventListener) {
    canvas.addEventListener('click', handleCanvasClick);
    canvas.hasEventListener = true;
  }
}

function generateImage() {
  const prefixSelect = document.getElementById('prefixPrompt');
  const promptInput = document.getElementById('promptInput');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

  if (!promptInput.value.trim()) {
    alert('Please enter a prompt!');
    return;
  }

  const imageContainer = document.getElementById('imageContainer');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  const saveButton = document.getElementById('saveButton');
  const addGalleryButton = document.getElementById('addGalleryButton');

  loadingSpinner.style.display = 'block';
  placeholderText.style.display = 'none';
  saveButton.style.display = 'none';
  addGalleryButton.style.display = 'none';

  // Clear existing images
  const existingImages = imageContainer.querySelectorAll('.gallery-generated-image, img');
  existingImages.forEach(img => img.remove());

  const generatedImage = document.createElement('div');
  generatedImage.id = `generatedImage_${Date.now()}`;
  generatedImage.className = 'gallery-generated-image';
  generatedImage.style.display = 'none';

  imageContainer.appendChild(generatedImage);
  currentImage = generatedImage;

  // Load the generated image
  const tempImg = new Image();
  tempImg.onload = async function() {
    loadingSpinner.style.display = 'none';
    generatedImage.style.display = 'block';
    generatedImage.style.backgroundImage = `url('${tempImg.src}')`;
    saveButton.style.display = 'block';
    addGalleryButton.style.display = 'block';

    try {
      // Add to gallery
      await room.collection('gallery_images').create({
        title: promptInput.value.trim().substring(0, 50), // Use first 50 chars as initial title
        prompt: fullPrompt,
        imageUrl: tempImg.src,
        views: 0,
        uses: 0,
        modified: false,
        promptHistory: [{
          type: 'original',
          prompt: fullPrompt,
          timestamp: new Date().toISOString()
        }]
      });

      setupImageEditor(tempImg);

    } catch (error) {
      console.error('Error processing generated image:', error);
      alert('Failed to process generated image. Please try again.');
    }
  };
  tempImg.crossOrigin = 'anonymous';
  tempImg.src = fullPrompt;
}

function showGalleryTab(tab) {
  currentTab = tab;
  currentPage = 1; // Reset to first page when changing tabs
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
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