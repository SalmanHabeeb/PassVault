import React, { useState } from "react";
import "./auth.css";

import { invoke } from "@tauri-apps/api";

function AuthDialog({ handleCloseDialog }) {
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const handleInvalidPassword = () => {
    document.getElementById("invalid-password-dialog").showModal();
  };

  const handleAuth = async (e) => {
    try {
      let result = await invoke("authenticate", {
        masterPassword: e.target.password.value,
      });
      console.log(result);
      if (!result) {
        handleInvalidPassword();
        e.target.password.value = "";
        handleCloseDialog(false);
        return;
      }
    } catch (error) {
      console.error(error);
      handleCloseDialog(false);
      return;
    }
    e.target.password.value = "";
    handleCloseDialog(true);
  };

  const handleToggleShowAuthPassword = (event) => {
    setShowAuthPassword(!showAuthPassword);
    const inputElement = document.getElementById("auth-dialog__form").password;
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleCancelAuthFlow = () => {
    document.getElementById("auth-dialog__form").password.value = "";
    setShowAuthPassword(false);
    document.getElementById("auth-dialog").close();
    handleCloseDialog(false);
  };

  return (
    <dialog id="auth-dialog" className="auth-dialog">
      <form
        id="auth-dialog__form"
        className="auth-dialog__form"
        method="dialog"
        onSubmit={handleAuth}
      >
        <div className="auth-dialog__input-container">
          <input
            id="auth-dialog__input"
            className="auth-dialog__input"
            name="password"
            type={showAuthPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete="new-password"
            required
            autoFocus
          />
          <span className="auth-dialog__eye-icon">
            <i
              className="material-icons"
              onClick={(event) => handleToggleShowAuthPassword(event)}
              style={{
                cursor: "pointer",
              }}
            >
              {showAuthPassword ? "visibility_off" : "visibility"}
            </i>
          </span>
        </div>
        <div className="auth-dialog__form-button-container">
          <button className="auth-dialog__form-button" type="submit">
            Unlock
          </button>
          <button
            className="auth-dialog__form-button"
            type="button"
            onClick={handleCancelAuthFlow}
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default AuthDialog;
