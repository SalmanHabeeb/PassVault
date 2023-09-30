import React, { useState, useEffect, useRef } from "react";
import "./create-dialog.css";

import * as utils from "../../../../general/utils";

import { invoke } from "@tauri-apps/api";

import GeneratePassword from "../../../../general/components/generate-password/generate-password";

function CreateDialog({ handleCloseDialog }) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showGeneratePassword, setShowGeneratePassword] = useState(false);
  const [safePassword, setSafePassword] = useState("");

  const generateRandomPasswordRef = useRef(null);

  const handlePasswordChange = () => {
    console.log("LINE 67");
    if (!document.getElementById("create-dialog__form").checkValidity()) {
      console.log("LINE 69");
      setSafePassword(utils.generatePassword.generateRandomPassword());
      setShowGeneratePassword(true);
      console.log(showGeneratePassword);
    }
  };

  const handleClickGeneratePassword = (password, elementId) => {
    console.log(document.getElementById(elementId));
    document.getElementById(elementId).password.value = password;
    setShowGeneratePassword(false);
  };

  const handleToggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
    const inputElement = document.getElementById(
      "create-dialog__form"
    ).password;
    inputElement.focus();
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleCreateNewEntrySubmit = async (e) => {
    console.log(e, e.target);
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
        // runAuthFlow();
        // prevOp.current = handleCreateNewEntrySubmit;
        // setPrevOpArgs([e]);
        handleCloseDialog({
          unauthorized: true,
          operation: handleCreateNewEntrySubmit,
          operationArgs: [e],
        });
        return;
      }
      handleCloseDialog({ success: result.success });
    } catch (error) {
      console.error(error);
    }
    e.target.site.value = "";
    e.target.username.value = "";
    e.target.password.value = "";
    setShowNewPassword(false);
  };

  const handleOutsideCreateDialogClick = (event) => {
    if (
      generateRandomPasswordRef.current &&
      !generateRandomPasswordRef.current.contains(event.target)
    ) {
      setShowGeneratePassword(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleOutsideCreateDialogClick);
    return () => {
      document.removeEventListener("click", handleOutsideCreateDialogClick);
    };
  }, []);

  useEffect(() => {
    const dialog = document.getElementById("create-dialog");
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
  }, []);

  return (
    <dialog id="create-dialog" className="create-dialog">
      <p>Enter new password</p>
      <form
        method="dialog"
        id="create-dialog__form"
        className="create-dialog__form"
        onSubmit={handleCreateNewEntrySubmit}
      >
        <input
          className="create-dialog__input"
          id="create-dialog__site-input"
          type="text"
          key={1}
          name="site"
          placeholder="Site"
          autoFocus
          required
        />
        <input
          className="create-dialog__input"
          type="text"
          key={2}
          name="username"
          placeholder="Username"
          autoComplete="username"
          required
        />
        <div className="create-dialog__input-container">
          <input
            className="create-dialog__input"
            type={showNewPassword ? "text" : "password"}
            key={3}
            name="password"
            placeholder="Password"
            autoComplete="new-password"
            onChange={handlePasswordChange}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                if (!showGeneratePassword) {
                  setSafePassword(
                    utils.generatePassword.generateRandomPassword()
                  );
                  setShowGeneratePassword(true);
                }
                console.log(
                  document.getElementById("create-dialog__form")
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
        <GeneratePassword
          showGeneratePassword={showGeneratePassword}
          generateRandomPasswordRef={generateRandomPasswordRef}
          safePassword={safePassword}
          handleClickGeneratePassword={handleClickGeneratePassword}
          formId={"create-dialog__form"}
        />
        <div className="create-dialog__form-button-container">
          <button className="create-dialog__form-button" type="submit">
            Save
          </button>
          <button
            className="create-dialog__form-button"
            type="button"
            onClick={() => {
              const element =
                document.getElementById("create-dialog").children[1];
              element.site.value = "";
              element.username.value = "";
              element.password.value = "";
              document.getElementById("create-dialog").close();
              setShowNewPassword(false);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default CreateDialog;
