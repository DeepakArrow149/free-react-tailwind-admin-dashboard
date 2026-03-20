import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

export default function DefectLog() {
  return (
    <ModulePage
      title="Defect Log & Analysis"
      module="Quality Control"
      icon={icon}
      description="Record and categorize garment defects during production and inspection. Analyze defect trends by type, line, operator, and style. Drive quality improvement with Pareto analysis and root cause tracking."
      features={[
        "Defect entry with type classification",
        "Defect categorization (Critical/Major/Minor)",
        "Defect location marking on garment diagram",
        "Line-wise defect rate tracking",
        "Pareto analysis for top defects",
        "Root cause analysis & corrective actions",
        "Defect trend reporting",
        "DHU (Defects per Hundred Units) monitoring"
      ]}
    />
  );
}
