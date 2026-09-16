import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "▣",
    },
    {
      name: "Mobility Map",
      path: "/mobility-map",
      icon: "⌖",
    },
    {
      name: "Stores",
      path: "/stores",
      icon: "▤",
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: "◫",
    },
    {
      name: "Cannibalization",
      path: "/cannibalization",
      icon: "◎",
    },
    {
      name: "Store Details",
      path: "/store-details",
      icon: "◉",
    },
    {
      name: "Settings",
      path: "/settings",
      icon: "⚙",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>GeoPulse</h2>
        <span>Retail Mobility Analytics</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Frontend & UI</p>
        <span>GeoPulse Analytics</span>
      </div>
    </aside>
  );
}

export default Sidebar;