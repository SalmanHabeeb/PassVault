import React, { useState, useEffect, useRef } from "react";
import "./login.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";

import { invoke } from "@tauri-apps/api";
import InvalidPasswordDialog from "../../general/components/invalid-password-dialog/invalid-password-dialog";

interface PasswordFormElement extends HTMLInputElement {
  password: HTMLInputElement;
  login__form_button: HTMLButtonElement;
}

interface Result {
  is_new_user: boolean;
  altered: boolean;
}

const LoginPage: React.FC<void> = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [showGeneratePassword, setShowGeneratePassword] = useState(false);
  const [safePassword, setSafePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const generateRandomPasswordRef = useRef(null);
  const dispatch = useDispatch();

  const handleToggleShowPassword = () => {
    setShowPassword(!showPassword);
    const inputElement = document.getElementById("login__form_password") as HTMLInputElement;
    inputElement.focus();
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleOutsideClick = (event: MouseEvent) => {
    if (
      generateRandomPasswordRef.current &&
      !(generateRandomPasswordRef.current as HTMLElement).contains(event.target as HTMLElement)
    ) {
      setShowGeneratePassword(false);
    }
  };

  const generateRandomPassword = () => {
    let buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    const length = (buffer[0] % 9) + 8;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = [];
    buffer = new Uint32Array(length);

    window.crypto.getRandomValues(buffer);

    for (let i = 0; i < length; i++) {
      password.push(charset[buffer[i] % charset.length]);
    }
    console.log(password);

    return password.join("");
  };

  const handlePasswordFocus = () => {
    if (isNewUser) {
      setSafePassword(generateRandomPassword());
      setShowGeneratePassword(true);
    }
  };

  const handleClickGeneratePassword = (password: string) => {
    console.log(document.getElementById("login__form"));
    const formElement = document.getElementById("login__form") as PasswordFormElement;
    formElement.password.value = password;
    setShowGeneratePassword(false);
  };

  const handleInvalidPassword = () => {
    const dialogElement = document.getElementById("invalid-password-dialog") as HTMLDialogElement;
    dialogElement.showModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.target as PasswordFormElement;
    formElement.login__form_button.disabled = true;
    try {
      let result = await invoke("authenticate", {
        masterPassword: formElement.password.value,
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
    formElement.login__form_button.disabled = false;
  };

  useEffect(() => {
    const start_app = async () => {
      try {
        let response: Result = await invoke("start_app", {});
        if (response.is_new_user) {
          setIsNewUser(true);
        } else if (response.altered) {
        }
      } catch (error) {
        console.error(error);
      }
    };
    start_app();
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  return (
    <div id="Login">
      <div className="login__container">
        <InvalidPasswordDialog />
        <form id="login__form" className="login__form" onSubmit={handleSubmit}>
          <div className="login__form-input-wrapper">
            <label
              className="login__form-input-label"
              htmlFor="login__form_password"
            >
              {isNewUser ? "Create your account" : "Enter your password"}
            </label>
            <div className="login__form-input-container">
              <input
                id="login__form_password"
                className="login__form_password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                onChange={handlePasswordFocus}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    if (!showGeneratePassword) {
                      setSafePassword(generateRandomPassword());
                      if (isNewUser) {
                        setShowGeneratePassword(true);
                      }
                    }
                    if(generateRandomPasswordRef.current) {
                    (generateRandomPasswordRef.current as HTMLInputElement).focus();}
                  }
                }}
                autoFocus
                required
              />
              <span
                className="login__form__toggle-password"
                onClick={handleToggleShowPassword}
              >
                <i className="material-icons">
                  {showPassword ? "visibility_off" : "visibility"}
                </i>
              </span>
              <div
                ref={generateRandomPasswordRef}
                className="suggest-password login__form-suggest-password"
                style={{ display: showGeneratePassword ? "block" : "none" }}
                tabIndex={0}
                onClick={() => handleClickGeneratePassword(safePassword)}
                onKeyDown={(e) => {
                  const formElement = document.getElementById("login__form") as PasswordFormElement;
                  if (e.key === "Enter") {
                    handleClickGeneratePassword(safePassword);
                  }
                  if (e.key === "ArrowDown") {
                    formElement.password.focus();
                  }
                  if (e.key === "ArrowUp") {
                    formElement.password.focus();
                  }
                }}
              >
                Use Secure Password:{` ${safePassword}`}
              </div>
            </div>
          </div>
          <div className="login__form-button-container">
            <button
              className="login__form-button"
              name="login__form_button"
              type="submit"
            >
              {isNewUser ? "Create" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
