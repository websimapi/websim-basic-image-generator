const Gallery = {
  room: new WebsimSocket(),
  state: {
    images: [],
    currentTab: 'recent',
    currentPage: 1,
    itemsPerPage: 10,
    currentSearch: '',
    currentUserFilter: null
  },

  async init() {
    this.images = await this.room.collection('gallery_images').getList();
    this.room.collection('gallery_images').subscribe(images => {
      this.images = images;
      this.render();
    });
    this.render();
  },

  generateGalleryLayout() {
    return `
      <div class="gallery-container">
        ${this.generateGalleryHeader()}
        <div id="gallery" class="gallery"></div>
        ${this.generatePagination()}
      </div>
    `;
  },

  generateGalleryHeader() {
    return `
      <div class="gallery-header">
        <div class="gallery-tabs">
          <button class="gallery-tab active" onclick="Gallery.showTab('recent')">Recent</button>
          <button class="gallery-tab" onclick="Gallery.showTab('popular')">Popular</button>
          <button class="gallery-tab" onclick="Gallery.showTab('my')">My Images</button>
        </div>
        ${this.generateUserFilter()}
        ${this.generateSearch()}
      </div>
    `;
  },

  generateUserFilter() {
    return `
      <div id="userFilterInfo" style="display: none;">
        <span>Showing images by: <strong id="userFilterName"></strong></span>
        <button onclick="Gallery.clearUserFilter()">Clear Filter</button>
      </div>
    `;
  },

  generateSearch() {
    return `
      <div class="search-container">
        <input type="text" id="gallerySearch" placeholder="Search images..." onkeyup="Gallery.filter()">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z"/>
        </svg>
      </div>
    `;
  },

  generatePagination() {
    return `
      <div class="gallery-pagination">
        <button onclick="Gallery.changePage(-1)" id="prevPage">Previous</button>
        <span id="pageInfo">Page 1 of 1</span>
        <button onclick="Gallery.changePage(1)" id="nextPage">Next</button>
      </div>
    `;
  },

  render() {
    const galleryEl = document.getElementById('gallery');
    let images = [...this.images];

    if (this.state.currentSearch) {
      const searchLower = this.state.currentSearch.toLowerCase();
      images = images.filter(img => 
        img.prompt.toLowerCase().includes(searchLower) || 
        img.username.toLowerCase().includes(searchLower)
      );
    }

    if (this.state.currentUserFilter) {
      images = images.filter(img => img.username === this.state.currentUserFilter);
      document.getElementById('userFilterInfo').style.display = 'block';
      document.getElementById('userFilterName').textContent = this.state.currentUserFilter;
    } else {
      document.getElementById('userFilterInfo').style.display = 'none';
    }

    switch (this.state.currentTab) {
      case 'popular':
        images.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'my':
        images = images.filter(img => img.username === this.room.party.client.username);
        break;
      default:
        images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const totalPages = Math.ceil(images.length / this.state.itemsPerPage);
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = startIndex + this.state.itemsPerPage;
    const pageImages = images.slice(startIndex, endIndex);

    document.getElementById('pageInfo').textContent = `Page ${this.state.currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = this.state.currentPage === 1;
    document.getElementById('nextPage').disabled = this.state.currentPage >= totalPages;

    if (pageImages.length === 0) {
      galleryEl.innerHTML = `
        <div class="no-results">
          ${this.state.currentSearch ? 'No images found matching your search' : 'No images available'}
        </div>
      `;
      return;
    }

    const galleryButtons = pageImages.map(img => `
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
        ${img.username === this.room.party.client.username ? `
          <div class="gallery-item-controls">
            <button class="edit-button" onclick="editImage('${img.id}')">Edit</button>
            <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    galleryEl.innerHTML = galleryButtons;
  },

  showTab(tab) {
    this.state.currentTab = tab;
    this.state.currentPage = 1;
    this.render();
  },

  filter() {
    const searchInput = document.getElementById('gallerySearch');
    this.state.currentSearch = searchInput.value.trim();
    this.state.currentPage = 1;
    this.render();
  },

  showUserGallery(username) {
    this.state.currentUserFilter = username;
    this.state.currentPage = 1;
    this.render();
  },

  clearUserFilter() {
    this.state.currentUserFilter = null;
    this.render();
  },

  changePage(delta) {
    const newPage = this.state.currentPage + delta;
    const totalPages = Math.ceil(this.images.length / this.state.itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
      this.state.currentPage = newPage;
      this.render();
    }
  }
};

async function loadGalleryImage(id) {
  const image = Gallery.images.find(img => img.id === id);
  if (!image) return;
  
  await Gallery.room.collection('gallery_images').update(id, {
    views: (image.views || 0) + 1
  });

  const imageContainer = document.getElementById('imageContainer');
  const existingImages = imageContainer.querySelectorAll('img');
  existingImages.forEach(img => img.remove());
  
  const generatedImage = document.createElement('img');
  generatedImage.id = `generatedImage_${Math.floor(Math.random() * 100000)}`;
  generatedImage.className = 'generated-image';
  generatedImage.style.display = 'none';
  generatedImage.crossOrigin = 'anonymous';
  generatedImage.src = image.imageUrl;
  generatedImage.alt = image.prompt;
  
  imageContainer.appendChild(generatedImage);
  
  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';
  
  generatedImage.onload = function () {
    setupImageEditor();
  };
}

function editImage(id) {
  const image = Gallery.images.find(img => img.id === id);
  if (!image) return;
  const dialog = document.getElementById('editPromptDialog');
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('editPromptInput');
  input.value = image.prompt;
  dialog.style.display = 'block';
  overlay.style.display = 'block';
}

async function saveEdit() {
  const input = document.getElementById('editPromptInput');
  const newPrompt = input.value.trim();
  if (!newPrompt) {
    alert('Please enter a prompt');
    return;
  }
  await Gallery.room.collection('gallery_images').update(Gallery.images.find(img => img.prompt === input.value).id, {
    prompt: newPrompt
  });
  cancelEdit();
}

function cancelEdit() {
  const dialog = document.getElementById('editPromptDialog');
  const overlay = document.getElementById('overlay');
  const input = document.getElementById('editPromptInput');
  input.value = '';
  dialog.style.display = 'none';
  overlay.style.display = 'none';
}

async function deleteImage(id) {
  if (!confirm('Are you sure you want to delete this image?')) return;
  await Gallery.room.collection('gallery_images').delete(id);
}

window.Gallery = Gallery;