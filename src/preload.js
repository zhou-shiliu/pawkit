const { contextBridge, ipcRenderer } = require('electron');

function onChannel(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  getCatState: () => ipcRenderer.invoke('get-cat-state'),
  getRoamingState: () => ipcRenderer.invoke('get-roaming-state'),
  getPresenceState: () => ipcRenderer.invoke('get-presence-state'),
  feedCat: () => ipcRenderer.invoke('feed-cat'),
  waterCat: () => ipcRenderer.invoke('water-cat'),
  petCat: () => ipcRenderer.invoke('pet-cat'),
  setPresenceIdleThreshold: (seconds) => ipcRenderer.invoke('set-presence-idle-threshold', seconds),
  setPresenceOverride: (override) => ipcRenderer.invoke('set-presence-override', override),
  onCatStateUpdated: (callback) => onChannel('cat-state-updated', callback),
  onRoamingStateUpdated: (callback) => onChannel('roaming-state-updated', callback),
  onPresenceStateUpdated: (callback) => onChannel('presence-state-updated', callback),
  onFeedCat: (callback) => onChannel('feed-cat', callback),
  onWaterCat: (callback) => onChannel('water-cat', callback),
  onPetCat: (callback) => onChannel('pet-cat', callback),
  hideWindow: () => ipcRenderer.send('hide-window'),
  // Sound IPC
  playSound: (payload) => ipcRenderer.invoke('play-sound', payload),
  getSoundSettings: () => ipcRenderer.invoke('get-sound-settings'),
  setSoundVolume: (volumes) => ipcRenderer.invoke('set-sound-volume', volumes),
  onPlaySound: (callback) => onChannel('play-sound', callback),
  onSoundVolumeUpdated: (callback) => onChannel('sound-volume-updated', callback),
});
