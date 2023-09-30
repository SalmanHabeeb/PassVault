import React from "react";
import "./invalid-password-dialog.css";

function InvalidPasswordDialog() {
  return (
    <dialog id="invalid-password-dialog" className="invalid-password-dialog">
      <p>Invalid password</p>
      <form method="dialog" type="submit">
        <button className="invalid-password-dialog__form-button">Ok</button>
      </form>
    </dialog>
  );
}

export default InvalidPasswordDialog;
