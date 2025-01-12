const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentPage = 1;
const itemsPerPage = 12;
let currentEditId = null;
let currentSearch = '';

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
      <div class="gallery-image" style="background-image: url('${img.imageUrl}');" onclick="loadGalleryImage('${img.id}')"></div>
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

async function showGalleryTab(tab) {
  currentTab = tab;
  currentPage = 1; 
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
}

let imageCounter = 0;
let currentImage = null;

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
  currentPage = 1; 
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

function setupImageEditor() {
  // You need to implement this function
}

// Add this function to your code
function editPrompt(id) {
  // You need to implement this function
}