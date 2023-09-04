import { ObjectType } from "../types"
import { Env } from "./common"

export async function schemas(
	request: Request,
	env: Env,
	responseContext: any,
): Promise<ObjectType | null | string[] | Response> {
	const url = new URL(request.url)

	if (request.method == "GET") {
		let schemaKey: string
		if ((schemaKey = url.pathname.split("/")[2]))
			return await env.SCHEMAS.get<ObjectType>(schemaKey, "json")
		return (await env.SCHEMAS.list()).keys.map((k) => k.name)
	}

	return new Response(null, { status: 405 })
}