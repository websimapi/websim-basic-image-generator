// Organize UI initialization and core structure
const UI = {
  initializeUI() {
    document.head.innerHTML = `
      <base href="./">
      <title>AI Image Editor</title>
      <link rel="stylesheet" href="styles.css">
    `;
    document.body.innerHTML = this.generateMainLayout();
    this.setupEventListeners();
  },

  generateMainLayout() {
    return `
      <div class="container">
        <h1>AI Image Editor</h1>
        ${this.generateEditorSection()}
        ${this.generateTextControls()}
        ${this.generateGallerySection()}
        ${this.generateDialogs()}
      </div>
    `;
  },

  generateEditorSection() {
    return `
      <div class="editor-section">
        <div class="input-group">
          ${Controls.generatePrefixSelect()}
          <input type="text" id="promptInput" placeholder="Enter your image prompt here...">
          ${Controls.generateSuffixSelect()}
          <button onclick="ImageGenerator.generateImage()">Generate</button>
          <input type="file" id="imageUpload" accept="image/*" onchange="ImageHandler.handleImageUpload(event)" style="display:none">
          <button onclick="document.getElementById('imageUpload').click()">Load Image</button>
        </div>

        <div class="image-container" id="imageContainer">
          <div id="loadingSpinner" class="loading" style="display: none;"></div>
          <div id="placeholderText" class="placeholder-text">Enter a prompt to generate an image or load one from your device</div>
          <canvas id="editCanvas"></canvas>
          ${EditorControls.generateEditorControls()}
        </div>

        <div class="action-buttons">
          <button onclick="ImageHandler.saveImage()" class="save-button" id="saveButton">Save Image</button>
          <button onclick="ImageHandler.addToGallery()" class="add-gallery-button" id="addGalleryButton">Add to Gallery</button>
        </div>
      </div>
    `;
  },

  generateTextControls() {
    return TextControls.generate();
  },

  generateGallerySection() {
    return Gallery.generateGalleryLayout();
  },

  generateDialogs() {
    return Dialogs.generate();
  },

  setupEventListeners() {
    EventHandlers.setup();
  }
};

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
  UI.initializeUI();
  AppState.init();
});

// Export for use in other modules
window.UI = UI;

// Define Controls
const Controls = {
  generatePrefixSelect() {
    const prefixes = [
      { value: '', label: 'Select Prefix...' },
      { value: 'HD ', label: 'HD' },
      { value: '4K ', label: '4K' },
      { value: 'Cartoon style ', label: 'Cartoon' },
      { value: 'Realistic ', label: 'Realistic' },
      { value: 'Photorealistic ', label: 'Photorealistic' },
      { value: 'Black and white ', label: 'Black & White' },
      { value: 'Vintage ', label: 'Vintage' },
      { value: 'Anime style ', label: 'Anime' }
    ];

    return `
      <select id="prefixPrompt">
        ${prefixes.map(prefix => `
          <option value="${prefix.value}">${prefix.label}</option>
        `).join('')}
      </select>
    `;
  },

  generateSuffixSelect() {
    const suffixes = [
      { value: '', label: 'Select Suffix...' },
      { value: ', white background', label: 'White Background' },
      { value: ', black background', label: 'Black Background' },
      { value: ', green background', label: 'Green Background' },
      { value: ', blue background', label: 'Blue Background' },
      { value: ', high quality', label: 'High Quality' },
      { value: ', detailed', label: 'Detailed' },
      { value: ', 8K', label: '8K' },
      { value: ', professional lighting', label: 'Professional Lighting' }
    ];

    return `
      <select id="suffixPrompt">
        ${suffixes.map(suffix => `
          <option value="${suffix.value}">${suffix.label}</option>
        `).join('')}
      </select>
    `;
  }
};

// Define EditorControls
const EditorControls = {
  generateEditorControls() {
    const tools = [
      {
        id: 'magicWand',
        tooltip: 'Magic Wand',
        icon: 'M7,5L3,9L9,15L13,11L7,5M16,12L12,16L14,18L18,14L16,12M12.8,2.6L16,5.8L18.6,3.2L15.4,0L12.8,2.6M21.4,11.6L24,14.2L21.4,16.8L18.8,14.2L21.4,11.6M0,18L3,21L5.6,18.4L2.6,15.4L0,18Z'
      },
      {
        id: 'fillSelection',
        tooltip: 'Fill Selection',
        icon: 'M19,11.5C19,11.5 17,13.67 17,15A2,2 0 0,0 19,17A2,2 0 0,0 21,15C21,13.67 19,11.5 19,11.5M5.21,10L10,5.21L14.79,10M16.56,8.94L7.62,0L6.21,1.41L8.59,3.79L3.44,8.94C2.85,9.5 2.85,10.47 3.44,11.06L8.94,16.56C9.23,16.85 9.62,17 10,17C10.38,17 10.77,16.85 11.06,16.56L16.56,11.06C17.15,10.47 17.15,9.5 16.56,8.94Z'
      },
      {
        id: 'setAlpha',
        tooltip: 'Set Alpha',
        icon: 'M17.66,8L12,2.35L6.34,8C4.78,9.56 4.78,12.11 6.34,13.66L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z'
      },
      {
        id: 'fillWithImage',
        tooltip: 'Fill with Generated Image',
        icon: 'M19,19H5V5H19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29M21.4,11.6L24,14.2L21.4,16.8L18.8,14.2L21.4,11.6M0,18L3,21L5.6,18.4L2.6,15.4L0,18Z'
      },
      {
        id: 'clearSelection',
        tooltip: 'Clear Selection',
        icon: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'
      },
      {
        id: 'text',
        tooltip: 'Add Text',
        icon: 'M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.33,17.75C13.67,18 14.33,18 15,18V19H9V18C9.67,18 10.33,18 10.67,17.75C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z'
      }
    ];

    return `
      <div class="tool-group">
        ${tools.map(tool => `
          <button class="tool-button" onclick="EditorHandler.setTool('${tool.id}')" id="${tool.id}Tool" data-tooltip="${tool.tooltip}">
            <svg viewBox="0 0 24 24">
              <path d="${tool.icon}"/>
            </svg>
          </button>
        `).join('')}
        
        <div class="color-display">
          <div class="color-preview" id="colorPreview"></div>
          <input type="color" id="colorPicker" class="color-picker" value="#ffffff">
          <span class="color-value" id="colorValue">#FFFFFF</span>
        </div>
      </div>
    `;
  }
};

// Define TextControls
const TextControls = {
  generate() {
    return `
      <div id="textControls" class="text-controls" style="display: none;">
        <input type="text" id="textInput" placeholder="Enter text...">
        <div class="text-options">
          <select id="fontFamily">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
          <input type="number" id="fontSize" value="24" min="8" max="72">
          <input type="color" id="textColor" value="#000000">
          <button onclick="TextHandler.commitText()">Apply</button>
          <button onclick="TextHandler.cancelText()">Cancel</button>
        </div>
      </div>
    `;
  }
};

// Define Gallery
const Gallery = {
  generateGalleryLayout() {
    return `
      <div class="gallery-container">
        <div class="gallery-header">
          <div class="gallery-tabs">
            <button class="gallery-tab active" onclick="GalleryHandler.showGalleryTab('recent')">Recent</button>
            <button class="gallery-tab" onclick="GalleryHandler.showGalleryTab('popular')">Popular</button>
            <button class="gallery-tab" onclick="GalleryHandler.showGalleryTab('my')">My Images</button>
          </div>
          <div id="userFilterInfo" style="display: none; align-items: center; gap: 1rem;">
            <span>Showing images by: <strong id="userFilterName"></strong></span>
            <button onclick="GalleryHandler.clearUserFilter()" class="clear-filter-button">Clear Filter</button>
          </div>
          <div class="search-container">
            <input type="text" id="gallerySearch" placeholder="Search images by title or username..." onkeyup="GalleryHandler.filterGallery()">
            <svg class="search-icon" viewBox="0 0 24 24">
              <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z"/>
            </svg>
          </div>
        </div>
        <div id="gallery" class="gallery"></div>
        <div class="gallery-pagination" id="galleryPagination">
          <button onclick="GalleryHandler.changePage(-1)" class="pagination-button" id="prevPage">Previous</button>
          <span id="pageInfo">Page 1 of 1</span>
          <button onclick="GalleryHandler.changePage(1)" class="pagination-button" id="nextPage">Next</button>
        </div>
      </div>
    `;
  }
};

// Define Dialogs
const Dialogs = {
  generate() {
    return `
      <div id="editTitleDialog" style="display: none;">
        <div class="dialog-content">
          <h3>Edit Image Title</h3>
          <input type="text" id="editTitleInput" placeholder="Enter new title">
          <div class="dialog-buttons">
            <button onclick="Dialogs.cancelTitleEdit()">Cancel</button>
            <button onclick="Dialogs.saveTitleEdit()">Save</button>
          </div>
        </div>
      </div>
    `;
  },

  cancelTitleEdit() {
    const dialog = document.getElementById('editTitleDialog');
    const input = document.getElementById('editTitleInput');
    input.value = '';
    dialog.style.display = 'none';
  },

  saveTitleEdit() {
    const input = document.getElementById('editTitleInput');
    const newTitle = input.value.trim();
    if (!newTitle) {
      alert('Please enter a title');
      return;
    }
    // Update image title here
    Dialogs.cancelTitleEdit();
  }
};

// Define EventHandlers
const EventHandlers = {
  setup() {
    document.getElementById('promptInput').addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        ImageGenerator.generateImage();
      }
    });

    document.getElementById('colorPicker').addEventListener('input', function (e) {
      document.getElementById('colorPreview').style.backgroundColor = e.target.value;
      document.getElementById('colorValue').textContent = e.target.value.toUpperCase();
    });

    document.getElementById('textInput').addEventListener('input', TextHandler.updateTextPreview);
    document.getElementById('fontFamily').addEventListener('change', TextHandler.updateTextPreview);
    document.getElementById('fontSize').addEventListener('input', TextHandler.updateTextPreview);
    document.getElementById('textColor').addEventListener('input', TextHandler.updateTextPreview);

    document.addEventListener('keydown', function (e) {
      if (e.shiftKey) EditorHandler.isShiftPressed = true;
      if (e.ctrlKey) EditorHandler.isCtrlPressed = true;
    });

    document.addEventListener('keyup', function (e) {
      if (!e.shiftKey) EditorHandler.isShiftPressed = false;
      if (!e.ctrlKey) EditorHandler.isCtrlPressed = false;
    });
  }
};

// Define EditorHandler
const EditorHandler = {
  isShiftPressed: false,
  isCtrlPressed: false,
  setTool(tool) {
    const canvas = document.getElementById('editCanvas');
    const fillImagePrompt = document.getElementById('fillImagePrompt');
    const textControls = document.getElementById('textControls');
    
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
    
    const toolButton = document.getElementById(`${tool}Tool`);
    if (toolButton) {
      toolButton.classList.add('active');
    }

    if (tool === 'fillSelection' && EditorHandler.currentSelection) {
      fillImagePrompt.style.display = 'none';
      EditorHandler.fillSelection();
    } else if (tool === 'setAlpha' && EditorHandler.currentSelection) {
      fillImagePrompt.style.display = 'none';
      EditorHandler.setSelectionAlpha();
    } else if (tool === 'fillWithImage' && EditorHandler.currentSelection) {
      fillImagePrompt.style.display = 'flex';
    } else if (tool === 'text') {
      canvas.style.cursor = 'text';
    } else {
      fillImagePrompt.style.display = 'none';
      textControls.style.display = 'none';
      canvas.style.cursor = tool === 'magicWand' ? 'crosshair' : 'default';
    }
  },

  fillSelection() {
    if (!EditorHandler.currentSelection) return;
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const color = document.getElementById('colorPicker').value;
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    for (let i = 0; i < EditorHandler.currentSelection.length; i++) {
      if (EditorHandler.currentSelection[i]) {
        const pixelPos = i * 4;
        pixels[pixelPos] = r;
        pixels[pixelPos + 1] = g;
        pixels[pixelPos + 2] = b;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    EditorHandler.originalImageData = imageData;
  },

  setSelectionAlpha() {
    if (!EditorHandler.currentSelection) return;
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    for (let i = 0; i < EditorHandler.currentSelection.length; i++) {
      if (EditorHandler.currentSelection[i]) {
        const pixelPos = i * 4;
        pixels[pixelPos + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    EditorHandler.originalImageData = imageData;
  },

  clearSelection() {
    EditorHandler.currentSelection = null;
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    ctx.putImageData(EditorHandler.originalImageData, 0, 0);
  },

  resetImage() {
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    ctx.putImageData(EditorHandler.originalImageData, 0, 0);
    EditorHandler.currentSelection = null;
  }
};

EditorHandler.currentSelection = null;
EditorHandler.originalImageData = null;

// Define ImageGenerator
const ImageGenerator = {
  generateImage() {
    const prefixSelect = document.getElementById('prefixPrompt');
    const promptInput = document.getElementById('promptInput');
    const suffixSelect = document.getElementById('suffixPrompt');
    const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

    const imageContainer = document.getElementById('imageContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const placeholderText = document.getElementById('placeholderText');
    const saveButton = document.getElementById('saveButton');
    const editorControls = document.getElementById('editorControls');
    const addGalleryButton = document.getElementById('addGalleryButton');

    if (!promptInput.value.trim()) {
      alert('Please enter a prompt!');
      return;
    }

    loadingSpinner.style.display = 'block';
    placeholderText.style.display = 'none';
    saveButton.style.display = 'none';
    addGalleryButton.style.display = 'none';

    const existingImages = imageContainer.querySelectorAll('img');
    existingImages.forEach(img => img.remove());

    const generatedImage = document.createElement('img');
    generatedImage.id = `generatedImage_${Date.now()}`;
    generatedImage.className = 'generated-image';
    generatedImage.style.display = 'none';
    generatedImage.crossOrigin = 'anonymous';
    generatedImage.src = fullPrompt;
    generatedImage.alt = fullPrompt;

    generatedImage.onload = async function() {
      if (generatedImage.src !== fullPrompt) {
        loadingSpinner.style.display = 'none';
        generatedImage.style.display = 'block';
        placeholderText.style.display = 'none';
        saveButton.style.display = 'block';
        addGalleryButton.style.display = 'block';
        EditorHandler.currentImage = generatedImage;
        
        try {
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
          
          EditorHandler.setupImageEditor();
          
        } catch (error) {
          console.error('Error processing generated image:', error);
          alert('Failed to process generated image. Please try again.');
        }
      }
    };

    imageContainer.appendChild(generatedImage);
  }
};

// Define ImageHandler
const ImageHandler = {
  saveImage() {
    const canvas = document.getElementById('editCanvas');
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      try {
        const blob = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsArrayBuffer(file);
        });
        
        const imageUrl = await websim.upload(file);
        
        const uploadedImage = new Image();
        uploadedImage.onload = function() {
          EditorHandler.currentImage = uploadedImage;
          EditorHandler.setupImageEditor();
        };
        uploadedImage.src = URL.createObjectURL(file);
        
        await room.collection('gallery_images').create({
          imageUrl: imageUrl,
          prompt: file.name,
          views: 0,
          uses: 0,
          modified: false
        });
        
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
  },

  addToGallery() {
    const canvas = document.getElementById('editCanvas');
    const promptInput = document.getElementById('promptInput');
    const prefixSelect = document.getElementById('prefixPrompt');
    const suffixSelect = document.getElementById('suffixPrompt');
    const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

    try {
      const sourceImage = galleryImages.find(img => 
        img.imageUrl === EditorHandler.currentImage.src
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
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'edited-image.png', { type: 'image/png' });
      const imageUrl = await websim.upload(file);
      
      await room.collection('gallery_images').create({
        prompt: fullPrompt,
        title: fullPrompt,
        imageUrl: imageUrl,
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
};

// Define TextHandler
const TextHandler = {
  currentTextPosition: null,
  textPreview: null,

  updateTextPreview() {
    if (!TextHandler.textPreview || !TextHandler.currentTextPosition) return;
    
    const text = document.getElementById('textInput').value;
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    
    TextHandler.textPreview.style.fontFamily = fontFamily;
    TextHandler.textPreview.style.fontSize = `${fontSize}px`;
    TextHandler.textPreview.style.color = color;
    TextHandler.textPreview.style.pointerEvents = 'none';
    TextHandler.textPreview.textContent = text || 'Enter text...';
  },

  commitText() {
    if (!TextHandler.currentTextPosition) return;
    
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');

    const text = document.getElementById('textInput').value;
    
    if (!text.trim()) {
      TextHandler.cancelText();
      return;
    }
    
    ctx.save();
    
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';  
  
    ctx.fillText(text, TextHandler.currentTextPosition.x, TextHandler.currentTextPosition.y);
    
    ctx.restore();
    
    EditorHandler.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const sourceImage = galleryImages.find(img => img.imageUrl === EditorHandler.currentImage.src);
    
    if (sourceImage) {
      const promptHistory = sourceImage.promptHistory || [{
        prompt: sourceImage.prompt,
        timestamp: sourceImage.created_at,
        username: sourceImage.username
      }];
      
      promptHistory.push({
        prompt: `Added text: "${text}" (${fontFamily}, ${fontSize}px, ${color})`,
        timestamp: new Date().toISOString(),
        type: 'text-edit',
        username: room.party.client.username
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'edited-image.png', { type: 'image/png' });
      const imageUrl = await websim.upload(file);
      
      await room.collection('gallery_images').create({
        prompt: sourceImage.prompt,
        title: sourceImage.title || sourceImage.prompt,
        imageUrl: imageUrl,
        views: 0,
        uses: 0,
        modified: true,
        promptHistory: promptHistory,
        sourceImageId: sourceImage.id
      });

      await room.collection('gallery_images').update(sourceImage.id, {
        uses: (sourceImage.uses || 0) + 1
      });
    }
    
    TextHandler.cancelText();
  },

  cancelText() {
    const textControls = document.getElementById('textControls');
    textControls.style.display = 'none';
    document.getElementById('textInput').value = '';
    
    if (TextHandler.textPreview) {
      TextHandler.textPreview.remove();
      TextHandler.textPreview = null;
    }
    
    TextHandler.currentTextPosition = null;
  },

  handleTextTool(clientX, clientY, canvasX, canvasY) {
    const textControls = document.getElementById('textControls');
    const canvas = document.getElementById('editCanvas');
    const rect = canvas.getBoundingClientRect();
    
    if (TextHandler.textPreview) {
      TextHandler.textPreview.remove();
    }
    
    TextHandler.textPreview = document.createElement('div');
    TextHandler.textPreview.className = 'text-preview';
    TextHandler.textPreview.style.position = 'fixed';
    TextHandler.textPreview.style.left = `${clientX}px`;
    TextHandler.textPreview.style.top = `${clientY}px`;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    TextHandler.currentTextPosition = { 
      x: canvasX, 
      y: canvasY,
      scaleX,
      scaleY
    };

    document.body.appendChild(TextHandler.textPreview);
    
    const controlsHeight = 100; 
    const controlsWidth = 250;  
  
    let top = clientY + 30; 
    let left = clientX;
    
    if (top + controlsHeight > window.innerHeight) {
      top = window.innerHeight - controlsHeight - 10;
    }
    
    if (left + controlsWidth > window.innerWidth) {
      left = window.innerWidth - controlsWidth - 10;
    }
    
    textControls.style.display = 'flex';
    textControls.style.left = `${left}px`;
    textControls.style.top = `${top}px`;
    
    const textInput = document.getElementById('textInput');
    textInput.focus();
    
    TextHandler.updateTextPreview();
  }
};

// Define GalleryHandler
const GalleryHandler = {
  currentTab: 'recent',
  currentPage: 1,
  itemsPerPage: 10,
  currentSearch: '',
  currentImage: null,
  originalImageData: null,
  currentSelection: null,
  isShiftPressed: false,
  isCtrlPressed: false,
  selectionCanvas: null,
  selectionCtx: null,
  currentTextPosition: null,
  textPreview: null,
  currentUserFilter: null,

  showGalleryTab(tab) {
    GalleryHandler.currentTab = tab;
    document.querySelectorAll('.gallery-tab').forEach(el => {
      el.classList.toggle('active', el.textContent.toLowerCase().includes(tab));
    });
    GalleryHandler.renderGallery();
  },

  changePage(delta) {
    GalleryHandler.currentPage += delta;
    GalleryHandler.renderGallery();
  },

  renderGallery() {
    const galleryEl = document.getElementById('gallery');
    let images = [...galleryImages];
    
    if (GalleryHandler.currentUserFilter) {
      images = images.filter(img => {
        const isCreator = img.username === GalleryHandler.currentUserFilter;
        const hasModifications = img.promptHistory?.some(entry => 
          entry.username === GalleryHandler.currentUserFilter
        );
        return isCreator || hasModifications;
      });
    } else if (GalleryHandler.currentSearch) {
      const searchLower = GalleryHandler.currentSearch.toLowerCase();
      images = images.filter(img => 
        img.prompt.toLowerCase().includes(searchLower) || 
        img.username.toLowerCase().includes(searchLower)
      );
    }

    if (GalleryHandler.currentUserFilter) {
      document.getElementById('userFilterInfo').style.display = 'flex';
      document.getElementById('userFilterName').textContent = GalleryHandler.currentUserFilter;
    } else {
      document.getElementById('userFilterInfo').style.display = 'none';
    }

    switch (GalleryHandler.currentTab) {
      case 'popular':
        images.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'my':
        images = images.filter(img => {
          const isOriginalCreator = img.username === room.party.client.username;
          const hasModifications = img.promptHistory?.some(entry => 
            entry.username === room.party.client.username && 
            entry.timestamp !== img.created_at
          );
          return isOriginalCreator || hasModifications;
        });
        break;
      default:
        images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const start = (GalleryHandler.currentPage - 1) * GalleryHandler.itemsPerPage;
    const end = start + GalleryHandler.itemsPerPage;
    const paginatedImages = images.slice(start, end);

    if (paginatedImages.length === 0) {
      galleryEl.innerHTML = `
        <div class="no-results">
          ${GalleryHandler.currentUserFilter ? 'No images found by this user' : GalleryHandler.currentSearch ? 'No images found matching your search' : 'No images available'}
        </div>
      `;
      document.getElementById('prevPage').disabled = true;
      document.getElementById('nextPage').disabled = true;
      document.getElementById('pageInfo').textContent = `Page ${GalleryHandler.currentPage} of ${Math.ceil(images.length / GalleryHandler.itemsPerPage)}`;
      return;
    }

    galleryEl.innerHTML = paginatedImages.map(img => `
      <div class="gallery-item">
        <div 
          class="gallery-item-image" 
          style="background-image: url('${img.imageUrl}')"
          onclick="GalleryHandler.loadGalleryImage('${img.id}')"
          role="img" 
          aria-label="${img.prompt}"
        ></div>
        <div class="metadata">
          <div class="image-title" ${img.username === room.party.client.username ? 'onclick="GalleryHandler.editTitle(\'' + img.id + '\')"' : ''}>
            ${img.title || img.prompt}
            ${img.username === room.party.client.username ? '<span class="edit-icon">✎</span>' : ''}
          </div>
          <div>${img.modified ? '(Remix)' : ''}</div>
          <div class="prompt-history">
            ${GalleryHandler.renderPromptHistory(img)}
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
            <button class="edit-button" onclick="GalleryHandler.editImage('${img.id}')" title="Edit Image">
              <svg viewBox="0 0 24 24">
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
              </svg>
            </button>
            <button class="delete-button" onclick="GalleryHandler.deleteImage('${img.id}')" title="Delete Image">
              <svg viewBox="0 0 24 24">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    `).join('');
    
    document.getElementById('prevPage').disabled = GalleryHandler.currentPage === 1;
    document.getElementById('nextPage').disabled = GalleryHandler.currentPage === Math.ceil(images.length / GalleryHandler.itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${GalleryHandler.currentPage} of ${Math.ceil(images.length / GalleryHandler.itemsPerPage)}`;
  },

  loadGalleryImage(id) {
    const image = galleryImages.find(img => img.id === id);
    if (!image) return;
    
    room.collection('gallery_images').update(id, {
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
    GalleryHandler.currentImage = generatedImage;
    document.getElementById('saveButton').style.display = 'block';
    document.getElementById('addGalleryButton').style.display = 'block';
    
    generatedImage.onload = function () {
      GalleryHandler.setupImageEditor();
    };
  },

  setupImageEditor() {
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    const editorControls = document.getElementById('editorControls');
    const fillImagePrompt = document.getElementById('fillImagePrompt');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const placeholderText = document.getElementById('placeholderText');
    loadingSpinner.style.display = 'none';
    placeholderText.style.display = 'none';
    if (GalleryHandler.currentImage) {
      canvas.width = GalleryHandler.currentImage.naturalWidth;
      canvas.height = GalleryHandler.currentImage.naturalHeight;
      ctx.drawImage(GalleryHandler.currentImage, 0, 0);
      GalleryHandler.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      GalleryHandler.currentImage.style.display = 'none';
      canvas.style.display = 'block';
      editorControls.style.display = 'flex';
    } else {
      canvas.style.display = 'none';
      editorControls.style.display = 'flex';
    }
    fillImagePrompt.style.display = 'none';
    if (!canvas.hasEventListener) {
      canvas.addEventListener('click', GalleryHandler.handleCanvasClick);
      canvas.hasEventListener = true;
    }
  },

  handleCanvasClick(e) {
    const canvas = document.getElementById('editCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const activeTool = document.querySelector('.tool-button.active');
    if (activeTool && activeTool.id === 'textTool') {
      TextHandler.handleTextTool(e.clientX, e.clientY, x, y);
      return;
    }

    if (!GalleryHandler.isShiftPressed && !GalleryHandler.isCtrlPressed) {
      GalleryHandler.currentSelection = null;
    }
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const newSelection = GalleryHandler.magicWandSelect(imageData, Math.round(x), Math.round(y), 32);
    if (GalleryHandler.isShiftPressed || GalleryHandler.isCtrlPressed) {
      if (GalleryHandler.currentSelection) {
        for (let i = 0; i < GalleryHandler.currentSelection.length; i++) {
          GalleryHandler.currentSelection[i] = GalleryHandler.currentSelection[i] || newSelection[i];
        }
      } else {
        GalleryHandler.currentSelection = newSelection;
      }
    } else {
      GalleryHandler.currentSelection = newSelection;
    }
    GalleryHandler.drawSelectionOverlay();
  },

  magicWandSelect(imageData, startX, startY, tolerance) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;
    const visited = new Uint8Array(width * height);
    const selected = new Uint8Array(width * height);
    const startPos = (startY * width + startX) * 4;
    const startR = pixels[startPos];
    const startG = pixels[startPos + 1];
    const startB = pixels[startPos + 2];
    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const pos = y * width + x;
      if (x < 0 || x >= width || y < 0 || y >= height || visited[pos]) {
        continue;
      }
      const pixelPos = pos * 4;
      const r = pixels[pixelPos];
      const g = pixels[pixelPos + 1];
      const b = pixels[pixelPos + 2];
      const colorDiff = Math.sqrt(Math.pow(r - startR, 2) + Math.pow(g - startG, 2) + Math.pow(b - startB, 2));
      if (colorDiff <= tolerance) {
        visited[pos] = 1;
        selected[pos] = 1;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
    return selected;
  },

  drawSelectionOverlay() {
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    ctx.putImageData(GalleryHandler.originalImageData, 0, 0);
    if (!GalleryHandler.currentSelection) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x;
        if (GalleryHandler.currentSelection[pos]) {
          const isEdge = x > 0 && !GalleryHandler.currentSelection[pos - 1] || x < width - 1 && !GalleryHandler.currentSelection[pos + 1] || y > 0 && !GalleryHandler.currentSelection[pos - width] || y < height - 1 && !GalleryHandler.currentSelection[pos + width];
          if (isEdge) {
            ctx.fillStyle = 'white';
            ctx.fillRect(x - 1, y - 1, 3, 3);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x - 1, y - 1, 3, 3);
          }
        }
      }
    }
  },

  filterGallery() {
    const searchInput = document.getElementById('gallerySearch');
    GalleryHandler.currentSearch = searchInput.value.trim();
    GalleryHandler.renderGallery();
  },

  renderPromptHistory(image) {
    if (!image.promptHistory || !image.promptHistory.length) {
      return `
        <div class="prompt-history">
          <div class="prompt-history-header" onclick="GalleryHandler.togglePromptHistory(this)">
            <span>Prompt History (1)</span>
            <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12">
              <path fill="currentColor" d="M6 8L2 4h8z"/>
            </svg>
          </div>
          <div class="prompt-history-entries" style="display: block;">
            <div class="prompt-history-entry">
              <div>Original prompt: ${image.prompt}</div>
              <div class="by-user">by <span class="username-link" onclick="GalleryHandler.showUserGallery('${image.username}')">${image.username}</span></div>
              <div class="timestamp">${new Date(image.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="prompt-history">
        <div class="prompt-history-header" onclick="GalleryHandler.togglePromptHistory(this)">
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
              <div class="by-user">by <span class="username-link" onclick="GalleryHandler.showUserGallery('${entry.username || image.username}')">${entry.username || image.username}</span></div>
              <div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  togglePromptHistory(header) {
    const historyDiv = header.parentElement;
    historyDiv.classList.toggle('expanded');
    const entriesDiv = historyDiv.querySelector('.prompt-history-entries');
    if (historyDiv.classList.contains('expanded')) {
      entriesDiv.style.display = 'block';
    } else {
      entriesDiv.style.display = 'none';
    }
  },

  showUserGallery(username) {
    GalleryHandler.currentUserFilter = username;
    GalleryHandler.currentPage = 1;  
    GalleryHandler.renderGallery();
  },

  clearUserFilter() {
    GalleryHandler.currentUserFilter = null;
    GalleryHandler.renderGallery();
  }
};

GalleryHandler.currentImage = null;
GalleryHandler.originalImageData = null;
GalleryHandler.currentSelection = null;
GalleryHandler.isShiftPressed = false;
GalleryHandler.isCtrlPressed = false;
GalleryHandler.selectionCanvas = null;
GalleryHandler.selectionCtx = null;
GalleryHandler.currentTextPosition = null;
GalleryHandler.textPreview = null;
GalleryHandler.currentUserFilter = null;

// Define AppState
const AppState = {
  init() {
    room = new WebsimSocket();
    GalleryHandler.galleryImages = [];
    GalleryHandler.initGallery();
  },

  async initGallery() {
    GalleryHandler.galleryImages = await room.collection('gallery_images').getList();
    room.collection('gallery_images').subscribe(images => {
      GalleryHandler.galleryImages = images;
      GalleryHandler.renderGallery();
    });
    GalleryHandler.renderGallery();
  }
};

// Define room
let room;

// Initialize when page loads
window.addEventListener('load', async () => {
  room = new WebsimSocket();
  AppState.init();
});