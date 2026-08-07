import Layout from "@/components/shared/layout";
import dynamic from "next/dynamic";

const ReportsPage = dynamic(() => import("@/components/reports/reports-page"));

const Reports = () => (
	<Layout>
		<ReportsPage />
	</Layout>
);

export default Reports;
