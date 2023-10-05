import React from "react";
import "./table-menu.css";

import * as utils from "../../../../general/utils";

function TableMenu({
  time,
  handleClickAdder,
  handleClickLock,
  handleClickUnLock,
  handleClickExit,
  handleClickSettings,
}) {
  return (
    <div className="table-header-button-menu">
      <div
        className="table-header-button-container"
        onMouseOver={() => {
          utils.showHelp("help-adder");
        }}
        onMouseOut={() => {
          utils.hideHelp("help-adder");
        }}
      >
        <button className="table-header-button" onClick={handleClickAdder}>
          <i className="material-icons">add</i>
        </button>
        <div id="help-adder" className="help">
          Add new password
          <div className="arrow"></div>
        </div>
      </div>
      <div className="table-header-button-container">
        <button
          id="table-header-button-lock-passwords"
          className="table-header-button-lock-passwords"
          onClick={time === 0 ? handleClickUnLock : handleClickLock}
          onMouseOver={() => {
            utils.showHelp("help-lock");
          }}
          onMouseOut={() => {
            utils.hideHelp("help-lock");
          }}
        >
          <i className="material-icons">
            {time === 0 ? "lock_open" : "lock_clock"}
          </i>
        </button>

        <div id="help-lock" className="help">
          {time === 0 ? "Unlock Passwords" : "Lock the passwords"}
          <div className="arrow"></div>
        </div>
      </div>
      <div className="table-header-button-container">
        <button
          id="table-header-button-lock-app"
          className="table-header-button"
          onClick={handleClickExit}
          onMouseOver={() => {
            utils.showHelp("help-lock-app");
          }}
          onMouseOut={() => {
            utils.hideHelp("help-lock-app");
          }}
        >
          <i className="material-icons">exit_to_app</i>
        </button>
        <div id="help-lock-app" className="help">
          Lock app
          <div className="arrow"></div>
        </div>
      </div>
      <div className="table-header-button-container">
        <button
          id="table-header-button-settings"
          className="table-header-button"
          onClick={handleClickSettings}
          onMouseOver={() => {
            utils.showHelp("help-settings-app");
          }}
          onMouseOut={() => {
            utils.hideHelp("help-settings-app");
          }}
        >
          <i className="material-icons">settings</i>
        </button>
        <div id="help-settings-app" className="help">
          Settings
          <div className="arrow"></div>
        </div>
      </div>
    </div>
  );
}

export default TableMenu;
