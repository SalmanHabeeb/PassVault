import React, { useState, useEffect, useRef } from "react";
import "./generate-password.css";

function GeneratePassword({
  showGeneratePassword,
  generateRandomPasswordRef,
  safePassword,
  handleClickGeneratePassword,
  formId,
}) {
  return (
    <div
      ref={generateRandomPasswordRef}
      className="suggest-password"
      name="password_suggest"
      style={{ display: showGeneratePassword ? "block" : "none" }}
      tabIndex={0}
      onClick={() => handleClickGeneratePassword(safePassword, formId)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleClickGeneratePassword(safePassword, formId);
          document.getElementById(formId).password.focus();
        }
        if (e.key === "ArrowDown") {
          document.getElementById(formId).password.focus();
        }
        if (e.key === "ArrowUp") {
          document.getElementById(formId).password.focus();
        }
      }}
    >
      Use Secure Password:{` ${safePassword}`}
    </div>
  );
}

export default GeneratePassword;
