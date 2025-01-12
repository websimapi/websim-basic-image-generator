const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentEditId = null;
let currentSearch = '';
let currentPage = 1;
let imageCounter = 0;
let currentImage = null;
const ITEMS_PER_PAGE = 10;

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
  
  // Apply filters
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    images = images.filter(img => 
      img.prompt.toLowerCase().includes(searchLower) || 
      img.username.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting based on current tab
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
  const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedImages = images.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (images.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        ${currentSearch ? 'No images found matching your search' : 'No images available'}
      </div>
    `;
    return;
  }

  // Render images
  galleryEl.innerHTML = `
    <div class="gallery-grid">
      ${paginatedImages.map(img => `
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
          ${img.username === room.party.client.username ? `
            <div class="gallery-item-controls">
              <button class="edit-button" onclick="editImage('${img.id}')">Edit</button>
              <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="pagination">
      ${renderPagination(currentPage, totalPages)}
    </div>
  `;
}

function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) return '';

  let pages = [];
  
  // Previous button
  pages.push(`
    <button 
      onclick="changePage(${currentPage - 1})" 
      class="page-button prev" 
      ${currentPage === 1 ? 'disabled' : ''}
    >
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>
  `);

  // Always show first page
  pages.push(`<button onclick="changePage(1)" class="page-button ${currentPage === 1 ? 'active' : ''}">1</button>`);

  // Calculate range of pages to show
  let start = Math.max(2, currentPage - 2);
  let end = Math.min(totalPages - 1, currentPage + 2);

  // Show ellipsis after first page
  if (start > 2) {
    pages.push('<span class="ellipsis">...</span>');
  }

  // Show pages
  for (let i = start; i <= end; i++) {
    pages.push(`
      <button 
        onclick="changePage(${i})" 
        class="page-button ${currentPage === i ? 'active' : ''}"
      >${i}</button>
    `);
  }

  // Show ellipsis before last page
  if (end < totalPages - 1) {
    pages.push('<span class="ellipsis">...</span>');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(`
      <button 
        onclick="changePage(${totalPages})" 
        class="page-button ${currentPage === totalPages ? 'active' : ''}"
      >${totalPages}</button>
    `);
  }

  // Next button
  pages.push(`
    <button 
      onclick="changePage(${currentPage + 1})" 
      class="page-button next" 
      ${currentPage === totalPages ? 'disabled' : ''}
    >
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
      </svg>
    </button>
  `);

  return pages.join('');
}

function changePage(newPage) {
  const images = [...galleryImages];
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
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderGallery();
    // Scroll to top of gallery
    document.querySelector('.gallery-container').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }
}

async function showGalleryTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  changePage(1);
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
  changePage(1);
}