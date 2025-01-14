const AppState = {
  room: null,

  async init() {
    this.room = new WebsimSocket();
    await Gallery.init();
    ImageEditor.setup();
  }
};

window.AppState = AppState;