import React, { useRef, useState, useEffect } from "react";
import "./home.css";
import { useDispatch } from "react-redux";

import { loginActions } from "../../state/loginSlice";

import { invoke } from "@tauri-apps/api";

function HomePage() {
  const dispatch = useDispatch();
  const [siteObjects, setSiteObjects] = useState([]);
  const [greeting, setGreeting] = useState("None");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const prevOp = useRef(null);
  const [prevOpArgs, setPrevOpArgs] = useState([]);

  const [toDeleteIndex, setToDeleteIndex] = useState(-1);

  const [showPassword, setShowPassword] = useState(
    new Array(siteObjects.length).fill(false)
  );
  const [clickedCopy, setClickedCopy] = useState(
    new Array(siteObjects.length).fill(false)
  );
  var timeoutId = null;

  const handleInvalidPassword = () => {
    document.getElementById("invalid-password-dialog").showModal();
  };

  const handleAuth = async (e) => {
    try {
      let result = await invoke("authenticate", {
        masterPassword: e.target.password.value,
      });
      console.log(result);
      if (!result) {
        handleInvalidPassword();
        e.target.password.value = "";
        prevOp.current = null;
        setPrevOpArgs([]);
        return;
      }
    } catch (error) {
      console.error(error);
    }
    e.target.password.value = "";
    console.log(prevOp);
    await executeFunc(prevOp.current, prevOpArgs);
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
          console.log(handleToggleShowPassword);
          console.log(prevOp);
          setPrevOpArgs([index]);
          return;
        }
        console.log(response);
        password = response.entry.password;
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
    // Adding the 'password' key to each object
    for (let i = 0; i < response.length; i++) {
      response[i].password = "password";
    }
    setSiteObjects(response);
  };

  const handleClickAdder = () => {
    setShowAddDialog(true);
    document.getElementById("password-dialog").showModal();
    console.log("show dialog");
  };

  const executeFunc = async (func, args) => {
    console.log(func);
    console.log(args, typeof args);
    if (typeof func === "function") {
      prevOp.current = null;
      setPrevOpArgs([]);
      return await func(...args);
    } else {
      throw new Error("The first argument must be a function");
    }
  };

  const handleCreateNewEntrySubmit = async (e) => {
    const site = e.target.site.value;
    const username = e.target.username.value;
    const password = e.target.password.value;
    if (!site || !username || !password) {
      return;
    }
    console.log(site, username, password);
    try {
      let result = await invoke("write_entry", {
        site: site,
        username: username,
        password: password,
      });
      if (!result.authorized) {
        runAuthFlow();
        prevOp.current = handleCreateNewEntrySubmit;
        setPrevOpArgs([e]);
        return;
      }
      if (result.success) {
        invoke("get_entries", {})
          // `invoke` returns a Promise
          .then((response) => {
            console.log(result, response);
            handleAllEntries(response.entries);
          })
          .catch((err) => console.log(err));
      }
    } catch (error) {
      console.error(error);
    }
    e.target.site.value = "";
    e.target.username.value = "";
    e.target.password.value = "";
  };

  const triggerDeleteEntryFlow = (index) => {
    setToDeleteIndex(index);
    document.getElementById("confirm-delete-dialog").showModal();
  };

  const handleDeleteCancel = () => {
    document.getElementById("confirm-delete-dialog").close();
  };

  const deleteEntrySubmit = async (index) => {
    const site = siteObjects[index].site;
    const username = siteObjects[index].username;
    try {
      let result = await invoke("delete_entry", {
        site: site,
        username: username,
      });
      if (!result.authorized) {
        runAuthFlow();
        prevOp.current = deleteEntrySubmit;
        setPrevOpArgs([index]);
        return;
      }
      let newSiteObjects = siteObjects.slice(); // Create a shallow copy to avoid modifying the original array
      newSiteObjects.splice(index, 1);
      setSiteObjects(newSiteObjects);
      setToDeleteIndex(-1);
    } catch (error) {
      console.error(error);
    }
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
        password = response.entry.password;
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
    invoke("greet", { name: "world" })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error(error);
      });
    getAllData();
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div id="Home">
      <dialog id="password-dialog" className="password-dialog">
        <p>Enter new password</p>
        <form
          method="dialog"
          className="password-dialog__form"
          onSubmit={handleCreateNewEntrySubmit}
        >
          <input
            className="password-dialog__input"
            type="text"
            key={1}
            name="site"
            placeholder="Site"
            autoFocus
            required
          />
          <input
            className="password-dialog__input"
            type="text"
            key={2}
            name="username"
            placeholder="Username"
            autoComplete="username"
            required
          />
          <input
            className="password-dialog__input"
            type="password"
            key={3}
            name="password"
            placeholder="Password"
            autoComplete="new-password"
            required
          />
          <div className="password-dialog__form-button-container">
            <button className="password-dialog__form-button" type="submit">
              Save
            </button>
            <button
              className="password-dialog__form-button"
              type="button"
              onClick={() => {
                console.log(
                  document.getElementById("password-dialog").children[1].site
                );
                document.getElementById(
                  "password-dialog"
                ).children[1].site.value = "";
                document.getElementById(
                  "password-dialog"
                ).children[1].username.value = "";
                document.getElementById(
                  "password-dialog"
                ).children[1].password.value = "";
                document.getElementById("password-dialog").close();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
      <dialog id="invalid-password-dialog" className="invalid-password-dialog">
        <p>Invalid password</p>
        <form method="dialog" type="submit">
          <button className="invalid-password-dialog__form-button">Ok</button>
        </form>
      </dialog>
      <dialog
        id="confirm-delete-dialog"
        className="confirm-delete-dialog"
        onSubmit={() => deleteEntrySubmit(toDeleteIndex)}
      >
        <p>Are you sure you want to delete this entry:</p>
        <p>
          Site: {toDeleteIndex >= 0 ? siteObjects[toDeleteIndex].site : null}
        </p>
        <p>
          Username:{" "}
          {toDeleteIndex >= 0 ? siteObjects[toDeleteIndex].username : null}
        </p>
        <form method="dialog" type="submit">
          <div className="confirm-delete-dialog__form-button-container">
            <button
              className="confirm-delete-dialog__form-button"
              type="submit"
            >
              Yes
            </button>
            <button
              className="confirm-delete-dialog__form-button"
              type="button"
              onClick={handleDeleteCancel}
            >
              No
            </button>
          </div>
        </form>
      </dialog>
      <dialog id="auth-dialog" className="auth-dialog">
        <form
          className="auth-dialog__form"
          method="dialog"
          onSubmit={handleAuth}
        >
          <input
            id="auth-dialog__input"
            className="auth-dialog__input"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            required
            autoFocus
          />
          <div className="auth-dialog__form-button-container">
            <button className="auth-dialog__form-button">Unlock</button>
          </div>
        </form>
      </dialog>
      <div className="home__container">
        <p className="home__welcome">Welcome!</p>
      </div>
      <div className="table-container">
        <div className="table-title">
          <h2>Saved Passwords</h2>
          <button className="table-header-button" onClick={handleClickAdder}>
            <i className="material-icons">add</i>
          </button>
        </div>
        {siteObjects ? (
          <table className="site-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Username</th>
                <th style={{ borderRight: "none" }}>Password</th>
                <th style={{ borderLeft: "none" }}></th>
              </tr>
            </thead>
            <tbody>
              {siteObjects.map((siteObject, index) => (
                <>
                  <tr key={index}>
                    <td>{siteObject.site}</td>
                    <td>{siteObject.username}</td>
                    <td style={{ width: "30%", borderRight: "none" }}>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            display: "inline-block",
                            WebkitTextSecurity: showPassword[index]
                              ? "none"
                              : "disc",
                          }}
                        >
                          {siteObject.password}
                        </span>
                      </div>
                    </td>
                    <td style={{ borderLeft: "none" }}>
                      <div>
                        <i
                          className="material-icons"
                          onClick={() => handleToggleShowPassword(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          {showPassword[index]
                            ? "visibility_off"
                            : "visibility"}
                        </i>
                        <i
                          className="material-icons"
                          onClick={() => copyToClipBoard(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          {clickedCopy[index] ? "done" : "content_copy"}
                        </i>
                        <i
                          className="material-icons"
                          onClick={() => triggerDeleteEntryFlow(index)}
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          delete
                        </i>
                      </div>
                    </td>
                  </tr>
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
