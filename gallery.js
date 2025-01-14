const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentSearch = '';
let currentPage = 1;
const itemsPerPage = 12;
let currentEditId = null;
let currentImage = null;

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
      (img.title || '').toLowerCase().includes(searchLower) || 
      (img.username || '').toLowerCase().includes(searchLower)
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

  const totalPages = Math.ceil(images.length / itemsPerPage);
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
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    return;
  }

  galleryEl.innerHTML = paginatedImages.map(img => `
    <div class="gallery-item">
      <div class="gallery-image" onclick="loadGalleryImage('${img.id}')" style="background-image: url('${img.imageUrl}');"></div>
      <div class="metadata">
        <div class="title" ${img.username === room.party.client.username ? `onclick="editTitle('${img.id}')"` : ''}>
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
                  ${entry.type === 'original' ? '<strong>Original:</strong>' : entry.type === 'upload' ? '<strong>Upload:</strong>' : '<strong>Modification:</strong>'}
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
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
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

function editTitle(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;
  
  const newTitle = prompt('Enter new title:', image.title || 'Untitled');
  if (newTitle === null) return; // User canceled

  room.collection('gallery_images').update(id, { title: newTitle });
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

async function showGalleryTab(tab) {
  currentTab = tab;
  currentPage = 1; // Reset to first page when changing tabs
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
}

function setupImageEditor() {
  // This function should contain the code to set up the image editor
  // You didn't provide the original implementation, so you should implement it according to your needs
}