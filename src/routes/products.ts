import { ObjectType } from "../types"
import { Env } from "./common"

export async function products(
	request: Request,
	env: Env,
	responseContext: any,
): Promise<ObjectType | null | string[] | Response> {
	const url = new URL(request.url)

	if (request.method == "GET") {
		let productKey: string
		if ((productKey = url.pathname.split("/")[2]))
			return await env.PRODUCTS.get<ObjectType>(productKey, "json")
		return (await env.PRODUCTS.list()).keys.map((k) => k.name)
	}

	return new Response(null, { status: 405 })
}
