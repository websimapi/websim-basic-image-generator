// Add these helper functions to gallery.js

function getImageFingerprint(src) {
  // Get a unique identifier for an image based on its src
  // For generated images, this will be the prompt
  // For uploaded images, this will be the full URL
  return src.includes('replicate.com') ? src.split('?')[0] : src;
}

async function removeMatchingImages(fingerprint) {
  const matches = galleryImages.filter(img => 
    getImageFingerprint(img.imageUrl) === fingerprint
  );
  
  for (const img of matches) {
    await room.collection('gallery_images').delete(img.id);
  }
}