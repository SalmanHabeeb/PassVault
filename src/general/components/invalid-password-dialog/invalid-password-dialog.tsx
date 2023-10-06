import React from "react";
import "./invalid-password-dialog.css";

const InvalidPasswordDialog = () => {
  return (
    <dialog id="invalid-password-dialog" className="invalid-password-dialog">
      <p>Invalid password</p>
      <form method="dialog">
        <button className="invalid-password-dialog__form-button" type="submit">Ok</button>
      </form>
    </dialog>
  );
};

export default InvalidPasswordDialog;
