import React, { useState, useEffect, useRef } from "react";
import "./login1.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";
import * as utils from "../../general/utils";

import { event, invoke } from "@tauri-apps/api";
import InvalidPasswordDialog from "../../general/components/message-dialog/message-dialog";
import { authenticate } from "../../general/utils/commands";
import Logo from "../../general/components/logo/logo";

interface PasswordFormElement extends HTMLInputElement {
  password: HTMLInputElement;
  logo_button: HTMLButtonElement;
}

interface Result {
  is_new_user: boolean;
  altered: boolean;
}

const LoginPage = () => {
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const generateRandomPasswordRef = useRef(null);
  const [safePassword, setSafePassword] = useState<string>("");
  const [showGeneratePassword, setShowGeneratePassword] =
    useState<boolean>(false);

  const [arcYCoords, setArcYCoords] = useState<number[]>(new Array(8).fill(0));

  const dispatch = useDispatch();

  const handleToggleShowPassword = () => {
    setShowPassword(!showPassword);
    const inputElement = document.getElementById(
      "login-input-password"
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
      const inputValue = inputElement.value;
      inputElement.value = "";
      setTimeout(() => {
        inputElement.value = inputValue;
      }, 0);
    }
  };

  // Function to find the circle on
  // which the given three points lie
  const findCircle = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ): number[] => {
    var x12 = x1 - x2;
    var x13 = x1 - x3;

    var y12 = y1 - y2;
    var y13 = y1 - y3;

    var y31 = y3 - y1;
    var y21 = y2 - y1;

    var x31 = x3 - x1;
    var x21 = x2 - x1;

    //x1^2 - x3^2
    var sx13 = Math.pow(x1, 2) - Math.pow(x3, 2);

    // y1^2 - y3^2
    var sy13 = Math.pow(y1, 2) - Math.pow(y3, 2);

    var sx21 = Math.pow(x2, 2) - Math.pow(x1, 2);
    var sy21 = Math.pow(y2, 2) - Math.pow(y1, 2);

    var f =
      (sx13 * x12 + sy13 * x12 + sx21 * x13 + sy21 * x13) /
      (2 * (y31 * x12 - y21 * x13));
    var g =
      (sx13 * y12 + sy13 * y12 + sx21 * y13 + sy21 * y13) /
      (2 * (x31 * y12 - x21 * y13));

    var c = -Math.pow(x1, 2) - Math.pow(y1, 2) - 2 * g * x1 - 2 * f * y1;

    // eqn of circle be
    // x^2 + y^2 + 2*g*x + 2*f*y + c = 0
    // where centre is (h = -g, k = -f) and radius r
    // as r^2 = h^2 + k^2 - c
    var h = -g;
    var k = -f;
    var sqr_of_r = h * h + k * k - c;

    // r is the radius
    var r = Math.sqrt(sqr_of_r);
    return [r, h, k];
  };

  const setCircleYCordinates = (length: number) => {
    let width = 135;
    let height = 50;
    let x1 = width / 2;
    let y1 = 0;

    let x2 = -width / 2;
    let y2 = 0;

    let x3 = 0;
    let y3 = height;
    let [r, h, k] = findCircle(x1, y1, x2, y2, x3, y3);
    let centerX = width / 2;
    let nChar = length > 8 ? length : 8;
    let distFactor = width / nChar;
    let newList: number[] = [];
    for (let i = 0; i < nChar; i++) {
      let elementDistFromCenter =
        Math.abs(nChar / 2 - (i + 0.5)) * distFactor + width / (nChar * 2);
      let yCoord = Math.sqrt(r ** 2 + (elementDistFromCenter - h) ** 2) + k;
      newList.push(yCoord);
    }
    setArcYCoords(newList);
  };

  const handleClickGeneratePassword = (password: string) => {
    setPassword(password);
    setCircleYCordinates(password.length);
    setShowGeneratePassword(false);
    const formElement = document.getElementById(
      "login-form"
    ) as PasswordFormElement;
    formElement.password.focus();
  };

  const handlePasswordFocus = () => {
    if (isNewUser) {
      setSafePassword(utils.generatePassword.generateRandomPassword());
      setShowGeneratePassword(true);
    }
  };

  const handleInvalidPassword = () => {
    const dialogElement = document.getElementById(
      "message-dialog"
    ) as HTMLDialogElement;
    dialogElement.showModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyElement = document.getElementsByClassName(
      "gg-key"
    )[0] as HTMLElement;
    keyElement.style.animationName = "rotateAnimation";
    keyElement.style.animationDirection = "unset";
    keyElement.style.animationDuration = "0.3s";
    const formElement = e.target as PasswordFormElement;
    formElement.logo_button.disabled = true;
    let result = await utils.tauriCommands.authenticate(
      formElement.password.value
    );
    console.log(result);
    if (result) {
      sessionStorage.setItem("isLoggedIn", "true");
      dispatch(loginActions.setIsLoggedIn(true));
    } else {
      handleInvalidPassword();
    }
    keyElement.style.animationName = "example";
    keyElement.style.animationDirection = "alternate";
    keyElement.style.animationDuration = "1s";
    formElement.logo_button.disabled = false;
    formElement.password.focus();
  };

  useEffect(() => {
    const element = document.getElementsByClassName(
      "login-input-placeholder"
    )[0] as HTMLElement;
    element.focus();
    setCircleYCordinates(8);
  }, []);

  useEffect(() => {
    const start_app = async () => {
      let response: any = await utils.tauriCommands.getAppConfig();
      if (response.is_new_user) {
        setIsNewUser(true);
      } else if (response.altered) {
      }
    };
    start_app();
  }, []);

  return (
    <div id="Login">
      <div className="login-container">
        <InvalidPasswordDialog message="Invalid Password" />
        <form
          id="login-form"
          className="login-form"
          onSubmit={(e) => {
            handleSubmit(e);
          }}
        >
          <div className="login-input-container">
            <div className="login-input-wrapper">
              <label
                id="login-input-placeholder"
                className="login-input-placeholder"
                style={{ display: showPassword ? "none" : undefined }}
                htmlFor="login-input-password"
              >
                {isNewUser ? "Set password" : "Enter password"}
              </label>

              <input
                id="login-input-password"
                className="login-input-password"
                name="password"
                type="text"
                value={password}
                onFocus={() => {
                  const placeholder = document.querySelector(
                    ".login-input-placeholder"
                  ) as HTMLElement;
                  if (placeholder) {
                    placeholder.style.animationPlayState = "running";
                  }
                }}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setCircleYCordinates(e.target.value.length);
                  handlePasswordFocus();
                }}
                onBlur={() => {
                  const placeholder = document.querySelector(
                    ".login-input-placeholder"
                  ) as HTMLElement;
                  if (placeholder) {
                    placeholder.style.animationPlayState = "paused";
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    if (!showGeneratePassword) {
                      setSafePassword(
                        utils.generatePassword.generateRandomPassword()
                      );
                      if (isNewUser) {
                        setShowGeneratePassword(true);
                      }
                    }
                    if (generateRandomPasswordRef.current) {
                      (
                        generateRandomPasswordRef.current as HTMLInputElement
                      ).focus();
                    }
                  }
                }}
                placeholder={isNewUser ? "Set password" : "Enter password"}
                autoComplete="off"
                required
                autoFocus
              />

              <span
                className="toggle-password"
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
                  e.preventDefault();
                  const formElement = document.getElementById(
                    "login-form"
                  ) as PasswordFormElement;
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
            <div className="login-input-display">
              {arcYCoords.map((item, idx) => {
                return (
                  <div
                    className="login-input-display-char"
                    key={idx}
                    style={{
                      width: `${270 / arcYCoords.length}px`,
                    }}
                  >
                    <div
                      className="login-input-char"
                      style={{
                        width:
                          password.length < 15
                            ? "10px"
                            : `${10 - Math.sqrt(password.length - 15)}px`,
                        height:
                          password.length < 15
                            ? "10px"
                            : `${10 - Math.sqrt(password.length - 15)}px`,
                        top: `${item}px`,
                        backgroundColor:
                          idx + 1 <= password.length
                            ? "rgb(33, 33, 158)"
                            : "white",
                      }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>
          <Logo
            buttonDisplay={<div className="gg-key"></div>}
            width={null}
            height={null}
            handleClickButton={null}
          />
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
