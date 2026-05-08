async function getLocale() {
	return "en";
}

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const locale = await getLocale();

	return (
		<html lang={locale}>
			<body>{children}</body>
		</html>
	);
}
