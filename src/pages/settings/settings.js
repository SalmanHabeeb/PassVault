import React, { useState, useRef, useEffect } from "react";
import "./settings.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";
import { invoke } from "@tauri-apps/api";

function SettingsPage() {
  const dispatch = useDispatch();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const prevOp = useRef(null);
  const [prevOpArgs, setPrevOpArgs] = useState([]);

  const handleBackClick = () => {
    dispatch(loginActions.setSettings(false));
    sessionStorage.removeItem("settings");
  };

  const handleToggleShowCurrentPassword = () => {
    setShowCurrentPassword(!showCurrentPassword);
    const inputElement = document.getElementById(
      "change-password-form"
    ).currentPassword;
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleToggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
    const inputElement = document.getElementById(
      "change-password-form"
    ).newPassword;
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleExpandChangePassword = () => {
    setShowChangePassword(!showChangePassword);
  };

  const calculateTotalTime = (minutes, seconds) => {
    return minutes * 60 + seconds;
  };

  const handleSecondsIncrement = async (value) => {
    let totalMinutes = minutes;
    let totalSeconds = seconds + value;
    if (totalSeconds > 59) {
      totalSeconds = 0;
      totalMinutes += 1;
    } else if (totalSeconds < 0) {
      totalMinutes -= 1;
      totalSeconds = 59;
    }
    if (calculateTotalTime(totalMinutes, totalSeconds) < 15) {
      totalSeconds = 15;
      totalMinutes = 0;
    } else if (calculateTotalTime(totalMinutes, totalSeconds) > 59 * 60 + 59) {
      totalSeconds = 59;
      totalMinutes = 59;
    }
    await handleSetTime(totalMinutes, totalSeconds);
  };

  const handleMinutesIncrement = async (value) => {
    let totalMinutes = minutes + value;
    let totalSeconds = seconds;

    if (totalMinutes > 59) {
      totalMinutes = 59;
      totalSeconds = 59;
    } else if (totalMinutes < 0) {
      totalMinutes = 0;
      totalSeconds = 15;
    }

    if (calculateTotalTime(totalMinutes, totalSeconds) < 15) {
      totalMinutes = 0;
      totalSeconds = 15;
    } else if (calculateTotalTime(totalMinutes, totalSeconds) > 59 * 60 + 59) {
      totalMinutes = 59;
      totalSeconds = 59;
    }

    await handleSetTime(totalMinutes, totalSeconds);
  };

  const handleMinutesChange = async (event) => {
    let totalMinutes = parseInt(event.target.value);
    let totalSeconds = seconds;

    if (totalMinutes > 59) {
      totalMinutes = 59;
      totalSeconds = 59;
    } else if (totalMinutes < 0) {
      totalMinutes = 0;
      totalSeconds = 15;
    }

    if (calculateTotalTime(totalMinutes, totalSeconds) < 15) {
      totalMinutes = 0;
      totalSeconds = 15;
    } else if (calculateTotalTime(totalMinutes, totalSeconds) > 59 * 60 + 59) {
      totalMinutes = 59;
      totalSeconds = 59;
    }

    await handleSetTime(totalMinutes, totalSeconds);
  };

  const handleSecondsChange = async (event) => {
    let totalMinutes = minutes;
    let totalSeconds = parseInt(event.target.value);

    if (totalSeconds > 59) {
      totalSeconds = 0;
      totalMinutes += 1;
    } else if (totalSeconds < 0) {
      totalMinutes -= 1;
      totalSeconds = 59;
    }
    if (calculateTotalTime(totalMinutes, totalSeconds) < 15) {
      totalSeconds = 15;
      totalMinutes = 0;
    } else if (calculateTotalTime(totalMinutes, totalSeconds) > 59 * 60 + 59) {
      totalSeconds = 59;
      totalMinutes = 59;
    }

    await handleSetTime(minutes, totalSeconds);
  };

  const handleSetTime = async (minutes, seconds) => {
    try {
      let response = await invoke("change_unlock_time", {
        newTime: calculateTotalTime(minutes, seconds),
      });
      console.log(response);
      if (!response.authorized) {
        runAuthFlow();
        prevOp.current = handleSetTime;
        setPrevOpArgs([minutes, seconds]);
        return;
      } else if (response.success) {
        console.log("hello");
        setMinutes(minutes);
        setSeconds(seconds);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const currentPassword = event.target.currentPassword.value;
    const newPassword = event.target.newPassword.value;
    if (!currentPassword || !newPassword) {
      return;
    }
    try {
      let response = await invoke("change_password", {
        currentPassword: currentPassword,
        newPassword: newPassword,
      });
      if (!response.authorized) {
        handleInvalidPassword();
      }
      if (response.success) {
      }
    } catch (error) {
      console.error(error);
    }
    event.target.currentPassword.value = "";
    event.target.newPassword.value = "";
    setShowChangePassword(false);
  };

  const handleChangePasswordCancel = () => {
    const element = document.getElementById("change-password-form");
    console.log(element.target);
    element.currentPassword.value = "";
    element.newPassword.value = "";
    setShowChangePassword(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  const handleInvalidPassword = () => {
    document.getElementById("invalid-password-dialog").showModal();
  };

  const executeFunc = async (func, args) => {
    console.log(func);
    console.log(args, typeof args);
    if (typeof func === "function") {
      prevOp.current = null;
      setPrevOpArgs([]);
      return await func(...args);
    } else {
      throw new Error("The first argument must be a function");
    }
  };

  const runAuthFlow = () => {
    document.getElementById("auth-dialog").showModal();
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
        prevOp.current = null;
        setPrevOpArgs([]);
        return;
      }
    } catch (error) {
      console.error(error);
    }
    e.target.password.value = "";
    console.log(prevOp);
    await executeFunc(prevOp.current, prevOpArgs);
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
  };

  useEffect(() => {
    invoke("check_time", {})
      .then((response) => {
        setSeconds(response.unlock_time % 60);
        setMinutes(Math.floor(response.unlock_time / 60));
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <div id="Settings">
      <dialog id="invalid-password-dialog" className="invalid-password-dialog">
        <p>Invalid password</p>
        <form method="dialog" type="submit">
          <button className="invalid-password-dialog__form-button">Ok</button>
        </form>
      </dialog>
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
      <div className="settings__container">
        <p className="settings__title">Settings</p>
        <span className="settings__back-container" onClick={handleBackClick}>
          <i className="material-icons">arrow_back</i>
        </span>
        <div className="settings__menu">
          <div className="settings__section">
            <div className="settings__section-row">
              <p className="settings__section-heading">Change Password</p>
              <span
                className="settings__section-down-arrow"
                onClick={handleExpandChangePassword}
              >
                <i className="material-icons">
                  {showChangePassword ? "expand_less" : "expand_more"}
                </i>
              </span>
            </div>
            <div className="change-password-container">
              {showChangePassword ? (
                <div className="settings__section-expansion">
                  <form
                    id="change-password-form"
                    className="change-password-form"
                    onSubmit={handleChangePassword}
                  >
                    <div className="change-password-form__input-container">
                      <label className="change-password-form__input-label">
                        Enter Current Password:{" "}
                      </label>
                      <input
                        className="change-password-form__input-label"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        autoFocus
                        required
                      />
                      <span className="change-password-form__eye-icon">
                        <i
                          className="material-icons"
                          onClick={(event) =>
                            handleToggleShowCurrentPassword(event)
                          }
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          {showCurrentPassword
                            ? "visibility_off"
                            : "visibility"}
                        </i>
                      </span>
                    </div>
                    <div className="change-password-form__input-container">
                      <label className="change-password-form__input-label">
                        Enter New Password:{"     "}
                      </label>
                      <input
                        className="change-password-form__input-label"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                      />
                      <span className="change-password-form__eye-icon">
                        <i
                          className="material-icons"
                          onClick={(event) =>
                            handleToggleShowNewPassword(event)
                          }
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          {showNewPassword ? "visibility_off" : "visibility"}
                        </i>
                      </span>
                    </div>
                    <div className="change-password-form__button-container">
                      <button
                        className="change-password-form__button"
                        type="submit"
                      >
                        Change
                      </button>
                      <button
                        className="change-password-form__button"
                        type="button"
                        onClick={(event) => handleChangePasswordCancel(event)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
          <div className="settings__section">
            <div className="settings__section-row">
              <div className="settings__section-heading">Lock in Time</div>
              <div className="settings__section-time-input-container">
                <div className="settings__section-time-nested-container">
                  <label
                    className="settings__section-time-input-label"
                    for="minutesInput"
                  >
                    M
                  </label>
                  <label
                    className="settings__section-time-input-label"
                    for="secondsInput"
                  >
                    S
                  </label>
                </div>
                <div className="settings__section-time-nested-container">
                  <div className="settings__section-time-input-set">
                    <input
                      type="number"
                      id="minutesInput"
                      className="settings__section-time-input"
                      name="minutes"
                      min="0"
                      value={minutes}
                      onChange={handleMinutesChange}
                      required
                    />
                    <button
                      className="settings__section-time-input-set-buttons"
                      onClick={() => {
                        handleMinutesIncrement(-1);
                      }}
                    >
                      ▼
                    </button>
                    <button
                      className="settings__section-time-input-set-buttons"
                      onClick={() => {
                        handleMinutesIncrement(1);
                      }}
                    >
                      ▲
                    </button>
                  </div>
                  <div className="settings__section-time-input-set">
                    <input
                      type="number"
                      id="secondsInput"
                      className="settings__section-time-input"
                      name="seconds"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={handleSecondsChange}
                      required
                    />
                    <button
                      className="settings__section-time-input-set-buttons"
                      onClick={() => {
                        handleSecondsIncrement(-1);
                      }}
                    >
                      ▼
                    </button>
                    <button
                      className="settings__section-time-input-set-buttons"
                      onClick={() => {
                        handleSecondsIncrement(1);
                      }}
                    >
                      ▲
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
