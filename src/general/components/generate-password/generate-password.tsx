import React, { useState, useEffect, useRef } from "react";
import "./generate-password.css";

type Props = {
  showGeneratePassword: boolean,
  generateRandomPasswordRef: React.RefObject<any>,
  safePassword: string,
  handleClickGeneratePassword: (password: string, htmlId: string) => void,
  formId: string,
}

interface PasswordInputElement extends HTMLInputElement {
  password: HTMLInputElement;
}


function GeneratePassword({
  showGeneratePassword,
  generateRandomPasswordRef,
  safePassword,
  handleClickGeneratePassword,
  formId,
}: Props) {

  return (
    <div
      ref={generateRandomPasswordRef}
      className="suggest-password"
      style={{ display: showGeneratePassword ? "block" : "none" }}
      tabIndex={0}
      onClick={() => handleClickGeneratePassword(safePassword, formId)}
      onKeyDown={(e) => {
        const element = document.getElementById(formId) as PasswordInputElement;

        if (e.key === "Enter") {
          e.preventDefault();
          handleClickGeneratePassword(safePassword, formId);
          element.password.focus();
        }
        if (e.key === "ArrowDown") {
          element.password.focus();
        }
        if (e.key === "ArrowUp") {
          element.password.focus();
        }
      }}
    >
      Use Secure Password:{` ${safePassword}`}
    </div>
  );
}

export default GeneratePassword;
