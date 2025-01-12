// In generateImage() function, when creating the prompt history:
await room.collection('gallery_images').create({
  title: promptInput.value.trim().substring(0, 50),
  prompt: fullPrompt,
  imageUrl: generatedImage.src,
  views: 0,
  uses: 0,
  modified: false,
  promptHistory: [{
    type: 'original',
    prompt: fullPrompt,
    timestamp: new Date().toISOString(),
    username: room.party.client.username
  }]
});

// In generateSelectionFill() function, when adding to prompt history:
promptHistory.push({
  type: 'selection',
  prompt: fullPrompt,
  timestamp: new Date().toISOString(),
  parentId: parentImage ? parentImage.id : null,
  username: room.party.client.username
});