const ClientPage = dynamic(() => import("@/components/clients/client-page"));
import Layout from "@/components/shared/layout";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const ClientView = () => {
	const router = useRouter();
	const clientId = Array.isArray(router.query.id)
		? router.query.id[0]
		: router.query.id;

	return <Layout>{clientId && <ClientPage clientId={clientId} />}</Layout>;
};

export default ClientView;
