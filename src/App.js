import React, { useState } from "react";
import "./App.css";
import { useSelector } from "react-redux";

import HomePage from "./pages/home/home";
import LoginPage from "./pages/login/login";
import SettingsPage from "./pages/settings/settings";

function App() {
  let isLoggedIn = useSelector((state) => state.login.isLoggedIn);
  let settings = useSelector((state) => state.login.settings);
  if (settings) {
    return <SettingsPage />;
  } else if (isLoggedIn) {
    return <HomePage />;
  } else {
    return <LoginPage />;
  }
}

export default App;
