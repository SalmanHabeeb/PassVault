import React from "react";
import "./login.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";

import { invoke } from "@tauri-apps/api";

function LoginPage() {
  const dispatch = useDispatch();

  const handleInvalidPassword = () => {
    document.getElementById("invalid-password-dialog").showModal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.target.login__form_button.disabled = true;
    try {
      let result = await invoke("authenticate", {
        masterPassword: e.target.password.value,
      });
      console.log(result);
      if (result) {
        sessionStorage.setItem("isLoggedIn", "true");
        dispatch(loginActions.setIsLoggedIn(true));
      } else {
        handleInvalidPassword();
      }
    } catch (error) {
      console.error(error);
    }
    e.target.login__form_button.disabled = false;
  };

  return (
    <div id="Login">
      <div className="login__container">
        <dialog
          id="invalid-password-dialog"
          className="invalid-password-dialog"
        >
          <p>Invalid password</p>
          <form method="dialog" type="submit">
            <button className="invalid-password-dialog__form-button">Ok</button>
          </form>
        </dialog>
        <form className="login__form" onSubmit={handleSubmit}>
          <input
            id="login__form_password"
            className="login__form_password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            autoFocus
            required
          />
          <div className="login__form-button-container">
            <button
              className="login__form-button"
              name="login__form_button"
              type="submit"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
