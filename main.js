import { WebsimSocket } from '@websim/websim-socket';
import { initializeEditor, setupImageEditor, EDITOR_STATE } from './imageEditor.js';
import { initGallery, showGalleryTab, changePage, filterGallery, clearUserFilter } from './gallery.js';

// Global state
let room;
let currentImage = null;
let referenceImageDescription = null;

// NSFW Detection Class
class SimpleNSFWDetector {
    constructor() {
        this.model = null;
        this.isLoading = false;
    }

    async loadModel() {
        if (this.model) return this.model;
        if (this.isLoading) {
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.model;
        }

        try {
            this.isLoading = true;
            console.log('Loading NSFW detection model...');
            // Assumes nsfwjs is loaded on the window
            this.model = await window.nsfwjs.load();
            console.log('NSFW model loaded successfully');
            return this.model;
        } catch (error) {
            console.error('Failed to load NSFW model:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async analyzeImage(imageElement) {
        try {
            const model = await this.loadModel();
            const predictions = await model.classify(imageElement);
            
            const nsfwScore = predictions.find(p => p.className === 'Porn')?.probability || 0;
            const sexyScore = predictions.find(p => p.className === 'Sexy')?.probability || 0;
            const hentaiScore = predictions.find(p => p.className === 'Hentai')?.probability || 0;
            
            const riskScore = Math.round((nsfwScore + sexyScore * 0.7 + hentaiScore) * 100);
            
            return {
                riskScore,
                isNSFW: riskScore > 50,
                predictions,
                categories: {
                    porn: Math.round(nsfwScore * 100),
                    sexy: Math.round(sexyScore * 100),
                    hentai: Math.round(hentaiScore * 100),
                    neutral: Math.round((predictions.find(p => p.className === 'Neutral')?.probability || 0) * 100),
                    drawing: Math.round((predictions.find(p => p.className === 'Drawing')?.probability || 0) * 100)
                }
            };
        } catch (error) {
            console.error('Error analyzing image:', error);
            throw error;
        }
    }

    async analyzeURL(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
                try {
                    const result = await this.analyzeImage(img);
                    resolve({ ...result, imgSrc: imageUrl });
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image from URL. Check CORS policy.'));
            img.src = imageUrl;
        });
    }
}

// Initialize NSFW detector
let nsfwDetector = null;

// Initialize the application
window.addEventListener('load', async () => {
  room = new WebsimSocket();
  await initGallery();
  initializeEditor();
  setupColorPicker();
  setupEventListeners();
  nsfwDetector = new SimpleNSFWDetector();
  setupFilterControls();
  
  // Expose to window for gallery filtering
  window.nsfwDetector = nsfwDetector;
  window.shouldFilter = shouldFilter;
});

// Setup filter controls
function setupFilterControls() {
  const sensitivitySlider = document.getElementById('filterSensitivity');
  const sensitivityValue = document.getElementById('sensitivityValue');
  
  sensitivitySlider.addEventListener('input', (e) => {
    sensitivityValue.textContent = e.target.value;
  });
}

// Filter settings toggle
function toggleFilterSettings() {
  const filterSettings = document.getElementById('filterSettings');
  filterSettings.style.display = filterSettings.style.display === 'none' ? 'block' : 'none';
}

// Check if content should be filtered
function shouldFilter(analysis) {
  const enableFilter = document.getElementById('enableFilter').checked;
  if (!enableFilter) return false;
  
  const sensitivity = parseInt(document.getElementById('filterSensitivity').value);
  const filterPorn = document.getElementById('filterPorn').checked;
  const filterSexy = document.getElementById('filterSexy').checked;
  const filterHentai = document.getElementById('filterHentai').checked;
  
  if (filterPorn && analysis.categories.porn >= sensitivity) return true;
  if (filterSexy && analysis.categories.sexy >= sensitivity) return true;  
  if (filterHentai && analysis.categories.hentai >= sensitivity) return true;
  
  return false;
}

// Apply content filter to image
async function applyContentFilter(imageElement, imageUrl) {
  try {
    const analysis = await nsfwDetector.analyzeURL(imageUrl);
    
    if (shouldFilter(analysis)) {
      const container = imageElement.parentElement;
      if (container && !container.querySelector('.censored-overlay')) {
        createCensoredOverlay(container, imageElement, analysis);
      }
    }
  } catch (error) {
    console.error('Error applying content filter:', error);
  }
}

// Create censored overlay
function createCensoredOverlay(container, imageElement, analysis) {
  container.classList.add('censored-image-container');
  imageElement.classList.add('blurred-image');
  
  const overlay = document.createElement('div');
  overlay.className = 'censored-overlay';
  overlay.innerHTML = `
    <div class="censored-content">
      <div class="censored-icon">🛡️</div>
      <div class="censored-title">Content Filtered</div>
      <div class="censored-subtitle">This image was flagged by the content filter</div>
      <div class="risk-score">Risk Score: ${analysis.riskScore}%</div>
      <button class="reveal-button" onclick="revealCensoredImage(this)">
        👁️ Click to Reveal
      </button>
    </div>
  `;
  
  container.appendChild(overlay);
}

// Reveal censored image
function revealCensoredImage(button) {
  const overlay = button.closest('.censored-overlay');
  const container = overlay.parentElement;
  const image = container.querySelector('img');
  
  overlay.style.opacity = '0';
  image.classList.remove('blurred-image');
  
  setTimeout(() => {
    overlay.remove();
    container.classList.remove('censored-image-container');
  }, 300);
}

// Setup event listeners
function setupEventListeners() {
  setupColorPickerEvents();
  setupTextControlEvents();
}

function setupColorPicker() {
  const colorPicker = document.getElementById('colorPicker');
  const colorPreview = document.getElementById('colorPreview');
  const colorValue = document.getElementById('colorValue');
  
  colorPreview.style.backgroundColor = colorPicker.value;
  colorValue.textContent = colorPicker.value.toUpperCase();
}

function setupColorPickerEvents() {
  document.getElementById('colorPicker').addEventListener('input', function (e) {
    document.getElementById('colorPreview').style.backgroundColor = e.target.value;
    document.getElementById('colorValue').textContent = e.target.value.toUpperCase();
  });
}

function setupTextControlEvents() {
  document.getElementById('textInput').addEventListener('input', updateTextPreview);
  document.getElementById('fontFamily').addEventListener('change', updateTextPreview);
  document.getElementById('fontSize').addEventListener('input', updateTextPreview);
  document.getElementById('textColor').addEventListener('input', updateTextPreview);
}

// Image generation
async function generateImage() {
  const prefixSelect = document.getElementById('prefixPrompt');
  const promptInput = document.getElementById('promptInput');
  const suffixSelect = document.getElementById('suffixPrompt');
  
  let basePrompt = promptInput.value.trim();
  
  if (referenceImageDescription) {
    if (basePrompt) {
      basePrompt = `${referenceImageDescription}, incorporating elements of: ${basePrompt}`;
    } else {
      basePrompt = referenceImageDescription;
    }
  }
  
  const fullPrompt = `${prefixSelect.value}${basePrompt}${suffixSelect.value}`;

  if (!basePrompt) {
    alert('Please enter a prompt or upload a reference image!');
    return;
  }

  showLoadingState();
  clearPreviousImages();

  try {
    const result = await websim.imageGen({
      prompt: fullPrompt,
      aspect_ratio: "1:1",
    });

    const generatedImage = await createImageElement(result.url, fullPrompt);
    currentImage = generatedImage;
    
    generatedImage.onload = async function() {
      if (generatedImage.dataset.freshGeneration === 'true') {
        await handleImageGenerated(generatedImage, fullPrompt, result.url);
      }
    };

  } catch (error) {
    console.error('Error generating image:', error);
    hideLoadingState();
    alert('Failed to generate image. Please try again.');
  }
}

function showLoadingState() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  const saveButton = document.getElementById('saveButton');
  const addGalleryButton = document.getElementById('addGalleryButton');

  loadingSpinner.style.display = 'block';
  placeholderText.style.display = 'none';
  saveButton.style.display = 'none';
  addGalleryButton.style.display = 'none';
}

function hideLoadingState() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const placeholderText = document.getElementById('placeholderText');
  
  loadingSpinner.style.display = 'none';
  placeholderText.style.display = 'block';
}

function clearPreviousImages() {
  const imageContainer = document.getElementById('imageContainer');
  const existingImages = imageContainer.querySelectorAll('img');
  existingImages.forEach(img => img.remove());
}

async function createImageElement(url, prompt) {
  const imageContainer = document.getElementById('imageContainer');
  const generatedImage = document.createElement('img');
  
  generatedImage.id = `generatedImage_${Date.now()}`;
  generatedImage.className = 'generated-image';
  generatedImage.style.display = 'none';
  generatedImage.crossOrigin = 'anonymous';
  generatedImage.dataset.freshGeneration = 'true';
  generatedImage.src = url;
  generatedImage.alt = prompt;

  imageContainer.appendChild(generatedImage);
  return generatedImage;
}

async function handleImageGenerated(generatedImage, fullPrompt, imageUrl) {
  generatedImage.dataset.freshGeneration = 'false';
  
  document.getElementById('loadingSpinner').style.display = 'none';
  generatedImage.style.display = 'block';
  document.getElementById('placeholderText').style.display = 'none';
  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';

  try {
    const galleryEntry = await room.collection('gallery_images').create({
      prompt: fullPrompt,
      imageUrl: imageUrl,
      views: 0,
      uses: 0,
      promptHistory: [{
        prompt: fullPrompt,
        timestamp: new Date().toISOString(),
        username: room.party.client.username
      }]
    });
    
    generatedImage.dataset.galleryId = galleryEntry.id;
    setupImageEditor(generatedImage);
    
    // Apply content filter to generated image
    await applyContentFilter(generatedImage, imageUrl);
    
  } catch (error) {
    console.error('Error processing generated image:', error);
    alert('Failed to process generated image. Please try again.');
  }
}

// Image upload handlers
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    const uploadedImage = await createUploadedImageElement(objectUrl, file.name);
    
    clearPreviousImages();
    document.getElementById('imageContainer').appendChild(uploadedImage);
    
    showImageControls();
    currentImage = uploadedImage;
    
    uploadedImage.onload = function() {
      setupImageEditor(uploadedImage);
      URL.revokeObjectURL(objectUrl);
    };

  } catch (error) {
    console.error('Error handling image upload:', error);
    alert('Failed to load image. Please try again.');
  }
  
  event.target.value = '';
}

async function createUploadedImageElement(objectUrl, fileName) {
  const uploadedImage = document.createElement('img');
  uploadedImage.id = `generatedImage_${Date.now()}`;
  uploadedImage.className = 'generated-image';
  uploadedImage.style.display = 'none';
  uploadedImage.crossOrigin = 'anonymous';
  uploadedImage.src = objectUrl;
  uploadedImage.alt = fileName;
  return uploadedImage;
}

function showImageControls() {
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('placeholderText').style.display = 'none';
  document.getElementById('saveButton').style.display = 'block';
  document.getElementById('addGalleryButton').style.display = 'block';
}

// Reference image handling
async function handleReferenceImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  try {
    await processReferenceImage(file);
  } catch (error) {
    console.error('Error handling reference image upload:', error);
    alert('Failed to load reference image. Please try again.');
  }
  
  event.target.value = '';
}

async function processReferenceImage(file) {
  const referenceContainer = document.getElementById('referenceImageContainer');
  const referencePreview = document.getElementById('referenceImagePreview');
  const descriptionEl = document.getElementById('referenceImageDescription');
  
  referenceContainer.style.display = 'block';
  
  const objectUrl = URL.createObjectURL(file);
  referencePreview.src = objectUrl;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    const imageDataUrl = e.target.result;
    
    try {
      const description = await analyzeReferenceImage(imageDataUrl);
      referenceImageDescription = description;
      descriptionEl.textContent = description;
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error analyzing reference image:', error);
      descriptionEl.textContent = 'Error analyzing image. Please try again.';
      alert('Failed to analyze reference image. Please try again.');
    }
  };
  
  reader.readAsDataURL(file);
}

async function analyzeReferenceImage(imageDataUrl) {
  const completion = await websim.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this image in detail for use as a prompt for AI image generation. Focus on the subject, style, composition, colors, lighting, and mood. Be specific and descriptive."
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl }
          }
        ]
      }
    ]
  });
  
  return completion.content;
}

function clearReferenceImage() {
  document.getElementById('referenceImageContainer').style.display = 'none';
  document.getElementById('referenceImagePreview').src = '';
  document.getElementById('referenceImageDescription').textContent = 'Analyzing image...';
  referenceImageDescription = null;
}

// Utility functions
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    generateImage();
  }
}

function saveImage() {
  const canvas = document.getElementById('editCanvas');
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
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
    const imageUrl = await websim.upload(file);
    
    await room.collection('gallery_images').create({
      prompt: fullPrompt,
      title: fullPrompt,
      imageUrl: imageUrl,
      views: 0,
      uses: 0,
      modified: true
    });
    
    alert('Image added to gallery successfully!');
    
  } catch (error) {
    console.error('Error adding to gallery:', error);
    alert('Failed to add image to gallery. Please try again.');
  }
}

// Text functionality
function updateTextPreview() {
  if (!EDITOR_STATE.textPreview || !EDITOR_STATE.currentTextPosition) return;
  
  const text = document.getElementById('textInput').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSize = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;
  
  EDITOR_STATE.textPreview.style.fontFamily = fontFamily;
  EDITOR_STATE.textPreview.style.fontSize = `${fontSize}px`;
  EDITOR_STATE.textPreview.style.color = color;
  EDITOR_STATE.textPreview.style.pointerEvents = 'none';
  EDITOR_STATE.textPreview.textContent = text || 'Enter text...';
}

// Selection fill functionality
async function generateSelectionFill() {
  if (!EDITOR_STATE.currentSelection || !currentImage) return;
  
  const prompt = document.getElementById('selectionPromptInput').value.trim();
  if (!prompt) {
    alert('Please enter a prompt for the selected region');
    return;
  }

  const prefixSelect = document.getElementById('prefixPrompt');
  const suffixSelect = document.getElementById('suffixPrompt');
  const fullPrompt = `${prefixSelect.value}${prompt}${suffixSelect.value}`;

  document.getElementById('loadingSpinner').style.display = 'block';

  try {
    const result = await websim.imageGen({
      prompt: fullPrompt,
      aspect_ratio: "1:1",
    });

    await applySelectionFill(result.url, fullPrompt);
    
  } catch (error) {
    console.error('Error generating fill image:', error);
    document.getElementById('loadingSpinner').style.display = 'none';
    alert('Failed to generate fill image. Please try again.');
  }
}

async function applySelectionFill(imageUrl, fullPrompt) {
  const generatedImage = document.createElement('img');
  generatedImage.crossOrigin = 'anonymous';
  generatedImage.style.display = 'none';
  generatedImage.dataset.freshFill = 'true';
  generatedImage.src = imageUrl;
  generatedImage.alt = fullPrompt;

  generatedImage.onload = async function() {
    if (generatedImage.dataset.freshFill !== 'true') return;
    generatedImage.dataset.freshFill = 'false';
    
    document.getElementById('loadingSpinner').style.display = 'none';
    
    // Apply the fill logic here (this would be moved to imageEditor.js)
    // For now, just hide the fill prompt
    document.getElementById('fillImagePrompt').style.display = 'none';
    generatedImage.remove();
  };

  document.body.appendChild(generatedImage);
}

// Expose functions to global scope for onclick handlers
window.generateImage = generateImage;
window.handleImageUpload = handleImageUpload;
window.handleReferenceImageUpload = handleReferenceImageUpload;
window.clearReferenceImage = clearReferenceImage;
window.handleKeyPress = handleKeyPress;
window.saveImage = saveImage;
window.addToGallery = addToGallery;
window.generateSelectionFill = generateSelectionFill;
window.updateTextPreview = updateTextPreview;
window.showGalleryTab = showGalleryTab;
window.changePage = changePage;
window.filterGallery = filterGallery;
window.clearUserFilter = clearUserFilter;
window.toggleFilterSettings = toggleFilterSettings;
window.revealCensoredImage = revealCensoredImage;

// Export for other modules
export { room, currentImage };