import React, { useState } from "react";
import "./App.css";
import { useSelector } from "react-redux";

import HomePage from "./pages/home/home";
import LoginPage from "./pages/login/login";
import SettingsPage from "./pages/settings/settings";

import { RootState } from "./state/store";
import TitleBar from "./general/components/titlebar/titlebar";

const App: React.FC = () => {
  let isLoggedIn = useSelector((state: RootState) => state.login.isLoggedIn);
  let settings = useSelector((state: RootState) => state.login.settings);
  return (
    <>
      <TitleBar />
      {settings && <SettingsPage />}
      {!settings && isLoggedIn && <HomePage />}
      {!settings && !isLoggedIn && <LoginPage />}
    </>
  );
};

export default App;
