import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export default function BOM() {
  return (
    <ModulePage
      title="Bill of Materials"
      module="Costing"
      icon={icon}
      description="Define complete material specifications for each style. Specify fabric consumption, trims requirements, and accessories per garment size. Auto-calculate order-level material requirements from BOM."
      features={[
        "Style-wise BOM creation",
        "Fabric consumption per garment (with wastage %)",
        "Trims & accessories specification",
        "Size-wise consumption variation",
        "Auto requirement calculation from order qty",
        "BOM version control",
        "Material substitution tracking",
        "BOM approval workflow"
      ]}
    />
  );
}
