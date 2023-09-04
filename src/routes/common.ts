import { TuyaResponse } from "@tuya/tuya-connector-nodejs"
import { LicenseData, ProjectData } from "../types"

export interface Env {
	TOKEN_USER: string
	TOKEN_ADMIN: string
	PROJECTS: KVNamespace
	LICENSES: KVNamespace
	PRODUCTS: KVNamespace
	SCHEMAS: KVNamespace
}

export async function getRandomProject(env: Env): Promise<ProjectData> {
	const projects = await env.PROJECTS.list()
	if (!projects.keys.length) throw Error("No projects")
	const projectKey =
		projects.keys[Math.floor(Math.random() * projects.keys.length)]
	return (await env.PROJECTS.get<ProjectData>(projectKey.name, "json"))!!
}

export async function getRandomLicense(env: Env): Promise<LicenseData> {
	const licenses = await env.LICENSES.list()
	if (!licenses.keys.length) throw Error("No licenses")
	const licenseKey =
		licenses.keys[Math.floor(Math.random() * licenses.keys.length)]
	return (await env.LICENSES.get<LicenseData>(licenseKey.name, "json"))!!
}

export async function unpack<T>(request: Promise<TuyaResponse<T>>): Promise<T> {
	const response = await request
	if (response.success === false)
		throw Error(`${response.code}: ${response.msg}`)
	return response.result
}

export function checkAuth(
	request: Request,
	env: Env,
	admin: boolean = false,
): Response | null {
	const tokens = []
	if (env.TOKEN_ADMIN) tokens.push(...env.TOKEN_ADMIN.split(" "))
	if (env.TOKEN_USER && !admin) tokens.push(...env.TOKEN_USER.split(" "))
	if (!tokens.length && !admin) return null

	for (const token of tokens) {
		if (request.headers.get("Authorization")?.split(" ")[1] === token)
			return null
	}

	return new Response(null, {
		status: 401,
		headers: { "WWW-Authenticate": "Basic" },
	})
}
