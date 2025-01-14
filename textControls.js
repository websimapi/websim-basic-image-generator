const TextControls = {
  state: {
    currentTextPosition: null,
    textPreview: null
  },

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
          <button onclick="TextControls.commitText()">Apply</button>
          <button onclick="TextControls.cancelText()">Cancel</button>
        </div>
      </div>
    `;
  },

  handleTextTool(clientX, clientY, canvasX, canvasY) {
    const textControls = document.getElementById('textControls');
    const canvas = document.getElementById('editCanvas');
    const rect = canvas.getBoundingClientRect();
    
    if (TextControls.state.textPreview) {
      TextControls.state.textPreview.remove();
    }
    
    TextControls.state.textPreview = document.createElement('div');
    TextControls.state.textPreview.className = 'text-preview';
    TextControls.state.textPreview.style.position = 'fixed';
    TextControls.state.textPreview.style.left = `${clientX}px`;
    TextControls.state.textPreview.style.top = `${clientY}px`;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    TextControls.state.currentTextPosition = { 
      x: canvasX, 
      y: canvasY,
      scaleX,
      scaleY
    };

    document.body.appendChild(TextControls.state.textPreview);
    
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
    
    TextControls.updateTextPreview();
  },

  updateTextPreview() {
    if (!TextControls.state.textPreview || !TextControls.state.currentTextPosition) return;
    
    const text = document.getElementById('textInput').value;
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    
    TextControls.state.textPreview.style.fontFamily = fontFamily;
    TextControls.state.textPreview.style.fontSize = `${fontSize}px`;
    TextControls.state.textPreview.style.color = color;
    TextControls.state.textPreview.style.pointerEvents = 'none';
    TextControls.state.textPreview.textContent = text || 'Enter text...';
  },

  commitText() {
    if (!TextControls.state.currentTextPosition) return;
    
    const canvas = document.getElementById('editCanvas');
    const ctx = canvas.getContext('2d');
    const text = document.getElementById('textInput').value;
    
    if (!text.trim()) {
      TextControls.cancelText();
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
  
    ctx.fillText(text, TextControls.state.currentTextPosition.x, TextControls.state.currentTextPosition.y);
    
    ctx.restore();
    
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const sourceImage = galleryImages.find(img => img.imageUrl === currentImage.src);
    
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
      
      const blob = canvas.toBlob(async (blob) => {
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
      }, 'image/png');
    }
    
    TextControls.cancelText();
  },

  cancelText() {
    const textControls = document.getElementById('textControls');
    textControls.style.display = 'none';
    document.getElementById('textInput').value = '';
    
    if (TextControls.state.textPreview) {
      TextControls.state.textPreview.remove();
      TextControls.state.textPreview = null;
    }
    
    TextControls.state.currentTextPosition = null;
  }
};

window.TextControls = TextControls;