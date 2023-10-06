import React, { useState } from "react";
import "./auth.css";

import { invoke } from "@tauri-apps/api";


interface PasswordFormElement extends HTMLInputElement {
  password: HTMLInputElement;
}

type Props = {
  handleCloseDialog: (isAuthenticated: boolean) => void,
}

const AuthDialog: React.FC<Props> = ({ handleCloseDialog }) => {
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const handleInvalidPassword = () => {
    const element = document.getElementById("invalid-password-dialog") as HTMLDialogElement;
    element.showModal();
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    const element =  e.target as PasswordFormElement;
    try {
      let result = await invoke("authenticate", {
        masterPassword: element.password.value,
      });
      console.log(result);
      if (!result) {
        handleInvalidPassword();
        element.password.value = "";
        handleCloseDialog(false);
        return;
      }
    } catch (error) {
      console.error(error);
      handleCloseDialog(false);
      return;
    }
    element.password.value = "";
    handleCloseDialog(true);
  };

  const handleToggleShowAuthPassword = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setShowAuthPassword(!showAuthPassword);
    const inputElement = (document.getElementById("auth-dialog__form") as PasswordFormElement).password;
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleCancelAuthFlow = () => {
    const formElement = document.getElementById("auth-dialog__form") as PasswordFormElement;
    formElement.password.value = "";
    setShowAuthPassword(false);
    const dialogElement = document.getElementById("auth-dialog") as HTMLDialogElement;
    dialogElement.close();
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
