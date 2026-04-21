import { Card } from "@/components/ui";

export default function LoadingDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Loading" description="Fetching school stats…">
        <div className="h-16" />
      </Card>
      <Card title="Loading" description="Fetching quick stats…">
        <div className="h-16" />
      </Card>
    </div>
  );
}
