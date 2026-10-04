function Header({ title = "Dashboard" }) {
  return (
    <header className="top-header">
      <div>
        <h1>{title}</h1>
        <p>Hyper-Local Retail Mobility Analytics</p>
      </div>

      <div className="user-profile">
        <div className="user-avatar">NS</div>

        <div className="user-info">
          <strong>Nikhil Shinde</strong>
          <span>Frontend Analyst</span>
        </div>
      </div>
    </header>
  );
}

export default Header;