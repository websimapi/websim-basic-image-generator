const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentEditId = null;
let currentSearch = '';
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let imageCounter = 0;
let currentImage = null;

async function initGallery() {
  galleryImages = await room.collection('gallery_images').getList();
  room.collection('gallery_images').subscribe(images => {
    galleryImages = images;
    currentPage = 1; // Reset to first page when data updates
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
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedImages = images.slice(startIndex, endIndex);

  if (images.length === 0) {
    galleryEl.innerHTML = `
      <div class="no-results">
        ${currentSearch ? 'No images found matching your search' : 'No images available'}
      </div>
    `;
    return;
  }

  // Render gallery items
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
    
    ${totalPages > 1 ? `
      <div class="pagination">
        ${currentPage > 1 ? `
          <button onclick="changePage(1)" class="page-button">«</button>
          <button onclick="changePage(${currentPage - 1})" class="page-button">‹</button>
        ` : ''}
        
        ${generatePageNumbers(currentPage, totalPages)}
        
        ${currentPage < totalPages ? `
          <button onclick="changePage(${currentPage + 1})" class="page-button">›</button>
          <button onclick="changePage(${totalPages})" class="page-button">»</button>
        ` : ''}
      </div>
    ` : ''}
  `;
}

function generatePageNumbers(current, total) {
  let pages = [];
  const MAX_VISIBLE = 5;
  
  if (total <= MAX_VISIBLE) {
    // Show all pages if total is small
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // Complex pagination logic for many pages
    if (current <= 3) {
      // Near start
      pages = [1, 2, 3, 4, '...', total];
    } else if (current >= total - 2) {
      // Near end
      pages = [1, '...', total - 3, total - 2, total - 1, total];
    } else {
      // Middle
      pages = [1, '...', current - 1, current, current + 1, '...', total];
    }
  }
  
  return pages.map(page => {
    if (page === '...') {
      return '<span class="page-ellipsis">...</span>';
    }
    return `
      <button onclick="changePage(${page})" 
              class="page-button ${page === current ? 'active' : ''}"
      >${page}</button>
    `;
  }).join('');
}

function changePage(newPage) {
  currentPage = newPage;
  renderGallery();
  // Scroll to top of gallery
  document.querySelector('.gallery-container').scrollIntoView({ behavior: 'smooth' });
}

async function showGalleryTab(tab) {
  currentTab = tab;
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
  renderGallery();
}