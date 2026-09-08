function AdminDashboard() { /* ... */ }
function UserDashboard() { /* ... */ }
function GuestDashboard() { /* ... */ }

function DashboardFactory(role) {
  switch (role) {
    case 'admin': return AdminDashboard;
    case 'user': return UserDashboard;
    default: return GuestDashboard;
  }
}

// Usage
const Dashboard = DashboardFactory(currentUser.role);
return <Dashboard />;
