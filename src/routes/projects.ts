import { TuyaContext } from "@tuya/tuya-connector-nodejs"
import { patchContext } from "../api/patch"
import { ProjectData } from "../types"
import { Env, unpack } from "./common"

type RequestData = {
	key?: string
} & ProjectData

export async function projects(
	request: Request,
	env: Env,
	responseContext: any,
): Promise<ProjectData | RequestData | null | string[] | Response> {
	const url = new URL(request.url)

	if (request.method == "GET") {
		let projectKey: string
		if ((projectKey = url.pathname.split("/")[2]))
			return await env.PROJECTS.get<ProjectData>(projectKey, "json")
		return (await env.PROJECTS.list()).keys.map((k) => k.name)
	}
	if (request.method != "POST") return new Response(null, { status: 405 })

	const project = await request.json<RequestData>()
	if (!(project.baseUrl && project.accessKey && project.secretKey))
		throw Error("Needs 'baseUrl', 'accessKey', 'secretKey' string")

	// build cloud API
	const tuya = new TuyaContext(project)
	patchContext(tuya)

	if (!project.assetId) {
		const assets = await unpack(
			tuya.assets.childAssets({ asset_id: "-1", page_size: 20 }),
		)
		if (assets.list.length == 0) {
			project.assetId = await unpack(
				tuya.assets.add({ name: "upk2esphome" }),
			)
		} else {
			project.assetId = assets.list[0].asset_id
		}
	}

	project.key = project.key ?? project.accessKey
	await env.PROJECTS.put(project.key, JSON.stringify(project))
	return project
}
