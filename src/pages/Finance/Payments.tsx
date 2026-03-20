import ModulePage from "../../components/common/ModulePage";

const icon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export default function Payments() {
  return (
    <ModulePage
      title="Payments"
      module="Finance"
      icon={icon}
      description="Track buyer payments, supplier payments, and internal transactions. Manage payment schedules, LC tracking, and bank reconciliation. Ensure accurate cash flow monitoring."
      features={[
        "Buyer payment receipt recording",
        "Supplier payment processing",
        "Payment against invoice matching",
        "LC (Letter of Credit) tracking",
        "TT/Wire transfer management",
        "Payment schedule & reminders",
        "Bank reconciliation",
        "Cash flow forecasting"
      ]}
    />
  );
}
