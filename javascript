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
      <img src="${img.imageUrl}" alt="${img.prompt}" onclick="loadGalleryImage('${img.id}')">
      <div class="metadata">
        <div class="image-title" ${img.username === room.party.client.username ? 'onclick="editTitle(\'' + img.id + '\')"' : ''}>
          ${img.title || img.prompt}
          ${img.username === room.party.client.username ? '<span class="edit-icon">✎</span>' : ''}
        </div>
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
          <button class="edit-button" onclick="editImage('${img.id}')" title="Edit Image">
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
  `).join('');
  
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === Math.ceil(images.length / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${Math.ceil(images.length / itemsPerPage)}`;
}

async function showGalleryTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.gallery-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
  });
  renderGallery();
}

function changePage(delta) {
  currentPage += delta;
  renderGallery();
}

async function loadGalleryImage(id) {
  const image = galleryImages.find(img => img.id === id);
  if (!image) return;

  try {
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

    // Try main URL first
    try {
      generatedImage.src = image.imageUrl;
    } catch (error) {
      console.warn('Main URL failed, trying fallback:', error);
      // If main URL fails and fallback exists, use it
      if (image.fallbackUrl) {
        generatedImage.src = image.fallbackUrl;
      } else {
        throw new Error('No fallback URL available');
      }
    }

    generatedImage.alt = image.prompt;
    imageContainer.appendChild(generatedImage);
    currentImage = generatedImage;

    document.getElementById('saveButton').style.display = 'block';
    document.getElementById('addGalleryButton').style.display = 'block';

    currentImage.onload = function() {
      setupImageEditor();
    };

    currentImage.onerror = function() {
      // If main URL fails, try fallback
      if (image.fallbackUrl && generatedImage.src !== image.fallbackUrl) {
        console.log('Switching to fallback URL');
        generatedImage.src = image.fallbackUrl;
      } else {
        console.error('Both main and fallback URLs failed');
        alert('Failed to load image.');
      }
    };

  } catch (error) {
    console.error('Error loading gallery image:', error);
    alert('Failed to load image. Please try again.');
  }
}

async function generateImage() {
  // ... existing setup code ...

  const promptInput = document.getElementById('promptInput');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

  try {
    // Create initial generated image 
    const generatedImage = document.createElement('img');
    generatedImage.id = `generatedImage_${Date.now()}`;
    generatedImage.className = 'generated-image';
    generatedImage.style.display = 'none';
    generatedImage.crossOrigin = 'anonymous';
    generatedImage.src = fullPrompt;
    generatedImage.alt = fullPrompt;

    const initialSrc = generatedImage.src;

    generatedImage.onload = async function() {
      if (generatedImage.src !== initialSrc) {
        loadingSpinner.style.display = 'none';
        generatedImage.style.display = 'block';
        placeholderText.style.display = 'none';
        saveButton.style.display = 'block';
        addGalleryButton.style.display = 'block';
        currentImage = generatedImage;

        try {
          // Create fallback URL by uploading to websim
          const blob = await fetch(generatedImage.src).then(r => r.blob());
          const file = new File([blob], 'generated-image.png', { type: 'image/png' });
          const fallbackUrl = await websim.upload(file);

          // Save to gallery with both URLs
          await room.collection('gallery_images').create({
            prompt: fullPrompt,
            imageUrl: generatedImage.src,
            fallbackUrl: fallbackUrl,
            views: 0,
            uses: 0,
            promptHistory: [{
              prompt: fullPrompt,
              timestamp: new Date().toISOString(),
              username: room.party.client.username
            }]
          });

          setupImageEditor();

        } catch (error) {
          console.error('Error creating fallback URL:', error);
          // Still proceed with main URL only
          await room.collection('gallery_images').create({
            prompt: fullPrompt,
            imageUrl: generatedImage.src,
            views: 0,
            uses: 0,
            promptHistory: [{
              prompt: fullPrompt,
              timestamp: new Date().toISOString(),
              username: room.party.client.username
            }]
          });
          setupImageEditor();
        }
      }
    };

    imageContainer.appendChild(generatedImage);

  } catch (error) {
    console.error('Error generating image:', error);
    loadingSpinner.style.display = 'none';
    alert('Failed to generate image. Please try again.');
  }
}

async function addToGallery() {
  const canvas = document.getElementById('editCanvas');
  const promptInput = document.getElementById('promptInput');
  const prefixSelect = document.getElementById('prefixPrompt');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'edited-image.png', { type: 'image/png' });
    const mainUrl = await websim.upload(file);

    // Create second upload as fallback
    const fallbackUrl = await websim.upload(file);

    const sourceImage = galleryImages.find(img => 
      img.imageUrl === currentImage.src || img.fallbackUrl === currentImage.src
    );

    if (sourceImage) {
      await room.collection('gallery_images').update(sourceImage.id, {
        uses: (sourceImage.uses || 0) + 1
      });
    }

    const promptHistory = sourceImage ? 
      [...(sourceImage.promptHistory || [{
        prompt: sourceImage.prompt,
        timestamp: sourceImage.created_at,
        username: sourceImage.username
      }])] : [];

    promptHistory.push({
      prompt: fullPrompt,
      timestamp: new Date().toISOString(),
      username: room.party.client.username
    });

    await room.collection('gallery_images').create({
      prompt: fullPrompt,
      title: fullPrompt,
      imageUrl: mainUrl,
      fallbackUrl: fallbackUrl,
      views: 0,
      uses: 0,
      modified: true,
      promptHistory: promptHistory,
      sourceImageId: sourceImage?.id
    });

    alert('Image added to gallery successfully!');

  } catch (error) {
    console.error('Error adding to gallery:', error);
    alert('Failed to add image to gallery. Please try again.');
  }
}

// ... rest of your code remains the same ...