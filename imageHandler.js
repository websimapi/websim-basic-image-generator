const ImageHandler = {
  async saveImage() {
    const canvas = document.getElementById('editCanvas');
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  async addToGallery() {
    const canvas = document.getElementById('editCanvas');
    const promptInput = document.getElementById('promptInput');
    const prefixSelect = document.getElementById('prefixPrompt');
    const suffixSelect = document.getElementById('suffixPrompt');
    const fullPrompt = `${prefixSelect.value}${promptInput.value.trim()}${suffixSelect.value}`;

    try {
      const sourceImage = galleryImages.find(img => 
        img.imageUrl === currentImage.src
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
  },

  async handleImageUpload(event) {
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
          currentImage = uploadedImage;
          setupImageEditor();
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
  }
};

window.ImageHandler = ImageHandler;