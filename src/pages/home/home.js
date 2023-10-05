import React, { useRef, useState, useEffect } from "react";
import "./home.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";

import { invoke } from "@tauri-apps/api";

import AuthDialog from "./components/auth/auth";
import InvalidPasswordDialog from "../../general/components/invalid-password-dialog/invalid-password-dialog";
import EditDialog from "./components/edit-dialog/edit-dialog";
import DeleteDialog from "./components/delete-dialog/delete-dialog";
import CreateDialog from "./components/create-dialog/create-dialog";
import TableHeader from "./components/table-header/table-header";
import TableRow from "./components/table-row/table-row";
import TableMenu from "./components/table-menu/table-menu";

function HomePage() {
  const dispatch = useDispatch();
  const [siteObjects, setSiteObjects] = useState([]);

  const currentPercentage = useRef(0);

  const prevOp = useRef(null);
  const [prevOpArgs, setPrevOpArgs] = useState([]);

  const [toDeleteIndex, setToDeleteIndex] = useState(-1);
  const [toEditIndex, setToEditIndex] = useState(-1);

  const [showPassword, setShowPassword] = useState(
    new Array(siteObjects.length).fill(false)
  );

  const [time, setTime] = useState(0);
  const totalTime = useRef(0);

  const [clickedCopy, setClickedCopy] = useState(
    new Array(siteObjects.length).fill(false)
  );
  var timeoutId = null;

  const handleCloseCreateDialog = async (args) => {
    if (args.unauthorized) {
      runAuthFlow();
      prevOp.current = args.operation;
      setPrevOpArgs(args.operationArgs);
      return;
    }
    if (args.success) {
      await getAllData();
    }
  };

  const handleCloseEditDialog = async (args) => {
    if (args.unauthorized) {
      runAuthFlow();
      prevOp.current = args.operation;
      setPrevOpArgs(args.operationArgs);
      return;
    }
    if (args.success) {
      await getAllData();
    }
  };

  const handleCloseAuthDialog = async (isAuthorized) => {
    if (isAuthorized) {
      executeFunc(prevOp.current, prevOpArgs);
    } else {
      if (
        typeof prevOp.current === "function" &&
        prevOp.current.toString() !== getAllData.toString()
      ) {
        prevOp.current = null;
        setPrevOpArgs([]);
      }
    }
  };

  const handleCloseDeleteDialog = async (args) => {
    if (args.unauthorized) {
      runAuthFlow();
      prevOp.current = args.operation;
      setPrevOpArgs(args.operationArgs);
      return;
    }
    if (args.success) {
      let newSiteObjects = siteObjects.slice(); // Create a shallow copy to avoid modifying the original array
      newSiteObjects.splice(toDeleteIndex, 1);
      setSiteObjects(newSiteObjects);
      setToDeleteIndex(-1);
    }
  };

  const runAuthFlow = () => {
    document.getElementById("auth-dialog").showModal();
  };

  const handleToggleShowPassword = async (index) => {
    let password;
    if (!showPassword[index]) {
      try {
        let response = await invoke("get_password", {
          site: siteObjects[index].site,
          username: siteObjects[index].username,
        });
        if (!response.authorized) {
          runAuthFlow();
          prevOp.current = handleToggleShowPassword;
          setPrevOpArgs([index]);
          return;
        }
        console.log(response);
        password = response.password;
        const updatedSiteObjects = [...siteObjects];
        updatedSiteObjects[index] = {
          ...updatedSiteObjects[index],
          password: password,
        };
        setSiteObjects(updatedSiteObjects);
        console.log(siteObjects, index);
      } catch (error) {
        console.error(error);
        return;
      }
    } else {
      const updatedSiteObjects = [...siteObjects];
      updatedSiteObjects[index] = {
        ...updatedSiteObjects[index],
        password: "password",
      };
      setSiteObjects(updatedSiteObjects);
    }
    const updatedShowPassword = [...showPassword];
    updatedShowPassword[index] = !updatedShowPassword[index];
    setShowPassword(updatedShowPassword);
  };

  const handleAllEntries = (response) => {
    for (let i = 0; i < response.length; i++) {
      response[i].password = "password";
    }
    setSiteObjects(response);
  };

  const handleClickAdder = () => {
    document.getElementById("create-dialog").showModal();
    console.log("show dialog");
  };

  const handleLockPasswords = async () => {
    try {
      let result = await invoke("lock_app", {});
      if (result) {
        const updatedSiteObjects = [...siteObjects];
        updatedSiteObjects.map((item) => {
          item.password = "password";
          return item;
        });
        setSiteObjects(updatedSiteObjects);
        const updatedShowPassword = new Array(showPassword.length);
        updatedShowPassword.fill(false);
        setShowPassword(updatedShowPassword);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLockApp = async () => {
    try {
      let result = await invoke("lock_app", {});
      if (result) {
        dispatch(loginActions.setIsLoggedIn(false));
        sessionStorage.clear();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleClickSettings = () => {
    dispatch(loginActions.setSettings(true));
    sessionStorage.setItem("settings", "true");
  };

  const executeFunc = async (func, args) => {
    console.log(func);
    console.log(args, typeof args);
    if (typeof func === "function") {
      prevOp.current = null;
      setPrevOpArgs([]);
      return await func(...args);
    }
  };

  const triggerDeleteEntryFlow = (index) => {
    setToDeleteIndex(index);
    document.getElementById("confirm-delete-dialog").showModal();
  };

  const triggerEditEntryFlow = (index) => {
    setToEditIndex(index);
    const editDialogBox = document.getElementById("edit-dialog");
    const editForm = document.getElementById("edit-dialog__form");
    editForm.site.value = siteObjects[index].site;
    editForm.username.value = siteObjects[index].username;
    editForm.password.value = "";
    editDialogBox.showModal();
  };

  const copyToClipBoard = async (index) => {
    const updatedClickedCopy = [...clickedCopy];
    let password;
    try {
      let response = await invoke("get_password", {
        site: siteObjects[index].site,
        username: siteObjects[index].username,
      });
      console.log(response);
      if (response.authorized) {
        password = response.password;
      } else {
        runAuthFlow();
        prevOp.current = copyToClipBoard;
        setPrevOpArgs([index]);
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
    updatedClickedCopy[index] = true; // Set clicked state immediately

    try {
      await navigator.clipboard.writeText(password);
      setClickedCopy(updatedClickedCopy);
      timeoutId = setTimeout(() => {
        setClickedCopy(new Array(siteObjects.length).fill(false));
      }, 3000);
    } catch (error) {
      console.error("Clipboard writeText error:", error);
    }
  };

  const getAllData = async () => {
    try {
      let response = await invoke("get_entries", {});
      if (!response.authorized) {
        runAuthFlow();
        prevOp.current = getAllData;
        setPrevOpArgs([]);
        return;
      }
      handleAllEntries(response.entries);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getAllData();
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleWindowKeyDown = (event) => {
    if (
      event.ctrlKey &&
      ((event.key === "L" && event.getModifierState("CapsLock")) ||
        (event.key === "l" && !event.getModifierState("CapsLock")))
    ) {
      const button = document.getElementById(
        "table-header-button-lock-passwords"
      );
      if (button) {
        button.click();
      }
    } else if (
      event.ctrlKey &&
      ((event.key === "l" && event.getModifierState("CapsLock")) ||
        (event.key === "L" && !event.getModifierState("CapsLock")))
    ) {
      const button = document.getElementById("table-header-button-lock-app");
      if (button) {
        button.click();
      }
    } else if (
      event.ctrlKey &&
      ((event.key === "s" && !event.getModifierState("CapsLock")) ||
        (event.key === "S" && event.getModifierState("CapsLock")))
    ) {
      const button = document.getElementById("table-header-button-settings");
      if (button) {
        button.click();
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      document.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, []);

  const checkTime = async () => {
    try {
      let response = await invoke("check_time", {});
      setTime(response.time_left);
      const buttonElement = document.getElementById(
        "table-header-button-lock-passwords"
      );
      const progressPercentage =
        response.time_left <= totalTime.current
          ? ((totalTime.current - response.time_left) * 100) / totalTime.current
          : 0;
      if (progressPercentage === 0) {
        currentPercentage.current = 0;
      }
      const duration = 1000;
      const increments = 10;
      const incrementPercentage =
        (progressPercentage - currentPercentage.current) / increments;

      const updateBackground = () => {
        if (currentPercentage.current >= progressPercentage) {
          clearInterval(animationInterval);
        } else {
          currentPercentage.current += incrementPercentage;
          if (buttonElement) {
            buttonElement.style.background = `radial-gradient(closest-side, #00ff00 85%, transparent 80% 100%), conic-gradient(blue ${currentPercentage.current}%, orange 0)`;
          }
        }
      };
      const animationInterval = setInterval(
        updateBackground,
        duration / increments
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    invoke("check_time", {})
      .then((response) => {
        totalTime.current = response.unlock_time;
        console.log(response);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    let interval = setInterval(() => {
      checkTime();
    }, 200);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div id="Home">
      <CreateDialog handleCloseDialog={handleCloseCreateDialog} />
      <EditDialog
        handleCloseDialog={handleCloseEditDialog}
        toEditSite={
          siteObjects[toEditIndex] ? siteObjects[toEditIndex].site : null
        }
        toEditUserName={
          siteObjects[toEditIndex] ? siteObjects[toEditIndex].username : null
        }
      />
      <InvalidPasswordDialog />
      <DeleteDialog
        handleCloseDialog={handleCloseDeleteDialog}
        toDeleteSite={
          siteObjects[toDeleteIndex] ? siteObjects[toDeleteIndex].site : null
        }
        toDeleteUserName={
          siteObjects[toDeleteIndex]
            ? siteObjects[toDeleteIndex].username
            : null
        }
      />
      <AuthDialog handleCloseDialog={handleCloseAuthDialog} />
      <div className="home__container">
        <p className="home__welcome">Welcome!</p>
      </div>
      <div className="table-container">
        <div className="table-title">
          <h2>Saved Passwords</h2>
          <TableMenu
            time={time}
            handleClickAdder={handleClickAdder}
            handleClickLock={handleLockPasswords}
            handleClickUnLock={runAuthFlow}
            handleClickExit={handleLockApp}
            handleClickSettings={handleClickSettings}
          />
        </div>
        {siteObjects ? (
          <table className="site-table">
            <TableHeader />
            <tbody>
              {siteObjects.map((siteObject, index) => (
                <>
                  <TableRow
                    index={index}
                    siteObject={siteObject ? siteObject : null}
                    showPassword={showPassword[index]}
                    clickedCopy={clickedCopy[index]}
                    onVisibilityToggle={handleToggleShowPassword}
                    onCopyClick={copyToClipBoard}
                    onDeleteClick={triggerDeleteEntryFlow}
                    onEditClick={triggerEditEntryFlow}
                  />
                </>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

export default HomePage;
