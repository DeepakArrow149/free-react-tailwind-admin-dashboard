import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default function Finishing() {
  return (
    <ModulePage
      title="Finishing"
      module="Production"
      icon={icon}
      description="Manage post-sewing finishing operations including washing, pressing, folding, and tagging. Track garments through finishing stages and ensure everything is completed before packing."
      features={[
        "Finishing order creation from sewing output",
        "Operation-wise tracking (wash/press/fold/tag)",
        "Finishing stage completion recording",
        "Pressing target vs actual monitoring",
        "Thread cutting & spot cleaning tracking",
        "Label and tag attachment verification",
        "Finishing output registration",
        "Transition to packing handoff"
      ]}
    />
  );
}
