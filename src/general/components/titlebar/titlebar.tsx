import React from "react";
import "./titlebar.css";

import { appWindow } from "@tauri-apps/api/window";

const TitleBar = () => {
  return (
    <div data-tauri-drag-region className="titlebar">
      <p className="titlebar-title">PassVault</p>
      <div className="titlebar-button-container">
        <div
          className="titlebar-button"
          id="titlebar-minimize"
          onClick={() => {
            appWindow.minimize();
          }}
        >
          <img
            src="https://api.iconify.design/mdi:window-minimize.svg"
            alt="minimize"
          />
        </div>
        <div
          className="titlebar-button"
          id="titlebar-maximize"
          onClick={() => {
            appWindow.toggleMaximize();
          }}
        >
          <img
            src="https://api.iconify.design/mdi:window-maximize.svg"
            alt="maximize"
          />
        </div>
        <div
          className="titlebar-button"
          id="titlebar-close"
          onClick={() => {
            appWindow.close();
          }}
        >
          <img src="https://api.iconify.design/mdi:close.svg" alt="close" />
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
