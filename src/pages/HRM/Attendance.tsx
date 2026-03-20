import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function Attendance() {
  return (
    <ModulePage
      title="Attendance Management"
      module="Human Resource Management"
      icon={icon}
      description="Track daily attendance for all employees. Support multiple attendance modes — biometric, manual, and shift-based. Generate attendance reports and integrate with payroll for salary computation."
      features={[
        "Daily attendance marking",
        "Biometric device integration",
        "Shift management (Day/Night/Split)",
        "Overtime recording & approval",
        "Leave application & approval",
        "Leave balance tracking",
        "Monthly attendance summary",
        "Attendance regularization workflow"
      ]}
    />
  );
}
