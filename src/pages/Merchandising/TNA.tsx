import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function TNA() {
  return (
    <ModulePage
      title="Time & Action Tracker"
      module="Merchandising"
      icon={icon}
      description="Define and monitor T&A calendars for each order to ensure on-time delivery. Set milestone dates for fabric sourcing, trims procurement, cutting, production, and shipment. Get automatic alerts for delays."
      features={[
        "T&A template creation per buyer",
        "Order-wise T&A calendar",
        "Auto calculation of dates from ship date",
        "Traffic light status indicators",
        "Delay alert & notification system",
        "Bulk update for multiple orders",
        "Gantt chart view",
        "Milestone completion tracking"
      ]}
    />
  );
}
