import React, { useState, useEffect } from "react";
import "./titlebar.css";

import { appWindow } from "@tauri-apps/api/window";

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    const checkMaximized = async () => {
      if (await appWindow.isMaximized()) {
        setIsMaximized(true);
      } else {
        setIsMaximized(false);
      }
    };

    checkMaximized();
  }, []);

  return (
    <div data-tauri-drag-region className="titlebar">
      <p data-tauri-drag-region className="titlebar-title">
        PassVault
      </p>
      <div className="titlebar-button-container">
        <div
          className="titlebar-button"
          id="titlebar-minimize"
          onClick={() => {
            appWindow.minimize();
          }}
        >
          <span className="material-icons window-icon">remove</span>
        </div>
        <div
          className="titlebar-button"
          id="titlebar-maximize"
          onClick={() => {
            appWindow.toggleMaximize();
            setIsMaximized(!isMaximized);
          }}
        >
          <span className="material-icons window-icon">crop_square</span>
        </div>
        <div
          className="titlebar-button"
          id="titlebar-close"
          onClick={() => {
            appWindow.close();
          }}
        >
          <span className="material-icons window-icon">close</span>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
