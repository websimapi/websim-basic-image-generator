import { WebsimSocket } from '@websim/websim-socket';

// removed duplicate room initialization - now using main.js room

const state = {
  galleryImages: [],
  currentTab: 'recent',
  currentEditId: null,
  currentEditTitleId: null,
  currentSearch: '',
  currentPage: 1,
  currentUserFilter: null,
  itemsPerPage: 10
};

let room;

async function initGallery() {
  room = new WebsimSocket();
  state.galleryImages = await room.collection('gallery_images').getList();
  room.collection('gallery_images').subscribe(images => {
    state.galleryImages = images;
    renderGallery();
  });
  renderGallery();
}

const galleryFilters = {
  search: (images, searchTerm) => {
    if (!searchTerm) return images;
    const searchLower = searchTerm.toLowerCase();
    return images.filter(img => 
      img.prompt.toLowerCase().includes(searchLower) || 
      img.username.toLowerCase().includes(searchLower)
    );
  },

  userFilter: (images, username) => {
    if (!username) return images;
    return images.filter(img => {
      const isCreator = img.username === username;
      const hasModifications = img.promptHistory?.some(entry => 
        entry.username === username
      );
      return isCreator || hasModifications;
    });
  },

  tabFilter: {
    popular: (images) => [...images].sort((a, b) => (b.views || 0) - (a.views || 0)),
    my: (images, username) => images.filter(img => {
      const isOriginalCreator = img.username === username;
      const hasModifications = img.promptHistory?.some(entry => 
        entry.username === username && 
        entry.timestamp !== img.created_at
      );
      return isOriginalCreator || hasModifications;
    }),
    recent: (images) => [...images].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
};

function renderGallery() {
  const galleryEl = document.getElementById('gallery');
  let filteredImages = [...state.galleryImages];

  if (state.currentUserFilter) {
    filteredImages = galleryFilters.userFilter(filteredImages, state.currentUserFilter);
    updateUserFilterUI(true);
  } else {
    updateUserFilterUI(false);
  }

  if (state.currentSearch) {
    filteredImages = galleryFilters.search(filteredImages, state.currentSearch);
  }

  filteredImages = galleryFilters.tabFilter[state.currentTab](
    filteredImages, 
    room.party.client.username
  );

  const totalPages = Math.ceil(filteredImages.length / state.itemsPerPage);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageImages = filteredImages.slice(startIndex, endIndex);

  updatePaginationControls(state.currentPage, totalPages);
  renderGalleryItems(pageImages, galleryEl);
}

function updateUserFilterUI(show) {
  const filterInfo = document.getElementById('userFilterInfo');
  if (show) {
    filterInfo.style.display = 'flex';
    document.getElementById('userFilterName').textContent = state.currentUserFilter;
  } else {
    filterInfo.style.display = 'none';
  }
}

function renderGalleryItems(images, container) {
  if (images.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        ${getNoResultsMessage()}
      </div>
    `;
    return;
  }

  container.innerHTML = images.map(img => createGalleryItemHTML(img)).join('');
}

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
        <div>by ${img.username}</div>
        <div>${new Date(img.created_at).toLocaleDateString()}</div>
      </div>
      <div class="stats">
        <span>${img.views || 0} views</span>
        <span>${img.uses || 0} uses</span>
      </div>
      ${img.username === room.party.client.username ? `
        <div class="gallery-item-controls">
          <button class="edit-button" onclick="editTitle('${img.id}')" title="Edit Title">
            <svg viewBox="0 0 24 24">
              <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
            </svg>
          </button>
          <button class="delete-button" onclick="deleteImage('${img.id}')" title="Delete Image">
            <svg viewBox="0 0 24 24">
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
            </svg>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

async function loadGalleryImage(id) {
  const image = state.galleryImages.find(img => img.id === id);
  if (!image) return;
  
  await room.collection('gallery_images').update(id, {
    views: (image.views || 0) + 1,
    uses: (image.uses || 0) + 1
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
  
  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';
  
  generatedImage.onload = function () {
    // This would call setupImageEditor from main.js
    if (window.setupImageEditor) {
      window.setupImageEditor();
    }
  };
}

async function showGalleryTab(tab) {
  state.currentTab = tab;
  state.currentPage = 1;
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
}

function changePage(delta) {
  const newPage = state.currentPage + delta;
  const totalPages = Math.ceil(state.galleryImages.length / state.itemsPerPage);
  
  if (newPage >= 1 && newPage <= totalPages) {
    state.currentPage = newPage;
    renderGallery();
  }
}

async function deleteImage(id) {
  if (!confirm('Are you sure you want to delete this image?')) return;
  await room.collection('gallery_images').delete(id);
}

function filterGallery() {
  const searchInput = document.getElementById('gallerySearch');
  state.currentSearch = searchInput.value.trim();
  state.currentPage = 1;
  renderGallery();
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
  state.currentUserFilter = username;
  state.currentPage = 1;
  renderGallery();
}

function clearUserFilter() {
  state.currentUserFilter = null;
  renderGallery();
}

function editTitle(id) {
  const image = state.galleryImages.find(img => img.id === id);
  
  state.currentEditTitleId = id;
  const dialog = document.getElementById('editTitleDialog');
  const input = document.getElementById('editTitleInput');
  input.value = image.title || image.prompt;
  dialog.style.display = 'block';
}

async function saveTitleEdit() {
  if (!state.currentEditTitleId) return;
  
  const input = document.getElementById('editTitleInput');
  const newTitle = input.value.trim();
  
  if (!newTitle) {
    alert('Please enter a title');
    return;
  }
  
  await room.collection('gallery_images').update(state.currentEditTitleId, {
    title: newTitle
  });
  
  cancelTitleEdit();
}

function cancelTitleEdit() {
  state.currentEditTitleId = null;
  const dialog = document.getElementById('editTitleDialog');
  const input = document.getElementById('editTitleInput');
  input.value = '';
  dialog.style.display = 'none';
}

function getNoResultsMessage() {
  if (state.currentUserFilter) return 'No images found by this user';
  if (state.currentSearch) return 'No images found matching your search';
  return 'No images available';
}

function updatePaginationControls(currentPage, totalPages) {
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Expose functions to global scope
window.loadGalleryImage = loadGalleryImage;
window.showUserGallery = showUserGallery;
window.togglePromptHistory = togglePromptHistory;
window.editTitle = editTitle;
window.saveTitleEdit = saveTitleEdit;
window.cancelTitleEdit = cancelTitleEdit;
window.deleteImage = deleteImage;

export {
  initGallery,
  showGalleryTab,
  changePage,
  filterGallery,
  clearUserFilter
};