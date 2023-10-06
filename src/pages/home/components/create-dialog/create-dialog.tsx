import React, { useState, useEffect, useRef } from "react";
import "./create-dialog.css";

import * as utils from "../../../../general/utils";

import { invoke } from "@tauri-apps/api";

import GeneratePassword from "../../../../general/components/generate-password/generate-password";

interface PasswordFormElement extends HTMLInputElement {
  site: HTMLInputElement;
  username: HTMLInputElement;
  password: HTMLInputElement;
}

interface ArgumentObject extends Object {
  unauthorized: boolean;
  operation: any;
  operationArgs: any;
  success: boolean;
}

interface Result {
  authorized: boolean;
  success: boolean;
}

type Props = {
  handleCloseDialog: (object: ArgumentObject) => Promise<void>,
}

const CreateDialog: React.FC<Props> = ({ handleCloseDialog }: Props) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showGeneratePassword, setShowGeneratePassword] = useState(false);
  const [safePassword, setSafePassword] = useState("");

  const generateRandomPasswordRef = useRef(null);

  const handlePasswordChange = () => {
    console.log("LINE 67");
    const formElement = document.getElementById("create-dialog__form") as HTMLFormElement;
    if (!formElement.checkValidity()) {
      console.log("LINE 69");
      setSafePassword(utils.generatePassword.generateRandomPassword());
      setShowGeneratePassword(true);
      console.log(showGeneratePassword);
    }
  };

  const handleClickGeneratePassword = (password: string, elementId: string) => {
    console.log(document.getElementById(elementId));
    const formElement = document.getElementById(elementId) as PasswordFormElement;
    formElement.password.value = password;
    setShowGeneratePassword(false);
  };

  const handleToggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
    const formElement = document.getElementById(
      "create-dialog__form"
    ) as PasswordFormElement;
    const inputElement = formElement.password;
    inputElement.focus();
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleCreateNewEntrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    const formElement = e.target as PasswordFormElement;
    const site = formElement.site.value;
    const username = formElement.username.value;
    const password = formElement.password.value;
    if (!site || !username || !password) {
      return;
    }
    console.log(site, username, password);
    try {
      let result: Result = await invoke("write_entry", {
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
          success: false,
        });
        return;
      }
      handleCloseDialog({
        unauthorized: false,
        operation: handleCreateNewEntrySubmit,
        operationArgs: [e],
        success: result.success,
      });
    } catch (error) {
      console.error(error);
    }
    formElement.site.value = "";
    formElement.username.value = "";
    formElement.password.value = "";
    setShowNewPassword(false);
  };

  const handleOutsideCreateDialogClick = (event: MouseEvent) => {
    if (
      generateRandomPasswordRef.current &&
      !(generateRandomPasswordRef.current as HTMLElement).contains(event.target as HTMLElement)
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
    const dialog = document.getElementById("create-dialog") as HTMLDialogElement;
    dialog.addEventListener("click", (event) => {
      // check if the user clicked outside of the dialog
      if (
        document.body.contains(dialog) && generateRandomPasswordRef.current &&
        !(generateRandomPasswordRef.current as HTMLElement).contains(event.target as Node)
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
                if(generateRandomPasswordRef.current) {
                  const input = generateRandomPasswordRef.current as HTMLInputElement;
                  input.focus();
                }
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
              const dialogElement = document.getElementById("create-dialog") as HTMLDialogElement;
                const element = dialogElement.children[1] as PasswordFormElement;
              element.site.value = "";
              element.username.value = "";
              element.password.value = "";
              dialogElement.close();
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
