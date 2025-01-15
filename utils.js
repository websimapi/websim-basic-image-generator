// Utility functions shared between scripts

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

// Other utility functions