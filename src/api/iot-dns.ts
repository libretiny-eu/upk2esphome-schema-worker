export async function fetchRegionEndpoint(region: string): Promise<string> {
	const headers = new Headers()
	headers.set("User-Agent", "TUYA_IOT_SDK")
	headers.set("Content-Type", "application/json")
	const body = JSON.stringify({
		region: region,
		config: [
			{
				key: "httpUrl",
				need_ca: false,
			},
		],
	})
	const r = await fetch("https://h3.iot-dns.com/v1/url_config", {
		headers,
		body,
		method: "POST",
	})
	const response = (await r.json()) as any
	return response.httpUrl.addr
}
