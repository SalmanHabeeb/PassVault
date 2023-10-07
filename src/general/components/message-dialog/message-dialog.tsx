import React from "react";
import "./message-dialog.css";

type Props = {
  message: string
}

const InvalidPasswordDialog = ({message}: Props) => {
  return (
    <dialog id="message-dialog" className="message-dialog">
      <p>{message}</p>
      <form method="dialog">
        <button className="message-dialog__form-button" type="submit">Ok</button>
      </form>
    </dialog>
  );
};

export default InvalidPasswordDialog;
