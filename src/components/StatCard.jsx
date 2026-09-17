function StatCard({ title, value, description, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div>
          <p className="stat-title">{title}</p>
          <h2>{value}</h2>
        </div>

        <div className="stat-icon">
          {icon}
        </div>
      </div>

      <p className="stat-description">
        {description}
      </p>
    </div>
  );
}

export default StatCard;