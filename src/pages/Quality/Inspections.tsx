import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

export default function Inspections() {
  return (
    <ModulePage
      title="Quality Inspections"
      module="Quality Control"
      icon={icon}
      description="Conduct quality inspections at every stage — incoming material, in-line, end-line, and final. Apply AQL standards, record measurements, and generate inspection reports for buyer compliance."
      features={[
        "Multi-stage inspection: Incoming, In-line, End-line, Final",
        "AQL-based sampling plans",
        "Measurement check recording",
        "Pass/Fail with reason coding",
        "Inspection report generation",
        "Buyer-specific QC standards",
        "Photo evidence attachment",
        "Corrective action tracking"
      ]}
    />
  );
}
