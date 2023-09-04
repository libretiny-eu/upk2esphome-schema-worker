import { LicenseData } from "../types"
import { Env } from "./common"

type RequestData = {
	key?: string
} & LicenseData

export async function licenses(
	request: Request,
	env: Env,
	responseContext: any,
): Promise<LicenseData | RequestData[] | null | string[] | Response> {
	const url = new URL(request.url)

	if (request.method == "GET") {
		let licenseKey: string
		if ((licenseKey = url.pathname.split("/")[2])) {
			const license = await env.LICENSES.get<LicenseData>(
				licenseKey,
				"json",
			)
			if (!license) return new Response(null, { status: 404 })
			return license
		}
		return (await env.LICENSES.list()).keys.map((k) => k.name)
	}
	if (request.method != "POST") return new Response(null, { status: 405 })

	let licenses = await request.json<RequestData[]>()
	if (!Array.isArray(licenses)) licenses = [licenses]

	for (const license of licenses) {
		if (!(license.uuid && license.authKey))
			throw Error("Needs 'uuid' and 'authKey' string")
		license.key = license.key ?? license.uuid
		await env.LICENSES.put(license.key, JSON.stringify(license))
	}

	return licenses
}
