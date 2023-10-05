import React from "react";
import "./table-row.css";

function TableRow({
  index,
  siteObject,
  showPassword,
  clickedCopy,
  onVisibilityToggle,
  onCopyClick,
  onDeleteClick,
  onEditClick,
}) {
  return siteObject ? (
    <tr className="site-table__row" key={index}>
      <td>{siteObject.site}</td>
      <td>{siteObject.username}</td>
      <td style={{ width: "30%", borderRight: "none" }}>
        <div style={{ position: "relative" }}>
          <span
            style={{
              display: "inline-block",
              WebkitTextSecurity: showPassword ? "none" : "disc",
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
            onClick={() => onVisibilityToggle(index)}
            style={{
              cursor: "pointer",
            }}
          >
            {showPassword ? "visibility_off" : "visibility"}
          </i>
          <i
            className="material-icons"
            onClick={() => onCopyClick(index)}
            style={{
              cursor: "pointer",
            }}
          >
            {clickedCopy ? "done" : "content_copy"}
          </i>
          <i
            className="material-icons"
            onClick={() => onDeleteClick(index)}
            style={{
              cursor: "pointer",
            }}
          >
            delete
          </i>
          <i
            className="material-icons"
            onClick={() => onEditClick(index)}
            style={{
              cursor: "pointer",
            }}
          >
            edit
          </i>
        </div>
      </td>
    </tr>
  ) : null;
}

export default TableRow;
