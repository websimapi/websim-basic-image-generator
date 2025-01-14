const EventHandlers = {
  setup() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.getElementById('promptInput').addEventListener('keypress', this.handlePromptEnter);
    document.getElementById('colorPicker').addEventListener('input', this.handleColorChange);
    document.getElementById('textInput').addEventListener('input', this.updateTextPreview);
    document.getElementById('fontFamily').addEventListener('change', this.updateTextPreview);
    document.getElementById('fontSize').addEventListener('input', this.updateTextPreview);
    document.getElementById('textColor').addEventListener('input', this.updateTextPreview);
  },

  handleKeyDown(e) {
    if (e.shiftKey) isShiftPressed = true;
    if (e.ctrlKey) isCtrlPressed = true;
  },

  handleKeyUp(e) {
    if (!e.shiftKey) isShiftPressed = false;
    if (!e.ctrlKey) isCtrlPressed = false;
  },

  handlePromptEnter(e) {
    if (e.key === 'Enter') {
      generateImage();
    }
  },

  handleColorChange(e) {
    const colorPreview = document.getElementById('colorPreview');
    const colorValue = document.getElementById('colorValue');
    colorPreview.style.backgroundColor = e.target.value;
    colorValue.textContent = e.target.value.toUpperCase();
  },

  updateTextPreview() {
    if (!textPreview || !currentTextPosition) return;
    
    const text = document.getElementById('textInput').value;
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    
    textPreview.style.fontFamily = fontFamily;
    textPreview.style.fontSize = `${fontSize}px`;
    textPreview.style.color = color;
    textPreview.style.pointerEvents = 'none';
    textPreview.textContent = text || 'Enter text...';
  }
};

window.EventHandlers = EventHandlers;