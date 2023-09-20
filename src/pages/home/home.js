import React, { useRef, useState, useEffect } from "react";
import "./home.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";

import { invoke } from "@tauri-apps/api";

function HomePage() {
  const dispatch = useDispatch();
  const [siteObjects, setSiteObjects] = useState([]);
  const [greeting, setGreeting] = useState("None");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [showGeneratePassword, setShowGeneratePassword] = useState(false);
  const [safePassword, setSafePassword] = useState("");
  const generateRandomPasswordRef = useRef(null);
  const generateRandomEditPasswordRef = useRef(null);
  const currentPercentage = useRef(0);

  const prevOp = useRef(null);
  const [prevOpArgs, setPrevOpArgs] = useState([]);

  const [toDeleteIndex, setToDeleteIndex] = useState(-1);
  const [toEditIndex, setToEditIndex] = useState(-1);

  const [showPassword, setShowPassword] = useState(
    new Array(siteObjects.length).fill(false)
  );

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const [time, setTime] = useState(0);
  const totalTime = useRef(0);

  const [clickedCopy, setClickedCopy] = useState(
    new Array(siteObjects.length).fill(false)
  );
  var timeoutId = null;

  const showHelp = (id) => {
    const tooltip = document.getElementById(id);
    if (tooltip) {
      tooltip.style.display = "block";
    }
  };

  const hideHelp = (id) => {
    const tooltip = document.getElementById(id);
    if (tooltip) {
      tooltip.style.display = "none";
    }
  };

  const handleOutsideClick = (event) => {
    if (
      generateRandomPasswordRef.current &&
      !generateRandomPasswordRef.current.contains(event.target)
    ) {
      setShowGeneratePassword(false);
    } else if (
      generateRandomEditPasswordRef.current &&
      !generateRandomEditPasswordRef.current.contains(event.target)
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

  const handleClickGeneratePassword = (password, elementId) => {
    console.log(document.getElementById(elementId));
    document.getElementById(elementId).password.value = password;
    setShowGeneratePassword(false);
  };

  const handlePasswordChange = () => {
    console.log("LINE 67");
    if (!document.getElementById("password-dialog__form").checkValidity()) {
      console.log("LINE 69");
      setSafePassword(generateRandomPassword());
      setShowGeneratePassword(true);
      console.log(showGeneratePassword);
    }
  };

  const handleToggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
    const inputElement = document.getElementById(
      "password-dialog__form"
    ).password;
    inputElement.focus();
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
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
    prevOp.current = null;
    setPrevOpArgs([]);
  };

  const runAuthFlow = () => {
    document.getElementById("auth-dialog").showModal();
  };

  const handleCancelAuthFlow = () => {
    document.getElementById("auth-dialog__form").password.value = "";
    setShowAuthPassword(false);
    document.getElementById("auth-dialog").close();
    if (
      typeof prevOp.current === "function" &&
      prevOp.current.toString() !== getAllData.toString()
    ) {
      console.log("164: ", prevOp.current);
      console.log("165: ", getAllData);
      console.log("166: ", getAllData === prevOp.current);
      prevOp.current = null;
      setPrevOpArgs([]);
    }
  };

  const handleToggleShowPassword = async (index) => {
    let password;
    if (!showPassword[index]) {
      try {
        let response = await invoke("get_password", {
          site: siteObjects[index].site,
          username: siteObjects[index].username,
        });
        if (!response.authorized) {
          runAuthFlow();
          prevOp.current = handleToggleShowPassword;
          console.log(handleToggleShowPassword);
          console.log(prevOp);
          setPrevOpArgs([index]);
          return;
        }
        console.log(response);
        password = response.password;
        const updatedSiteObjects = [...siteObjects];
        updatedSiteObjects[index] = {
          ...updatedSiteObjects[index],
          password: password,
        };
        setSiteObjects(updatedSiteObjects);
        console.log(siteObjects, index);
      } catch (error) {
        console.error(error);
        return;
      }
    } else {
      const updatedSiteObjects = [...siteObjects];
      updatedSiteObjects[index] = {
        ...updatedSiteObjects[index],
        password: "password",
      };
      setSiteObjects(updatedSiteObjects);
    }
    const updatedShowPassword = [...showPassword];
    updatedShowPassword[index] = !updatedShowPassword[index];
    setShowPassword(updatedShowPassword);
  };

  const handleAllEntries = (response) => {
    // Adding the 'password' key to each object
    for (let i = 0; i < response.length; i++) {
      response[i].password = "password";
    }
    setSiteObjects(response);
  };

  const handleClickAdder = () => {
    setShowAddDialog(true);
    document.getElementById("password-dialog").showModal();
    console.log("show dialog");
  };

  const handleLockPasswords = async () => {
    try {
      let result = await invoke("lock_app", {});
      if (result) {
        const updatedSiteObjects = [...siteObjects];
        updatedSiteObjects.map((item) => {
          item.password = "password";
          return item;
        });
        setSiteObjects(updatedSiteObjects);
        const updatedShowPassword = new Array(showPassword.length);
        updatedShowPassword.fill(false);
        setShowPassword(updatedShowPassword);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLockApp = async () => {
    try {
      let result = await invoke("lock_app", {});
      if (result) {
        dispatch(loginActions.setIsLoggedIn(false));
        sessionStorage.clear();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleClickSettings = () => {
    dispatch(loginActions.setSettings(true));
    sessionStorage.setItem("settings", "true");
  };

  const executeFunc = async (func, args) => {
    console.log(func);
    console.log(args, typeof args);
    if (typeof func === "function") {
      prevOp.current = null;
      setPrevOpArgs([]);
      return await func(...args);
    }
  };

  const handleEditEntrySubmit = async (e) => {
    const newSite = e.target.site.value;
    const newUsername = e.target.username.value;
    const newPassword = e.target.password.value;
    const editSite = siteObjects[toEditIndex].site;
    const editUsername = siteObjects[toEditIndex].username;
    console.log("Hello");
    if (!newSite || !newUsername) {
      return;
    }
    console.log({
      newSite: newSite,
      newUsername: newUsername,
      newPassword: newPassword,
      editSite: editSite,
      editUsername: editUsername,
    });
    console.log("Hello");
    try {
      let result = await invoke("edit_entry", {
        newSite: newSite,
        newUsername: newUsername,
        newPassword: newPassword,
        editSite: editSite,
        editUsername: editUsername,
      });
      if (!result.authorized) {
        runAuthFlow();
        prevOp.current = handleEditEntrySubmit;
        setPrevOpArgs([e]);
        return;
      }
      console.log(result);
      if (result.success) {
        invoke("get_entries", {})
          // `invoke` returns a Promise
          .then((response) => {
            console.log(result, response);
            handleAllEntries(response.entries);
          })
          .catch((err) => console.log(err));
      }
    } catch (error) {
      console.error(error);
    }
    e.target.site.value = "";
    e.target.username.value = "";
    e.target.password.value = "";
    setShowNewPassword(false);
  };

  const handleCreateNewEntrySubmit = async (e) => {
    const site = e.target.site.value;
    const username = e.target.username.value;
    const password = e.target.password.value;
    if (!site || !username || !password) {
      return;
    }
    console.log(site, username, password);
    try {
      let result = await invoke("write_entry", {
        site: site,
        username: username,
        password: password,
      });
      if (!result.authorized) {
        runAuthFlow();
        prevOp.current = handleCreateNewEntrySubmit;
        setPrevOpArgs([e]);
        return;
      }
      if (result.success) {
        invoke("get_entries", {})
          // `invoke` returns a Promise
          .then((response) => {
            console.log(result, response);
            handleAllEntries(response.entries);
          })
          .catch((err) => console.log(err));
      }
    } catch (error) {
      console.error(error);
    }
    e.target.site.value = "";
    e.target.username.value = "";
    e.target.password.value = "";
    setShowNewPassword(false);
  };

  const triggerDeleteEntryFlow = (index) => {
    setToDeleteIndex(index);
    document.getElementById("confirm-delete-dialog").showModal();
  };

  const triggerEditEntryFlow = (index) => {
    setToEditIndex(index);
    const editDialogBox = document.getElementById("edit-dialog");
    const editForm = document.getElementById("edit-dialog__form");
    editForm.site.value = siteObjects[index].site;
    editForm.username.value = siteObjects[index].username;
    editForm.password.value = "";
    editDialogBox.showModal();
  };

  const handleDeleteCancel = () => {
    document.getElementById("confirm-delete-dialog").close();
  };

  const deleteEntrySubmit = async (index) => {
    const site = siteObjects[index].site;
    const username = siteObjects[index].username;
    try {
      let result = await invoke("delete_entry", {
        site: site,
        username: username,
      });
      if (!result.authorized) {
        runAuthFlow();
        prevOp.current = deleteEntrySubmit;
        setPrevOpArgs([index]);
        return;
      }
      let newSiteObjects = siteObjects.slice(); // Create a shallow copy to avoid modifying the original array
      newSiteObjects.splice(index, 1);
      setSiteObjects(newSiteObjects);
      setToDeleteIndex(-1);
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipBoard = async (index) => {
    const updatedClickedCopy = [...clickedCopy];
    let password;
    try {
      let response = await invoke("get_password", {
        site: siteObjects[index].site,
        username: siteObjects[index].username,
      });
      console.log(response);
      if (response.authorized) {
        password = response.password;
      } else {
        runAuthFlow();
        prevOp.current = copyToClipBoard;
        setPrevOpArgs([index]);
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
    updatedClickedCopy[index] = true; // Set clicked state immediately

    try {
      await navigator.clipboard.writeText(password);
      setClickedCopy(updatedClickedCopy);
      timeoutId = setTimeout(() => {
        setClickedCopy(new Array(siteObjects.length).fill(false));
      }, 3000);
    } catch (error) {
      console.error("Clipboard writeText error:", error);
    }
  };

  const getAllData = async () => {
    try {
      let response = await invoke("get_entries", {});
      if (!response.authorized) {
        runAuthFlow();
        prevOp.current = getAllData;
        setPrevOpArgs([]);
        return;
      }
      handleAllEntries(response.entries);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getAllData();
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const dialog = document.getElementById("password-dialog");
    const editDialog = document.getElementById("edit-dialog");
    dialog.addEventListener("click", (event) => {
      // check if the user clicked outside of the dialog
      if (
        document.body.contains(dialog) &&
        !generateRandomPasswordRef.current.contains(event.target)
      ) {
        // set showGeneratePassword to false
        setShowGeneratePassword(false);
      }
    });
    editDialog.addEventListener("click", (event) => {
      // check if the user clicked outside of the dialog
      if (
        document.body.contains(dialog) &&
        !generateRandomEditPasswordRef.current.contains(event.target)
      ) {
        // set showGeneratePassword to false
        setShowGeneratePassword(false);
      }
    });
  }, []);

  const handleWindowKeyDown = (event) => {
    if (
      event.ctrlKey &&
      ((event.key === "L" && event.getModifierState("CapsLock")) ||
        (event.key === "l" && !event.getModifierState("CapsLock")))
    ) {
      const button = document.getElementById(
        "table-header-button-lock-passwords"
      );
      if (button) {
        button.click();
      }
    } else if (
      event.ctrlKey &&
      ((event.key === "l" && event.getModifierState("CapsLock")) ||
        (event.key === "L" && !event.getModifierState("CapsLock")))
    ) {
      const button = document.getElementById("table-header-button-lock-app");
      if (button) {
        button.click();
      }
    } else if (
      event.ctrlKey &&
      ((event.key === "s" && !event.getModifierState("CapsLock")) ||
        (event.key === "S" && event.getModifierState("CapsLock")))
    ) {
      const button = document.getElementById("table-header-button-settings");
      if (button) {
        button.click();
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      document.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, []);

  const checkTime = async () => {
    try {
      let response = await invoke("check_time", {});
      setTime(response.time_left);
      const buttonElement = document.getElementById(
        "table-header-button-lock-passwords"
      );
      const progressPercentage =
        response.time_left <= totalTime.current
          ? ((totalTime.current - response.time_left) * 100) / totalTime.current
          : 0;
      if (progressPercentage === 0) {
        currentPercentage.current = 0;
      }
      console.log(progressPercentage, response.time_left);
      const duration = 1000;
      const increments = 10;
      const incrementPercentage =
        (progressPercentage - currentPercentage.current) / increments;

      const updateBackground = () => {
        if (currentPercentage.current >= progressPercentage) {
          clearInterval(animationInterval);
        } else {
          currentPercentage.current += incrementPercentage;
          buttonElement.style.background = `radial-gradient(closest-side, #00ff00 85%, transparent 80% 100%), conic-gradient(blue ${currentPercentage.current}%, orange 0)`;
        }
      };
      const animationInterval = setInterval(
        updateBackground,
        duration / increments
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    invoke("check_time", {})
      .then((response) => {
        totalTime.current = response.unlock_time;
        console.log(response);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    let interval = setInterval(() => {
      checkTime();
    }, 200);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div id="Home">
      <dialog id="password-dialog" className="password-dialog">
        <p>Enter new password</p>
        <form
          method="dialog"
          id="password-dialog__form"
          className="password-dialog__form"
          onSubmit={handleCreateNewEntrySubmit}
        >
          <input
            className="password-dialog__input"
            id="password-dialog__site-input"
            type="text"
            key={1}
            name="site"
            placeholder="Site"
            autoFocus
            required
          />
          <input
            className="password-dialog__input"
            type="text"
            key={2}
            name="username"
            placeholder="Username"
            autoComplete="username"
            required
          />
          <div className="password-dialog__input-container">
            <input
              className="password-dialog__input"
              type={showNewPassword ? "text" : "password"}
              key={3}
              name="password"
              placeholder="Password"
              autoComplete="new-password"
              onChange={handlePasswordChange}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  if (!showGeneratePassword) {
                    setSafePassword(generateRandomPassword());
                    setShowGeneratePassword(true);
                  }
                  console.log(
                    document.getElementById("password-dialog__form")
                      .password_suggest
                  );
                  generateRandomPasswordRef.current.focus();
                }
              }}
              autoFocus
              required
            />
            <span
              className="toggle-password"
              onClick={handleToggleShowNewPassword}
            >
              <i className="material-icons">
                {showNewPassword ? "visibility_off" : "visibility"}
              </i>
            </span>
          </div>
          <div
            ref={generateRandomPasswordRef}
            className="password-dialog__suggest-password"
            name="password_suggest"
            style={{ display: showGeneratePassword ? "block" : "none" }}
            tabIndex={0}
            onClick={() =>
              handleClickGeneratePassword(safePassword, "password-dialog__form")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleClickGeneratePassword(
                  safePassword,
                  "password-dialog__form"
                );
                e.preventDefault();
                document
                  .getElementById("password-dialog__form")
                  .password.focus();
              }
              if (e.key === "ArrowDown") {
                document
                  .getElementById("password-dialog__form")
                  .password.focus();
              }
              if (e.key === "ArrowUp") {
                document
                  .getElementById("password-dialog__form")
                  .password.focus();
              }
            }}
          >
            Use Secure Password:{` ${safePassword}`}
          </div>
          <div className="password-dialog__form-button-container">
            <button className="password-dialog__form-button" type="submit">
              Save
            </button>
            <button
              className="password-dialog__form-button"
              type="button"
              onClick={() => {
                console.log(
                  document.getElementById("password-dialog").children[1].site
                );
                document.getElementById(
                  "password-dialog"
                ).children[1].site.value = "";
                document.getElementById(
                  "password-dialog"
                ).children[1].username.value = "";
                document.getElementById(
                  "password-dialog"
                ).children[1].password.value = "";
                document.getElementById("password-dialog").close();
                setShowNewPassword(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
      <dialog id="edit-dialog" className="edit-dialog">
        <p>Edit your entry:</p>
        <form
          method="dialog"
          id="edit-dialog__form"
          className="edit-dialog__form"
          onSubmit={handleEditEntrySubmit}
        >
          <input
            className="edit-dialog__input"
            id="edit-dialog__site-input"
            type="text"
            key={1}
            name="site"
            placeholder="Site"
            required
          />
          <input
            className="edit-dialog__input"
            type="text"
            key={2}
            name="username"
            placeholder="Username"
            autoComplete="username"
            required
          />
          <div className="edit-dialog__input-container">
            <input
              id="edit-dialog__password-input"
              className="edit-dialog__input"
              type={showNewPassword ? "text" : "password"}
              key={3}
              name="password"
              placeholder="Password"
              autoComplete="new-password"
              onChange={handlePasswordChange}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  if (!showGeneratePassword) {
                    setSafePassword(generateRandomPassword());
                    setShowGeneratePassword(true);
                  }
                  console.log(
                    document.getElementById("edit-dialog__form")
                      .password_suggest
                  );
                  generateRandomEditPasswordRef.current.focus();
                }
              }}
              autoFocus
            />
            <span
              className="toggle-password"
              onClick={handleToggleShowNewPassword}
            >
              <i className="material-icons">
                {showNewPassword ? "visibility_off" : "visibility"}
              </i>
            </span>
          </div>
          <div
            ref={generateRandomEditPasswordRef}
            className="edit-dialog__suggest-password"
            name="password_suggest"
            style={{ display: showGeneratePassword ? "block" : "none" }}
            tabIndex={0}
            onClick={() =>
              handleClickGeneratePassword(safePassword, "edit-dialog__form")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleClickGeneratePassword(safePassword, "edit-dialog__form");
                e.preventDefault();
                document.getElementById("edit-dialog__form").password.focus();
              }
              if (e.key === "ArrowDown") {
                document.getElementById("edit-dialog__form").password.focus();
              }
              if (e.key === "ArrowUp") {
                document.getElementById("edit-dialog__form").password.focus();
              }
            }}
          >
            Use Secure Password:{` ${safePassword}`}
          </div>
          <div className="edit-dialog__form-button-container">
            <button className="edit-dialog__form-button" type="submit">
              Save
            </button>
            <button
              className="edit-dialog__form-button"
              type="button"
              onClick={() => {
                console.log(
                  document.getElementById("edit-dialog").children[1].site
                );
                document.getElementById("edit-dialog").children[1].site.value =
                  "";
                document.getElementById(
                  "edit-dialog"
                ).children[1].username.value = "";
                document.getElementById(
                  "edit-dialog"
                ).children[1].password.value = "";
                document.getElementById("edit-dialog").close();
                setShowNewPassword(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
      <dialog id="invalid-password-dialog" className="invalid-password-dialog">
        <p>Invalid password</p>
        <form method="dialog" type="submit">
          <button className="invalid-password-dialog__form-button">Ok</button>
        </form>
      </dialog>
      <dialog
        id="confirm-delete-dialog"
        className="confirm-delete-dialog"
        onSubmit={() => deleteEntrySubmit(toDeleteIndex)}
      >
        <p>Are you sure you want to delete this entry:</p>
        <p>
          Site: {toDeleteIndex >= 0 ? siteObjects[toDeleteIndex].site : null}
        </p>
        <p>
          Username:{" "}
          {toDeleteIndex >= 0 ? siteObjects[toDeleteIndex].username : null}
        </p>
        <form method="dialog" type="submit">
          <div className="confirm-delete-dialog__form-button-container">
            <button
              className="confirm-delete-dialog__form-button"
              type="submit"
            >
              Yes
            </button>
            <button
              id="confirm-delete-dialog__form-button-cancel"
              className="confirm-delete-dialog__form-button"
              type="button"
              onClick={handleDeleteCancel}
              autoFocus
            >
              No
            </button>
          </div>
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
      <div className="home__container">
        <p className="home__welcome">Welcome!</p>
      </div>
      <div className="table-container">
        <div className="table-title">
          <h2>Saved Passwords</h2>
          <div className="table-header-button-menu">
            <div
              className="table-header-button-container"
              onMouseOver={() => {
                showHelp("help-adder");
              }}
              onMouseOut={() => {
                hideHelp("help-adder");
              }}
            >
              <button
                className="table-header-button"
                onClick={handleClickAdder}
              >
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
                onClick={time === 0 ? runAuthFlow : handleLockPasswords}
                onMouseOver={() => {
                  showHelp("help-lock");
                }}
                onMouseOut={() => {
                  hideHelp("help-lock");
                }}
              >
                <i className="material-icons">
                  {time === 0 ? "lock_open" : "lock_clock"}
                </i>
              </button>
              {/* <div className="progress-wrapper">
                <div
                  className="progress-bar"
                  style={{
                    strokeDasharray: `${50 * Math.PI} ${50 * Math.PI}`,
                    strokeDashoffset:
                      50 * Math.PI - ((time - 60) / 60) * (50 * Math.PI),
                  }}
                ></div>
              </div> */}
              <div id="help-lock" className="help">
                {time === 0 ? "Unlock Passwords" : "Lock the passwords"}
                <div className="arrow"></div>
              </div>
            </div>
            <div className="table-header-button-container">
              <button
                id="table-header-button-lock-app"
                className="table-header-button"
                onClick={handleLockApp}
                onMouseOver={() => {
                  showHelp("help-lock-app");
                }}
                onMouseOut={() => {
                  hideHelp("help-lock-app");
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
                  showHelp("help-settings-app");
                }}
                onMouseOut={() => {
                  hideHelp("help-settings-app");
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
        </div>
        {siteObjects ? (
          <table className="site-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Username</th>
                <th>Password</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {siteObjects.map((siteObject, index) => (
                <>
                  <tr className="site-table__row" key={index}>
                    <td>{siteObject.site}</td>
                    <td>{siteObject.username}</td>
                    <td style={{ width: "30%", borderRight: "none" }}>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            display: "inline-block",
                            WebkitTextSecurity: showPassword[index]
                              ? "none"
                              : "disc",
                          }}
                        >
                          {siteObject.password}
                        </span>
                      </div>
                    </td>
                    <td style={{ borderLeft: "none" }}>
                      <div>
                        <i
                          className="material-icons"
                          onClick={() => handleToggleShowPassword(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          {showPassword[index]
                            ? "visibility_off"
                            : "visibility"}
                        </i>
                        <i
                          className="material-icons"
                          onClick={() => copyToClipBoard(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          {clickedCopy[index] ? "done" : "content_copy"}
                        </i>
                        <i
                          className="material-icons"
                          onClick={() => triggerDeleteEntryFlow(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          delete
                        </i>
                        <i
                          className="material-icons"
                          onClick={() => triggerEditEntryFlow(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          edit
                        </i>
                      </div>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

export default HomePage;
