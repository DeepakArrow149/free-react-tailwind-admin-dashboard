import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export default function CostSheets() {
  return (
    <ModulePage
      title="Cost Sheets"
      module="Costing"
      icon={icon}
      description="Create detailed garment cost breakdowns including fabric, trims, CMT, overheads, and margins. Compare cost versions, track buyer price negotiations, and maintain cost history per style."
      features={[
        "Style-wise cost sheet creation",
        "Fabric, trims, accessories cost breakup",
        "CMT (Cut-Make-Trim) cost calculation",
        "Overhead & admin cost allocation",
        "Margin analysis per buyer",
        "Cost version comparison",
        "Currency conversion support",
        "Cost approval workflow"
      ]}
    />
  );
}
