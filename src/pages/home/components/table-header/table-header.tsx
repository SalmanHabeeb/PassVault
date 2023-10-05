import React from "react";
import "./table-header.css";

const TableHeader: React.FC<void> = () => {
  return (
    <thead>
      <tr>
        <th>Site</th>
        <th>Username</th>
        <th>Password</th>
        <th></th>
      </tr>
    </thead>
  );
}

export default TableHeader;
