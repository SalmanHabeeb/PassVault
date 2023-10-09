import React, { ReactNode } from "react";
import "./logo.css";

type Props = {
  buttonDisplay: ReactNode;
  width: string | null;
  height: string | null;
  handleClickButton: ((event: React.MouseEvent) => void) | null;
};

const Logo = ({ buttonDisplay, width, height, handleClickButton }: Props) => {
  return (
    <div
      className="
        logo"
      style={{
        width: width ? width : undefined,
        height: height ? height : undefined,
      }}
    >
      <div
        className="logo-inner"
        style={{
          width: width ? `${parseFloat(width) * 0.5}px` : undefined,
          height: height ? `${parseFloat(height) * 0.6}px` : undefined,
        }}
      >
        <button
          id="button"
          className="logo-button"
          name="logo_button"
          type="submit"
          onClick={handleClickButton ? handleClickButton : () => {}}
        >
          {buttonDisplay}
        </button>
      </div>
    </div>
  );
};

export default Logo;
