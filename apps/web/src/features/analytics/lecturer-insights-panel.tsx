import { DashboardAnalyticsOverview } from './dashboard-analytics-overview.js';

export function LecturerInsightsPanel() {
  return (
    <DashboardAnalyticsOverview
      description="Calculated only from your assigned courses and their verified attendance records."
      heading="Lecturer attendance pulse"
      scopeName="Lecturer"
    />
  );
}
