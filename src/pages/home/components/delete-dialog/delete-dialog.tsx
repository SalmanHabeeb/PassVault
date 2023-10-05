import React, { useState, useEffect, useRef } from "react";
import "./delete-dialog.css";

import { invoke } from "@tauri-apps/api";

type Props = {
  handleCloseDialog: (object: any) => void,
  toDeleteSite: string,
  toDeleteUserName: string,
};

const DeleteDialog: React.FC<Props> = ({
  handleCloseDialog,
  toDeleteSite,
  toDeleteUserName,
}: Props) => {

  const handleDeleteCancel = () => {
    const dialog = document.getElementById("confirm-delete-dialog") as HTMLDialogElement;
    dialog.close();
  };
  

  const deleteEntrySubmit = async (site: string, username: string) => {
    try {
      let result: any = await invoke("delete_entry", {
        site: site,
        username: username,
      });
      if (!result.authorized) {
        handleCloseDialog({
          unauthorized: true,
          operation: deleteEntrySubmit,
          operationArgs: [site, username],
        });
        return;
      }
      handleCloseDialog({ success: result.success });
    } catch (error) {
      console.error(error);
      handleCloseDialog({ success: false });
    }
  };

  return (
    <dialog
      id="confirm-delete-dialog"
      className="confirm-delete-dialog"
      onSubmit={() => deleteEntrySubmit(toDeleteSite, toDeleteUserName)}
    >
      <p>Are you sure you want to delete this entry:</p>
      <p>Site: {toDeleteSite ? toDeleteSite : null}</p>
      <p>Username: {toDeleteUserName ? toDeleteUserName : null}</p>
      <form method="dialog">
        <div className="confirm-delete-dialog__form-button-container">
          <button className="confirm-delete-dialog__form-button" type="submit">
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
  );
};

export default DeleteDialog;
