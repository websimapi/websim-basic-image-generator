const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentEditId = null;
let currentSearch = '';
let currentPage = 1;
let imageCounter = 0;
let currentImage = null;
const ITEMS_PER_PAGE = 12;

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

  const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedImages = images.slice(start, start + ITEMS_PER_PAGE);

  if (images.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        ${currentSearch ? 'No images found matching your search' : 'No images available'}
      </div>
    `;
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  galleryEl.innerHTML = paginatedImages.map(img => `
    <div class="gallery-item">
      <img src="${img.imageUrl}" alt="${img.prompt}" onclick="loadGalleryImage('${img.id}')">
      <div class="metadata">
        <div class="prompt">${img.prompt}</div>
        <div class="username">by ${img.username}</div>
        <div class="date">${new Date(img.created_at).toLocaleDateString()}</div>
      </div>
      <div class="stats">
        <span><i class="fa fa-eye"></i> ${img.views || 0}</span>
        <span><i class="fa fa-paint-brush"></i> ${img.uses || 0}</span>
      </div>
      ${img.username === room.party.client.username ? `
        <div class="gallery-item-controls">
          <button class="edit-button" onclick="editImage('${img.id}')">Edit</button>
          <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const paginationEl = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    paginationEl.style.display = 'none';
    return;
  }

  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <button 
      class="pagination-btn prev" 
      onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? 'disabled' : ''}>
      ←
    </button>
  `;

  // First page
  if (currentPage > 3) {
    paginationHTML += `
      <button class="pagination-btn" onclick="changePage(1)">1</button>
      ${currentPage > 4 ? '<span class="pagination-ellipsis">...</span>' : ''}
    `;
  }

  // Page numbers around current page
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    paginationHTML += `
      <button 
        class="pagination-btn ${i === currentPage ? 'active' : ''}" 
        onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  // Last page
  if (currentPage < totalPages - 2) {
    paginationHTML += `
      ${currentPage < totalPages - 3 ? '<span class="pagination-ellipsis">...</span>' : ''}
      <button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>
    `;
  }

  // Next button
  paginationHTML += `
    <button 
      class="pagination-btn next" 
      onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? 'disabled' : ''}>
      →
    </button>
  `;

  paginationEl.innerHTML = paginationHTML;
  paginationEl.style.display = 'flex';
}

function changePage(newPage) {
  if (newPage < 1) return;
  const totalPages = Math.ceil(galleryImages.length / ITEMS_PER_PAGE);
  if (newPage > totalPages) return;
  
  currentPage = newPage;
  renderGallery();
  
  // Smooth scroll to top of gallery
  document.querySelector('.gallery-container').scrollIntoView({ 
    behavior: 'smooth',
    block: 'start'
  });
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
  currentPage = 1; // Reset to first page when searching
  renderGallery();
}