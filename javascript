galleryEl.innerHTML = paginatedImages.map(img => `
  <div class="gallery-item">
    <div class="gallery-image" 
         style="background-image: url('${img.imageUrl}')" 
         onclick="loadGalleryImage('${img.id}')"
         role="img" 
         aria-label="${img.prompt}">
    </div>
    <div class="metadata">
      <div class="title" ${img.username === room.party.client.username ? 'onclick="editTitle(\'' + img.id + '\')"' : ''}>
        ${img.title || 'Untitled'} 
        ${img.username === room.party.client.username ? '<span class="edit-icon">✎</span>' : ''}
      </div>
      <div>by ${img.username}</div>
      <div>${new Date(img.created_at).toLocaleDateString()}</div>
      <div class="prompt-history">
        <details>
          <summary>Prompt History</summary>
          <ol>
            ${(img.promptHistory || []).map((entry, i) => `
              <li>
                ${entry.type === 'original' ? '<strong>Original:</strong>' : '<strong>Selection Fill:</strong>'}
                ${entry.prompt}
                <span class="prompt-date">${new Date(entry.timestamp).toLocaleString()}</span>
              </li>
            `).join('')}
          </ol>
        </details>
      </div>
    </div>
    <div class="stats">
      <span>${img.views || 0} views</span>
      <span>${img.uses || 0} uses</span>
    </div>
    ${img.username === room.party.client.username ? `
      <div class="gallery-item-controls">
        <button class="edit-button" onclick="editTitle('${img.id}')">Edit Title</button>
        <button class="delete-button" onclick="deleteImage('${img.id}')">Delete</button>
      </div>
    ` : ''}
  </div>
`).join('');