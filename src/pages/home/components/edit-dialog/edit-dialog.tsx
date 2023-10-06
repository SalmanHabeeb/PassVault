import React, { useState, useEffect, useRef } from "react";
import "./edit-dialog.css";

import { invoke } from "@tauri-apps/api";

import * as utils from "../../../../general/utils";
import GeneratePassword from "../../../../general/components/generate-password/generate-password";

interface PasswordFormElement extends HTMLInputElement {
  site: HTMLInputElement;
  username: HTMLInputElement;
  password: HTMLInputElement;
}

interface Result {
  authorized: boolean;
  success: boolean;
}

type Props = {
  handleCloseDialog: (object: any) => void,
  toEditSite: string | null,
  toEditUserName: string | null,
};

const EditDialog: React.FC<Props> = ({
  handleCloseDialog,
  toEditSite,
  toEditUserName,
}: Props) => {
  const [safePassword, setSafePassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showGeneratePassword, setShowGeneratePassword] = useState(false);

  const generateRandomEditPasswordRef = useRef(null);

  const handleOutsideEditDialogClick = (event: MouseEvent) => {
    if (
      generateRandomEditPasswordRef.current &&
      !(generateRandomEditPasswordRef.current as HTMLElement).contains(event.target as HTMLElement)
    ) {
      setShowGeneratePassword(false);
    }
  };

  const handleClickGeneratePassword = (password: string, elementId: string) => {
    console.log(document.getElementById(elementId));
    const formElement = document.getElementById(elementId) as PasswordFormElement;
    formElement.password.value = password;
    setShowGeneratePassword(false);
  };

  const handlePasswordChange = () => {
    setSafePassword(utils.generatePassword.generateRandomPassword());
    setShowGeneratePassword(true);
    console.log(showGeneratePassword);
  };

  const handleToggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
    const formElement = document.getElementById("edit-dialog__form") as PasswordFormElement;
    const inputElement = formElement.password;
    inputElement.focus();
    const inputValue = inputElement.value;
    inputElement.focus();
    inputElement.value = "";
    setTimeout(() => {
      inputElement.value = inputValue;
    }, 0);
  };

  const handleEditEntrySubmit = async (e: React.FormEvent) => {
    const formElement = document.getElementById("edit-dialog__form") as PasswordFormElement;
    const newSite = formElement.site.value;
    const newUsername = formElement.username.value;
    const newPassword = formElement.password.value;
    const editSite = toEditSite;
    const editUsername = toEditUserName;
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
      let result: Result = await invoke("edit_entry", {
        newSite: newSite,
        newUsername: newUsername,
        newPassword: newPassword,
        editSite: editSite,
        editUsername: editUsername,
      });
      if (!result.authorized) {
        handleCloseDialog({
          unauthorized: true,
          operation: handleEditEntrySubmit,
          operationArgs: [e],
        });
        return;
      }
      console.log(result);
      handleCloseDialog({ success: result.success });
      // invoke("get_entries", {})
      //   // `invoke` returns a Promise
      //   .then((response) => {
      //     console.log(result, response);
      //     handleAllEntries(response.entries);
      //   })
      //   .catch((err) => console.log(err));
    } catch (error) {
      console.error(error);
    }
    formElement.site.value = "";
    formElement.username.value = "";
    formElement.password.value = "";
    setShowNewPassword(false);
  };

  useEffect(() => {
    document.addEventListener("click", handleOutsideEditDialogClick);
    return () => {
      document.removeEventListener("click", handleOutsideEditDialogClick);
    };
  }, []);

  useEffect(() => {
    const dialog = document.getElementById("edit-dialog") as HTMLDialogElement;
    dialog.addEventListener("click", (event) => {
      // check if the user clicked outside of the dialog
      if (
        document.body.contains(dialog) && generateRandomEditPasswordRef.current &&
        !(generateRandomEditPasswordRef.current as HTMLElement).contains(event.target as HTMLElement)
      ) {
        // set showGeneratePassword to false
        setShowGeneratePassword(false);
      }
    });
  }, []);

  return (
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
                  setSafePassword(
                    utils.generatePassword.generateRandomPassword()
                  );
                  setShowGeneratePassword(true);
                }
                if(generateRandomEditPasswordRef.current) {
                (generateRandomEditPasswordRef.current as HTMLInputElement).focus();
              }
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
        <GeneratePassword
          showGeneratePassword={showGeneratePassword}
          generateRandomPasswordRef={generateRandomEditPasswordRef}
          safePassword={safePassword}
          handleClickGeneratePassword={handleClickGeneratePassword}
          formId={"edit-dialog__form"}
        />
        <div className="edit-dialog__form-button-container">
          <button className="edit-dialog__form-button" type="submit">
            Save
          </button>
          <button
            className="edit-dialog__form-button"
            type="button"
            onClick={() => {
              const dialogElement = document.getElementById("edit-dialog") as HTMLDialogElement;
              const formElement = dialogElement.children[1] as PasswordFormElement;
              formElement.site.value =
                "";
              formElement.username.value = "";
              formElement.password.value = "";
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
};

export default EditDialog;
