const {
    contextBridge,
    ipcRenderer
} = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "IPC", {
        send: (data) => {
            ipcRenderer.send("IPC", data);
        },
        receive: (func) => {
            ipcRenderer.on("IPC", (event, ...args) => func(...args));
        }
    }
);