const room = new WebsimSocket();
let galleryImages = [];
let currentTab = 'recent';
let currentEditId = null;
let currentSearch = '';
let imageCounter = 0;
let currentImage = null;
let currentPage = 1;
const itemsPerPage = 10;
let favoriteUsers = new Set(JSON.parse(localStorage.getItem('favoriteUsers') || '[]'));
let currentUserFilter = null;

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

  if (currentUserFilter) {
    images = images.filter(img => img.username === currentUserFilter);
  }

  switch (currentTab) {
    case 'popular':
      images.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'my':
      images = images.filter(img => img.username === room.party.client.username);
      break;
    case 'favorites':
      images = images.filter(img => favoriteUsers.has(img.username));
      // Group images by username
      const groupedByUser = {};
      images.forEach(img => {
        if (!groupedByUser[img.username]) {
          groupedByUser[img.username] = [];
        }
        groupedByUser[img.username].push(img);
      });

      if (Object.keys(groupedByUser).length === 0) {
        galleryEl.innerHTML = `
          <div class="no-results">
            You haven't favorited any users yet
          </div>
        `;
        return;
      }

      galleryEl.innerHTML = Object.entries(groupedByUser).map(([username, userImages]) => `
        <div class="favorite-user-group">
          <div class="favorite-user-header">
            <h3>${username}'s Gallery</h3>
            <div class="favorite-user-controls">
              <button onclick="showUserGallery('${username}', true)" class="view-all-button">View All</button>
              <button onclick="unfavoriteUser('${username}')" class="unfavorite-button">
                <svg class="heart-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>
                </svg>
                Unfavorite
              </button>
            </div>
          </div>
          <div class="user-images-preview">
            ${userImages.slice(0, 4).map(img => `
              <div class="gallery-item">
                <div 
                  class="gallery-item-image" 
                  style="background-image: url('${img.imageUrl}')"
                  onclick="loadGalleryImage('${img.id}')"
                  role="img" 
                  aria-label="${img.prompt}"
                ></div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
      return;
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
      ${img.username === room.party.client.username ? `
        <div class="gallery-item-controls">
          <button class="edit-button" onclick="editImage('${img.id}')">Edit</button>
          <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function showGalleryTab(tab) {
  currentTab = tab;
  currentUserFilter = null;
  currentPage = 1;
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
}

function showUserGallery(username, fromFavorites = false) {
  if (fromFavorites) {
    currentTab = 'recent';
    document.querySelectorAll('.gallery-tab').forEach(el => {
      el.classList.toggle('active', el.textContent.toLowerCase().includes('recent'));
    });
  }
  currentUserFilter = username;
  currentPage = 1;
  renderGallery();
  
  const button = document.getElementById('favoriteButton');
  if (favoriteUsers.has(username)) {
    button.classList.add('favorited');
    button.querySelector('.favorite-text').textContent = 'Favorited';
  } else {
    button.classList.remove('favorited');
    button.querySelector('.favorite-text').textContent = 'Favorite';
  }
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

function unfavoriteUser(username) {
  if (confirm(`Are you sure you want to unfavorite ${username}?`)) {
    favoriteUsers.delete(username);
    localStorage.setItem('favoriteUsers', JSON.stringify([...favoriteUsers]));
    renderGallery();
  }
}