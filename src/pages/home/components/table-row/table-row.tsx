import React from "react";
import "./table-row.css";

interface SiteObject extends Object {
  site: string,
  username: string,
  password: string,
}

type Props = {
  index: number;
  siteObject: SiteObject | null;
  showPassword: boolean;
  clickedCopy: boolean;
  onVisibilityToggle: (index: number) => void;
  onCopyClick: (index: number) => void;
  onDeleteClick: (index: number) => void;
  onEditClick: (index: number) => void;
}

const TableRow: React.FC<Props> = ({
  index,
  siteObject,
  showPassword,
  clickedCopy,
  onVisibilityToggle,
  onCopyClick,
  onDeleteClick,
  onEditClick,
}: Props) => {
  return siteObject ? (
    <tr className="site-table__row" key={index}>
      <td>{siteObject.site}</td>
      <td>{siteObject.username}</td>
      <td style={{ width: "30%", borderRight: "none" }}>
        <div style={{ position: "relative" }}>
          <input
            className="site-table__row-password"
            type={showPassword ? "text" : "password"}
            value={siteObject.password}
            readOnly
          />
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
